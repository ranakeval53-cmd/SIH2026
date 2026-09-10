import pandas as pd

from backend.app.services import final_validator


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
        "requires_power_block": False,
        "requires_st_disconnection": "",
        "required_machines": "",
        "required_gangs": "",
        "has_yard": True,
    }
    base.update(overrides)
    return base


def _block(task_id, start, end):
    return {
        "candidate_id": f"{task_id}__{start}_{end}",
        "task_id": task_id,
        "start_minute": start,
        "end_minute": end,
        "start_time": f"m{start}",
        "end_time": f"m{end}",
        "status": "SCHEDULED",
        "conflicting_trains": [],
        "conflicting_tasks": [],
        "reason": "",
    }


def test_duplicate_task_id_is_rejected():
    tasks_df = pd.DataFrame([_task_row(task_id="T1"), _task_row(task_id="T1")])
    selection = {}
    result = final_validator.validate_selection(selection, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "REJECTED"
    assert any(v["type"] == "DUPLICATE_TASK_ID" for v in result["violations"])


def test_clean_non_conflicting_selection_is_approved():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_Y", start_km=100, end_km=105),
        ]
    )
    selection = {"A": _block("A", 0, 60), "B": _block("B", 0, 60)}
    result = final_validator.validate_selection(selection, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "APPROVED"
    assert result["violations"] == []


def test_overlapping_selected_blocks_are_rejected():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=2, end_km=8),
        ]
    )
    # Deliberately construct an invalid selection with overlapping time AND
    # overlapping km on the same section/line - this must never pass validation.
    selection = {"A": _block("A", 0, 60), "B": _block("B", 30, 90)}
    result = final_validator.validate_selection(selection, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "REJECTED"
    assert any(v["type"] == "TRACK_KM_OVERLAP" for v in result["violations"])


def test_unscheduled_tasks_do_not_affect_validation():
    tasks_df = pd.DataFrame([_task_row(task_id="A")])
    selection = {"A": None}
    result = final_validator.validate_selection(selection, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "APPROVED"
