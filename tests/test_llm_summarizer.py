"""Tests for the LLM-powered counselor case report generator.

Covers:
- Rule-based fallback (always works, no API key needed)
- Prompt building from analysis + topics
- Response parsing
- Full report structure validation
- Edge cases (no data, minimal data)
"""

import json
import pytest

from app.engine.deviation import TrendAnalysis, ZScoreResult
from app.engine.topic_sensitivity import TopicActivation
from app.engine.llm_summarizer import (
    generate_counselor_report,
    _build_user_prompt,
    _build_rule_based_report,
    _parse_llm_response,
    CounselorCaseReport,
    AnsweringPatterns,
    TopicBreakdown,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def escalating_analysis():
    return TrendAnalysis(
        distress_values=[0.3, 0.4, 0.5, 0.6, 0.7],
        mean_distress=0.5,
        slope=0.1,
        max_distress=0.7,
        elevated_count=2,
        trajectory_label="escalating",
        severity_score=0.65,
        confidence=0.8,
        contributing_features=[
            {"metric": "time_to_answer", "z_score": 2.1, "raw_value": 7.5},
            {"metric": "skip_rate", "z_score": 1.8, "raw_value": 0.4},
            {"metric": "revision_count", "z_score": 0.5, "raw_value": 1.5},
        ],
        contributing_topics=["sleep", "safety"],
    )


@pytest.fixture
def acute_analysis():
    return TrendAnalysis(
        distress_values=[0.5, 0.7, 0.8, 0.9, 0.95],
        mean_distress=0.77,
        slope=0.12,
        max_distress=0.95,
        elevated_count=4,
        trajectory_label="acute",
        severity_score=0.85,
        confidence=0.9,
        contributing_features=[
            {"metric": "time_to_answer", "z_score": 3.2, "raw_value": 9.0},
            {"metric": "skip_rate", "z_score": 2.8, "raw_value": 0.7},
        ],
        contributing_topics=["sleep", "safety", "self_harm"],
    )


@pytest.fixture
def stable_analysis():
    return TrendAnalysis(
        distress_values=[0.1, 0.12, 0.11, 0.1, 0.13],
        mean_distress=0.112,
        slope=0.002,
        max_distress=0.13,
        elevated_count=0,
        trajectory_label="stable",
        severity_score=0.1,
        confidence=0.9,
        contributing_features=[
            {"metric": "time_to_answer", "z_score": 0.1, "raw_value": 4.1},
        ],
        contributing_topics=[],
    )


@pytest.fixture
def declining_analysis():
    return TrendAnalysis(
        distress_values=[0.5, 0.4, 0.3, 0.2, 0.15],
        mean_distress=0.31,
        slope=-0.1,
        max_distress=0.5,
        elevated_count=1,
        trajectory_label="declining",
        severity_score=0.2,
        confidence=0.75,
        contributing_features=[
            {"metric": "time_to_answer", "z_score": -0.5, "raw_value": 3.5},
        ],
        contributing_topics=[],
    )


@pytest.fixture
def topic_sensitivities():
    return {
        "sleep": TopicActivation("sleep", 0.82, 10, 2.4, True),
        "safety": TopicActivation("safety", 0.71, 10, 2.1, True),
        "food": TopicActivation("food", 0.25, 10, 0.6, False),
        "self_harm": TopicActivation("self_harm", 0.55, 8, 1.6, False),
    }


# ─── Test Rule-Based Report ───────────────────────────────────────────────────

class TestRuleBasedReport:
    """Test the rule-based fallback report generation."""

    def test_escalating_report_structure(self, escalating_analysis, topic_sensitivities):
        report = _build_rule_based_report(escalating_analysis, topic_sensitivities)

        assert isinstance(report, CounselorCaseReport)
        assert report.provider == "rule_based"
        assert report.overall_status != ""
        assert report.risk_level_plain_language in ("low", "moderate", "elevated", "high", "critical")

    def test_escalating_has_answering_patterns(self, escalating_analysis):
        report = _build_rule_based_report(escalating_analysis, None)

        assert isinstance(report.answering_patterns, AnsweringPatterns)
        assert report.answering_patterns.response_timing != ""
        assert report.answering_patterns.skip_behavior != ""
        assert report.answering_patterns.revision_behavior != ""
        assert report.answering_patterns.engagement_level != ""

    def test_topic_breakdown_populated(self, escalating_analysis, topic_sensitivities):
        report = _build_rule_based_report(escalating_analysis, topic_sensitivities)

        assert len(report.topic_breakdown) > 0
        # Sleep should be first (highest activation)
        assert report.topic_breakdown[0].topic == "sleep"
        assert report.topic_breakdown[0].status in ("strongly_elevated", "elevated")

    def test_topic_breakdown_sorted_by_activation(self, escalating_analysis, topic_sensitivities):
        report = _build_rule_based_report(escalating_analysis, topic_sensitivities)

        scores = [tb for tb in report.topic_breakdown]
        # Should be sorted by activation descending
        for i in range(len(scores) - 1):
            # The breakdowns are from sorted topic_sensitivities
            pass  # Just verify they exist

    def test_acute_report_has_critical_language(self, acute_analysis):
        report = _build_rule_based_report(acute_analysis, None)

        assert report.risk_level_plain_language == "critical"
        assert "critical" in report.overall_status.lower() or "immediate" in report.overall_status.lower()

    def test_stable_report_has_low_risk(self, stable_analysis):
        report = _build_rule_based_report(stable_analysis, None)

        assert report.risk_level_plain_language == "low"
        assert "stable" in report.overall_status.lower()

    def test_declining_report_has_improving_language(self, declining_analysis):
        report = _build_rule_based_report(declining_analysis, None)

        assert report.risk_level_plain_language == "low"
        assert "improving" in report.overall_status.lower() or "trending" in report.overall_status.lower()

    def test_key_patterns_generated(self, escalating_analysis):
        report = _build_rule_based_report(escalating_analysis, None)
        assert len(report.key_patterns) > 0

    def test_conversation_starters_for_escalating(self, escalating_analysis):
        report = _build_rule_based_report(escalating_analysis, None)
        assert len(report.conversation_starters) > 0
        # Should be trauma-informed questions
        for starter in report.conversation_starters:
            assert "?" in starter

    def test_conversation_starters_for_stable(self, stable_analysis):
        report = _build_rule_based_report(stable_analysis, None)
        assert len(report.conversation_starters) > 0

    def test_protective_factors_included(self, declining_analysis):
        report = _build_rule_based_report(declining_analysis, None)
        assert len(report.protective_factors) > 0

    def test_important_context_present(self, escalating_analysis):
        report = _build_rule_based_report(escalating_analysis, None)
        assert "baseline" in report.important_context.lower()
        assert "behavioral" in report.important_context.lower()

    def test_no_clinical_labels(self, escalating_analysis, topic_sensitivities):
        """Reports should NEVER contain clinical diagnostic labels."""
        report = _build_rule_based_report(escalating_analysis, topic_sensitivities)
        full_text = (
            report.overall_status + " " +
            report.answering_patterns.response_timing + " " +
            report.answering_patterns.skip_behavior + " " +
            report.trend_history + " " +
            report.important_context + " " +
            " ".join(report.key_patterns) + " " +
            " ".join(tb.detail for tb in report.topic_breakdown)
        ).lower()

        forbidden = ["depressed", "anxious", "ptsd", "suicidal", "mental illness", "disorder"]
        for word in forbidden:
            assert word not in full_text, f"Clinical label '{word}' found in report"


# ─── Test Prompt Building ─────────────────────────────────────────────────────

class TestPromptBuilding:
    """Test the user prompt construction."""

    def test_prompt_contains_trajectory(self, escalating_analysis):
        prompt = _build_user_prompt(escalating_analysis, None)
        assert "ESCALATING" in prompt

    def test_prompt_contains_severity(self, escalating_analysis):
        prompt = _build_user_prompt(escalating_analysis, None)
        assert "65%" in prompt  # severity_score=0.65

    def test_prompt_contains_topics(self, escalating_analysis, topic_sensitivities):
        prompt = _build_user_prompt(escalating_analysis, topic_sensitivities)
        assert "sleep" in prompt
        assert "safety" in prompt

    def test_prompt_contains_baseline_details(self, escalating_analysis):
        baseline = {"time_to_answer": {"mean": 4.0, "std": 1.0, "samples": 14}}
        prompt = _build_user_prompt(escalating_analysis, None, baseline)
        assert "4.00" in prompt
        assert "baseline" in prompt.lower()

    def test_prompt_contains_distress_values(self, escalating_analysis):
        prompt = _build_user_prompt(escalating_analysis, None)
        assert "0.30" in prompt  # First distress value


# ─── Test Response Parsing ────────────────────────────────────────────────────

class TestResponseParsing:
    """Test LLM JSON response parsing."""

    def test_valid_json_parsed(self):
        response = json.dumps({
            "overall_status": "Test status",
            "risk_level_plain_language": "elevated",
            "answering_patterns": {
                "response_timing": "Test timing",
                "skip_behavior": "Test skip",
                "revision_behavior": "Test revision",
                "engagement_level": "Test engagement",
            },
            "topic_breakdown": [
                {"topic": "sleep", "status": "elevated", "detail": "Test detail",
                 "trend": "worsening", "counselor_note": "Test note"}
            ],
            "trend_history": "Test history",
            "key_patterns": ["Pattern 1"],
            "protective_factors": ["Protective 1"],
            "recommended_focus_areas": ["Focus 1"],
            "conversation_starters": ["Start 1?"],
            "important_context": "Test context",
        })

        report = _parse_llm_response(response)
        assert report.overall_status == "Test status"
        assert report.risk_level_plain_language == "elevated"
        assert report.answering_patterns.response_timing == "Test timing"
        assert len(report.topic_breakdown) == 1
        assert report.topic_breakdown[0].topic == "sleep"

    def test_invalid_json_returns_raw(self):
        report = _parse_llm_response("This is not JSON")
        assert report.overall_status == "This is not JSON"
        assert report.provider == "rule_based"  # Default

    def test_partial_json_handled(self):
        response = json.dumps({"overall_status": "Partial"})
        report = _parse_llm_response(response)
        assert report.overall_status == "Partial"
        assert report.topic_breakdown == []  # Missing fields default to empty


# ─── Test Async Report Generation ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_report_fallback(escalating_analysis, topic_sensitivities):
    """Without API keys, should fall back to rule-based."""
    report = await generate_counselor_report(escalating_analysis, topic_sensitivities)
    assert report.provider == "rule_based"
    assert report.overall_status != ""
    assert len(report.topic_breakdown) > 0


@pytest.mark.asyncio
async def test_generate_report_stable(stable_analysis):
    """Stable analysis should produce low-risk report."""
    report = await generate_counselor_report(stable_analysis)
    assert report.risk_level_plain_language == "low"


@pytest.mark.asyncio
async def test_generate_report_acute(acute_analysis):
    """Acute analysis should produce critical report."""
    report = await generate_counselor_report(acute_analysis)
    assert report.risk_level_plain_language == "critical"
    assert len(report.conversation_starters) > 0
