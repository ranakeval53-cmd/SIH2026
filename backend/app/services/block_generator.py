"""
Block Generator.

Generates candidate maintenance block windows for a task by sliding
required_duration_mins across a fixed synthetic planning horizon
(constants.PLANNING_HORIZON_MINUTES) on a fixed step
(constants.CANDIDATE_STEP_MINUTES).

The dataset does not specify which hours of day traffic blocks are normally
granted, so this module does NOT invent a "night window only" business rule.
Instead it exhaustively proposes candidates across the whole horizon and lets
conflict_engine / feasibility_engine reject the ones that collide with real
train movements - low-traffic hours naturally surface as feasible because
fewer trains occupy the section then, which is realistic without having to
assert it as a hard-coded rule.

Public API:
    generate_candidates(task_row, horizon_minutes=None, step_minutes=None) -> list[dict]
"""

from __future__ import annotations

from typing import Dict, List, Optional

from backend.app.utils import constants, time_utils


def generate_candidates(
    task_row,
    horizon_minutes: Optional[int] = None,
    step_minutes: Optional[int] = None,
) -> List[Dict]:
    horizon_minutes = horizon_minutes or constants.PLANNING_HORIZON_MINUTES
    step_minutes = step_minutes or constants.CANDIDATE_STEP_MINUTES

    duration = task_row.get("required_duration_mins")
    try:
        duration = int(duration)
    except (TypeError, ValueError):
        duration = None

    task_id = task_row.get("task_id")

    if duration is None or duration <= 0:
        return []

    if duration > horizon_minutes:
        # Cannot possibly fit - no candidates. Caller/explainability reports
        # this as "insufficient window" rather than silently producing zero.
        return []

    candidates = []
    candidate_index = 0
    start = 0
    while start + duration <= horizon_minutes:
        end = start + duration
        candidates.append(
            {
                "candidate_id": f"{task_id}__C{candidate_index}",
                "task_id": task_id,
                "start_minute": start,
                "end_minute": end,
                "start_time": time_utils.minutes_to_label(start),
                "end_time": time_utils.minutes_to_label(end),
                "status": "CANDIDATE",
                "conflicting_trains": [],
                "conflicting_tasks": [],
                "reason": "",
            }
        )
        candidate_index += 1
        start += step_minutes

    return candidates


def generate_all_candidates(tasks_df, horizon_minutes=None, step_minutes=None) -> Dict[str, List[Dict]]:
    """Convenience wrapper: task_id -> list of raw (unannotated) candidates."""
    return {
        row["task_id"]: generate_candidates(row, horizon_minutes, step_minutes)
        for _, row in tasks_df.iterrows()
    }
