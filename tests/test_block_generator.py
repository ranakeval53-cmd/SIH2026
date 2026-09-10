import pandas as pd

from backend.app.services import block_generator


def _task_row(**overrides):
    base = {"task_id": "T1", "required_duration_mins": 60}
    base.update(overrides)
    return pd.Series(base)


def test_candidate_count_matches_horizon_and_step():
    task = _task_row(required_duration_mins=60)
    candidates = block_generator.generate_candidates(task, horizon_minutes=240, step_minutes=60)
    # starts at 0, 60, 120, 180 (180+60=240 still fits) -> 4 candidates
    assert len(candidates) == 4
    assert [c["start_minute"] for c in candidates] == [0, 60, 120, 180]
    assert all(c["end_minute"] - c["start_minute"] == 60 for c in candidates)


def test_candidate_fields_are_well_formed():
    task = _task_row(task_id="TX", required_duration_mins=30)
    candidates = block_generator.generate_candidates(task, horizon_minutes=60, step_minutes=30)
    assert len(candidates) == 2
    first = candidates[0]
    assert first["task_id"] == "TX"
    assert first["status"] == "CANDIDATE"
    assert first["conflicting_trains"] == []
    assert first["conflicting_tasks"] == []
    assert first["start_time"] == "D1 00:00"
    assert first["end_time"] == "D1 00:30"


def test_insufficient_window_when_duration_exceeds_horizon():
    task = _task_row(required_duration_mins=500)
    candidates = block_generator.generate_candidates(task, horizon_minutes=240, step_minutes=60)
    assert candidates == []


def test_invalid_or_missing_duration_produces_no_candidates():
    task = _task_row(required_duration_mins=None)
    assert block_generator.generate_candidates(task, horizon_minutes=240, step_minutes=60) == []

    task_zero = _task_row(required_duration_mins=0)
    assert block_generator.generate_candidates(task_zero, horizon_minutes=240, step_minutes=60) == []


def test_generate_all_candidates_keys_by_task_id():
    tasks_df = pd.DataFrame(
        [
            {"task_id": "A", "required_duration_mins": 60},
            {"task_id": "B", "required_duration_mins": 120},
        ]
    )
    result = block_generator.generate_all_candidates(tasks_df, horizon_minutes=240, step_minutes=60)
    assert set(result.keys()) == {"A", "B"}
    assert len(result["A"]) == 4
    assert len(result["B"]) == 3
