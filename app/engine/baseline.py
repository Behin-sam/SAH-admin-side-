"""Stage 3: Personal Baseline Engine.

Computes a per-survivor personal baseline from their first ~2 weeks of
check-in and reaction signal data.

APPROACH:
=========
We do NOT use population norms. Each survivor IS their own baseline.
This is critical because:
- A survivor in active crisis may have a "normal" that differs vastly
  from someone in stable recovery.
- Population norms would misclassify high-baseline individuals.

The baseline is computed as:
  - Mean (μ) and standard deviation (σ) for each metric over the
    baseline period window.
  - Metrics: time_to_answer, skip_rate, revision_count,
    voice_pitch_variability, voice_pace, voice_pause_duration.

ROLLING UPDATE:
==============
After the initial baseline is set, we use an exponentially weighted
moving average (EWMA) to slowly incorporate new data without letting
a single outlier shift the baseline.

  baseline_new = α × current_value + (1 - α) × baseline_old

With α = 0.1, the baseline shifts slowly — it takes ~10 new check-ins
to move the mean by one standard deviation. This prevents "baseline
drift" from masking real changes.

CLINICAL NOTE:
=============
This is a prototype. A real deployment would need:
- Clinical validation of the baseline period length (14 days is a
  starting assumption, not evidence-based).
- Minimum data completeness thresholds (what if they skip half the
  check-ins?).
- Separate baselines for different question topics.
- Review by trauma-informed clinicians before deployment.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


# ─── Configuration ────────────────────────────────────────────────────────────

# Minimum check-ins required to establish a baseline
MIN_CHECKINS_FOR_BASELINE = 10

# EWMA smoothing factor (0-1). Lower = slower adaptation.
EWMA_ALPHA = 0.1

# Minimum variance floor to avoid division by zero in z-score calculations
MIN_VARIANCE = 0.001


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class MetricBaseline:
    """Baseline stats for a single metric."""
    mean: float = 0.0
    std_dev: float = 0.0
    min_val: float = float("inf")
    max_val: float = float("-inf")
    sample_count: int = 0

    @property
    def variance(self) -> float:
        return self.std_dev ** 2 if self.std_dev > 0 else MIN_VARIANCE


@dataclass
class PersonalBaseline:
    """Complete personal baseline for a survivor."""
    survivor_id: str
    established: bool = False
    established_at: str | None = None

    # One MetricBaseline per signal type
    metrics: dict[str, MetricBaseline] = field(default_factory=dict)

    # EWMA-smoothed means for ongoing updates
    ewma_means: dict[str, float] = field(default_factory=dict)
    ewma_variance: dict[str, float] = field(default_factory=dict)


# ─── Baseline Calculation ────────────────────────────────────────────────────

def compute_baseline_from_samples(
    samples: dict[str, list[float]],
) -> dict[str, MetricBaseline]:
    """Compute mean/std/min/max for each metric from raw samples.

    Args:
        samples: Dict mapping metric names to lists of float values.
                 Example: {"time_to_answer": [3.2, 4.1, 2.8, ...], ...}

    Returns:
        Dict mapping metric names to MetricBaseline objects.

    Algorithm:
        1. Filter out None values (missing data).
        2. Compute arithmetic mean and sample standard deviation.
        3. Record min/max for reference.
    """
    baselines = {}

    for metric_name, values in samples.items():
        # Filter out None/NaN
        clean = [v for v in values if v is not None and not math.isnan(v)]

        if not clean:
            baselines[metric_name] = MetricBaseline(sample_count=0)
            continue

        n = len(clean)
        mean = sum(clean) / n

        # Sample standard deviation (Bessel's correction)
        if n > 1:
            variance = sum((x - mean) ** 2 for x in clean) / (n - 1)
            std_dev = math.sqrt(variance)
        else:
            std_dev = 0.0

        baselines[metric_name] = MetricBaseline(
            mean=mean,
            std_dev=max(std_dev, math.sqrt(MIN_VARIANCE)),  # Floor to avoid div/0
            min_val=min(clean),
            max_val=max(clean),
            sample_count=n,
        )

    return baselines


def compute_rolling_baseline(
    existing_baseline: PersonalBaseline,
    new_values: dict[str, float | None],
) -> PersonalBaseline:
    """Update baseline with new check-in data using EWMA.

    This is called after the initial baseline is established.
    It slowly adapts the baseline to account for natural drift
    without being sensitive to individual outliers.

    EWMA formula:
        mean_new = α × value + (1 - α) × mean_old
        var_new  = α × (value - mean_new)² + (1 - α) × var_old

    Args:
        existing_baseline: Current personal baseline.
        new_values: Latest check-in metric values.

    Returns:
        Updated PersonalBaseline (modifies in place).
    """
    for metric_name, value in new_values.items():
        if value is None or math.isnan(value):
            continue

        # Update EWMA mean
        old_mean = existing_baseline.ewma_means.get(metric_name, 0.0)
        new_mean = EWMA_ALPHA * value + (1 - EWMA_ALPHA) * old_mean
        existing_baseline.ewma_means[metric_name] = new_mean

        # Update EWMA variance
        old_var = existing_baseline.ewma_variance.get(metric_name, MIN_VARIANCE)
        new_var = EWMA_ALPHA * (value - new_mean) ** 2 + (1 - EWMA_ALPHA) * old_var
        existing_baseline.ewma_variance[metric_name] = max(new_var, MIN_VARIANCE)

        # Update the MetricBaseline for reference
        if metric_name in existing_baseline.metrics:
            mb = existing_baseline.metrics[metric_name]
            mb.mean = new_mean
            mb.std_dev = math.sqrt(existing_baseline.ewma_variance[metric_name])
            mb.sample_count += 1
            mb.min_val = min(mb.min_val, value)
            mb.max_val = max(mb.max_val, value)

    return existing_baseline


def establish_baseline(
    survivor_id: str,
    samples: dict[str, list[float]],
    checkin_count: int,
) -> PersonalBaseline:
    """Create an initial personal baseline from raw sample data.

    Call this when the survivor has completed enough check-ins during
    the baseline period (typically 2 weeks / ~10-14 check-ins).

    Args:
        survivor_id: The survivor's ID.
        samples: Dict of metric_name -> list of values from baseline period.
        checkin_count: Number of check-ins used.

    Returns:
        PersonalBaseline with established=True if enough data,
        or established=False if not enough data.
    """
    baseline = PersonalBaseline(survivor_id=survivor_id)

    if checkin_count < MIN_CHECKINS_FOR_BASELINE:
        baseline.established = False
        return baseline

    # Compute initial statistics
    metrics = compute_baseline_from_samples(samples)
    baseline.metrics = metrics
    baseline.established = True

    # Initialize EWMA with the computed means
    baseline.ewma_means = {name: m.mean for name, m in metrics.items()}
    baseline.ewma_variance = {name: m.variance for name, m in metrics.items()}

    return baseline


def has_enough_data_for_baseline(checkin_count: int) -> bool:
    """Check if we have enough check-ins to establish a baseline."""
    return checkin_count >= MIN_CHECKINS_FOR_BASELINE


def get_baseline_from_log(baseline_data: dict) -> PersonalBaseline:
    """Reconstruct a PersonalBaseline from a stored dict (e.g., from DB).

    In production, this would deserialize from the risk_trajectory_log
    or a dedicated baseline storage table.
    """
    baseline = PersonalBaseline(
        survivor_id=baseline_data.get("survivor_id", ""),
        established=baseline_data.get("established", False),
        established_at=baseline_data.get("established_at"),
    )

    for name, data in baseline_data.get("metrics", {}).items():
        baseline.metrics[name] = MetricBaseline(**data)

    baseline.ewma_means = baseline_data.get("ewma_means", {})
    baseline.ewma_variance = baseline_data.get("ewma_variance", {})

    return baseline
