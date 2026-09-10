import pandas as pd

from backend.app.services import conflict_engine
from backend.app.utils import constants


def _task_row(**overrides):
    base = {
        "task_id": "TASK_A",
        "section_id": "SEC_A_B_DN",
        "track_line": "DN",
        "start_km": 8.0,
        "end_km": 12.0,
        "station_code": "B",
        "required_duration_mins": 60,
        "requires_traffic_block": True,
        "requires_power_block": False,
        "requires_st_disconnection": "",
        "required_machines": "M1",
        "required_gangs": "G1",
        "has_yard": False,
    }
    base.update(overrides)
    return pd.Series(base)


def _candidate(start, end, task_id="TASK_A"):
    return {"task_id": task_id, "start_minute": start, "end_minute": end}


def _trains_df():
    return pd.DataFrame(
        [
            {"train_no": "T1", "direction": "DN", "priority_rank": 1, "is_freight": False,
             "origin": "A", "destination": "C", "departure_time": "01:40", "arrival_time": "02:02",
             "speed_kmh": 100.0},
        ]
    )


def _schedules_df():
    return pd.DataFrame(
        [
            {"train_no": "T1", "station_code": "A", "arrival_minutes": None, "departure_minutes": 100,
             "distance_km": 0.0, "day_count": 1},
            {"train_no": "T1", "station_code": "B", "arrival_minutes": 110, "departure_minutes": 112,
             "distance_km": 10.0, "day_count": 1},
            {"train_no": "T1", "station_code": "C", "arrival_minutes": 122, "departure_minutes": None,
             "distance_km": 20.0, "day_count": 1},
        ]
    )


def _stations_df():
    return pd.DataFrame(
        [
            {"station_code": "A", "km_from_origin": 0.0},
            {"station_code": "B", "km_from_origin": 10.0},
            {"station_code": "C", "km_from_origin": 20.0},
        ]
    )


# ---------------------------------------------------------------------------
# Train conflict
# ---------------------------------------------------------------------------

def test_train_movement_overlapping_block_is_a_hard_conflict():
    models = conflict_engine.build_train_position_models(_trains_df(), _schedules_df(), _stations_df())
    task = _task_row(track_line="DN")
    # T1 occupies km[8,12] during [108,114) (hand-derivable from the schedule above).
    conflicts = conflict_engine.check_train_conflicts(_candidate(100, 109), task, models, horizon_minutes=200)
    assert len(conflicts) == 1
    assert conflicts[0]["severity"] in constants.HARD_SEVERITIES
    assert conflicts[0]["train_no"] == "T1"


def test_train_movement_outside_block_is_not_a_conflict():
    models = conflict_engine.build_train_position_models(_trains_df(), _schedules_df(), _stations_df())
    task = _task_row(track_line="DN")
    conflicts = conflict_engine.check_train_conflicts(_candidate(0, 50), task, models, horizon_minutes=200)
    assert conflicts == []


def test_opposite_line_train_ignored_unless_cross_line_risk_flagged():
    models = conflict_engine.build_train_position_models(_trains_df(), _schedules_df(), _stations_df())
    task = _task_row(track_line="UP", requires_power_block=False, requires_st_disconnection="")
    conflicts = conflict_engine.check_train_conflicts(_candidate(100, 120), task, models, horizon_minutes=200)
    assert conflicts == []

    risky_task = _task_row(track_line="UP", requires_power_block=True)
    risky_conflicts = conflict_engine.check_train_conflicts(_candidate(100, 120), risky_task, models, horizon_minutes=200)
    assert len(risky_conflicts) == 1
    assert risky_conflicts[0]["severity"] in constants.SOFT_SEVERITIES


# ---------------------------------------------------------------------------
# Task overlap / incompatible infrastructure
# ---------------------------------------------------------------------------

def test_overlapping_incompatible_tasks_flagged_as_track_km_overlap():
    task_a = _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=10,
                        required_machines="", required_gangs="")
    task_b = _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=5, end_km=15,
                        required_machines="", required_gangs="")
    conflict = conflict_engine.check_task_pair_conflict(_candidate(0, 60, "A"), task_a, _candidate(30, 90, "B"), task_b)
    assert conflict is not None
    assert conflict["type"] == "TRACK_KM_OVERLAP"
    assert conflict["severity"] == constants.SEVERITY_CRITICAL


def test_same_section_but_disjoint_km_is_not_a_conflict():
    task_a = _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5,
                        required_machines="", required_gangs="")
    task_b = _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=6, end_km=10,
                        required_machines="", required_gangs="")
    assert conflict_engine.check_task_pair_conflict(_candidate(0, 60, "A"), task_a, _candidate(0, 60, "B"), task_b) is None


def test_incompatible_infrastructure_conflict_no_yard_capacity():
    task_a = _task_row(task_id="A", station_code="B", requires_traffic_block=True, has_yard=False)
    task_b = _task_row(task_id="B", station_code="B", requires_traffic_block=True, has_yard=False)
    conflict = conflict_engine.check_infrastructure_conflict(
        _candidate(0, 60, "A"), task_a, _candidate(30, 90, "B"), task_b
    )
    assert conflict is not None
    assert conflict["type"] == "STATION_CAPACITY_CONFLICT"


def test_infrastructure_conflict_absent_with_yard_capacity():
    task_a = _task_row(task_id="A", station_code="B", requires_traffic_block=True, has_yard=True)
    task_b = _task_row(task_id="B", station_code="B", requires_traffic_block=True, has_yard=True)
    assert conflict_engine.check_infrastructure_conflict(
        _candidate(0, 60, "A"), task_a, _candidate(30, 90, "B"), task_b
    ) is None


# ---------------------------------------------------------------------------
# structural_conflict_reason (shared by optimizer.py and block_fusion.py)
# ---------------------------------------------------------------------------

def test_structural_conflict_reason_detects_each_type():
    track = _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=10,
                       required_machines="", required_gangs="")
    track2 = _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=5, end_km=15,
                        required_machines="", required_gangs="")
    assert conflict_engine.structural_conflict_reason(track, track2) == "TRACK_KM_OVERLAP"

    resource_a = _task_row(task_id="A", section_id="SEC_X", start_km=0, end_km=1, required_machines="M9")
    resource_b = _task_row(task_id="B", section_id="SEC_Y", start_km=500, end_km=501, required_machines="M9")
    assert conflict_engine.structural_conflict_reason(resource_a, resource_b) == "RESOURCE_CONFLICT"

    infra_a = _task_row(task_id="A", section_id="SEC_INFRA_A", start_km=0, end_km=1, station_code="X",
                         requires_traffic_block=True, has_yard=False, required_machines="", required_gangs="")
    infra_b = _task_row(task_id="B", section_id="SEC_INFRA_B", start_km=999, end_km=1000, station_code="X",
                         requires_traffic_block=True, has_yard=False, required_machines="", required_gangs="")
    assert conflict_engine.structural_conflict_reason(infra_a, infra_b) == "STATION_CAPACITY_CONFLICT"


def test_structural_conflict_reason_none_for_unrelated_tasks():
    task_a = _task_row(task_id="A", section_id="SEC_X", station_code="X", required_machines="M1",
                        required_gangs="G1")
    task_b = _task_row(task_id="B", section_id="SEC_Y", station_code="Y", start_km=999, end_km=1000,
                        required_machines="M2", required_gangs="G2")
    assert conflict_engine.structural_conflict_reason(task_a, task_b) is None


# ---------------------------------------------------------------------------
# Insufficient duration / invalid time range / duplicate task
# ---------------------------------------------------------------------------

def test_insufficient_duration_flagged():
    task = _task_row(required_duration_mins=0)
    violation = conflict_engine.check_duration_validity(task)
    assert violation is not None
    assert violation["type"] == "INSUFFICIENT_DURATION"
    assert violation["severity"] == constants.SEVERITY_CRITICAL


def test_missing_duration_flagged():
    task = _task_row(required_duration_mins=None)
    violation = conflict_engine.check_duration_validity(task)
    assert violation is not None


def test_valid_duration_not_flagged():
    task = _task_row(required_duration_mins=90)
    assert conflict_engine.check_duration_validity(task) is None


def test_invalid_time_range_flagged():
    candidate = {"task_id": "A", "start_minute": 100, "end_minute": 50}  # end before start
    violation = conflict_engine.check_time_range_validity(candidate, horizon_minutes=200)
    assert violation is not None
    assert violation["type"] == "INVALID_TIME_RANGE"


def test_time_range_outside_horizon_flagged():
    candidate = {"task_id": "A", "start_minute": 190, "end_minute": 250}
    violation = conflict_engine.check_time_range_validity(candidate, horizon_minutes=200)
    assert violation is not None


def test_valid_time_range_not_flagged():
    candidate = {"task_id": "A", "start_minute": 0, "end_minute": 60}
    assert conflict_engine.check_time_range_validity(candidate, horizon_minutes=200) is None


def test_duplicate_task_scheduling_detected():
    tasks_df = pd.DataFrame([_task_row(task_id="DUP"), _task_row(task_id="DUP"), _task_row(task_id="UNIQUE")])
    violations = conflict_engine.check_duplicate_tasks(tasks_df)
    assert len(violations) == 1
    assert violations[0]["type"] == "DUPLICATE_TASK"
    assert violations[0]["task_id"] == "DUP"


def test_no_duplicate_tasks_returns_empty():
    tasks_df = pd.DataFrame([_task_row(task_id="A"), _task_row(task_id="B")])
    assert conflict_engine.check_duplicate_tasks(tasks_df) == []
