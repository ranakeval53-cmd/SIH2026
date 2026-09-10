"""
Feasibility Engine.

Decides whether a single candidate block is individually feasible, in
isolation from every other task (cross-task conflicts - track/resource/
infrastructure - are pairwise and are instead enforced as mutual-exclusion
constraints inside optimizer.py, then re-checked by final_validator.py).

A candidate is feasible only when ALL of the following hold:
    1. valid duration            (end - start == required_duration_mins, > 0)
    2. valid time range           (0 <= start < end <= planning horizon)
    3. no hard train conflict     (no CRITICAL/HIGH severity train conflict)

Soft (MEDIUM/LOW severity) train conflicts do not block feasibility; they are
carried forward as a penalty for the optimizer to weigh against priority.

Public API:
    assess_candidate(candidate, task_row, train_models, horizon_minutes) -> dict
"""

from __future__ import annotations

from typing import Dict, List

from backend.app.services import conflict_engine
from backend.app.utils import constants


def assess_candidate(candidate: dict, task_row, train_models: Dict, horizon_minutes: int) -> dict:
    hard_reasons: List[str] = []

    duration = task_row.get("required_duration_mins")
    try:
        duration = int(duration)
    except (TypeError, ValueError):
        duration = None

    actual_span = candidate["end_minute"] - candidate["start_minute"]
    if duration is None or duration <= 0:
        hard_reasons.append("INVALID_DURATION: required_duration_mins missing or non-positive")
    elif actual_span != duration:
        hard_reasons.append(
            f"INVALID_DURATION: candidate span {actual_span}min != required {duration}min"
        )

    if candidate["start_minute"] < 0 or candidate["end_minute"] > horizon_minutes:
        hard_reasons.append(
            f"INVALID_TIME_RANGE: [{candidate['start_minute']}, {candidate['end_minute']}) "
            f"outside horizon [0, {horizon_minutes})"
        )
    if candidate["start_minute"] >= candidate["end_minute"]:
        hard_reasons.append("INVALID_TIME_RANGE: start_minute >= end_minute")

    train_conflicts = conflict_engine.check_train_conflicts(candidate, task_row, train_models, horizon_minutes)
    hard_train_conflicts = [c for c in train_conflicts if c["severity"] in constants.HARD_SEVERITIES]
    soft_train_conflicts = [c for c in train_conflicts if c["severity"] in constants.SOFT_SEVERITIES]

    for c in hard_train_conflicts:
        hard_reasons.append(f"HARD_TRAIN_CONFLICT[{c['severity']}]: {c['reason']}")

    feasible = len(hard_reasons) == 0

    return {
        "feasible": feasible,
        "hard_reasons": hard_reasons,
        "train_conflicts": train_conflicts,
        "hard_train_conflicts": hard_train_conflicts,
        "soft_train_conflicts": soft_train_conflicts,
        "soft_conflict_penalty": len(soft_train_conflicts),
    }


def find_duplicate_task_ids(tasks_df) -> List[str]:
    return tasks_df["task_id"][tasks_df["task_id"].duplicated()].unique().tolist()


def filter_feasible_candidates(
    candidates: List[dict], task_row, train_models: Dict, horizon_minutes: int
) -> List[dict]:
    """Annotate every candidate with its feasibility assessment and return the
    full annotated list (both feasible and infeasible) so nothing is silently
    dropped before it reaches the explanation layer."""
    annotated = []
    for candidate in candidates:
        assessment = assess_candidate(candidate, task_row, train_models, horizon_minutes)
        enriched = dict(candidate)
        enriched["status"] = "FEASIBLE" if assessment["feasible"] else "INFEASIBLE"
        enriched["conflicting_trains"] = [c["train_no"] for c in assessment["train_conflicts"]]
        enriched["reason"] = (
            "; ".join(assessment["hard_reasons"]) if not assessment["feasible"] else ""
        )
        enriched["_assessment"] = assessment
        annotated.append(enriched)
    return annotated
