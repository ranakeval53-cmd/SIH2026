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
    return {
        "candidate_id": f"{task_id}__C_{start}_{end}",
        "task_id": task_id,
        "start_minute": start,
        "end_minute": end,
        "start_time": f"m{start}",
        "end_time": f"m{end}",
        "status": "CANDIDATE",
        "conflicting_trains": [],
        "conflicting_tasks": [],
        "reason": "",
    }


def _stations_df():
    return pd.DataFrame(
        [
            {"station_code": "A", "km_from_origin": 0.0},
            {"station_code": "B", "km_from_origin": 10.0},
            {"station_code": "C", "km_from_origin": 20.0},
        ]
    )


def _schedules_df():
    # T_SCHED travels A(0km)->B(10km)->C(20km): 0km@t100, 10km@t110 (dwell to 112), 20km@t122.
    return pd.DataFrame(
        [
            {"train_no": "T_SCHED", "station_code": "A", "arrival_minutes": None, "departure_minutes": 100,
             "distance_km": 0.0, "day_count": 1},
            {"train_no": "T_SCHED", "station_code": "B", "arrival_minutes": 110, "departure_minutes": 112,
             "distance_km": 10.0, "day_count": 1},
            {"train_no": "T_SCHED", "station_code": "C", "arrival_minutes": 122, "departure_minutes": None,
             "distance_km": 20.0, "day_count": 1},
        ]
    )


def _trains_df():
    return pd.DataFrame(
        [
            {"train_no": "T_SCHED", "direction": "DN", "priority_rank": 1, "is_freight": False,
             "origin": "A", "destination": "C", "departure_time": "01:40", "arrival_time": "02:02",
             "speed_kmh": 100.0},
            {"train_no": "T_ENDPOINT", "direction": "DN", "priority_rank": 9, "is_freight": True,
             "origin": "A", "destination": "C", "departure_time": "00:00", "arrival_time": "00:20",
             "speed_kmh": 60.0},
            {"train_no": "T_UNRESOLVED", "direction": "UP", "priority_rank": 3, "is_freight": False,
             "origin": "FARAWAY_1", "destination": "FARAWAY_2", "departure_time": "05:00", "arrival_time": "06:00",
             "speed_kmh": 100.0},
        ]
    )


def test_build_train_position_models_tiers():
    schedules = _schedules_df()
    # Drop schedule rows for T_ENDPOINT/T_UNRESOLVED so they fall through to
    # ENDPOINTS / UNRESOLVED tiers respectively.
    models = conflict_engine.build_train_position_models(_trains_df(), schedules, _stations_df())

    assert models["T_SCHED"].tier == conflict_engine.TIER_SCHEDULE
    assert models["T_SCHED"].resolved is True

    assert models["T_ENDPOINT"].tier == conflict_engine.TIER_ENDPOINTS
    assert models["T_ENDPOINT"].resolved is True

    assert models["T_UNRESOLVED"].tier == conflict_engine.TIER_UNRESOLVED
    assert models["T_UNRESOLVED"].resolved is False
    assert "T_UNRESOLVED" in conflict_engine.unresolved_trains(models)


def test_occupancy_interval_matches_hand_computed_interpolation():
    models = conflict_engine.build_train_position_models(_trains_df(), _schedules_df(), _stations_df())
    model = models["T_SCHED"]
    # Task occupies km [8, 12]; hand-computed occupancy on day 1 is [108, 114].
    intervals = conflict_engine.get_occupancy_intervals(model, 8.0, 12.0, horizon_minutes=200)
    day1 = [iv for iv in intervals if iv[0] < 200][0]
    assert abs(day1[0] - 108) < 1e-6
    assert abs(day1[1] - 114) < 1e-6


def _only_scheduled_train_models():
    """Isolate T_SCHED only, so boundary/overlap assertions aren't affected by
    the other synthetic trains in _trains_df() which also traverse this
    corridor and would otherwise legitimately add their own conflicts."""
    trains_df = _trains_df()[_trains_df()["train_no"] == "T_SCHED"].reset_index(drop=True)
    return conflict_engine.build_train_position_models(trains_df, _schedules_df(), _stations_df())


def test_boundary_touching_candidate_is_not_a_conflict():
    models = _only_scheduled_train_models()
    task = _task_row(track_line="DN")
    # Occupancy window is [108, 114); a candidate ending exactly at 108 must not conflict.
    touching_candidate = _candidate(0, 108)
    conflicts = conflict_engine.check_train_conflicts(touching_candidate, task, models, horizon_minutes=200)
    assert conflicts == []


def test_overlapping_candidate_is_flagged_as_hard_conflict():
    models = _only_scheduled_train_models()
    task = _task_row(track_line="DN")
    overlapping_candidate = _candidate(100, 109)
    conflicts = conflict_engine.check_train_conflicts(overlapping_candidate, task, models, horizon_minutes=200)
    train_conflicts = [c for c in conflicts if c["train_no"] == "T_SCHED"]
    assert len(train_conflicts) == 1
    assert train_conflicts[0]["severity"] in constants.HARD_SEVERITIES


def test_unresolved_train_never_produces_a_conflict():
    models = conflict_engine.build_train_position_models(_trains_df(), _schedules_df(), _stations_df())
    task = _task_row(track_line="UP")  # matches T_UNRESOLVED's direction
    candidate = _candidate(0, 2000)  # huge window, would surely "conflict" if it were resolved
    conflicts = conflict_engine.check_train_conflicts(candidate, task, models, horizon_minutes=2000)
    assert all(c["train_no"] != "T_UNRESOLVED" for c in conflicts)


def test_task_pair_km_overlap_conflict_detected():
    task_a = _task_row(task_id="TASK_A", section_id="SEC_X", track_line="UP", start_km=10, end_km=20,
                        required_machines="", required_gangs="")
    task_b = _task_row(task_id="TASK_B", section_id="SEC_X", track_line="UP", start_km=15, end_km=25,
                        required_machines="", required_gangs="")
    cand_a = _candidate(0, 60, "TASK_A")
    cand_b = _candidate(30, 90, "TASK_B")
    conflict = conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b)
    assert conflict is not None
    assert conflict["type"] == "TRACK_KM_OVERLAP"
    assert conflict["severity"] == constants.SEVERITY_CRITICAL


def test_task_pair_no_conflict_when_km_ranges_disjoint():
    task_a = _task_row(task_id="TASK_A", section_id="SEC_X", track_line="UP", start_km=10, end_km=20,
                        required_machines="", required_gangs="")
    task_b = _task_row(task_id="TASK_B", section_id="SEC_X", track_line="UP", start_km=20.5, end_km=25,
                        required_machines="", required_gangs="")
    cand_a = _candidate(0, 60, "TASK_A")
    cand_b = _candidate(0, 60, "TASK_B")
    assert conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b) is None


def test_shared_resource_conflict_detected_regardless_of_location():
    task_a = _task_row(task_id="TASK_A", section_id="SEC_X", start_km=0, end_km=1, required_machines="MACHINE_1")
    task_b = _task_row(task_id="TASK_B", section_id="SEC_Y", start_km=500, end_km=501, required_machines="MACHINE_1")
    cand_a = _candidate(0, 60, "TASK_A")
    cand_b = _candidate(30, 90, "TASK_B")
    conflict = conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b)
    assert conflict is not None
    assert conflict["type"] == "RESOURCE_CONFLICT"


def test_infrastructure_conflict_requires_no_yard():
    task_a = _task_row(task_id="TASK_A", station_code="B", requires_traffic_block=True, has_yard=False)
    task_b = _task_row(task_id="TASK_B", station_code="B", requires_traffic_block=True, has_yard=False)
    cand_a = _candidate(0, 60, "TASK_A")
    cand_b = _candidate(30, 90, "TASK_B")
    conflict = conflict_engine.check_infrastructure_conflict(cand_a, task_a, cand_b, task_b)
    assert conflict is not None
    assert conflict["type"] == "STATION_CAPACITY_CONFLICT"


def test_infrastructure_conflict_absent_when_station_has_yard():
    task_a = _task_row(task_id="TASK_A", station_code="B", requires_traffic_block=True, has_yard=True)
    task_b = _task_row(task_id="TASK_B", station_code="B", requires_traffic_block=True, has_yard=True)
    cand_a = _candidate(0, 60, "TASK_A")
    cand_b = _candidate(30, 90, "TASK_B")
    assert conflict_engine.check_infrastructure_conflict(cand_a, task_a, cand_b, task_b) is None
