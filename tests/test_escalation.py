"""Tests for the escalation logic (Stage 6).

Covers:
- Action determination from trajectory + severity
- Alert payload construction with explainability
- Urgency classification
- Response recommendations
- Edge cases and boundary conditions
"""

import pytest

from app.engine.escalation import (
    determine_action,
    build_alert_payload,
    ActionType,
    _determine_urgency,
    _recommend_response,
    _interpret_metric,
    _describe_topic_activation,
)
from app.engine.deviation import TrendAnalysis
from app.engine.topic_sensitivity import TopicActivation


class TestDetermineAction:
    """Test mapping trajectory + severity → action type."""

    def test_stable_no_action(self):
        assert determine_action("stable", 0.2) == ActionType.NONE

    def test_declining_self_resource(self):
        assert determine_action("declining", 0.3) == ActionType.SELF_RESOURCE

    def test_escalating_counselor_alert(self):
        assert determine_action("escalating", 0.5) == ActionType.COUNSELOR_ALERT

    def test_acute_immediate_contact(self):
        assert determine_action("acute", 0.8) == ActionType.IMMEDIATE_CONTACT

    def test_escalating_high_severity_promotes_to_acute(self):
        """Escalating with severity > 0.8 should trigger immediate contact."""
        assert determine_action("escalating", 0.85) == ActionType.IMMEDIATE_CONTACT

    def test_escalating_low_severity_stays_alert(self):
        assert determine_action("escalating", 0.6) == ActionType.COUNSELOR_ALERT

    def test_acute_always_immediate(self):
        """Even low severity acute should trigger immediate contact."""
        assert determine_action("acute", 0.3) == ActionType.IMMEDIATE_CONTACT


class TestBuildAlertPayload:
    """Test alert payload construction (now async)."""

    def _make_analysis(self, label="escalating", severity=0.65, slope=0.1):
        return TrendAnalysis(
            distress_values=[0.3, 0.4, 0.5, 0.6, 0.7],
            mean_distress=0.5,
            slope=slope,
            max_distress=0.7,
            elevated_count=2,
            trajectory_label=label,
            severity_score=severity,
            confidence=0.8,
            contributing_features=[
                {"metric": "time_to_answer", "z_score": 2.1, "raw_value": 7.5},
                {"metric": "skip_rate", "z_score": 1.8, "raw_value": 0.4},
            ],
            contributing_topics=["sleep", "safety"],
        )

    @pytest.mark.asyncio
    async def test_payload_has_required_fields(self):
        analysis = self._make_analysis()
        payload = await build_alert_payload("s1", "c1", analysis)

        assert payload["survivor_id"] == "s1"
        assert payload["counselor_id"] == "c1"
        assert payload["alert_type"] == "escalating"
        assert "trend_summary" in payload
        assert "severity_score" in payload
        assert "confidence" in payload
        assert "contributing_topics" in payload
        assert "feature_details" in payload
        assert "recommended_response" in payload
        # LLM report fields
        assert "overall_status" in payload
        assert "answering_patterns" in payload
        assert "topic_breakdown" in payload
        assert "key_patterns" in payload

    @pytest.mark.asyncio
    async def test_payload_includes_feature_interpretations(self):
        analysis = self._make_analysis()
        payload = await build_alert_payload("s1", "c1", analysis)

        features = payload["feature_details"]
        assert len(features) > 0
        assert features[0]["metric"] == "time_to_answer"
        assert "interpretation" in features[0]

    @pytest.mark.asyncio
    async def test_payload_with_topic_sensitivities(self):
        analysis = self._make_analysis()
        topics = {
            "sleep": TopicActivation("sleep", 0.82, 10, 2.1, True),
            "safety": TopicActivation("safety", 0.71, 10, 1.8, True),
            "food": TopicActivation("food", 0.25, 10, 0.5, False),
        }
        payload = await build_alert_payload("s1", "c1", analysis, topics)

        topic_details = payload["topic_details"]
        topic_names = [t["topic"] for t in topic_details]
        assert "sleep" in topic_names
        assert "safety" in topic_names
        assert "food" not in topic_names

    @pytest.mark.asyncio
    async def test_acute_payload_urgency(self):
        analysis = self._make_analysis(label="acute", severity=0.85)
        payload = await build_alert_payload("s1", "c1", analysis)
        assert payload["urgency"] == "critical"

    @pytest.mark.asyncio
    async def test_escalating_high_severity_urgency(self):
        analysis = self._make_analysis(label="escalating", severity=0.75)
        payload = await build_alert_payload("s1", "c1", analysis)
        assert payload["urgency"] == "high"

    @pytest.mark.asyncio
    async def test_escalating_medium_severity_urgency(self):
        analysis = self._make_analysis(label="escalating", severity=0.5)
        payload = await build_alert_payload("s1", "c1", analysis)
        assert payload["urgency"] == "medium"

    @pytest.mark.asyncio
    async def test_recommended_response_for_immediate(self):
        analysis = self._make_analysis(label="acute", severity=0.9)
        payload = await build_alert_payload("s1", "c1", analysis)
        assert "IMMEDIATE" in payload["recommended_response"]
        assert "1 hour" in payload["recommended_response"]

    @pytest.mark.asyncio
    async def test_recommended_response_for_alert(self):
        analysis = self._make_analysis(label="escalating", severity=0.6)
        payload = await build_alert_payload("s1", "c1", analysis)
        assert "24 hours" in payload["recommended_response"]

    @pytest.mark.asyncio
    async def test_recommended_response_for_self_resource(self):
        analysis = self._make_analysis(label="declining", severity=0.3)
        payload = await build_alert_payload("s1", "c1", analysis)
        assert "encouraging" in payload["recommended_response"].lower()


class TestInterpretMetric:
    """Test metric interpretation strings."""

    def test_time_to_answer_above(self):
        result = _interpret_metric("time_to_answer", 2.5)
        assert "above" in result
        assert "response timing" in result

    def test_skip_rate_below(self):
        result = _interpret_metric("skip_rate", -1.5)
        assert "below" in result
        assert "skipped" in result

    def test_voice_pitch(self):
        result = _interpret_metric("voice_pitch_variability", 2.0)
        assert "pitch" in result

    def test_magnitude_labels(self):
        assert "significantly" in _interpret_metric("time_to_answer", 3.0)
        assert "moderately" in _interpret_metric("time_to_answer", 1.5)
        assert "slightly" in _interpret_metric("time_to_answer", 0.5)


class TestDescribeTopicActivation:
    """Test topic activation descriptions."""

    def test_strong_activation(self):
        ta = TopicActivation("sleep", 0.85, 10, 2.5, True)
        desc = _describe_topic_activation("sleep", ta)
        assert "Strongly" in desc or "strongly" in desc

    def test_consistent_activation(self):
        ta = TopicActivation("safety", 0.65, 10, 1.9, True)
        desc = _describe_topic_activation("safety", ta)
        assert "Consistently" in desc or "consistently" in desc

    def test_normal_activation(self):
        ta = TopicActivation("food", 0.2, 10, 0.5, False)
        desc = _describe_topic_activation("food", ta)
        assert "Normal" in desc or "normal" in desc


class TestDetermineUrgency:
    """Test urgency classification."""

    def test_acute_is_critical(self):
        analysis = TrendAnalysis([], 0.8, 0.2, 0.9, 4, "acute", 0.85, 0.8, [], [])
        assert _determine_urgency(analysis) == "critical"

    def test_escalating_high_severity(self):
        analysis = TrendAnalysis([], 0.7, 0.15, 0.8, 3, "escalating", 0.75, 0.8, [], [])
        assert _determine_urgency(analysis) == "high"

    def test_escalating_medium_severity(self):
        analysis = TrendAnalysis([], 0.5, 0.1, 0.6, 2, "escalating", 0.5, 0.8, [], [])
        assert _determine_urgency(analysis) == "medium"

    def test_declining_is_low(self):
        analysis = TrendAnalysis([], 0.3, -0.1, 0.4, 1, "declining", 0.2, 0.8, [], [])
        assert _determine_urgency(analysis) == "low"

    def test_stable_is_info(self):
        analysis = TrendAnalysis([], 0.1, 0.0, 0.15, 0, "stable", 0.1, 0.9, [], [])
        assert _determine_urgency(analysis) == "info"
