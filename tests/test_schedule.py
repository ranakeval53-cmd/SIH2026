import pandas as pd

from backend.app.services import block_fusion, conflict_engine, scheduling_engine, schedule_validator
from backend.app.utils import constants


def _task_row(**overrides):
    base = {
        "task_id": "T1",
        "department": "TMS",
        "task_name": "Test task",
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
    return pd.Series(base)


# ---------------------------------------------------------------------------
# Successful / failed block fusion
# ---------------------------------------------------------------------------

def test_successful_block_fusion_produces_sequential_non_overlapping_subwindows():
    task_a = _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5,
                        required_machines="MACHINE_1", required_duration_mins=60)
    task_b = _task_row(task_id="B", section_id="SEC_Y", track_line="UP", start_km=500, end_km=505,
                        required_machines="MACHINE_1", required_duration_mins=90)

    candidates = block_fusion.generate_fusion_candidates(
        task_a, task_b, "RESOURCE_CONFLICT", horizon_minutes=480, step_minutes=60, train_models={}
    )

    assert len(candidates) > 0
    first = candidates[0]
    assert first["is_fused"] is True
    assert set(first["task_ids"]) == {"A", "B"}
    win_a = first["sub_windows"]["A"]
    win_b = first["sub_windows"]["B"]
    assert win_a["end_minute"] == win_b["start_minute"]  # strictly sequential, back-to-back
    assert win_b["end_minute"] - win_a["start_minute"] == 150  # combined duration
    assert first["block_end"] - first["block_start"] == 150


def test_failed_block_fusion_when_combined_duration_exceeds_cap():
    task_a = _task_row(task_id="A", required_duration_mins=250, required_machines="M1")
    task_b = _task_row(task_id="B", required_duration_mins=200, required_machines="M1")
    assert task_a["required_duration_mins"] + task_b["required_duration_mins"] > constants.FUSION_MAX_COMBINED_DURATION_MINUTES

    candidates = block_fusion.generate_fusion_candidates(
        task_a, task_b, "RESOURCE_CONFLICT", horizon_minutes=2880, step_minutes=60, train_models={}
    )
    assert candidates == []


def test_failed_block_fusion_when_no_conflict_free_sequential_slot_exists():
    task_a = _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5,
                        required_duration_mins=30, required_machines="M1")
    task_b = _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=50, end_km=55,
                        required_duration_mins=30, required_machines="M1")

    # A premium (priority_rank=1) train sits on B's km range for the ENTIRE
    # horizon -> every possible sequential start hits a hard conflict for B.
    blocking_train = conflict_engine.TrainModel(
        train_no="BLOCKER",
        direction="UP",
        priority_rank=1,
        is_freight=False,
        tier=conflict_engine.TIER_SCHEDULE,
        points=[(0.0, 52.0), (120.0, 52.0)],
    )
    train_models = {"BLOCKER": blocking_train}

    candidates = block_fusion.generate_fusion_candidates(
        task_a, task_b, "TRACK_KM_OVERLAP", horizon_minutes=120, step_minutes=30, train_models=train_models
    )
    assert candidates == []


def test_find_fusable_task_pairs_only_returns_structurally_conflicting_pairs():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5, required_machines="M1"),
            _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=0, end_km=5, required_machines="M1"),
            _task_row(task_id="C", section_id="SEC_Z", track_line="DN", start_km=999, end_km=1000,
                      required_machines="M2", required_gangs="G2", station_code="ZZZ"),
        ]
    )
    pairs = block_fusion.find_fusable_task_pairs(tasks_df)
    pair_task_ids = {frozenset((a, b)) for a, b, _ in pairs}
    assert frozenset(("A", "B")) in pair_task_ids
    assert frozenset(("A", "C")) not in pair_task_ids
    assert frozenset(("B", "C")) not in pair_task_ids


# ---------------------------------------------------------------------------
# Schedule validator
# ---------------------------------------------------------------------------

def test_schedule_validator_approves_clean_schedule():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_Y", start_km=100, end_km=105),
        ]
    )
    selected_options = [
        {"option_id": "OPT_A", "task_ids": ["A"], "is_fused": False, "sub_windows": {"A": (0, 60)}},
        {"option_id": "OPT_B", "task_ids": ["B"], "is_fused": False, "sub_windows": {"B": (0, 60)}},
    ]
    result = schedule_validator.validate_schedule(selected_options, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "APPROVED"
    assert result["violations"] == []


def test_schedule_validator_rejects_overlapping_selected_blocks():
    tasks_df = pd.DataFrame(
        [
            _task_row(task_id="A", section_id="SEC_X", track_line="UP", start_km=0, end_km=5),
            _task_row(task_id="B", section_id="SEC_X", track_line="UP", start_km=2, end_km=8),
        ]
    )
    # Deliberately invalid: two different options overlap in both time AND km on the same section/line.
    selected_options = [
        {"option_id": "OPT_A", "task_ids": ["A"], "is_fused": False, "sub_windows": {"A": (0, 60)}},
        {"option_id": "OPT_B", "task_ids": ["B"], "is_fused": False, "sub_windows": {"B": (30, 90)}},
    ]
    result = schedule_validator.validate_schedule(selected_options, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "REJECTED"
    assert any(v["type"] == "TRACK_KM_OVERLAP" for v in result["violations"])


def test_schedule_validator_rejects_duplicate_task_across_options():
    tasks_df = pd.DataFrame([_task_row(task_id="A", section_id="SEC_X", start_km=0, end_km=5)])
    selected_options = [
        {"option_id": "OPT_1", "task_ids": ["A"], "is_fused": False, "sub_windows": {"A": (0, 60)}},
        {"option_id": "OPT_2", "task_ids": ["A"], "is_fused": False, "sub_windows": {"A": (100, 160)}},
    ]
    result = schedule_validator.validate_schedule(selected_options, tasks_df, train_models={}, horizon_minutes=200)
    assert result["status"] == "REJECTED"
    assert any(v["type"] == "DUPLICATE_TASK_SCHEDULING" for v in result["violations"])


# ---------------------------------------------------------------------------
# End-to-end scheduling_engine run against the real processed dataset
# ---------------------------------------------------------------------------

def test_end_to_end_scheduling_engine_run_on_real_dataset():
    output = scheduling_engine.run(write_output=False)

    assert output["status"] == "APPROVED"
    assert output["validation"]["violations"] == []

    total_tasks = output["metrics"]["total_tasks"]
    assert total_tasks == len(output["scheduled_tasks"]) + len(output["unscheduled_tasks"])

    scheduled_ids_in_blocks = {t["task_id"] for b in output["blocks"] for t in b["tasks"]}
    scheduled_ids_flat = {t["task_id"] for t in output["scheduled_tasks"]}
    assert scheduled_ids_in_blocks == scheduled_ids_flat

    # Every block's own duration must equal the sum of its tasks' individual durations.
    for block in output["blocks"]:
        assert block["duration_minutes"] > 0
        assert block["status"] == "SCHEDULED"

    assert output["metrics"]["total_blocks"] == len(output["blocks"])
    assert output["metrics"]["fused_block_count"] == sum(1 for b in output["blocks"] if b["fused"])
