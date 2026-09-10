import pandas as pd

from backend.app.services import constraint_engine, optimizer


def _task_row(**overrides):
    base = {
        "task_id": "T1",
        "section_id": "SEC_X",
        "track_line": "UP",
        "start_km": 0.0,
        "end_km": 5.0,
        "station_code": "S1",
        "required_duration_mins": 60,
        "requires_traffic_block": True,
        "required_machines": "",
        "required_gangs": "",
        "has_yard": True,
    }
    base.update(overrides)
    return base


def _candidate(task_id, start, end, soft_penalty=0):
    return {
        "candidate_id": f"{task_id}__{start}_{end}",
        "task_id": task_id,
        "start_minute": start,
        "end_minute": end,
        "start_time": f"m{start}",
        "end_time": f"m{end}",
        "status": "FEASIBLE",
        "conflicting_trains": [],
        "conflicting_tasks": [],
        "reason": "",
        "_assessment": {"soft_conflict_penalty": soft_penalty, "soft_train_conflicts": []},
    }


def test_mutual_exclusion_prevents_two_conflicting_tasks_scheduling_overlapping_time():
    # Same section/line, overlapping km ranges -> any time-overlapping pair is a hard conflict.
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=2, end_km=8),
        ]
    )
    # Both tasks only have ONE candidate each, and those candidates overlap in time.
    feasible_candidates_by_task = {
        "A": [_candidate("A", 0, 60)],
        "B": [_candidate("B", 30, 90)],
    }
    priority_by_task = {"A": 90.0, "B": 50.0}

    result = optimizer.solve(tasks_df, feasible_candidates_by_task, priority_by_task, horizon_minutes=200, step_minutes=30)

    assert result["status"] in ("OPTIMAL", "FEASIBLE")
    chosen = {tid: block is not None for tid, block in result["selection"].items()}
    # They cannot both be scheduled - the higher priority task (A) should win.
    assert sum(chosen.values()) == 1
    assert chosen["A"] is True
    assert chosen["B"] is False
    assert len(result["mutual_exclusions_applied"]) >= 1


def test_non_conflicting_tasks_are_both_scheduled():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_Y", track_line="UP", start_km=100, end_km=105),
        ]
    )
    feasible_candidates_by_task = {
        "A": [_candidate("A", 0, 60)],
        "B": [_candidate("B", 0, 60)],
    }
    priority_by_task = {"A": 90.0, "B": 50.0}

    result = optimizer.solve(tasks_df, feasible_candidates_by_task, priority_by_task, horizon_minutes=200, step_minutes=30)

    assert result["selection"]["A"] is not None
    assert result["selection"]["B"] is not None
    assert len(result["mutual_exclusions_applied"]) == 0


def test_higher_priority_preferred_when_only_one_slot_available_between_two_candidates():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
        ]
    )
    # Two tasks competing for the exact same single time slot on the same track.
    feasible_candidates_by_task = {
        "A": [_candidate("A", 0, 60)],
        "B": [_candidate("B", 0, 60)],
    }
    priority_by_task = {"A": 20.0, "B": 95.0}

    result = optimizer.solve(tasks_df, feasible_candidates_by_task, priority_by_task, horizon_minutes=200, step_minutes=30)

    assert result["selection"]["B"] is not None
    assert result["selection"]["A"] is None


def test_task_with_no_feasible_candidates_is_left_unscheduled():
    tasks_df = pd.DataFrame([_task_row(task_id="A")])
    feasible_candidates_by_task = {"A": []}
    priority_by_task = {"A": 80.0}

    result = optimizer.solve(tasks_df, feasible_candidates_by_task, priority_by_task, horizon_minutes=200, step_minutes=30)

    assert result["selection"]["A"] is None


# ---------------------------------------------------------------------------
# constraint_engine.build_model() + optimizer.solve_model():
# the Scheduling Engine's global (non-greedy), fusion-aware CP-SAT path.
# ---------------------------------------------------------------------------

def test_successful_cp_sat_optimization_picks_globally_best_combination():
    """Three tasks, two of which share a track and can ONLY be scheduled at the
    same single slot each has available; a naive greedy pass that scheduled
    tasks in task_id order would grab A first (lower priority) and starve B
    (higher priority). The global CP-SAT solve must not do that."""
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="C", section_id="SEC_Z", track_line="UP", start_km=200, end_km=205),
        ]
    )
    individual_candidates_by_task = {
        "A": [_candidate("A", 0, 60)],
        "B": [_candidate("B", 0, 60)],
        "C": [_candidate("C", 0, 60)],
    }
    priority_by_task = {"A": 10.0, "B": 99.0, "C": 50.0}

    built = constraint_engine.build_model(tasks_df, individual_candidates_by_task, {}, priority_by_task, 200, 30)
    result = optimizer.solve_model(built)

    assert result["status"] in ("OPTIMAL", "FEASIBLE")
    assert result["selection_by_task"]["B"] is not None
    assert result["selection_by_task"]["A"] is None
    assert result["selection_by_task"]["C"] is not None


def test_fused_option_lets_both_structurally_conflicting_tasks_complete():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5, required_machines="M1"),
            _task_row(task_id="B", section_id="SEC_Y", track_line="UP", start_km=500, end_km=505, required_machines="M1"),
        ]
    )
    individual_candidates_by_task = {
        "A": [_candidate("A", 0, 60)],
        "B": [_candidate("B", 0, 60)],
    }
    fused_candidate = {
        "candidate_id": "FUSED__A__B__0",
        "task_ids": ["A", "B"],
        "block_start": 0,
        "block_end": 120,
        "start_time": "D1 00:00",
        "end_time": "D1 02:00",
        "sub_windows": {
            "A": {"start_minute": 0, "end_minute": 60, "start_time": "D1 00:00", "end_time": "D1 01:00"},
            "B": {"start_minute": 60, "end_minute": 120, "start_time": "D1 01:00", "end_time": "D1 02:00"},
        },
        "assessment_by_task": {
            "A": {"soft_conflict_penalty": 0, "soft_train_conflicts": []},
            "B": {"soft_conflict_penalty": 0, "soft_train_conflicts": []},
        },
        "fusion_reason_type": "RESOURCE_CONFLICT",
        "fusion_reason": "shared machine M1",
        "status": "CANDIDATE",
    }
    priority_by_task = {"A": 80.0, "B": 80.0}

    built = constraint_engine.build_model(
        tasks_df, individual_candidates_by_task, {"A__FUSE__B": [fused_candidate]}, priority_by_task, 200, 30
    )
    result = optimizer.solve_model(built)

    # Individually, A and B overlap in time on the same machine -> mutually exclusive.
    # The fused option sequences them, so BOTH should complete via the SAME option.
    assert result["selection_by_task"]["A"] == "FUSED__A__B__0"
    assert result["selection_by_task"]["B"] == "FUSED__A__B__0"


def test_impossible_schedule_task_marked_unscheduled_with_no_options():
    tasks_df = pd.DataFrame([_task_row(task_id="A", required_duration_mins=99999)])
    # Duration exceeds the horizon -> block_generator would produce zero candidates;
    # simulate that directly here.
    built = constraint_engine.build_model(tasks_df, {"A": []}, {}, {"A": 90.0}, 200, 30)
    result = optimizer.solve_model(built)
    assert result["selection_by_task"]["A"] is None
