"""LLM-Powered Counselor Case Report Generator.

Takes ALL survivor data — trajectory, topic sensitivities, question-level
reactions, trend history, baseline comparisons — and generates a
comprehensive case report for the counselor dashboard.

WHAT THE COUNSELOR SEES:
========================
1. Overall Status — trajectory + plain-language risk level
2. Answering Patterns — how this person responds to questions:
   - Time-to-answer trends (getting slower? faster? inconsistent?)
   - Skip patterns (which topics do they avoid?)
   - Revision behavior (do they change their mind often?)
3. Topic-by-Topic Breakdown — for EACH topic tag:
   - Current activation level vs their own baseline
   - Trend over the analysis window
   - What this might mean (without clinical labels)
4. Trend History — how patterns have shifted over time
5. Key Behavioral Patterns — the most notable changes
6. Recommended Focus — what to explore in conversation
7. Conversation Starters — trauma-informed opening questions

ETHICAL CONSTRAINTS:
===================
- NEVER use clinical diagnostic labels (depressed, anxious, PTSD)
- Describe BEHAVIORAL PATTERNS, not mental states
- "Response patterns show X" NOT "the person is feeling Y"
- Focus on what the counselor CAN DO
- This is a support tool, not a diagnosis tool

CLINICAL NOTE:
=============
The LLM prompt templates here are for prototyping.
Every template MUST be reviewed by trauma-informed clinicians
before deployment with real survivors.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.config import settings
from app.engine.deviation import TrendAnalysis, ZScoreResult
from app.engine.topic_sensitivity import TopicActivation, get_high_activation_topics

logger = logging.getLogger(__name__)


# ─── Prompt Templates ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a trauma-informed support assistant generating detailed counselor case reports for a mental health support system.

CRITICAL RULES:
1. You are NOT a diagnostic tool. You describe BEHAVIORAL PATTERNS, not mental states.
2. NEVER use clinical labels: do NOT say "depressed", "anxious", "PTSD", "suicidal", "mental illness", etc.
3. Describe OBSERVABLE PATTERNS in the survivor's response behavior.
4. Focus on WHAT THE COUNSELOR CAN DO, not on interpreting the survivor's inner state.
5. Be warm but professional. This report goes to a trained counselor.
6. If severity is high, convey urgency without causing alarm.
7. Never reference raw z-scores or statistical measures — translate them into plain language.
8. Use the survivor's OWN baseline as the frame of reference, not population norms.
9. Frame everything as "compared to their own normal" not "compared to average people".

OUTPUT FORMAT — Return a JSON object:
{
  "overall_status": "A concise 1-2 sentence overall assessment",
  "risk_level_plain_language": "low / moderate / elevated / high / critical",

  "answering_patterns": {
    "response_timing": "How their answer speed has changed...",
    "skip_behavior": "Which topics they skip and how often...",
    "revision_behavior": "How often they change answers and what that suggests...",
    "engagement_level": "Overall engagement with the check-in process..."
  },

  "topic_breakdown": [
    {
      "topic": "topic_name",
      "status": "stable / elevated / strongly_elevated / improving",
      "detail": "How this topic's response pattern compares to their baseline...",
      "trend": "improving / worsening / stable",
      "counselor_note": "What to be aware of for this topic..."
    }
  ],

  "trend_history": "A narrative of how patterns have changed over the analysis window...",

  "key_patterns": [
    "Most notable pattern 1",
    "Most notable pattern 2",
    "Most notable pattern 3"
  ],

  "protective_factors": [
    "Something positive or stable about their patterns"
  ],

  "recommended_focus_areas": [
    "Topic or area the counselor should explore"
  ],

  "conversation_starters": [
    "A trauma-informed opening question the counselor could use"
  ],

  "important_context": "Any other relevant context for the counselor..."
}
"""

USER_PROMPT_TEMPLATE = """Generate a detailed counselor case report for this survivor:

═══════════════════════════════════════════════════════════════
OVERALL STATUS
═══════════════════════════════════════════════════════════════
Trajectory: {trajectory_label}
Severity: {severity_score} (0 = at their baseline, 1 = maximum deviation)
Confidence: {confidence} (how reliable this assessment is)
Analysis window: Last {window_size} check-ins

═══════════════════════════════════════════════════════════════
BEHAVIORAL SIGNAL CHANGES (compared to their personal baseline)
═══════════════════════════════════════════════════════════════
{feature_details}

═══════════════════════════════════════════════════════════════
TOPIC-BY-TOPIC ACTIVATION (how each topic area compares to their baseline)
═══════════════════════════════════════════════════════════════
{topic_details}

═══════════════════════════════════════════════════════════════
TREND OVER TIME
═══════════════════════════════════════════════════════════════
Direction: {trend_direction}
Rate of change: {slope} (positive = signals increasing, negative = decreasing)
Distress index values over window: {distress_values}

═══════════════════════════════════════════════════════════════
BASELINE REFERENCE
═══════════════════════════════════════════════════════════════
{baseline_details}

Generate a comprehensive, trauma-informed case report. Be specific about what has changed, what is stable, and what the counselor should focus on."""


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class TopicBreakdown:
    """Detailed breakdown for a single topic."""
    topic: str
    status: str           # stable / elevated / strongly_elevated / improving
    detail: str
    trend: str            # improving / worsening / stable
    counselor_note: str


@dataclass
class AnsweringPatterns:
    """How the survivor answers questions."""
    response_timing: str = ""
    skip_behavior: str = ""
    revision_behavior: str = ""
    engagement_level: str = ""


@dataclass
class CounselorCaseReport:
    """Full case report for the counselor dashboard."""
    overall_status: str = ""
    risk_level_plain_language: str = "unknown"
    answering_patterns: AnsweringPatterns = field(default_factory=AnsweringPatterns)
    topic_breakdown: list[TopicBreakdown] = field(default_factory=list)
    trend_history: str = ""
    key_patterns: list[str] = field(default_factory=list)
    protective_factors: list[str] = field(default_factory=list)
    recommended_focus_areas: list[str] = field(default_factory=list)
    conversation_starters: list[str] = field(default_factory=list)
    important_context: str = ""
    provider: str = "rule_based"
    raw_response: str = ""


# ─── Provider Calls ───────────────────────────────────────────────────────────

async def _call_openai(system_prompt: str, user_prompt: str) -> str:
    """Call OpenAI API."""
    import httpx

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise ValueError("No OpenAI API key configured")

    model = settings.LLM_MODEL or "gpt-4o"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 2000,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def _call_anthropic(system_prompt: str, user_prompt: str) -> str:
    """Call Anthropic API."""
    import httpx

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise ValueError("No Anthropic API key configured")

    model = settings.LLM_MODEL or "claude-3-5-sonnet-20241022"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 2000,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]


# ─── Prompt Builder ───────────────────────────────────────────────────────────

def _build_user_prompt(
    analysis: TrendAnalysis,
    topic_sensitivities: dict[str, TopicActivation] | None,
    baseline_summary: dict | None = None,
) -> str:
    """Build the detailed user prompt from all available data."""

    # ── Feature details (behavioral signals) ──
    feature_lines = []
    for fc in analysis.contributing_features[:8]:
        metric_name = fc["metric"].replace("_", " ")
        z = fc["z_score"]
        raw = fc["raw_value"]

        if abs(z) > 2:
            magnitude = "strongly"
        elif abs(z) > 1:
            magnitude = "moderately"
        else:
            magnitude = "slightly"

        direction = "above" if z > 0 else "below"
        feature_lines.append(
            f"- {metric_name}: {magnitude} {direction} their personal baseline "
            f"(current: {raw:.2f}, their normal: ±1σ range)"
        )
    feature_details = "\n".join(feature_lines) if feature_lines else "No notable signal changes."

    # ── Topic details ──
    topic_lines = []
    if topic_sensitivities:
        for topic, ta in sorted(
            topic_sensitivities.items(),
            key=lambda x: x[1].activation_score,
            reverse=True,
        ):
            topic_name = topic.replace("_", " ")
            score = ta.activation_score

            if score > 0.8:
                status = "STRONGLY ELEVATED"
            elif score > 0.6:
                status = "elevated"
            elif score > 0.4:
                status = "moderately elevated"
            elif score > 0.2:
                status = "slightly elevated"
            else:
                status = "within normal range"

            trend = "worsening" if score > 0.6 else "stable"
            topic_lines.append(
                f"- {topic_name}: {status} "
                f"(activation: {score:.0%}, based on {ta.sample_count} data points, "
                f"avg deviation: {ta.avg_z_score:.1f}σ)"
            )
    topic_details = "\n".join(topic_lines) if topic_lines else "No topic data available."

    # ── Trend direction ──
    if analysis.slope > 0.05:
        trend_direction = "WORSENING — distress signals are increasing over time"
    elif analysis.slope < -0.05:
        trend_direction = "IMPROVING — distress signals are decreasing over time"
    else:
        trend_direction = "STABLE — no significant change in distress signals"

    # ── Baseline details ──
    baseline_lines = []
    if baseline_summary:
        for metric, stats in baseline_summary.items():
            metric_name = metric.replace("_", " ")
            baseline_lines.append(
                f"- {metric_name}: their normal range is "
                f"{stats.get('mean', 0):.2f} ± {stats.get('std', 0):.2f} "
                f"(based on {stats.get('samples', '?')} check-ins)"
            )
    baseline_details = "\n".join(baseline_lines) if baseline_lines else "Baseline data not yet available."

    # ── Distress values ──
    distress_str = ", ".join(f"{v:.2f}" for v in analysis.distress_values)

    return USER_PROMPT_TEMPLATE.format(
        trajectory_label=analysis.trajectory_label.upper(),
        severity_score=f"{analysis.severity_score:.0%}",
        confidence=f"{analysis.confidence:.0%}",
        window_size=len(analysis.distress_values),
        feature_details=feature_details,
        topic_details=topic_details,
        trend_direction=trend_direction,
        slope=f"{analysis.slope:+.3f}",
        distress_values=distress_str,
        baseline_details=baseline_details,
    )


# ─── Response Parser ──────────────────────────────────────────────────────────

def _parse_llm_response(raw: str) -> CounselorCaseReport:
    """Parse LLM JSON response into structured case report."""
    try:
        data = json.loads(raw)

        # Parse topic breakdown
        topic_breakdown = []
        for tb in data.get("topic_breakdown", []):
            topic_breakdown.append(TopicBreakdown(
                topic=tb.get("topic", ""),
                status=tb.get("status", "unknown"),
                detail=tb.get("detail", ""),
                trend=tb.get("trend", "stable"),
                counselor_note=tb.get("counselor_note", ""),
            ))

        # Parse answering patterns
        ap = data.get("answering_patterns", {})
        answering_patterns = AnsweringPatterns(
            response_timing=ap.get("response_timing", ""),
            skip_behavior=ap.get("skip_behavior", ""),
            revision_behavior=ap.get("revision_behavior", ""),
            engagement_level=ap.get("engagement_level", ""),
        )

        return CounselorCaseReport(
            overall_status=data.get("overall_status", ""),
            risk_level_plain_language=data.get("risk_level_plain_language", "unknown"),
            answering_patterns=answering_patterns,
            topic_breakdown=topic_breakdown,
            trend_history=data.get("trend_history", ""),
            key_patterns=data.get("key_patterns", []),
            protective_factors=data.get("protective_factors", []),
            recommended_focus_areas=data.get("recommended_focus_areas", []),
            conversation_starters=data.get("conversation_starters", []),
            important_context=data.get("important_context", ""),
            raw_response=raw,
        )
    except (json.JSONDecodeError, KeyError) as e:
        logger.warning(f"Failed to parse LLM response: {e}")
        # Return raw text as narrative
        return CounselorCaseReport(
            overall_status=raw[:500] if len(raw) > 500 else raw,
            raw_response=raw,
        )


# ─── Rule-Based Fallback ─────────────────────────────────────────────────────

def _build_rule_based_report(
    analysis: TrendAnalysis,
    topic_sensitivities: dict[str, TopicActivation] | None,
    baseline_summary: dict | None = None,
) -> CounselorCaseReport:
    """Generate a comprehensive rule-based report when LLM is unavailable.

    This is the FALLBACK — still detailed and trauma-informed,
    just generated from templates rather than an LLM.
    """
    label = analysis.trajectory_label
    severity = analysis.severity_score
    n = len(analysis.distress_values)

    # ── Overall status ──
    if label == "acute":
        overall = (
            f"Critical: Over the last {n} check-ins, response patterns show "
            f"significant deviation ({severity:.0%} severity) from this person's "
            f"established baseline. Immediate outreach recommended."
        )
    elif label == "escalating":
        overall = (
            f"Escalating: Over the last {n} check-ins, response patterns show "
            f"an upward trend ({severity:.0%} severity) compared to their baseline. "
            f"Review recommended within 24 hours."
        )
    elif label == "declining":
        overall = (
            f"Improving: Over the last {n} check-ins, response patterns are "
            f"trending toward their established baseline ({severity:.0%} severity). "
            f"Current approach appears to be helping."
        )
    else:
        overall = (
            f"Stable: Response patterns remain within this person's normal range "
            f"({severity:.0%} severity) over the last {n} check-ins."
        )

    # ── Answering patterns ──
    features = {fc["metric"]: fc for fc in analysis.contributing_features}

    timing = features.get("time_to_answer")
    if timing:
        if timing["z_score"] > 1.5:
            response_timing = (
                f"Response times have increased notably compared to their baseline. "
                f"They are taking longer to answer questions, which may indicate "
                f"increased difficulty with the content."
            )
        elif timing["z_score"] < -1.5:
            response_timing = (
                f"Response times have decreased — they are answering faster than their "
                f"baseline. This could indicate disengagement or rushing through questions."
            )
        else:
            response_timing = "Response timing is within their normal range."
    else:
        response_timing = "No response timing data available."

    skip = features.get("skip_rate")
    if skip:
        if skip["z_score"] > 1.5:
            skip_behavior = (
                f"Skip rate is elevated compared to their baseline. They are "
                f"skipping more questions than usual, which may indicate difficulty "
                f"engaging with certain topics."
            )
        elif skip["z_score"] < -1.5:
            skip_behavior = (
                f"Skip rate has decreased — they are answering more questions "
                f"than usual, which may indicate increased engagement."
            )
        else:
            skip_behavior = "Skip rate is within their normal range."
    else:
        skip_behavior = "No skip data available."

    revision = features.get("revision_count")
    if revision:
        if revision["z_score"] > 1.5:
            revision_behavior = (
                f"Answer revision rate is elevated — they are changing their "
                f"answers more frequently than usual, which may indicate "
                f"uncertainty or internal conflict about certain topics."
            )
        else:
            revision_behavior = "Revision rate is within their normal range."
    else:
        revision_behavior = "No revision data available."

    # Engagement
    elevated_count = sum(1 for fc in analysis.contributing_features if abs(fc["z_score"]) > 1)
    total_features = len(analysis.contributing_features) or 1
    engagement_ratio = elevated_count / total_features
    if engagement_ratio > 0.6:
        engagement = "Multiple signals are elevated — overall engagement pattern has shifted."
    elif engagement_ratio < 0.2:
        engagement = "Most signals are within normal range — engagement appears stable."
    else:
        engagement = "Some signals are elevated — mixed engagement pattern."

    answering = AnsweringPatterns(
        response_timing=response_timing,
        skip_behavior=skip_behavior,
        revision_behavior=revision_behavior,
        engagement_level=engagement,
    )

    # ── Topic breakdown ──
    topic_breakdown = []
    if topic_sensitivities:
        for topic, ta in sorted(
            topic_sensitivities.items(),
            key=lambda x: x[1].activation_score,
            reverse=True,
        ):
            score = ta.activation_score
            if score > 0.8:
                status = "strongly_elevated"
                detail = (
                    f"Response patterns for {topic.replace('_', ' ')} questions "
                    f"are strongly elevated ({score:.0%} activation). This topic "
                    f"consistently triggers reactions significantly different from "
                    f"their baseline."
                )
                counselor_note = (
                    f"Consider exploring {topic.replace('_', ' ')} with care. "
                    f"This topic shows sustained activation."
                )
            elif score > 0.6:
                status = "elevated"
                detail = (
                    f"Response patterns for {topic.replace('_', ' ')} questions "
                    f"are elevated ({score:.0%} activation) compared to their baseline."
                )
                counselor_note = f"Worth exploring {topic.replace('_', ' ')} in conversation."
            elif score > 0.4:
                status = "moderately_elevated"
                detail = (
                    f"Response patterns for {topic.replace('_', ' ')} questions "
                    f"show moderate elevation ({score:.0%} activation)."
                )
                counselor_note = f"Monitor {topic.replace('_', ' ')} — may need attention."
            elif score > 0.2:
                status = "slightly_elevated"
                detail = (
                    f"Response patterns for {topic.replace('_', ' ')} questions "
                    f"are slightly above their baseline ({score:.0%} activation)."
                )
                counselor_note = ""
            else:
                status = "stable"
                detail = (
                    f"Response patterns for {topic.replace('_', ' ')} questions "
                    f"are within their normal range ({score:.0%} activation)."
                )
                counselor_note = ""

            trend = "worsening" if score > 0.6 else "improving" if score < 0.2 else "stable"

            topic_breakdown.append(TopicBreakdown(
                topic=topic,
                status=status,
                detail=detail,
                trend=trend,
                counselor_note=counselor_note,
            ))

    # ── Trend history ──
    if analysis.slope > 0.05:
        trend_history = (
            f"Over the analysis window, distress indicators have been trending "
            f"upward. The rate of change ({analysis.slope:+.3f}) suggests a "
            f"{'gradual' if analysis.slope < 0.1 else 'notable'} increase in "
            f"deviation from baseline."
        )
    elif analysis.slope < -0.05:
        trend_history = (
            f"Over the analysis window, distress indicators have been trending "
            f"downward. The rate of change ({analysis.slope:+.3f}) suggests "
            f"improvement toward their baseline."
        )
    else:
        trend_history = (
            f"The analysis window shows relatively stable patterns with minimal "
            f"change (slope: {analysis.slope:+.3f})."
        )

    # ── Key patterns ──
    key_patterns = []
    for fc in analysis.contributing_features[:4]:
        metric = fc["metric"].replace("_", " ")
        if fc["z_score"] > 2:
            key_patterns.append(f"{metric} is strongly elevated above their baseline")
        elif fc["z_score"] > 1:
            key_patterns.append(f"{metric} is moderately elevated above their baseline")
        elif fc["z_score"] < -2:
            key_patterns.append(f"{metric} is strongly below their baseline")
        elif fc["z_score"] < -1:
            key_patterns.append(f"{metric} is moderately below their baseline")

    # ── Protective factors ──
    protective = []
    if label == "declining":
        protective.append("Response patterns are trending toward their baseline — current support may be effective")
    stable_features = [fc for fc in analysis.contributing_features if abs(fc["z_score"]) < 0.5]
    if stable_features:
        names = [fc["metric"].replace("_", " ") for fc in stable_features[:2]]
        protective.append(f"{', '.join(names)} remain stable within their normal range")
    if not protective:
        protective.append("Baseline is well-established with sufficient data points")

    # ── Focus areas ──
    focus = []
    if topic_sensitivities:
        high = get_high_activation_topics(topic_sensitivities, threshold=0.5)
        focus = [t.replace("_", " ") for t in high[:3]]
    if not focus and analysis.contributing_features:
        top = analysis.contributing_features[0]["metric"].replace("_", " ")
        focus = [top]

    # ── Conversation starters ──
    if label in ("acute", "escalating"):
        starters = [
            "How have things been going for you since we last talked?",
            "Is there anything that's been on your mind lately?",
            "I wanted to check in — how are you doing today?",
        ]
    elif label == "declining":
        starters = [
            "It seems like things have been a bit easier recently — would you say that's true?",
            "What has been helping you lately?",
            "You've been making progress — what do you think has been most helpful?",
        ]
    else:
        starters = [
            "How are you doing today?",
            "Is there anything you'd like to talk about?",
            "How have the check-ins been feeling for you?",
        ]

    # ── Risk level ──
    risk_map = {
        "acute": "critical",
        "escalating": "elevated" if severity > 0.6 else "moderate",
        "declining": "low",
        "stable": "low",
    }

    # ── Important context ──
    context = (
        f"Analysis based on {n} check-ins. "
        f"Confidence: {analysis.confidence:.0%}. "
    )
    if analysis.confidence < 0.6:
        context += "Low confidence — more data points would improve assessment accuracy. "
    context += (
        "All patterns are compared to this person's OWN baseline, not population norms. "
        "This report describes behavioral patterns, not diagnoses."
    )

    return CounselorCaseReport(
        overall_status=overall,
        risk_level_plain_language=risk_map.get(label, "unknown"),
        answering_patterns=answering,
        topic_breakdown=topic_breakdown,
        trend_history=trend_history,
        key_patterns=key_patterns,
        protective_factors=protective,
        recommended_focus_areas=focus,
        conversation_starters=starters,
        important_context=context,
        provider="rule_based",
    )


# ─── Public API ───────────────────────────────────────────────────────────────

async def generate_counselor_report(
    analysis: TrendAnalysis,
    topic_sensitivities: dict[str, TopicActivation] | None = None,
    baseline_summary: dict | None = None,
) -> CounselorCaseReport:
    """Generate a comprehensive counselor case report.

    Tries LLM first (OpenAI or Anthropic), falls back to rule-based.

    Args:
        analysis: The trend analysis for this check-in window.
        topic_sensitivities: Topic-level activation scores.
        baseline_summary: Survivor's personal baseline stats per metric.

    Returns:
        CounselorCaseReport with full narrative, patterns, and recommendations.
    """
    system_prompt = SYSTEM_PROMPT
    user_prompt = _build_user_prompt(analysis, topic_sensitivities, baseline_summary)

    # Try LLM providers in order
    providers = []
    if settings.OPENAI_API_KEY:
        providers.append(("openai", _call_openai))
    if settings.ANTHROPIC_API_KEY:
        providers.append(("anthropic", _call_anthropic))

    for provider_name, provider_fn in providers:
        try:
            raw = await provider_fn(system_prompt, user_prompt)
            report = _parse_llm_response(raw)
            report.provider = provider_name
            logger.info(f"Counselor report generated via {provider_name}")
            return report
        except Exception as e:
            logger.warning(f"LLM provider {provider_name} failed: {e}")
            continue

    # Fallback to rule-based
    logger.info("Using rule-based counselor report (no LLM available)")
    return _build_rule_based_report(analysis, topic_sensitivities, baseline_summary)
