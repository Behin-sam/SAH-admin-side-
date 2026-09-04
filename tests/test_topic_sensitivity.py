"""Tests for topic sensitivity mapping (Stage 5)."""

import pytest

from app.engine.baseline import PersonalBaseline, MetricBaseline, MIN_VARIANCE
from app.engine.topic_sensitivity import (
    compute_topic_sensitivity,
    get_high_activation_topics,
    format_sensitivity_summary,
    TopicActivation,
)


@pytest.fixture
def simple_baseline():
    """A simple baseline for testing."""
    baseline = PersonalBaseline(survivor_id="test")
    baseline.metrics["time_to_answer"] = MetricBaseline(
        mean=4.0, std_dev=1.0, min_val=2.0, max_val=6.0, sample_count=14
    )
    baseline.metrics["skip_rate"] = MetricBaseline(
        mean=0.1, std_dev=0.05, min_val=0.0, max_val=0.2, sample_count=14
    )
    return baseline


class TestComputeTopicSensitivity:
    """Test topic-level activation computation."""

    def test_normal_topic_low_activation(self, simple_baseline):
        topic_data = {
            "sleep": [
                {"time_to_answer": 4.2, "skip_rate": 0.1},
                {"time_to_answer": 3.8, "skip_rate": 0.12},
                {"time_to_answer": 4.0, "skip_rate": 0.08},
            ]
        }
        result = compute_topic_sensitivity(simple_baseline, topic_data)
        assert result["sleep"].activation_score < 0.3

    def test_elevated_topic_high_activation(self, simple_baseline):
        topic_data = {
            "safety": [
                {"time_to_answer": 7.0, "skip_rate": 0.4},  # Well above baseline
                {"time_to_answer": 8.0, "skip_rate": 0.5},
                {"time_to_answer": 7.5, "skip_rate": 0.45},
            ]
        }
        result = compute_topic_sensitivity(simple_baseline, topic_data)
        assert result["safety"].activation_score > 0.5

    def test_empty_topic_data(self, simple_baseline):
        result = compute_topic_sensitivity(simple_baseline, {"empty_topic": []})
        assert result["empty_topic"].activation_score == 0.0
        assert result["empty_topic"].sample_count == 0

    def test_multiple_topics(self, simple_baseline):
        topic_data = {
            "sleep": [{"time_to_answer": 4.0}],
            "safety": [{"time_to_answer": 7.0}],
            "food": [{"time_to_answer": 4.1}],
        }
        result = compute_topic_sensitivity(simple_baseline, topic_data)
        assert len(result) == 3
        # Safety should have highest activation
        assert result["safety"].activation_score > result["sleep"].activation_score

    def test_consistently_elevated_flag(self, simple_baseline):
        topic_data = {
            "danger": [
                {"time_to_answer": 7.0} for _ in range(5)  # 5 elevated samples
            ]
        }
        result = compute_topic_sensitivity(simple_baseline, topic_data)
        assert result["danger"].consistently_elevated is True

    def test_not_consistently_elevated_with_few_samples(self, simple_baseline):
        topic_data = {
            "danger": [
                {"time_to_answer": 7.0},  # Only 1 sample
            ]
        }
        result = compute_topic_sensitivity(simple_baseline, topic_data)
        assert result["danger"].consistently_elevated is False

    def test_none_values_in_signals(self, simple_baseline):
        topic_data = {
            "mixed": [
                {"time_to_answer": 4.0, "skip_rate": None},
                {"time_to_answer": None, "skip_rate": 0.1},
            ]
        }
        result = compute_topic_sensitivity(simple_baseline, topic_data)
        # Should handle gracefully — some data points computed
        assert result["mixed"].sample_count >= 0


class TestGetHighActivationTopics:
    """Test filtering high-activation topics."""

    def test_filters_by_threshold(self):
        sensitivities = {
            "sleep": TopicActivation("sleep", 0.8, 10, 2.4, True),
            "safety": TopicActivation("safety", 0.5, 10, 1.5, False),
            "food": TopicActivation("food", 0.2, 10, 0.6, False),
        }
        result = get_high_activation_topics(sensitivities, threshold=0.6)
        assert "sleep" in result
        assert "safety" not in result
        assert "food" not in result

    def test_sorted_by_score_descending(self):
        sensitivities = {
            "a": TopicActivation("a", 0.7, 10, 2.1, True),
            "b": TopicActivation("b", 0.9, 10, 2.7, True),
            "c": TopicActivation("c", 0.8, 10, 2.4, True),
        }
        result = get_high_activation_topics(sensitivities, threshold=0.6)
        assert result == ["b", "c", "a"]

    def test_empty_when_none_above_threshold(self):
        sensitivities = {
            "a": TopicActivation("a", 0.3, 10, 0.9, False),
        }
        result = get_high_activation_topics(sensitivities, threshold=0.6)
        assert result == []


class TestFormatSensitivitySummary:
    """Test human-readable summary generation."""

    def test_high_activation_summary(self):
        sensitivities = {
            "sleep": TopicActivation("sleep", 0.8, 10, 2.4, True),
            "safety": TopicActivation("safety", 0.7, 10, 2.1, True),
        }
        summary = format_sensitivity_summary(sensitivities)
        assert "sleep" in summary
        assert "safety" in summary
        assert "high" in summary.lower()

    def test_no_elevated_summary(self):
        sensitivities = {
            "food": TopicActivation("food", 0.2, 10, 0.6, False),
        }
        summary = format_sensitivity_summary(sensitivities)
        assert "No topics" in summary or "no elevated" in summary.lower()
