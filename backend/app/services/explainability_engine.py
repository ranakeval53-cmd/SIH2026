"""
Explainability Engine.

Turns the raw output of the priority/conflict/optimizer stages into a
human-readable explanation for every task, whether it was scheduled or not.
Nothing here invents new facts - every sentence is built directly from
values already computed upstream (priority reason codes, conflict reasons,
optimizer mutual-exclusion records).

Public API:
    explain_scheduled(task_id, priority_result, block, soft_conflicts) -> dict
    explain_unscheduled(task_id, priority_result, candidates, exclusions_lost_to) -> dict
"""

from __future__ import annotations

from typing import Dict, List, Optional

from backend.app.utils import time_utils


def explain_scheduled(
    task_id: str,
    priority_result: dict,
    block: dict,
    soft_conflicts: Optional[List[dict]] = None,
) -> dict:
    soft_conflicts = soft_conflicts or []
    window = f"{block['start_time']} to {block['end_time']}"

    lead_reasons = priority_result["reason_codes"][:2]
    reason_text = "; ".join(lead_reasons) if lead_reasons else "baseline priority factors"

    if soft_conflicts:
        conflict_note = (
            f" A conflict-free window on the hard constraints was found; "
            f"{len(soft_conflicts)} lower-severity (soft) freight/opposite-line "
            f"consideration(s) remain and were accepted as an acceptable trade-off."
        )
    else:
        conflict_note = " No train, track, resource, or infrastructure conflict was found in this window."

    explanation = (
        f"Scheduled for {window} ({priority_result['priority_class']} priority, "
        f"score {priority_result['priority_score']}/100) because of {reason_text}."
        f"{conflict_note}"
    )

    return {
        "task_id": task_id,
        "recommendation": "Schedule",
        "priority_score": priority_result["priority_score"],
        "priority_class": priority_result["priority_class"],
        "explanation": explanation,
        "factors": priority_result["reason_codes"],
    }


def explain_unscheduled(
    task_id: str,
    priority_result: dict,
    total_candidates: int,
    feasible_candidates: int,
    lost_to_tasks: Optional[List[str]] = None,
) -> dict:
    lost_to_tasks = lost_to_tasks or []

    if total_candidates == 0:
        reason = "required_duration_mins exceeds the planning horizon - no candidate window could even be formed."
    elif feasible_candidates == 0:
        reason = (
            f"all {total_candidates} candidate windows in the planning horizon collide with a hard "
            f"(train, track, or infrastructure) conflict - no conflict-free window exists."
        )
    elif lost_to_tasks:
        reason = (
            f"a conflict-free window existed but the optimizer allocated the shared track/resource "
            f"to higher-priority task(s) {', '.join(lost_to_tasks)} instead."
        )
    else:
        reason = "the optimizer did not select this task in the priority-maximizing solution."

    explanation = (
        f"Not scheduled in this planning run ({priority_result['priority_class']} priority, "
        f"score {priority_result['priority_score']}/100): {reason}"
    )

    return {
        "task_id": task_id,
        "recommendation": "Defer",
        "priority_score": priority_result["priority_score"],
        "priority_class": priority_result["priority_class"],
        "explanation": explanation,
        "factors": priority_result["reason_codes"],
    }
