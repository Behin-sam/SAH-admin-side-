"""Shared test fixtures for engine tests."""

import math
import pytest

from app.engine.baseline import (
    PersonalBaseline,
    MetricBaseline,
    compute_baseline_from_samples,
    establish_baseline,
    MIN_VARIANCE,
)


@pytest.fixture
def sample_checkin_data():
    """Realistic 14-day check-in data for a survivor with mild distress."""
    import random
    random.seed(42)

    data = {
        "time_to_answer": [random.gauss(4.0, 0.8) for _ in range(14)],
        "skip_rate": [random.gauss(0.1, 0.05) for _ in range(14)],
        "revision_count": [random.gauss(1.5, 0.5) for _ in range(14)],
    }
    # Clamp to reasonable ranges
    data["time_to_answer"] = [max(1.0, v) for v in data["time_to_answer"]]
    data["skip_rate"] = [max(0.0, min(1.0, v)) for v in data["skip_rate"]]
    data["revision_count"] = [max(0.0, v) for v in data["revision_count"]]
    return data


@pytest.fixture
def established_baseline(sample_checkin_data):
    """A fully established personal baseline from 14 days of data."""
    return establish_baseline(
        survivor_id="test-survivor-001",
        samples=sample_checkin_data,
        checkin_count=14,
    )


@pytest.fixture
def acute_checkin_values():
    """A check-in with values well outside the baseline (acute signal)."""
    return {
        "time_to_answer": 8.5,    # Way above normal (baseline ~4.0)
        "skip_rate": 0.6,         # High skip rate (baseline ~0.1)
        "revision_count": 4.0,    # High revisions (baseline ~1.5)
    }


@pytest.fixture
def normal_checkin_values():
    """A check-in that's within normal baseline range."""
    return {
        "time_to_answer": 4.2,
        "skip_rate": 0.12,
        "revision_count": 1.3,
    }


@pytest.fixture
def declining_checkin_values():
    """A check-in showing improvement (lower distress signals)."""
    return {
        "time_to_answer": 2.5,    # Faster responses (less distress)
        "skip_rate": 0.02,        # Almost no skipping
        "revision_count": 0.5,    # Fewer revisions
    }
