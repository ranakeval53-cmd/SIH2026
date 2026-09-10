"""
Block Fusion.

Finds pairs of maintenance tasks that are worth merging into ONE shared
maintenance block instead of two separate ones, and generates the candidate
fused-block windows for the optimizer to choose from.

Why fusion matters here specifically: conflict_engine.structural_conflict_reason()
flags a pair of tasks as "structurally conflicting" when they sit on the same
section/track with overlapping km, or need the same machine/gang, or need a
simultaneous traffic block at a no-yard station. Historically (see optimizer.py's
plain `solve()`) that meant the two tasks could never both run inside an
overlapping time window - the scheduler had to pick one or shift them apart.

Fusion offers a third option: request ONE shared traffic block for the whole
section/resource, and run the two tasks back-to-back (sequentially) inside it.
That legitimately resolves the structural conflict (they're never physically
simultaneous) while also cutting the total block count in half - directly
serving the "maximize useful block fusion/grouping" and "minimize number of
separate blocks" objectives.

Fusion is REFUSED (not attempted) when:
  - the two tasks are not structurally related at all (nothing to gain by
    forcing them together - never fuse arbitrary/incompatible tasks), or
  - the combined (summed) duration exceeds constants.FUSION_MAX_COMBINED_DURATION_MINUTES
    (an overlong block itself becomes an availability/disruption problem), or
  - no start time exists in the horizon where BOTH sequential sub-windows are
    individually hard-conflict-free (checked with the exact same
    feasibility_engine.assess_candidate() used for solo scheduling - fusion
    never gets a looser safety bar than solo scheduling).

Only pairwise (2-task) fusion is implemented - see constants.FUSION_MAX_GROUP_SIZE
and AI_LAYER.md / the scheduling engine limitations section.

Public API:
    find_fusable_task_pairs(tasks_df) -> list[(task_id_a, task_id_b, reason_type)]
    generate_fusion_candidates(task_a_row, task_b_row, reason_type, horizon_minutes,
                                step_minutes, train_models) -> list[dict]
    generate_all_fusion_candidates(tasks_df, horizon_minutes, step_minutes, train_models)
        -> (fusion_candidates_by_pair, fusion_rejections)
"""

from __future__ import annotations

from typing import Dict, List, Tuple

import pandas as pd

from backend.app.services import conflict_engine, feasibility_engine
from backend.app.utils import constants, time_utils


def _pair_key(task_id_a: str, task_id_b: str) -> str:
    return f"{task_id_a}__FUSE__{task_id_b}"


def find_fusable_task_pairs(tasks_df: pd.DataFrame) -> List[Tuple[str, str, str]]:
    """Every pair of DIFFERENT tasks that structurally conflict (and are
    therefore worth attempting to fuse), as (task_id_a, task_id_b, reason_type)."""
    if constants.FUSION_MAX_GROUP_SIZE < 2 or not constants.FUSION_ENABLED:
        return []

    rows = list(tasks_df.iterrows())
    pairs = []
    for i, (_, task_a) in enumerate(rows):
        for _, task_b in rows[i + 1:]:
            reason_type = conflict_engine.structural_conflict_reason(task_a, task_b)
            if reason_type is not None:
                pairs.append((task_a["task_id"], task_b["task_id"], reason_type))
    return pairs


def _duration_of(task_row) -> int:
    return int(task_row["required_duration_mins"])


def generate_fusion_candidates(
    task_a_row,
    task_b_row,
    reason_type: str,
    horizon_minutes: int,
    step_minutes: int,
    train_models: Dict,
) -> List[dict]:
    """Slide a combined (sequential) window across the horizon; keep only the
    starts where BOTH sub-tasks are individually hard-conflict-free in their
    own sub-slice of the block."""
    duration_a = _duration_of(task_a_row)
    duration_b = _duration_of(task_b_row)
    combined_duration = duration_a + duration_b

    if combined_duration > constants.FUSION_MAX_COMBINED_DURATION_MINUTES:
        return []
    if combined_duration > horizon_minutes:
        return []

    task_id_a = task_a_row["task_id"]
    task_id_b = task_b_row["task_id"]
    candidates = []
    index = 0
    start = 0
    while start + combined_duration <= horizon_minutes:
        sub_a = {
            "candidate_id": f"{task_id_a}__subA",
            "task_id": task_id_a,
            "start_minute": start,
            "end_minute": start + duration_a,
        }
        sub_b = {
            "candidate_id": f"{task_id_b}__subB",
            "task_id": task_id_b,
            "start_minute": start + duration_a,
            "end_minute": start + combined_duration,
        }
        assessment_a = feasibility_engine.assess_candidate(sub_a, task_a_row, train_models, horizon_minutes)
        assessment_b = feasibility_engine.assess_candidate(sub_b, task_b_row, train_models, horizon_minutes)

        if assessment_a["feasible"] and assessment_b["feasible"]:
            block_start, block_end = start, start + combined_duration
            candidates.append(
                {
                    "candidate_id": f"FUSED__{task_id_a}__{task_id_b}__{index}",
                    "is_fused": True,
                    "task_ids": [task_id_a, task_id_b],
                    "block_start": block_start,
                    "block_end": block_end,
                    "start_time": time_utils.minutes_to_label(block_start),
                    "end_time": time_utils.minutes_to_label(block_end),
                    "sub_windows": {
                        task_id_a: {
                            "start_minute": sub_a["start_minute"],
                            "end_minute": sub_a["end_minute"],
                            "start_time": time_utils.minutes_to_label(sub_a["start_minute"]),
                            "end_time": time_utils.minutes_to_label(sub_a["end_minute"]),
                        },
                        task_id_b: {
                            "start_minute": sub_b["start_minute"],
                            "end_minute": sub_b["end_minute"],
                            "start_time": time_utils.minutes_to_label(sub_b["start_minute"]),
                            "end_time": time_utils.minutes_to_label(sub_b["end_minute"]),
                        },
                    },
                    "assessment_by_task": {task_id_a: assessment_a, task_id_b: assessment_b},
                    "fusion_reason_type": reason_type,
                    "fusion_reason": (
                        f"{task_id_a} and {task_id_b} share a {reason_type.replace('_', ' ').lower()} - "
                        f"fusing them into one sequential block ({task_id_a} then {task_id_b}, "
                        f"{combined_duration} min total) avoids requesting two separate traffic blocks."
                    ),
                    "status": "CANDIDATE",
                }
            )
            index += 1
        start += step_minutes

    return candidates


def generate_all_fusion_candidates(
    tasks_df: pd.DataFrame,
    horizon_minutes: int,
    step_minutes: int,
    train_models: Dict,
) -> Tuple[Dict[str, List[dict]], List[dict]]:
    """Returns (fusion_candidates_by_pair_key, fusion_rejections).

    fusion_rejections explains, per structurally-related pair, WHY no fused
    block was offered (so this is visible in the final output rather than a
    silent gap) - e.g. combined duration too long, or no common conflict-free
    sequential slot exists anywhere in the horizon.
    """
    rows = {row["task_id"]: row for _, row in tasks_df.iterrows()}
    fusion_candidates_by_pair: Dict[str, List[dict]] = {}
    fusion_rejections: List[dict] = []

    for task_id_a, task_id_b, reason_type in find_fusable_task_pairs(tasks_df):
        task_a_row, task_b_row = rows[task_id_a], rows[task_id_b]
        combined_duration = _duration_of(task_a_row) + _duration_of(task_b_row)
        pair_key = _pair_key(task_id_a, task_id_b)

        if combined_duration > constants.FUSION_MAX_COMBINED_DURATION_MINUTES:
            fusion_rejections.append(
                {
                    "task_a": task_id_a,
                    "task_b": task_id_b,
                    "reason_type": reason_type,
                    "reason": (
                        f"Combined duration {combined_duration}min exceeds the "
                        f"{constants.FUSION_MAX_COMBINED_DURATION_MINUTES}min fusion cap; "
                        f"tasks will be scheduled independently instead."
                    ),
                }
            )
            continue

        candidates = generate_fusion_candidates(
            task_a_row, task_b_row, reason_type, horizon_minutes, step_minutes, train_models
        )
        if candidates:
            fusion_candidates_by_pair[pair_key] = candidates
        else:
            fusion_rejections.append(
                {
                    "task_a": task_id_a,
                    "task_b": task_id_b,
                    "reason_type": reason_type,
                    "reason": (
                        f"No time slot in the planning horizon lets both {task_id_a} and {task_id_b} "
                        f"run sequentially without a hard train conflict; tasks will be scheduled "
                        f"independently instead (subject to their own mutual-exclusion constraint)."
                    ),
                }
            )

    return fusion_candidates_by_pair, fusion_rejections
