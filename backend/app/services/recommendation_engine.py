"""
Recommendation Engine.

Thin assembly layer: for every task, pairs its priority result with the
optimizer's decision and produces one explanation record (spec section 7).
Also derives which competing task(s) "won" a shared resource/track when a
task lost out, purely by reading the optimizer's own mutual-exclusion
records - no new logic, just attribution for explainability.

Public API:
    build_recommendations(tasks_df, priority_by_task, selection, mutual_exclusions_applied) -> list[dict]
"""

from __future__ import annotations

from typing import Dict, List

import pandas as pd

from backend.app.services import explainability_engine


def _tasks_that_won_against(task_id: str, mutual_exclusions_applied: List[dict], scheduled_task_ids: set) -> List[str]:
    winners = set()
    for exclusion in mutual_exclusions_applied:
        if exclusion["task_a"] == task_id and exclusion["task_b"] in scheduled_task_ids:
            winners.add(exclusion["task_b"])
        elif exclusion["task_b"] == task_id and exclusion["task_a"] in scheduled_task_ids:
            winners.add(exclusion["task_a"])
    return sorted(winners)


def build_recommendations(
    tasks_df: pd.DataFrame,
    priority_by_task: Dict[str, dict],
    selection: Dict[str, dict],
    candidates_meta_by_task: Dict[str, dict],
    mutual_exclusions_applied: List[dict],
) -> List[dict]:
    scheduled_task_ids = {task_id for task_id, block in selection.items() if block is not None}
    recommendations = []

    for _, task_row in tasks_df.iterrows():
        task_id = task_row["task_id"]
        priority_result = priority_by_task[task_id]
        block = selection.get(task_id)
        meta = candidates_meta_by_task.get(task_id, {"total": 0, "feasible": 0})

        if block is not None:
            record = explainability_engine.explain_scheduled(
                task_id, priority_result, block, block.get("_assessment", {}).get("soft_train_conflicts")
            )
        else:
            lost_to = _tasks_that_won_against(task_id, mutual_exclusions_applied, scheduled_task_ids)
            record = explainability_engine.explain_unscheduled(
                task_id, priority_result, meta["total"], meta["feasible"], lost_to
            )
        recommendations.append(record)

    return recommendations
