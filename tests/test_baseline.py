"""Tests for the personal baseline engine (Stage 3).

Covers:
- compute_baseline_from_samples: mean/std/min/max from raw data
- establish_baseline: threshold check + full baseline creation
- compute_rolling_baseline: EWMA update
- Edge cases: empty data, single sample, extreme values
"""

import math
import pytest

from app.engine.baseline import (
    MetricBaseline,
    PersonalBaseline,
    compute_baseline_from_samples,
    compute_rolling_baseline,
    establish_baseline,
    has_enough_data_for_baseline,
    MIN_CHECKINS_FOR_BASELINE,
    MIN_VARIANCE,
)


class TestComputeBaselineFromSamples:
    """Test computing statistics from raw sample data."""

    def test_basic_computation(self):
        samples = {"time_to_answer": [3.0, 4.0, 5.0]}
        result = compute_baseline_from_samples(samples)

        assert "time_to_answer" in result
        mb = result["time_to_answer"]
        assert mb.mean == pytest.approx(4.0)
        assert mb.sample_count == 3
        assert mb.min_val == 3.0
        assert mb.max_val == 5.0

    def test_std_dev_calculation(self):
        # [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, sample std ≈ 2.138 (Bessel's correction)
        samples = {"metric": [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]}
        result = compute_baseline_from_samples(samples)
        mb = result["metric"]
        assert mb.mean == pytest.approx(5.0)
        assert mb.std_dev == pytest.approx(2.138, abs=0.01)

    def test_single_sample(self):
        samples = {"metric": [5.0]}
        result = compute_baseline_from_samples(samples)
        mb = result["metric"]
        assert mb.mean == 5.0
        # With 1 sample, variance is 0 but std_dev gets floored to sqrt(MIN_VARIANCE)
        assert mb.std_dev == pytest.approx(0.0316, abs=0.01)
        assert mb.sample_count == 1

    def test_empty_samples(self):
        samples = {"metric": []}
        result = compute_baseline_from_samples(samples)
        mb = result["metric"]
        assert mb.sample_count == 0
        assert mb.mean == 0.0

    def test_filters_none_values(self):
        samples = {"metric": [3.0, None, 5.0, None, 4.0]}
        result = compute_baseline_from_samples(samples)
        mb = result["metric"]
        assert mb.mean == pytest.approx(4.0)
        assert mb.sample_count == 3

    def test_filters_nan_values(self):
        samples = {"metric": [3.0, float("nan"), 5.0]}
        result = compute_baseline_from_samples(samples)
        mb = result["metric"]
        assert mb.mean == pytest.approx(4.0)
        assert mb.sample_count == 2

    def test_multiple_metrics(self):
        samples = {
            "time_to_answer": [3.0, 4.0, 5.0],
            "skip_rate": [0.1, 0.2, 0.3],
        }
        result = compute_baseline_from_samples(samples)
        assert len(result) == 2
        assert result["time_to_answer"].mean == pytest.approx(4.0)
        assert result["skip_rate"].mean == pytest.approx(0.2)

    def test_std_dev_floor(self):
        """Std dev should never be zero (prevents div/0 in z-scores)."""
        samples = {"metric": [5.0, 5.0, 5.0]}
        result = compute_baseline_from_samples(samples)
        mb = result["metric"]
        assert mb.std_dev >= math.sqrt(MIN_VARIANCE)


class TestEstablishBaseline:
    """Test initial baseline establishment."""

    def test_establishes_with_enough_data(self):
        samples = {
            "time_to_answer": [4.0] * 14,
            "skip_rate": [0.1] * 14,
        }
        baseline = establish_baseline("s1", samples, checkin_count=14)

        assert baseline.established is True
        assert baseline.survivor_id == "s1"
        assert "time_to_answer" in baseline.metrics
        assert "skip_rate" in baseline.metrics

    def test_rejects_insufficient_data(self):
        samples = {"time_to_answer": [4.0] * 5}
        baseline = establish_baseline("s1", samples, checkin_count=5)

        assert baseline.established is False

    def test_exactly_minimum_checkins(self):
        samples = {"metric": [1.0] * MIN_CHECKINS_FOR_BASELINE}
        baseline = establish_baseline("s1", samples, checkin_count=MIN_CHECKINS_FOR_BASELINE)
        assert baseline.established is True

    def test_one_below_minimum(self):
        samples = {"metric": [1.0] * (MIN_CHECKINS_FOR_BASELINE - 1)}
        baseline = establish_baseline("s1", samples, checkin_count=MIN_CHECKINS_FOR_BASELINE - 1)
        assert baseline.established is False

    def test_ewma_initialized_from_samples(self):
        samples = {"time_to_answer": [3.0, 5.0, 7.0]}
        baseline = establish_baseline("s1", samples, checkin_count=14)

        assert baseline.ewma_means["time_to_answer"] == pytest.approx(5.0)
        assert baseline.ewma_variance["time_to_answer"] > 0


class TestComputeRollingBaseline:
    """Test EWMA-based rolling baseline updates."""

    def test_single_update_shifts_mean(self, established_baseline):
        old_mean = established_baseline.ewma_means["time_to_answer"]

        # Feed a value significantly above the mean
        new_values = {"time_to_answer": 8.0, "skip_rate": 0.5, "revision_count": 3.0}
        updated = compute_rolling_baseline(established_baseline, new_values)

        # Mean should shift upward, but not all the way to 8.0 (EWMA dampening)
        new_mean = updated.ewma_means["time_to_answer"]
        assert new_mean > old_mean
        assert new_mean < 8.0  # EWMA doesn't jump to the new value

    def test_multiple_updates_converge(self, established_baseline):
        """Feeding the same high value repeatedly should converge toward it."""
        baseline = established_baseline
        for _ in range(20):
            baseline = compute_rolling_baseline(baseline, {
                "time_to_answer": 8.0,
                "skip_rate": 0.5,
                "revision_count": 3.0,
            })

        # After 20 updates, mean should be much closer to 8.0
        final_mean = baseline.ewma_means["time_to_answer"]
        assert final_mean > 6.0

    def test_none_values_are_skipped(self, established_baseline):
        old_mean = established_baseline.ewma_means["time_to_answer"]
        compute_rolling_baseline(established_baseline, {"time_to_answer": None})
        assert established_baseline.ewma_means["time_to_answer"] == old_mean

    def test_variance_updates(self, established_baseline):
        old_var = established_baseline.ewma_variance["time_to_answer"]
        compute_rolling_baseline(established_baseline, {"time_to_answer": 10.0})
        new_var = established_baseline.ewma_variance["time_to_answer"]
        # Variance should change after an outlier
        assert new_var != old_var

    def test_min_variance_floor(self, established_baseline):
        """Variance should never drop below MIN_VARIANCE."""
        for _ in range(50):
            compute_rolling_baseline(established_baseline, {
                "time_to_answer": established_baseline.ewma_means["time_to_answer"],
            })
        assert established_baseline.ewma_variance["time_to_answer"] >= MIN_VARIANCE


class TestHasEnoughData:
    """Test the data sufficiency check."""

    def test_enough(self):
        assert has_enough_data_for_baseline(MIN_CHECKINS_FOR_BASELINE) is True

    def test_not_enough(self):
        assert has_enough_data_for_baseline(MIN_CHECKINS_FOR_BASELINE - 1) is False

    def test_way_enough(self):
        assert has_enough_data_for_baseline(100) is True
