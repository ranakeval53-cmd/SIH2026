"""
Schedule Validator.

Independent safety net for the Scheduling Engine: re-derives every hard
conflict check from scratch against the FINAL set of selected block options
(individual or fused) the optimizer produced. Trusts nothing upstream -
not the optimizer's bookkeeping, and not block_fusion's own internal
sequencing check either (fusion candidates are re-verified here too).

Any hard violation -> the whole plan is REJECTED (never shipped as valid).
No violations -> APPROVED.

Public API:
    validate_schedule(selected_options, tasks_df, train_models, horizon_minutes) -> dict
"""

from __future__ import annotations

from typing import Dict, List

import pandas as pd

from backend.app.services import conflict_engine, feasibility_engine
from backend.app.utils import constants


def _sub_candidate(task_id: str, window) -> dict:
    return {"task_id": task_id, "start_minute": window[0], "end_minute": window[1]}


def validate_schedule(
    selected_options: List[dict],
    tasks_df: pd.DataFrame,
    train_models: Dict,
    horizon_minutes: int,
) -> dict:
    violations: List[dict] = []
    rows = {row["task_id"]: row for _, row in tasks_df.iterrows()}

    # 1. Duplicate task_id in the source data.
    violations.extend(conflict_engine.check_duplicate_tasks(tasks_df))

    # 2. Every sub-task inside every selected option must itself be a valid,
    #    hard-conflict-free window (duration, time range, train conflicts).
    for option in selected_options:
        for task_id, window in option["sub_windows"].items():
            task_row = rows.get(task_id)
            if task_row is None:
                violations.append(
                    {
                        "type": "UNKNOWN_TASK",
                        "severity": constants.SEVERITY_CRITICAL,
                        "task_id": task_id,
                        "reason": f"Selected option {option['option_id']} references unknown task_id {task_id}",
                    }
                )
                continue

            duration_violation = conflict_engine.check_duration_validity(task_row)
            if duration_violation:
                violations.append(duration_violation)

            candidate = _sub_candidate(task_id, window)
            time_violation = conflict_engine.check_time_range_validity(candidate, horizon_minutes)
            if time_violation:
                violations.append(time_violation)
                continue

            assessment = feasibility_engine.assess_candidate(candidate, task_row, train_models, horizon_minutes)
            if not assessment["feasible"]:
                violations.append(
                    {
                        "type": "INFEASIBLE_SELECTED_SUBTASK",
                        "severity": constants.SEVERITY_CRITICAL,
                        "task_id": task_id,
                        "option_id": option["option_id"],
                        "reason": "; ".join(assessment["hard_reasons"]),
                    }
                )

    # 3. Intra-option conflicts: for a fused option, re-verify its own tasks
    #    don't conflict with each other (never trust block_fusion's own claim).
    for option in selected_options:
        task_ids = option["task_ids"]
        for i, task_id_a in enumerate(task_ids):
            for task_id_b in task_ids[i + 1:]:
                task_a, task_b = rows.get(task_id_a), rows.get(task_id_b)
                if task_a is None or task_b is None:
                    continue
                cand_a = _sub_candidate(task_id_a, option["sub_windows"][task_id_a])
                cand_b = _sub_candidate(task_id_b, option["sub_windows"][task_id_b])
                conflict = conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b)
                if conflict is None:
                    conflict = conflict_engine.check_infrastructure_conflict(cand_a, task_a, cand_b, task_b)
                if conflict is not None:
                    violations.append(
                        {
                            "type": conflict["type"],
                            "severity": conflict["severity"],
                            "task_id": task_id_a,
                            "other_task_id": task_id_b,
                            "option_id": option["option_id"],
                            "reason": f"[WITHIN FUSED BLOCK] {conflict['reason']}",
                        }
                    )

    # 4. Cross-option conflicts: two DIFFERENT options must never place two
    #    (different) tasks into an incompatible overlap.
    for i, option_a in enumerate(selected_options):
        for option_b in selected_options[i + 1:]:
            for task_id_a, window_a in option_a["sub_windows"].items():
                for task_id_b, window_b in option_b["sub_windows"].items():
                    if task_id_a == task_id_b:
                        violations.append(
                            {
                                "type": "DUPLICATE_TASK_SCHEDULING",
                                "severity": constants.SEVERITY_CRITICAL,
                                "task_id": task_id_a,
                                "reason": (
                                    f"{task_id_a} appears in two different selected blocks "
                                    f"({option_a['option_id']} and {option_b['option_id']})"
                                ),
                            }
                        )
                        continue
                    task_a, task_b = rows.get(task_id_a), rows.get(task_id_b)
                    if task_a is None or task_b is None:
                        continue
                    cand_a = _sub_candidate(task_id_a, window_a)
                    cand_b = _sub_candidate(task_id_b, window_b)
                    conflict = conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b)
                    if conflict is None:
                        conflict = conflict_engine.check_infrastructure_conflict(cand_a, task_a, cand_b, task_b)
                    if conflict is not None:
                        violations.append(
                            {
                                "type": conflict["type"],
                                "severity": conflict["severity"],
                                "task_id": task_id_a,
                                "other_task_id": task_id_b,
                                "option_a": option_a["option_id"],
                                "option_b": option_b["option_id"],
                                "reason": conflict["reason"],
                            }
                        )

    status = "REJECTED" if violations else "APPROVED"
    return {"status": status, "violations": violations}
