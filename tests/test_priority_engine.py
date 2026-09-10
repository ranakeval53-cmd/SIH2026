import pandas as pd
import pytest

from backend.app.services import priority_engine


def _row(**overrides):
    base = {
        "task_id": "T1",
        "department": "TMS",
        "task_category": "USFD_IMR_RAIL_FLAW",
        "section_id": "SEC_A_B_UP",
        "track_line": "UP",
        "station_code": "GZB",
        "start_km": 10.0,
        "end_km": 10.5,
        "work_length_km": 0.5,
        "horizon": "DAILY",
        "status": "PENDING",
        "safety_criticality": 9.9,
        "asset_degradation_score": 9.5,
        "urgency_days_overdue": 4,
        "gmt_accumulated": 62.4,
        "speed_restriction_if_deferred_kmh": 20.0,
        "has_speed_restriction": True,
        "required_duration_mins": 120,
        "requires_traffic_block": True,
        "requires_power_block": False,
        "requires_st_disconnection": "",
        "km_from_origin": 25.4,
        "has_yard": True,
        "platforms": 6,
    }
    base.update(overrides)
    return base


def _df(*rows):
    return pd.DataFrame(list(rows))


def test_high_safety_and_degradation_yields_critical():
    df = _df(_row())
    results = priority_engine.compute_priorities(df)
    assert len(results) == 1
    result = results[0]
    assert result["priority_class"] == "CRITICAL"
    assert result["priority_score"] > 85
    assert any("SAFETY_CRITICALITY" in code for code in result["reason_codes"])


def test_low_everything_yields_low_class():
    df = _df(
        _row(
            task_id="T2",
            safety_criticality=1.0,
            asset_degradation_score=1.0,
            urgency_days_overdue=0,
            gmt_accumulated=1.0,
            speed_restriction_if_deferred_kmh=None,
            has_speed_restriction=False,
            has_yard=False,
            platforms=1,
        )
    )
    result = priority_engine.compute_priorities(df)[0]
    assert result["priority_class"] == "LOW"
    assert result["priority_score"] < 40


def test_missing_field_is_not_fabricated_and_score_still_bounded():
    row = _row(task_id="T3")
    # Simulate a genuinely missing column value (NaN), as pandas would surface it.
    row["safety_criticality"] = float("nan")
    df = _df(row)
    result = priority_engine.compute_priorities(df)[0]
    assert "safety" not in result["components"]
    assert "NO_SAFETY_CRITICALITY_DATA" in result["reason_codes"]
    assert 0.0 <= result["priority_score"] <= 100.0


def test_missing_speed_restriction_adds_explicit_reason_not_a_guess():
    row = _row(task_id="T4", speed_restriction_if_deferred_kmh=None, has_speed_restriction=False)
    df = _df(row)
    result = priority_engine.compute_priorities(df)[0]
    assert "NO_SPEED_RESTRICTION_DATA" in result["reason_codes"]


def test_urgency_scales_by_horizon_cap():
    daily = _df(_row(task_id="D", horizon="DAILY", urgency_days_overdue=3))
    monthly = _df(_row(task_id="M", horizon="MONTHLY", urgency_days_overdue=3))
    daily_result = priority_engine.compute_priorities(daily)[0]
    monthly_result = priority_engine.compute_priorities(monthly)[0]
    # Same overdue count is far more urgent for a DAILY task than a MONTHLY one.
    assert daily_result["components"]["urgency"] > monthly_result["components"]["urgency"]


@pytest.mark.parametrize(
    "score,expected",
    [(90, "CRITICAL"), (85, "CRITICAL"), (70, "HIGH"), (65, "HIGH"), (50, "MEDIUM"), (40, "MEDIUM"), (10, "LOW")],
)
def test_classify_thresholds(score, expected):
    assert priority_engine.classify(score) == expected
