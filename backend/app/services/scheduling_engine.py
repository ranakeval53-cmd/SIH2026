"""
Optimization & Scheduling Engine orchestrator - PS 26027, Team Techtonic.

Runs the full scheduling pipeline end to end:

    maintenance tasks + AI priority -> candidate block windows -> conflict
    detection -> block fusion -> CP-SAT constraint modeling -> global
    optimization -> schedule generation -> final validation
    -> data/output/optimized_block_plan.json

Usage:
    python -m backend.app.services.scheduling_engine

This module owns the OPTIMIZATION & SCHEDULING side of the AI layer. It
reuses (does not duplicate) the priority scoring, data loading, candidate
generation and conflict-detection primitives already built for the wider AI
& Intelligence Layer (see priority_engine.py, block_generator.py,
feasibility_engine.py, data_loader.py) and adds the pieces specific to this
engine: structural-conflict-aware block fusion, a CP-SAT model that chooses
globally (never greedily) between individual and fused block options, and a
block-centric final schedule + independent re-validation.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone

import pandas as pd

from backend.app.services import (
    block_fusion,
    block_generator,
    conflict_engine,
    constraint_engine,
    data_loader,
    feasibility_engine,
    optimizer,
    schedule_validator,
)
from backend.app.services import priority_engine as priority_engine_module
from backend.app.utils import constants


def _log(message: str) -> None:
    print(f"[scheduling_engine] {message}", flush=True)


def _generate_conflict_report(tasks_df: pd.DataFrame) -> list:
    """Every conflict type the spec asks us to surface, independent of which
    time windows end up chosen - this is reported regardless of what the
    optimizer eventually does with it."""
    conflicts = []
    conflicts.extend(conflict_engine.check_duplicate_tasks(tasks_df))

    for _, task_row in tasks_df.iterrows():
        duration_violation = conflict_engine.check_duration_validity(task_row)
        if duration_violation:
            conflicts.append(duration_violation)

    rows = list(tasks_df.iterrows())
    severity_by_type = {
        "TRACK_KM_OVERLAP": constants.SEVERITY_CRITICAL,
        "RESOURCE_CONFLICT": constants.SEVERITY_CRITICAL,
        "STATION_CAPACITY_CONFLICT": constants.SEVERITY_HIGH,
    }
    for i, (_, task_a) in enumerate(rows):
        for _, task_b in rows[i + 1:]:
            reason_type = conflict_engine.structural_conflict_reason(task_a, task_b)
            if reason_type is None:
                continue
            conflicts.append(
                {
                    "type": reason_type,
                    "severity": severity_by_type.get(reason_type, constants.SEVERITY_HIGH),
                    "task_a": task_a["task_id"],
                    "task_b": task_b["task_id"],
                    "reason": (
                        f"{task_a['task_id']} and {task_b['task_id']} structurally conflict "
                        f"({reason_type}); resolved either by block fusion (sequential shared "
                        f"block) or by mutual-exclusion scheduling."
                    ),
                }
            )
    return conflicts


def _lost_to_tasks(task_id, task_option_ids, selected_option_ids, mutual_exclusions_applied):
    my_options = set(task_option_ids.get(task_id, []))
    winners = set()
    for exclusion in mutual_exclusions_applied:
        option_a, option_b = exclusion["option_a"], exclusion["option_b"]
        if option_a in my_options and option_b in selected_option_ids:
            winners.add(exclusion["task_b"])
        elif option_b in my_options and option_a in selected_option_ids:
            winners.add(exclusion["task_a"])
    return sorted(winners)


def run(horizon_minutes: int = None, step_minutes: int = None, write_output: bool = True) -> dict:
    horizon_minutes = horizon_minutes or constants.PLANNING_HORIZON_MINUTES
    step_minutes = step_minutes or constants.CANDIDATE_STEP_MINUTES
    started_at = time.time()

    _log("[1/9] Loading project data from data/processed/ ...")
    data = data_loader.load_processed_data()
    _log(f"      {len(data.tasks)} maintenance tasks, {len(data.trains)} trains, {len(data.schedules)} schedule stops.")

    _log("[1/9] Calculating AI priority scores ...")
    priority_results = priority_engine_module.compute_priorities(data.task_features)
    priority_by_task = {r["task_id"]: r["priority_score"] for r in priority_results}
    priority_class_by_task = {r["task_id"]: r["priority_class"] for r in priority_results}

    _log("[2/9] Generating candidate block windows ...")
    raw_candidates_by_task = block_generator.generate_all_candidates(data.tasks, horizon_minutes, step_minutes)

    _log("[3/9] Detecting conflicts (train/task/resource/infrastructure/duplicate/duration) ...")
    train_models = conflict_engine.build_train_position_models(data.trains, data.schedules, data.stations)
    conflicts_report = _generate_conflict_report(data.tasks)

    task_rows = {row["task_id"]: row for _, row in data.tasks.iterrows()}
    feasible_candidates_by_task = {}
    candidate_meta_by_task = {}
    for task_id, raw_candidates in raw_candidates_by_task.items():
        annotated = feasibility_engine.filter_feasible_candidates(
            raw_candidates, task_rows[task_id], train_models, horizon_minutes
        )
        feasible = [c for c in annotated if c["status"] == "FEASIBLE"]
        feasible_candidates_by_task[task_id] = feasible
        candidate_meta_by_task[task_id] = {"total": len(raw_candidates), "feasible": len(feasible)}
    total_feasible = sum(v["feasible"] for v in candidate_meta_by_task.values())
    _log(f"      {total_feasible} individually feasible candidate windows across all tasks.")

    _log("[4/9] Running block fusion ...")
    fusion_candidates_by_pair, fusion_rejections = block_fusion.generate_all_fusion_candidates(
        data.tasks, horizon_minutes, step_minutes, train_models
    )
    fusable_pairs = block_fusion.find_fusable_task_pairs(data.tasks)
    _log(
        f"      {len(fusable_pairs)} structurally-related task pair(s) evaluated for fusion, "
        f"{len(fusion_candidates_by_pair)} pair(s) produced a feasible fused block option, "
        f"{len(fusion_rejections)} rejected."
    )

    _log("[5/9] Building CP-SAT constraint model ...")
    built = constraint_engine.build_model(
        data.tasks, feasible_candidates_by_task, fusion_candidates_by_pair, priority_by_task, horizon_minutes, step_minutes
    )
    _log(
        f"      {len(built['options'])} block options ({sum(1 for o in built['options'].values() if o['is_fused'])} fused), "
        f"{len(built['mutual_exclusions_applied'])} mutual-exclusion constraints."
    )

    _log("[6/9] Solving globally with OR-Tools CP-SAT ...")
    opt_result = optimizer.solve_model(built)
    _log(f"      Solver status: {opt_result['status']}, objective={opt_result['objective_value']}.")

    _log("[7/9] Generating final schedule ...")
    selected_option_ids = list(opt_result["selected_option_ids"])

    _log("[8/9] Running final validation (re-checked independently of the solver) ...")
    selected_options = [built["options"][oid] for oid in selected_option_ids]
    validation = schedule_validator.validate_schedule(selected_options, data.tasks, train_models, horizon_minutes)
    dropped_option_ids = []
    while validation["status"] == "REJECTED":
        offending = set()
        for v in validation["violations"]:
            for key in ("option_id", "option_a", "option_b"):
                if v.get(key):
                    offending.add(v[key])
        if not offending:
            break
        selected_option_ids = [oid for oid in selected_option_ids if oid not in offending]
        dropped_option_ids.extend(offending)
        selected_options = [built["options"][oid] for oid in selected_option_ids]
        validation = schedule_validator.validate_schedule(selected_options, data.tasks, train_models, horizon_minutes)
    if dropped_option_ids:
        _log(f"      Validator rejected and dropped options: {dropped_option_ids}. Re-validated as {validation['status']}.")
    else:
        _log(f"      Validation status: {validation['status']}")

    output = _assemble_output(
        data=data,
        priority_results=priority_results,
        priority_by_task=priority_by_task,
        priority_class_by_task=priority_class_by_task,
        built=built,
        opt_result=opt_result,
        selected_option_ids=selected_option_ids,
        candidate_meta_by_task=candidate_meta_by_task,
        fusion_rejections=fusion_rejections,
        fusable_pairs=fusable_pairs,
        conflicts_report=conflicts_report,
        validation=validation,
        train_models=train_models,
        horizon_minutes=horizon_minutes,
        step_minutes=step_minutes,
        started_at=started_at,
    )

    if write_output:
        _log(f"[9/9] Writing {constants.OPTIMIZED_BLOCK_PLAN_PATH} ...")
        os.makedirs(constants.DATA_OUTPUT_DIR, exist_ok=True)
        with open(constants.OPTIMIZED_BLOCK_PLAN_PATH, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, default=str)
        _log("      Done.")

    return output


def _assemble_output(
    *,
    data,
    priority_results,
    priority_by_task,
    priority_class_by_task,
    built,
    opt_result,
    selected_option_ids,
    candidate_meta_by_task,
    fusion_rejections,
    fusable_pairs,
    conflicts_report,
    validation,
    train_models,
    horizon_minutes,
    step_minutes,
    started_at,
) -> dict:
    tasks_df = data.tasks
    task_rows = {row["task_id"]: row for _, row in tasks_df.iterrows()}
    options = built["options"]
    task_option_ids = built["task_option_ids"]

    selected_option_ids_set = set(selected_option_ids)
    ordered_selected = sorted((options[oid] for oid in selected_option_ids), key=lambda o: o["block_start"])

    blocks = []
    scheduled_tasks = []
    scheduled_task_ids = set()

    for index, option in enumerate(ordered_selected, start=1):
        block_id = f"BLK_{index:04d}"
        task_details = []
        for task_id in option["task_ids"]:
            task_row = task_rows[task_id]
            sub_window = option["sub_windows"][task_id]
            detail = {
                "task_id": task_id,
                "task_name": task_row.get("task_name"),
                "department": task_row.get("department"),
                "section_id": task_row.get("section_id"),
                "track_line": task_row.get("track_line"),
                "station_code": task_row.get("station_code"),
                "start_km": task_row.get("start_km"),
                "end_km": task_row.get("end_km"),
                "start_time": _label(sub_window[0]),
                "end_time": _label(sub_window[1]),
                "priority_score": priority_by_task.get(task_id),
                "priority_class": priority_class_by_task.get(task_id),
            }
            task_details.append(detail)
            scheduled_task_ids.add(task_id)
            scheduled_tasks.append(
                {
                    "task_id": task_id,
                    "block_id": block_id,
                    "fused": option["is_fused"],
                    "start_time": detail["start_time"],
                    "end_time": detail["end_time"],
                    "priority_score": detail["priority_score"],
                    "priority_class": detail["priority_class"],
                    "department": detail["department"],
                    "section_id": detail["section_id"],
                    "track_line": detail["track_line"],
                    "station_code": detail["station_code"],
                }
            )

        soft_conflicts = []
        for task_id, conflicts in option["soft_train_conflicts"].items():
            for c in conflicts:
                soft_conflicts.append({"task_id": task_id, **{k: v for k, v in c.items() if k != "position_model_tier"}})

        blocks.append(
            {
                "block_id": block_id,
                "start_time": option["start_time"],
                "end_time": option["end_time"],
                "duration_minutes": option["block_end"] - option["block_start"],
                "fused": option["is_fused"],
                "fusion_reason": option["fusion_reason"],
                "tasks": task_details,
                "departments": sorted({d["department"] for d in task_details if d["department"]}),
                "sections": sorted({d["section_id"] for d in task_details if d["section_id"]}),
                "track_lines": sorted({d["track_line"] for d in task_details if d["track_line"]}),
                "stations": sorted({d["station_code"] for d in task_details if d["station_code"]}),
                "priority_score": max((d["priority_score"] for d in task_details), default=None),
                "conflicts": soft_conflicts,
                "status": "SCHEDULED",
            }
        )

    unscheduled_tasks = []
    for _, task_row in tasks_df.iterrows():
        task_id = task_row["task_id"]
        if task_id in scheduled_task_ids:
            continue
        meta = candidate_meta_by_task.get(task_id, {"total": 0, "feasible": 0})
        has_fusion_option = any(
            task_id in options[oid]["task_ids"] for oid in task_option_ids.get(task_id, []) if options[oid]["is_fused"]
        )
        if meta["total"] == 0:
            reasons = ["required_duration_mins exceeds the planning horizon; no candidate window exists."]
        elif meta["feasible"] == 0 and not has_fusion_option:
            reasons = [f"All {meta['total']} candidate windows hit a hard conflict; no conflict-free window found."]
        else:
            lost_to = _lost_to_tasks(task_id, task_option_ids, selected_option_ids_set, built["mutual_exclusions_applied"])
            if lost_to:
                reasons = [
                    f"A conflict-free window existed but the optimizer allocated the shared "
                    f"track/resource to higher-priority task(s) {', '.join(lost_to)} instead."
                ]
            else:
                reasons = ["The optimizer did not select this task in the priority-maximizing global solution."]
        unscheduled_tasks.append(
            {
                "task_id": task_id,
                "priority_score": priority_by_task.get(task_id),
                "priority_class": priority_class_by_task.get(task_id),
                "status": "UNSCHEDULED",
                "reasons": reasons,
            }
        )

    fused_blocks = [b for b in blocks if b["fused"]]
    total_tasks = len(tasks_df)
    total_priority = sum(priority_by_task.values()) or 1.0
    scheduled_priority = sum(t["priority_score"] for t in scheduled_tasks if t["priority_score"] is not None)
    total_required_minutes = int(pd.to_numeric(tasks_df["required_duration_mins"], errors="coerce").fillna(0).sum())
    scheduled_minutes = sum(b["duration_minutes"] for b in blocks)

    metrics = {
        "total_tasks": total_tasks,
        "scheduled_task_count": len(scheduled_tasks),
        "unscheduled_task_count": len(unscheduled_tasks),
        "task_completion_rate_pct": round(len(scheduled_tasks) / total_tasks * 100, 2) if total_tasks else 0.0,
        "priority_weighted_completion_pct": round(scheduled_priority / total_priority * 100, 2),
        "total_blocks": len(blocks),
        "fused_block_count": len(fused_blocks),
        "fused_task_count": sum(len(b["tasks"]) for b in fused_blocks),
        "blocks_saved_by_fusion": sum(len(b["tasks"]) - 1 for b in fused_blocks),
        "fusable_pairs_evaluated": len(fusable_pairs),
        "fusion_candidates_created": sum(1 for oid in options if options[oid]["is_fused"]),
        "fusion_rejections": len(fusion_rejections),
        "total_required_maintenance_minutes": total_required_minutes,
        "scheduled_maintenance_minutes": scheduled_minutes,
        "maintenance_backlog_minutes_remaining": total_required_minutes - scheduled_minutes,
        "soft_train_conflicts_accepted": sum(len(b["conflicts"]) for b in blocks),
    }

    return {
        "status": validation["status"],
        "blocks": blocks,
        "scheduled_tasks": scheduled_tasks,
        "unscheduled_tasks": unscheduled_tasks,
        "conflicts": conflicts_report,
        "fusion": {
            "fusable_pairs_evaluated": fusable_pairs,
            "fusion_rejections": fusion_rejections,
        },
        "metrics": metrics,
        "validation": validation,
        "meta": {
            "team": constants.TEAM_NAME,
            "problem_statement_id": constants.PROBLEM_STATEMENT_ID,
            "problem_statement_title": constants.PROBLEM_STATEMENT_TITLE,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "planning_horizon_minutes": horizon_minutes,
            "planning_horizon_note": constants.HORIZON_REFERENCE_LABEL,
            "candidate_step_minutes": step_minutes,
            "optimizer_status": opt_result["status"],
            "optimizer_objective_value": opt_result["objective_value"],
            "runtime_seconds": round(time.time() - started_at, 3),
        },
        "priority_scores": priority_results,
    }


def _label(minute: int) -> str:
    from backend.app.utils import time_utils

    return time_utils.minutes_to_label(minute)


def main() -> int:
    output = run()
    print(
        json.dumps(
            {
                "status": output["status"],
                "scheduled_tasks": len(output["scheduled_tasks"]),
                "unscheduled_tasks": len(output["unscheduled_tasks"]),
                "total_blocks": output["metrics"]["total_blocks"],
                "fused_block_count": output["metrics"]["fused_block_count"],
            },
            indent=2,
        )
    )
    return 0 if output["status"] == "APPROVED" else 1


if __name__ == "__main__":
    sys.exit(main())
