"""
AI & Intelligence Layer orchestrator - PS 26027, Team Techtonic.

Runs the full pipeline end to end:

    processed data -> priority engine -> block generator -> conflict engine
    -> feasibility engine -> OR-Tools optimizer -> final validator
    -> explainability / recommendation engine -> data/output/optimized_blocks.json

Usage:
    python -m backend.app.services.run_ai
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone

import pandas as pd

from backend.app.services import (
    block_generator,
    conflict_engine,
    data_loader,
    explainability_engine,
    feasibility_engine,
    final_validator,
    optimizer,
    recommendation_engine,
)
from backend.app.services import priority_engine as priority_engine_module
from backend.app.utils import constants, time_utils


def _log(message: str) -> None:
    print(f"[run_ai] {message}", flush=True)


def run(horizon_minutes: int = None, step_minutes: int = None, write_output: bool = True) -> dict:
    horizon_minutes = horizon_minutes or constants.PLANNING_HORIZON_MINUTES
    step_minutes = step_minutes or constants.CANDIDATE_STEP_MINUTES
    started_at = time.time()

    _log("[1/8] Loading processed data from data/processed/ ...")
    data = data_loader.load_processed_data()
    _log(
        f"      {len(data.tasks)} maintenance tasks, {len(data.stations)} stations, "
        f"{len(data.trains)} trains, {len(data.schedules)} schedule stops."
    )

    _log("[2/8] Calculating priority scores ...")
    priority_results = priority_engine_module.compute_priorities(data.task_features)
    priority_by_task = {r["task_id"]: r for r in priority_results}
    _log(f"      {len(priority_results)} tasks scored.")

    _log("[3/8] Generating candidate block windows ...")
    raw_candidates_by_task = block_generator.generate_all_candidates(data.tasks, horizon_minutes, step_minutes)
    total_raw = sum(len(v) for v in raw_candidates_by_task.values())
    _log(f"      {total_raw} raw candidates across {len(raw_candidates_by_task)} tasks.")

    _log("[4/8] Building train position models + running conflict/feasibility checks ...")
    train_models = conflict_engine.build_train_position_models(data.trains, data.schedules, data.stations)
    resolved_trains = [t for t, m in train_models.items() if m.resolved]
    unresolved = conflict_engine.unresolved_trains(train_models)
    _log(f"      {len(resolved_trains)}/{len(train_models)} trains have a resolvable position model.")
    if unresolved:
        _log(f"      Unresolved (excluded from geometric conflict checks): {unresolved}")

    task_rows = {row["task_id"]: row for _, row in data.tasks.iterrows()}
    feasible_candidates_by_task = {}
    candidates_meta_by_task = {}
    for task_id, raw_candidates in raw_candidates_by_task.items():
        annotated = feasibility_engine.filter_feasible_candidates(
            raw_candidates, task_rows[task_id], train_models, horizon_minutes
        )
        feasible = [c for c in annotated if c["status"] == "FEASIBLE"]
        feasible_candidates_by_task[task_id] = feasible
        candidates_meta_by_task[task_id] = {
            "total": len(raw_candidates),
            "feasible": len(feasible),
            "infeasible": len(annotated) - len(feasible),
        }
    total_feasible = sum(v["feasible"] for v in candidates_meta_by_task.values())
    _log(f"      {total_feasible}/{total_raw} candidates are individually feasible (no hard train conflict).")

    _log("[5/8] Solving with OR-Tools CP-SAT optimizer ...")
    priority_score_by_task = {tid: r["priority_score"] for tid, r in priority_by_task.items()}
    opt_result = optimizer.solve(
        data.tasks, feasible_candidates_by_task, priority_score_by_task, horizon_minutes, step_minutes
    )
    _log(
        f"      Solver status: {opt_result['status']}, objective={opt_result['objective_value']}, "
        f"{len(opt_result['mutual_exclusions_applied'])} mutual-exclusion constraints applied."
    )

    _log("[6/8] Running final validation on the selected set ...")
    selection = opt_result["selection"]
    validation = final_validator.validate_selection(selection, data.tasks, train_models, horizon_minutes)
    dropped_tasks = []
    while validation["status"] == "REJECTED":
        offending_task_ids = {
            v.get("task_id") for v in validation["violations"] if v.get("task_id")
        } | {
            v.get("other_task_id") for v in validation["violations"] if v.get("other_task_id")
        }
        offending_task_ids.discard(None)
        if not offending_task_ids:
            break
        for task_id in offending_task_ids:
            if selection.get(task_id) is not None:
                selection[task_id] = None
                dropped_tasks.append(task_id)
        validation = final_validator.validate_selection(selection, data.tasks, train_models, horizon_minutes)
    if dropped_tasks:
        _log(f"      Validator rejected and dropped: {dropped_tasks}. Re-validated as {validation['status']}.")
    else:
        _log(f"      Validation status: {validation['status']}")

    _log("[7/8] Generating explanations ...")
    recommendations = recommendation_engine.build_recommendations(
        data.tasks, priority_by_task, selection, candidates_meta_by_task, opt_result["mutual_exclusions_applied"]
    )

    output = _assemble_output(
        data=data,
        priority_results=priority_results,
        selection=selection,
        candidates_meta_by_task=candidates_meta_by_task,
        opt_result=opt_result,
        validation=validation,
        recommendations=recommendations,
        train_models=train_models,
        unresolved_trains=unresolved,
        horizon_minutes=horizon_minutes,
        step_minutes=step_minutes,
        started_at=started_at,
    )

    if write_output:
        _log(f"[8/8] Writing {constants.OPTIMIZED_BLOCKS_PATH} ...")
        os.makedirs(constants.DATA_OUTPUT_DIR, exist_ok=True)
        with open(constants.OPTIMIZED_BLOCKS_PATH, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, default=str)
        _log("      Done.")

    return output


def _assemble_output(
    *,
    data,
    priority_results,
    selection,
    candidates_meta_by_task,
    opt_result,
    validation,
    recommendations,
    train_models,
    unresolved_trains,
    horizon_minutes,
    step_minutes,
    started_at,
) -> dict:
    tasks_df = data.tasks
    priority_by_task = {r["task_id"]: r for r in priority_results}

    scheduled_tasks = []
    unscheduled_tasks = []
    selected_blocks = []
    train_conflict_log = []

    for _, task_row in tasks_df.iterrows():
        task_id = task_row["task_id"]
        block = selection.get(task_id)
        priority_result = priority_by_task[task_id]

        if block is not None:
            assessment = block.get("_assessment", {})
            record = {
                "task_id": task_id,
                "task_name": task_row.get("task_name"),
                "department": task_row.get("department"),
                "section_id": task_row.get("section_id"),
                "track_line": task_row.get("track_line"),
                "station_code": task_row.get("station_code"),
                "start_km": task_row.get("start_km"),
                "end_km": task_row.get("end_km"),
                "start_time": block["start_time"],
                "end_time": block["end_time"],
                "start_minute": block["start_minute"],
                "end_minute": block["end_minute"],
                "priority_score": priority_result["priority_score"],
                "priority_class": priority_result["priority_class"],
                "soft_conflicts": [
                    {k: v for k, v in c.items() if k != "position_model_tier"}
                    for c in assessment.get("soft_train_conflicts", [])
                ],
            }
            scheduled_tasks.append(record)
            selected_blocks.append(
                {
                    "task_id": task_id,
                    "start_time": block["start_time"],
                    "end_time": block["end_time"],
                    "status": "SCHEDULED",
                    "conflicting_trains": [c["train_no"] for c in assessment.get("soft_train_conflicts", [])],
                    "reason": (
                        "Conflict-free on all hard constraints."
                        if not assessment.get("soft_train_conflicts")
                        else "Conflict-free on hard constraints; soft conflicts accepted."
                    ),
                }
            )
            for c in assessment.get("soft_train_conflicts", []):
                train_conflict_log.append({"task_id": task_id, **c})
        else:
            meta = candidates_meta_by_task.get(task_id, {"total": 0, "feasible": 0})
            reasons = []
            if meta["total"] == 0:
                reasons.append("Task duration exceeds the planning horizon; no candidate window exists.")
            elif meta["feasible"] == 0:
                reasons.append(
                    f"All {meta['total']} candidate windows hit a hard conflict; no conflict-free window found."
                )
            else:
                reasons.append(
                    f"{meta['feasible']} conflict-free window(s) existed but were not selected by the optimizer "
                    f"(lower priority than competing demands on shared track/resources)."
                )
            unscheduled_tasks.append({"task_id": task_id, "reasons": reasons})

    total_tasks = len(tasks_df)
    scheduled_count = len(scheduled_tasks)
    unscheduled_count = len(unscheduled_tasks)

    total_priority = sum(r["priority_score"] for r in priority_results) or 1.0
    scheduled_priority = sum(r["priority_score"] for r in scheduled_tasks)

    total_required_minutes = int(pd.to_numeric(tasks_df["required_duration_mins"], errors="coerce").fillna(0).sum())
    scheduled_minutes = sum((b["end_minute"] - b["start_minute"]) for b in scheduled_tasks)

    by_class = {}
    for r in priority_results:
        cls = r["priority_class"]
        by_class.setdefault(cls, {"total": 0, "scheduled": 0})
        by_class[cls]["total"] += 1
    for b in scheduled_tasks:
        by_class.setdefault(b["priority_class"], {"total": 0, "scheduled": 0})
        by_class[b["priority_class"]]["scheduled"] += 1

    asset_availability_metrics = {
        "scheduled_task_count": scheduled_count,
        "unscheduled_task_count": unscheduled_count,
        "task_completion_rate_pct": round(scheduled_count / total_tasks * 100, 2) if total_tasks else 0.0,
        "priority_weighted_completion_pct": round(scheduled_priority / total_priority * 100, 2),
        "total_required_maintenance_minutes": total_required_minutes,
        "scheduled_maintenance_minutes": scheduled_minutes,
        "maintenance_backlog_minutes_remaining": total_required_minutes - scheduled_minutes,
        "by_priority_class": by_class,
        "soft_train_conflicts_accepted": len(train_conflict_log),
    }

    summary = {
        "team": constants.TEAM_NAME,
        "problem_statement_id": constants.PROBLEM_STATEMENT_ID,
        "problem_statement_title": constants.PROBLEM_STATEMENT_TITLE,
        "total_tasks": total_tasks,
        "scheduled_tasks": scheduled_count,
        "unscheduled_tasks": unscheduled_count,
        "optimizer_status": opt_result["status"],
        "validation_status": validation["status"],
        "runtime_seconds": round(time.time() - started_at, 3),
    }

    return {
        "meta": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "planning_horizon_minutes": horizon_minutes,
            "planning_horizon_note": constants.HORIZON_REFERENCE_LABEL,
            "candidate_step_minutes": step_minutes,
            "unresolved_train_position_models": unresolved_trains,
            "source_files": [
                os.path.relpath(p, constants.REPO_ROOT)
                for p in (
                    constants.MAINTENANCE_TASKS_ENRICHED_CSV,
                    constants.TASK_FEATURES_CSV,
                    constants.STATIONS_CLEAN_CSV,
                    constants.TRAINS_CLEAN_CSV,
                    constants.SCHEDULES_CLEAN_CSV,
                )
            ],
        },
        "summary": summary,
        "priority_scores": priority_results,
        "scheduled_tasks": scheduled_tasks,
        "unscheduled_tasks": unscheduled_tasks,
        "selected_blocks": selected_blocks,
        "conflicts": {
            "mutual_exclusions_applied": opt_result["mutual_exclusions_applied"],
            "soft_train_conflicts_accepted": train_conflict_log,
        },
        "explanations": recommendations,
        "validation": validation,
        "asset_availability_metrics": asset_availability_metrics,
    }


def main() -> int:
    output = run()
    print(json.dumps(output["summary"], indent=2))
    return 0 if output["validation"]["status"] == "APPROVED" else 1


if __name__ == "__main__":
    sys.exit(main())
