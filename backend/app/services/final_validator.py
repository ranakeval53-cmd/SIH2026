"""
Final Validator.

Independent safety net: re-runs the full conflict/constraint check against
the FINAL selected set of blocks the optimizer produced (never trusting the
solver's own bookkeeping). If it finds any hard violation the whole plan is
marked REJECTED; the caller (run_ai.py) then drops the offending task(s) and
re-validates rather than ever shipping an unvalidated schedule.

Public API:
    validate_selection(selection, tasks_df, train_models, horizon_minutes) -> dict
"""

from __future__ import annotations

from typing import Dict

import pandas as pd

from backend.app.services import conflict_engine, feasibility_engine
from backend.app.utils import constants


def validate_selection(
    selection: Dict[str, dict],
    tasks_df: pd.DataFrame,
    train_models: Dict,
    horizon_minutes: int,
) -> dict:
    violations = []

    rows = {row["task_id"]: row for _, row in tasks_df.iterrows()}

    duplicate_ids = feasibility_engine.find_duplicate_task_ids(tasks_df)
    if duplicate_ids:
        violations.append(
            {
                "type": "DUPLICATE_TASK_ID",
                "severity": constants.SEVERITY_CRITICAL,
                "reason": f"Duplicate task_id(s) in input data: {duplicate_ids}",
            }
        )

    scheduled = [(task_id, block) for task_id, block in selection.items() if block is not None]

    # 1. Per-block standalone validity + train conflicts.
    for task_id, block in scheduled:
        task_row = rows.get(task_id)
        if task_row is None:
            violations.append(
                {
                    "type": "UNKNOWN_TASK",
                    "severity": constants.SEVERITY_CRITICAL,
                    "reason": f"Selected block references unknown task_id {task_id}",
                }
            )
            continue

        assessment = feasibility_engine.assess_candidate(block, task_row, train_models, horizon_minutes)
        if not assessment["feasible"]:
            violations.append(
                {
                    "type": "INFEASIBLE_SELECTED_BLOCK",
                    "task_id": task_id,
                    "severity": constants.SEVERITY_CRITICAL,
                    "reason": "; ".join(assessment["hard_reasons"]),
                }
            )

    # 2. Pairwise task/resource/infrastructure conflicts among selected blocks.
    for i, (task_id_a, block_a) in enumerate(scheduled):
        for task_id_b, block_b in scheduled[i + 1:]:
            task_a, task_b = rows.get(task_id_a), rows.get(task_id_b)
            if task_a is None or task_b is None:
                continue
            conflict = conflict_engine.check_task_pair_conflict(block_a, task_a, block_b, task_b)
            if conflict is not None:
                violations.append(
                    {
                        "type": conflict["type"],
                        "severity": conflict["severity"],
                        "task_id": task_id_a,
                        "other_task_id": task_id_b,
                        "reason": conflict["reason"],
                    }
                )
            infra_conflict = conflict_engine.check_infrastructure_conflict(block_a, task_a, block_b, task_b)
            if infra_conflict is not None:
                violations.append(
                    {
                        "type": infra_conflict["type"],
                        "severity": infra_conflict["severity"],
                        "task_id": task_id_a,
                        "other_task_id": task_id_b,
                        "reason": infra_conflict["reason"],
                    }
                )

    status = "REJECTED" if violations else "APPROVED"
    return {"status": status, "violations": violations}
