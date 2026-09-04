"""Stage 6: Escalation Logic.

Maps trajectory labels + severity scores to tiered actions:

  TRAJECTORY     → ACTION
  ─────────────────────────────────────────────────────────
  stable         → No action. Continue monitoring.
  declining      → Self-resource nudge (in-app)
                   "You've been doing well lately. Here are some
                    resources that might help you maintain this."
  escalating     → Counselor alert with trend summary + explainability.
                   "Jane's behavioral signals show an upward trend over
                    the last 5 check-ins, primarily driven by changes
                    in sleep and safety question reactions."
  acute          → Immediate-contact protocol.
                   "URGENT: Significant deviation detected. Trigger
                    immediate outreach per acute protocol."

DESIGN PRINCIPLES:
==================
1. NEVER automate intervention. The system suggests, humans decide.
2. Alert payload contains EXPLAINABILITY, not raw scores.
   Counselors need to know WHY, not just WHAT.
3. Deduplication: We don't spam counselors with the same alert.
   If a trajectory is already "escalating" and stays "escalating",
   we don't create a new alert — we update the existing one.
4. Alert lifecycle: pending → acknowledged → in_progress → resolved.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.engine.deviation import TrendAnalysis, generate_trend_summary
from app.engine.topic_sensitivity import TopicActivation


# ─── Alert Types ──────────────────────────────────────────────────────────────

class ActionType:
    NONE = "none"
    SELF_RESOURCE = "self_resource"
    COUNSELOR_ALERT = "counselor_alert"
    IMMEDIATE_CONTACT = "immediate_contact"


def determine_action(trajectory_label: str, severity_score: float) -> str:
    """Map trajectory + severity to an action type.

    Decision matrix:
    ┌────────────┬─────────────────────────────────────┐
    │ Trajectory │ Action                              │
    ├────────────┼─────────────────────────────────────┤
    │ stable     │ none                                │
    │ declining  │ self_resource nudge                 │
    │ escalating │ counselor_alert                     │
    │ acute      │ immediate_contact                   │
    └────────────┴─────────────────────────────────────┘

    Severity can override: an escalating trajectory with severity > 0.8
    is treated as acute.
    """
    if trajectory_label == "acute" or (trajectory_label == "escalating" and severity_score > 0.8):
        return ActionType.IMMEDIATE_CONTACT
    elif trajectory_label == "escalating":
        return ActionType.COUNSELOR_ALERT
    elif trajectory_label == "declining":
        return ActionType.SELF_RESOURCE
    else:
        return ActionType.NONE


# ─── Alert Payload Builder ────────────────────────────────────────────────────

def build_alert_payload(
    survivor_id: str,
    counselor_id: str,
    analysis: TrendAnalysis,
    topic_sensitivities: dict[str, TopicActivation] | None = None,
) -> dict:
    """Build a rich alert payload with trend summary + explainability.

    This is what the counselor sees. It should answer:
    1. WHAT is happening? (trajectory label + severity)
    2. WHY do we think this? (contributing features + topics)
    3. HOW confident are we? (confidence score)
    4. WHAT should I do? (action type + recommended response)

    The payload is intentionally human-readable — counselors are not
    data scientists.
    """
    action = determine_action(analysis.trajectory_label, analysis.severity_score)

    # Build topic contributions
    topic_contributions = []
    if topic_sensitivities:
        for topic, ta in topic_sensitivities.items():
            if ta.activation_score > 0.4:  # Only include notable topics
                topic_contributions.append({
                    "topic": topic,
                    "activation_score": ta.activation_score,
                    "description": _describe_topic_activation(topic, ta),
                })
        topic_contributions.sort(key=lambda x: x["activation_score"], reverse=True)

    # Top contributing features
    feature_contributions = []
    for fc in analysis.contributing_features[:5]:
        feature_contributions.append({
            "metric": fc["metric"],
            "z_score": fc["z_score"],
            "interpretation": _interpret_metric(fc["metric"], fc["z_score"]),
        })

    # Build trend summary
    trend_summary = generate_trend_summary(analysis)

    # Determine urgency level
    urgency = _determine_urgency(analysis)

    return {
        "survivor_id": survivor_id,
        "counselor_id": counselor_id,
        "alert_type": analysis.trajectory_label,
        "action_type": action,
        "trend_summary": trend_summary,
        "severity_score": analysis.severity_score,
        "confidence": analysis.confidence,
        "urgency": urgency,
        "window_size": len(analysis.distress_values),
        "contributing_topics": [tc["topic"] for tc in topic_contributions[:3]],
        "topic_details": topic_contributions,
        "feature_details": feature_contributions,
        "recommended_response": _recommend_response(action, analysis),
    }


def _describe_topic_activation(topic: str, ta: TopicActivation) -> str:
    """Human-readable description of topic activation."""
    score = ta.activation_score
    if score > 0.8:
        return f"Strongly activated — {topic} questions consistently trigger elevated reactions"
    elif score > 0.6:
        return f"Consistently elevated — {topic} questions show sustained activation"
    elif score > 0.4:
        return f"Moderate activation — {topic} questions show some elevation"
    else:
        return f"Normal range — {topic} questions show expected reaction levels"


def _interpret_metric(metric: str, z_score: float) -> str:
    """Interpret what a z-score means for a specific metric."""
    direction = "above" if z_score > 0 else "below"
    magnitude = "significantly" if abs(z_score) > 2 else "moderately" if abs(z_score) > 1 else "slightly"

    interpretations = {
        "time_to_answer": f"{magnitude} {direction} baseline — response timing has changed",
        "skip_rate": f"{magnitude} {direction} baseline — more questions are being skipped",
        "revision_count": f"{magnitude} {direction} baseline — answers are being revised more frequently",
        "voice_pitch_variability": f"{magnitude} {direction} baseline — voice pitch variability has changed",
        "voice_pace": f"{magnitude} {direction} baseline — speech pace has changed",
        "voice_pause_duration": f"{magnitude} {direction} baseline — pause patterns have changed",
    }

    return interpretations.get(metric, f"{magnitude} {direction} baseline for {metric}")


def _determine_urgency(analysis: TrendAnalysis) -> str:
    """Determine urgency level for the alert."""
    if analysis.trajectory_label == "acute":
        return "critical"
    elif analysis.trajectory_label == "escalating":
        if analysis.severity_score > 0.7:
            return "high"
        return "medium"
    elif analysis.trajectory_label == "declining":
        return "low"
    return "info"


def _recommend_response(action: str, analysis: TrendAnalysis) -> str:
    """Suggest a response protocol for the counselor."""
    if action == ActionType.IMMEDIATE_CONTACT:
        return (
            "IMMEDIATE ACTION REQUIRED: Contact the survivor within 1 hour. "
            "Follow the acute outreach protocol. Ensure safety resources are "
            "available. Do not reference the specific signals — express genuine "
            "concern and ask how they're doing."
        )
    elif action == ActionType.COUNSELOR_ALERT:
        return (
            "Schedule a check-in within 24 hours. Review the contributing "
            "topics to prepare for the conversation. The survivor's behavioral "
            "signals suggest increasing distress — approach with curiosity, "
            "not alarm."
        )
    elif action == ActionType.SELF_RESOURCE:
        return (
            "No immediate action needed. Consider sending an encouraging "
            "in-app message with relevant self-care resources. The survivor's "
            "signals show improvement."
        )
    return "Continue monitoring. No action needed at this time."
