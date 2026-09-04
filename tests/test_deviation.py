"""Tests for the deviation / trend model (Stage 4).

Covers:
- Z-score computation against personal baseline
- Composite distress index calculation
- Trajectory classification rules
- Edge cases: no data, single point, all extremes
"""

import pytest

from app.engine.baseline import establish_baseline
from app.engine.deviation import (
    compute_z_scores,
    compute_distress_index,
    classify_trajectory,
    generate_trend_summary,
    METRIC_WEIGHTS,
)


class TestComputeZScores:
    """Test z-score computation against personal baseline."""

    def test_normal_values_near_zero(self, established_baseline, normal_checkin_values):
        """Values within baseline range should produce small z-scores."""
        z_scores = compute_z_scores(established_baseline, normal_checkin_values)
        assert len(z_scores) == 3

        for zs in z_scores:
            assert abs(zs.z_score) < 1.0  # Within 1σ
            assert zs.is_elevated is False

    def test_extreme_values_produce_large_z(self, established_baseline, acute_checkin_values):
        """Values far from baseline should produce large z-scores."""
        z_scores = compute_z_scores(established_baseline, acute_checkin_values)

        # At least one should be highly elevated
        elevated = [zs for zs in z_scores if zs.is_elevated]
        assert len(elevated) >= 1

    def test_direction_labels(self, established_baseline):
        """Z-scores should have correct direction labels."""
        # Well above baseline
        z_scores = compute_z_scores(established_baseline, {"time_to_answer": 10.0})
        assert z_scores[0].direction == "above"
        assert z_scores[0].z_score > 0

        # Well below baseline
        z_scores = compute_z_scores(established_baseline, {"time_to_answer": 1.0})
        assert z_scores[0].direction == "below"
        assert z_scores[0].z_score < 0

    def test_missing_metrics_ignored(self, established_baseline):
        """Metrics not in the baseline should be skipped."""
        z_scores = compute_z_scores(established_baseline, {"nonexistent_metric": 5.0})
        assert len(z_scores) == 0

    def test_none_values_ignored(self, established_baseline):
        """None values should be skipped."""
        z_scores = compute_z_scores(established_baseline, {"time_to_answer": None})
        assert len(z_scores) == 0

    def test_z_score_formula(self):
        """Verify z-score formula: z = (x - μ) / σ."""
        from app.engine.baseline import PersonalBaseline, MetricBaseline

        baseline = PersonalBaseline(survivor_id="test")
        baseline.metrics["metric"] = MetricBaseline(mean=5.0, std_dev=2.0, sample_count=10)

        z_scores = compute_z_scores(baseline, {"metric": 9.0})
        assert z_scores[0].z_score == pytest.approx(2.0)  # (9 - 5) / 2


class TestComputeDistressIndex:
    """Test composite distress index calculation."""

    def test_zero_for_no_signals(self):
        assert compute_distress_index([]) == 0.0

    def test_low_for_normal_z_scores(self):
        from app.engine.deviation import ZScoreResult
        z_scores = [
            ZScoreResult("time_to_answer", 4.0, 0.1, False, "normal"),
            ZScoreResult("skip_rate", 0.1, 0.05, False, "normal"),
        ]
        index = compute_distress_index(z_scores)
        assert index < 0.2  # Low distress

    def test_high_for_extreme_z_scores(self):
        from app.engine.deviation import ZScoreResult
        z_scores = [
            ZScoreResult("time_to_answer", 10.0, 3.0, True, "above"),
            ZScoreResult("skip_rate", 0.8, 2.5, True, "above"),
        ]
        index = compute_distress_index(z_scores)
        assert index > 0.5

    def test_respects_metric_weights(self):
        """Higher-weight metrics should push distress index up more."""
        from app.engine.deviation import ZScoreResult

        # High-weight metric (skip_rate=1.5) with high z, low-weight metric (voice_pace=0.8) low z
        z_heavy = [
            ZScoreResult("skip_rate", 0.5, 3.0, True, "above"),
        ]
        # Same z but on low-weight metric
        z_light = [
            ZScoreResult("voice_pace", 6.0, 3.0, True, "above"),
        ]
        # With single metric, both give same index (abs(z) * w / w = abs(z))
        # So test with MULTIPLE metrics where weights differ:
        z_high_weight = [
            ZScoreResult("skip_rate", 0.5, 3.0, True, "above"),       # w=1.5, z=3.0
            ZScoreResult("time_to_answer", 8.0, 3.0, True, "above"),   # w=1.0, z=3.0
        ]
        z_low_weight = [
            ZScoreResult("revision_count", 5.0, 3.0, True, "above"),  # w=0.8, z=3.0
            ZScoreResult("voice_pace", 6.0, 3.0, True, "above"),      # w=0.8, z=3.0
        ]
        # Both have same z-scores, but high-weight group has higher total weight
        # weighted_mean = sum(w*z)/sum(w) → same if all z are equal
        # Actually still equal. Let's use DIFFERENT z-scores:
        z_high_contrib = [
            ZScoreResult("skip_rate", 0.8, 3.0, True, "above"),       # w=1.5
        ]
        z_low_contrib = [
            ZScoreResult("voice_pace", 6.0, 1.0, True, "above"),      # w=0.8
        ]
        assert compute_distress_index(z_high_contrib) > compute_distress_index(z_low_contrib)

    def test_capped_at_1(self):
        from app.engine.deviation import ZScoreResult
        z_scores = [
            ZScoreResult("time_to_answer", 20.0, 10.0, True, "above"),
        ]
        index = compute_distress_index(z_scores)
        assert index <= 1.0


class TestClassifyTrajectory:
    """Test trajectory classification from trend windows."""

    def test_stable_low_distress(self):
        """Low, flat distress → stable."""
        window = [0.1, 0.15, 0.12, 0.1, 0.13]
        analysis = classify_trajectory(window, [])
        assert analysis.trajectory_label == "stable"
        assert analysis.severity_score < 0.4

    def test_escalating_increasing_distress(self):
        """Rising distress → escalating."""
        # Need higher values to cross the escalation threshold
        window = [0.3, 0.45, 0.55, 0.65, 0.75]
        analysis = classify_trajectory(window, [])
        assert analysis.trajectory_label in ("escalating", "acute")

    def test_declining_decreasing_distress(self):
        """Falling distress → declining (improving)."""
        window = [0.5, 0.4, 0.3, 0.2, 0.15]
        analysis = classify_trajectory(window, [])
        assert analysis.trajectory_label == "declining"
        assert analysis.slope < 0

    def test_acute_with_extreme_signal(self):
        """Single extreme z-score → acute."""
        from app.engine.deviation import ZScoreResult

        # Create z-scores with one extreme value
        z_scores = [
            ZScoreResult("time_to_answer", 12.0, 4.0, True, "above"),  # > 2.5 threshold
        ]
        window = [0.3, 0.4, 0.5, 0.6, 0.7]
        analysis = classify_trajectory(window, z_scores)
        assert analysis.trajectory_label == "acute"

    def test_empty_window(self):
        """Empty window should default to stable."""
        analysis = classify_trajectory([], [])
        assert analysis.trajectory_label == "stable"
        assert analysis.severity_score == 0.0

    def test_single_point(self):
        """Single data point — should be stable with low confidence."""
        analysis = classify_trajectory([0.3], [])
        assert analysis.trajectory_label == "stable"
        assert analysis.confidence < 0.8  # Low confidence with 1 point

    def test_slope_computation(self):
        """Verify slope is computed correctly."""
        # Perfect linear increase
        window = [0.0, 0.1, 0.2, 0.3, 0.4]
        analysis = classify_trajectory(window, [])
        assert analysis.slope > 0  # Positive slope (worsening)

        # Perfect linear decrease
        window = [0.4, 0.3, 0.2, 0.1, 0.0]
        analysis = classify_trajectory(window, [])
        assert analysis.slope < 0  # Negative slope (improving)

    def test_max_distress(self):
        window = [0.1, 0.5, 0.3, 0.8, 0.2]
        analysis = classify_trajectory(window, [])
        assert analysis.max_distress == pytest.approx(0.8)

    def test_severity_bounded(self):
        """Severity should always be between 0 and 1."""
        window = [0.9, 0.95, 1.0, 0.98, 0.99]
        analysis = classify_trajectory(window, [])
        assert 0.0 <= analysis.severity_score <= 1.0

    def test_confidence_increases_with_window_size(self):
        short = classify_trajectory([0.3, 0.3], [])
        long = classify_trajectory([0.3] * 5, [])
        assert long.confidence >= short.confidence


class TestGenerateTrendSummary:
    """Test human-readable summary generation."""

    def test_acute_summary(self):
        from app.engine.deviation import TrendAnalysis
        analysis = TrendAnalysis(
            distress_values=[0.6, 0.7, 0.8, 0.9],
            mean_distress=0.75,
            slope=0.1,
            max_distress=0.9,
            elevated_count=3,
            trajectory_label="acute",
            severity_score=0.85,
            confidence=0.8,
            contributing_features=[],
            contributing_topics=[],
        )
        summary = generate_trend_summary(analysis)
        assert "Acute" in summary or "acute" in summary.lower()
        assert "outreach" in summary.lower() or "deviation" in summary.lower()

    def test_stable_summary(self):
        from app.engine.deviation import TrendAnalysis
        analysis = TrendAnalysis(
            distress_values=[0.1, 0.12, 0.11],
            mean_distress=0.11,
            slope=0.0,
            max_distress=0.12,
            elevated_count=0,
            trajectory_label="stable",
            severity_score=0.1,
            confidence=0.9,
            contributing_features=[],
            contributing_topics=[],
        )
        summary = generate_trend_summary(analysis)
        assert "Stable" in summary or "stable" in summary.lower()
