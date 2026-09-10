"""
Recommendation Ranking.

Turns the Scheduling Engine's output (data/output/optimized_block_plan.json,
produced by scheduling_engine.run()) into the flat, ranked list of
"recommendations" the Planner Dashboard reviews. This module does NOT
recompute priorities, conflicts, or the schedule itself - it only reads
already-computed fields and derives a presentation-layer ranking on top,
so there is exactly one source of truth for scheduling decisions
(the Scheduling Engine) and one for how they're ranked for human review
(here).

Every recommendation is one of:
  - SCHEDULE_BLOCK - a block the optimizer selected (one or more fused tasks).
  - DEFER_TASK     - a task the optimizer could NOT place; the recommended
                     action is manual planner review, not "do nothing".

`recommendation_score` and `feasibility_score` are explicitly rule-based
blends of real, already-computed signals (priority score, soft conflict
count, backlog-reduction share). Neither is an ML confidence value - no ML
model exists anywhere in this project (see AI_LAYER.md / DASHBOARD.md).

Public API:
    build_recommendations(plan: dict, tasks_df) -> list[dict]
"""

from __future__ import annotations

from typing import Dict, List

import pandas as pd

from backend.app.utils import constants


def _defer_recommendation_id(task_id: str) -> str:
    return f"DEFER_{task_id}"


def _clip(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _block_recommendation(block: dict, priority_by_task: Dict[str, dict], max_duration: float) -> dict:
    task_ids = [t["task_id"] for t in block["tasks"]]
    priority_vals = [t["priority_score"] for t in block["tasks"] if t["priority_score"] is not None]
    avg_priority = sum(priority_vals) / len(priority_vals) if priority_vals else 0.0

    soft_conflicts = block["conflicts"]
    conflict_risk_score = _clip(100 - len(soft_conflicts) * 20)  # 100 = no risk

    availability_benefit_component = _clip((block["duration_minutes"] / max_duration) * 100) if max_duration else 0.0

    recommendation_score = round(
        constants.REC_WEIGHT_PRIORITY * avg_priority
        + constants.REC_WEIGHT_CONFLICT_RISK * conflict_risk_score
        + constants.REC_WEIGHT_AVAILABILITY_BENEFIT * availability_benefit_component,
        2,
    )

    feasibility_score = 100
    feasibility_score -= len(soft_conflicts) * constants.REC_FEASIBILITY_PENALTY_PER_SOFT_CONFLICT
    if block["fused"] and len(task_ids) > 1:
        feasibility_score -= (len(task_ids) - 1) * constants.REC_FEASIBILITY_PENALTY_PER_EXTRA_FUSED_TASK
    feasibility_score = round(_clip(feasibility_score), 2)

    reason_parts = []
    if block["fused"]:
        reason_parts.append(block["fusion_reason"])
    top_reason_codes = []
    for task_id in task_ids:
        pr = priority_by_task.get(task_id)
        if pr:
            top_reason_codes.extend(pr.get("reason_codes", [])[:1])
    if top_reason_codes:
        reason_parts.append("Key drivers: " + "; ".join(top_reason_codes))
    if soft_conflicts:
        reason_parts.append(
            f"{len(soft_conflicts)} lower-severity (soft) train conflict(s) reviewed and accepted."
        )
    else:
        reason_parts.append("No train, track, resource, or infrastructure conflict found for this window.")
    reason = " ".join(reason_parts)

    affected_trains = sorted({c["train_no"] for c in soft_conflicts if c.get("train_no")})

    return {
        "recommendation_id": block["block_id"],
        "type": "SCHEDULE_BLOCK",
        "recommended_action": "Approve Block" if not soft_conflicts else "Review & Approve (soft conflict noted)",
        "recommendation_score": recommendation_score,
        "feasibility_score": feasibility_score,
        "priority_score": block["priority_score"],
        "priority_class": max(
            (priority_by_task.get(tid, {}).get("priority_class", "LOW") for tid in task_ids),
            key=lambda c: constants.PRIORITY_THRESHOLDS.get(c, 0),
            default="LOW",
        ),
        "reason": reason,
        "affected_section": sorted(set(block["sections"])),
        "affected_stations": sorted(set(block["stations"])),
        "affected_trains": affected_trains,
        "expected_benefit": (
            f"Completes {block['duration_minutes']} min of maintenance across "
            f"{len(task_ids)} task(s), reducing the maintenance backlog."
        ),
        "risk_conflicts": soft_conflicts,
        "block": block,
        "task_ids": task_ids,
    }


def _defer_recommendation(unscheduled_task: dict, task_row) -> dict:
    task_id = unscheduled_task["task_id"]
    return {
        "recommendation_id": _defer_recommendation_id(task_id),
        "type": "DEFER_TASK",
        "recommended_action": "Manual Planner Review Required",
        "recommendation_score": unscheduled_task.get("priority_score") or 0.0,
        "feasibility_score": 0.0,
        "priority_score": unscheduled_task.get("priority_score"),
        "priority_class": unscheduled_task.get("priority_class"),
        "reason": " ".join(unscheduled_task.get("reasons", [])),
        "affected_section": [task_row.get("section_id")] if task_row is not None else [],
        "affected_stations": [task_row.get("station_code")] if task_row is not None else [],
        "affected_trains": [],
        "expected_benefit": "None yet - task not placed in the current optimized plan.",
        "risk_conflicts": [],
        "block": None,
        "task_ids": [task_id],
    }


def build_recommendations(plan: dict, tasks_df: pd.DataFrame) -> List[dict]:
    priority_by_task = {r["task_id"]: r for r in plan["priority_scores"]}
    task_rows = {row["task_id"]: row for _, row in tasks_df.iterrows()}

    max_duration = max((b["duration_minutes"] for b in plan["blocks"]), default=0)

    recommendations = [_block_recommendation(b, priority_by_task, max_duration) for b in plan["blocks"]]
    recommendations.extend(
        _defer_recommendation(u, task_rows.get(u["task_id"])) for u in plan["unscheduled_tasks"]
    )
    recommendations.sort(key=lambda r: r["recommendation_score"], reverse=True)
    return recommendations
