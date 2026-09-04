"""Stage 5: Topic Sensitivity Mapping.

Aggregates reaction-signal "activation scores" by question topic tag.
This surfaces which topics (e.g., "sleep", "safety", "self_harm")
consistently trigger elevated reactions for a given survivor.

APPROACH:
=========
1. For each check-in question, look up its topic tags.
2. For each topic, aggregate the reaction signals associated with
   questions tagged with that topic.
3. Compute an "activation score" per topic:
     activation = mean(z_scores for questions in this topic)
4. Map the last N days to a sensitivity profile.

OUTPUT:
=======
{
  "sleep": 0.82,         # High activation — consistently elevated
  "safety": 0.71,        # Elevated
  "food": 0.35,          # Normal range
  "self_harm": 0.45,     # Mildly elevated
  "family": 0.28,        # Low
}

A score > 0.6 = "consistently high reaction over the window"
A score > 0.8 = "strongly activated — worth counselor attention"

CLINICAL NOTE:
=============
This mapping helps counselors understand WHAT topics are difficult
for a survivor without exposing raw response text. It should be
presented as "signal activation" not "emotional state" — we cannot
infer emotions from reaction times alone.
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass

from app.engine.baseline import PersonalBaseline, MIN_VARIANCE


@dataclass
class TopicActivation:
    """Activation score for a single topic."""
    topic: str
    activation_score: float      # 0.0 - 1.0
    sample_count: int            # Number of data points used
    avg_z_score: float           # Average z-score for this topic
    consistently_elevated: bool  # True if > 0.6 for 3+ consecutive days


def compute_topic_sensitivity(
    baseline: PersonalBaseline,
    topic_signal_data: dict[str, list[dict]],
) -> dict[str, TopicActivation]:
    """Compute topic-level activation scores from reaction signals.

    Args:
        baseline: The survivor's personal baseline.
        topic_signal_data: Dict mapping topic names to lists of signal dicts.
            Example: {
                "sleep": [
                    {"time_to_answer": 5.2, "skip_rate": 0.0, ...},
                    {"time_to_answer": 6.1, "skip_rate": 0.2, ...},
                ],
                "safety": [...]
            }

    Returns:
        Dict mapping topic names to TopicActivation objects.
    """
    results = {}

    for topic, signal_list in topic_signal_data.items():
        if not signal_list:
            results[topic] = TopicActivation(
                topic=topic,
                activation_score=0.0,
                sample_count=0,
                avg_z_score=0.0,
                consistently_elevated=False,
            )
            continue

        z_scores = []

        for signals in signal_list:
            # Compute a composite z-score for this data point
            point_z_scores = []
            for metric, value in signals.items():
                if value is None or metric not in baseline.metrics:
                    continue
                mb = baseline.metrics[metric]
                std = max(mb.std_dev, math.sqrt(MIN_VARIANCE))
                z = abs((value - mb.mean) / std)
                point_z_scores.append(z)

            if point_z_scores:
                z_scores.append(sum(point_z_scores) / len(point_z_scores))

        if not z_scores:
            activation = 0.0
            avg_z = 0.0
        else:
            avg_z = sum(z_scores) / len(z_scores)
            # Normalize: 0σ → 0.0, 3σ → 1.0
            activation = min(avg_z / 3.0, 1.0)

        # Check if consistently elevated (simplified: > 0.6 overall)
        consistently_elevated = activation > 0.6 and len(z_scores) >= 3

        results[topic] = TopicActivation(
            topic=topic,
            activation_score=round(activation, 4),
            sample_count=len(z_scores),
            avg_z_score=round(avg_z, 4),
            consistently_elevated=consistently_elevated,
        )

    return results


def get_high_activation_topics(
    sensitivities: dict[str, TopicActivation],
    threshold: float = 0.6,
) -> list[str]:
    """Return topics with activation above threshold, sorted by score descending."""
    elevated = [
        (topic, s.activation_score)
        for topic, s in sensitivities.items()
        if s.activation_score >= threshold
    ]
    elevated.sort(key=lambda x: x[1], reverse=True)
    return [topic for topic, _ in elevated]


def format_sensitivity_summary(sensitivities: dict[str, TopicActivation]) -> str:
    """Generate a human-readable sensitivity summary for counselors.

    Example: "Sleep and safety questions show consistently high reaction
    over the last 5 days."
    """
    high = get_high_activation_topics(sensitivities, threshold=0.6)
    moderate = [
        topic for topic, s in sensitivities.items()
        if 0.3 <= s.activation_score < 0.6
    ]

    parts = []
    if high:
        topics_str = ", ".join(high[:3])
        parts.append(f"{topics_str} show consistently high activation")
    if moderate:
        topics_str = ", ".join(moderate[:3])
        parts.append(f"{topics_str} show moderate activation")

    if not parts:
        return "No topics showing elevated activation in recent check-ins."

    return ". ".join(parts) + "."
