"""Stage 4: Deviation / Trend Model.

Scores ongoing check-ins against the survivor's OWN baseline using
rolling z-scores, then classifies the trajectory into:
  - STABLE: values within normal range
  - DECLINING: values trending in the "improving" direction (less distress)
  - ESCALATING: values trending toward higher distress
  - ACUTE: severe deviation requiring immediate attention

APPROACH:
=========
1. For each new check-in, compute a z-score per metric:
     z = (value - baseline_mean) / baseline_std_dev

2. Aggregate z-scores into a composite "distress index":
     distress_index = weighted_mean(|z_scores|)  (using absolute values
     for metrics where higher = more distress)

3. Use a TREND WINDOW (last N check-ins) to classify trajectory,
   NOT a single data point. This prevents false alarms from bad days.

4. Trajectory is classified by:
   - Mean distress index in the window
   - Slope of distress index over the window
   - Presence of extreme values (|z| > 2.5)

FUTURE REPLACEMENT:
==================
This z-score approach is intentionally simple and interpretable.
A production system would replace it with:
  - LSTM/Transformer temporal model trained on longitudinal data
  - Per-topic trajectory models (sleep trajectory ≠ safety trajectory)
  - Population-informed priors (with explicit consent for aggregation)
  - Confidence intervals calibrated against clinical outcomes

CLINICAL NOTE:
=============
The severity score (0-1) is NOT a diagnostic score. It is a
relative measure of deviation from THIS survivor's own baseline.
A severity of 0.8 means "significantly different from your own
normal pattern" — NOT "you are 80% depressed."
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from app.config import settings
from app.engine.baseline import PersonalBaseline, MIN_VARIANCE


# ─── Configuration ────────────────────────────────────────────────────────────

# Weights for composite distress index (metrics where higher = more distress)
METRIC_WEIGHTS = {
    "time_to_answer": 1.0,       # Longer = more distress
    "skip_rate": 1.5,            # Skipping = strong signal
    "revision_count": 0.8,       # Revising = uncertainty/distress
    "voice_pitch_variability": 1.2,  # Higher pitch variability = stress
    "voice_pace": 0.8,           # Faster pace = anxiety
    "voice_pause_duration": 1.0, # Longer pauses = distress
}


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class ZScoreResult:
    """Z-score for a single metric."""
    metric_name: str
    raw_value: float
    z_score: float
    is_elevated: bool  # True if |z| > escalation threshold
    direction: str     # "above" / "below" / "normal"


@dataclass
class TrendAnalysis:
    """Result of analyzing a trend window of distress indices."""
    distress_values: list[float]       # Distress index per check-in in window
    mean_distress: float               # Average distress over window
    slope: float                       # Linear trend slope (positive = worsening)
    max_distress: float                # Worst point in window
    elevated_count: int                # How many points exceed threshold
    trajectory_label: str              # stable / declining / escalating / acute
    severity_score: float              # 0.0 - 1.0
    confidence: float                  # 0.0 - 1.0
    contributing_features: list[dict]  # Which features drove the result
    contributing_topics: list[str]     # Which topics are most activated


# ─── Z-Score Computation ─────────────────────────────────────────────────────

def compute_z_scores(
    baseline: PersonalBaseline,
    values: dict[str, float | None],
) -> list[ZScoreResult]:
    """Compute z-scores for each metric against the personal baseline.

    Args:
        baseline: The survivor's personal baseline.
        values: Current check-in metric values.

    Returns:
        List of ZScoreResult objects.
    """
    results = []

    for metric_name, value in values.items():
        if value is None or metric_name not in baseline.metrics:
            continue

        mb = baseline.metrics[metric_name]
        std = max(mb.std_dev, math.sqrt(MIN_VARIANCE))

        z = (value - mb.mean) / std

        is_elevated = abs(z) > settings.Z_SCORE_ESCALATING
        direction = "above" if z > 0.5 else ("below" if z < -0.5 else "normal")

        results.append(ZScoreResult(
            metric_name=metric_name,
            raw_value=value,
            z_score=round(z, 3),
            is_elevated=is_elevated,
            direction=direction,
        ))

    return results


# ─── Composite Distress Index ─────────────────────────────────────────────────

def compute_distress_index(z_scores: list[ZScoreResult]) -> float:
    """Compute a composite distress index from z-scores.

    Uses weighted average of absolute z-scores, capped at 3.0
    to prevent extreme outliers from dominating.

    Returns:
        Float between 0.0 and 1.0 (normalized).
    """
    if not z_scores:
        return 0.0

    weighted_sum = 0.0
    weight_total = 0.0

    for zs in z_scores:
        weight = METRIC_WEIGHTS.get(zs.metric_name, 1.0)
        capped_z = min(abs(zs.z_score), 3.0)  # Cap at 3σ
        weighted_sum += weight * capped_z
        weight_total += weight

    if weight_total == 0:
        return 0.0

    raw_index = weighted_sum / weight_total
    # Normalize to 0-1 (3σ is roughly max)
    return min(raw_index / 3.0, 1.0)


# ─── Trend Classification ────────────────────────────────────────────────────

def classify_trajectory(
    distress_window: list[float],
    z_scores_recent: list[ZScoreResult],
) -> TrendAnalysis:
    """Classify trajectory from a window of distress indices.

    Uses the TREND_WINDOW (last N check-ins) to determine trajectory.
    Classification rules:

    STABLE:
      - Mean distress < 0.3
      - No extreme values (|z| > 2.5)
      - Slope is flat (|slope| < 0.05)

    DECLINING (improving):
      - Mean distress is decreasing
      - Slope is negative and significant
      - Note: "declining" here means declining distress = improving

    ESCALATING:
      - Mean distress > 0.4 OR slope is positive and significant
      - Multiple elevated points in window
      - Multiple metrics showing sustained elevation

    ACUTE:
      - Any single point with |z| > Z_SCORE_ACUTE (2.5)
      - Mean distress > 0.6
      - Rapid escalation (slope > 0.15 over short window)
    """
    if not distress_window:
        return TrendAnalysis(
            distress_values=[],
            mean_distress=0.0,
            slope=0.0,
            max_distress=0.0,
            elevated_count=0,
            trajectory_label="stable",
            severity_score=0.0,
            confidence=0.0,
            contributing_features=[],
            contributing_topics=[],
        )

    n = len(distress_window)
    mean_distress = sum(distress_window) / n
    max_distress = max(distress_window)

    # Simple linear regression for slope
    if n >= 2:
        x_mean = (n - 1) / 2
        y_mean = mean_distress
        numerator = sum((i - x_mean) * (d - y_mean) for i, d in enumerate(distress_window))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator > 0 else 0.0
    else:
        slope = 0.0

    # Count elevated points
    elevated_count = sum(1 for d in distress_window if d > 0.5)

    # Check for acute signals in recent z-scores
    has_acute_signal = any(
        zs.z_score > settings.Z_SCORE_ACUTE or zs.z_score < -settings.Z_SCORE_ACUTE
        for zs in z_scores_recent
    )

    # Classification
    if has_acute_signal or (mean_distress > 0.6 and slope > 0.1):
        trajectory_label = "acute"
        severity_score = min(mean_distress * 1.2, 1.0)
    elif (
        mean_distress > 0.4
        or (slope > 0.08 and elevated_count >= 2)
        or (slope > 0.15)
    ):
        trajectory_label = "escalating"
        severity_score = min(mean_distress * 0.9, 0.85)
    elif slope < -0.08 and mean_distress < 0.4:
        trajectory_label = "declining"  # Improving
        severity_score = max(mean_distress * 0.5, 0.1)
    else:
        trajectory_label = "stable"
        severity_score = min(mean_distress * 0.4, 0.3)

    # Confidence based on window completeness and data quality
    confidence = min(n / settings.TREND_WINDOW, 1.0) * 0.8 + 0.2

    # Contributing features (top z-scores by absolute value)
    contributing = sorted(
        [{"metric": zs.metric_name, "z_score": zs.z_score, "raw_value": zs.raw_value}
         for zs in z_scores_recent],
        key=lambda x: abs(x["z_score"]),
        reverse=True,
    )[:5]

    # Contributing topics would come from question-topic mapping
    # (populated by the topic sensitivity engine)
    contributing_topics = []

    return TrendAnalysis(
        distress_values=distress_window,
        mean_distress=round(mean_distress, 4),
        slope=round(slope, 4),
        max_distress=round(max_distress, 4),
        elevated_count=elevated_count,
        trajectory_label=trajectory_label,
        severity_score=round(severity_score, 4),
        confidence=round(confidence, 4),
        contributing_features=contributing,
        contributing_topics=contributing_topics,
    )


def generate_trend_summary(analysis: TrendAnalysis) -> str:
    """Generate a human-readable trend summary for counselor alerts.

    This is NOT a diagnostic statement. It describes patterns in
    behavioral signals relative to the survivor's own baseline.
    """
    label = analysis.trajectory_label
    severity = analysis.severity_score
    mean_d = analysis.mean_distress

    if label == "acute":
        return (
            f"Acute alert: Significant deviation from your normal patterns detected. "
            f"The distress signal index is {mean_d:.0%} above your baseline, "
            f"with rapid escalation over the last {len(analysis.distress_values)} check-ins. "
            f"Immediate outreach recommended."
        )
    elif label == "escalating":
        top_feature = analysis.contributing_features[0] if analysis.contributing_features else None
        feature_note = f" Primarily driven by changes in {top_feature['metric']}." if top_feature else ""
        return (
            f"Escalating pattern detected. Your behavioral signals show an upward trend "
            f"in distress indicators over the last {len(analysis.distress_values)} check-ins.{feature_note} "
            f"Severity level: {severity:.0%}."
        )
    elif label == "declining":
        return (
            f"Positive trend: Your behavioral signals show a decreasing pattern "
            f"over the last {len(analysis.distress_values)} check-ins. "
            f"Distress indicators are moving toward your baseline levels."
        )
    else:
        return (
            f"Stable pattern. Your behavioral signals remain within your normal range "
            f"over the last {len(analysis.distress_values)} check-ins."
        )
