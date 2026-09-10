"""
Constraint Engine.

Builds the OR-Tools CP-SAT constraint model (variables + hard constraints +
weighted objective) for the Scheduling Engine. Does NOT call the solver -
that is optimizer.solve_model()'s job (see optimizer.py). This split keeps
"what the rules are" (here) separate from "how we search for the best
assignment" (there), so either can change independently.

A "block option" is the unit this model decides over: either
  - an INDIVIDUAL option: one task, in one of its candidate windows, or
  - a FUSED option: two tasks sharing one sequential block (from block_fusion.py).
Both shapes are normalised into the same option record so the rest of the
model (decision variables, mutual exclusion, objective) doesn't need to care
which kind it is looking at.

Decision variables
-------------------
One BoolVar per option. A task is "scheduled" iff exactly one of the options
containing it is chosen (options are already pre-filtered to be individually
feasible - see feasibility_engine / block_fusion - so no extra per-option
hard-constraint checking happens here beyond that already-done filtering).

Hard constraints
-----------------
1. sum(options containing task) <= 1                 for every task
2. var[opt_a] + var[opt_b] <= 1   for every pair of options that would put
   two DIFFERENT, structurally-conflicting tasks into overlapping/incompatible
   sub-windows (track/km, shared resource, or station-capacity) - unless
   opt_a is opt_b (i.e. a single fused option already resolved that conflict
   internally by sequencing the two tasks, which is exactly the point of
   fusion).

Soft objective (all weights configurable in constants.py)
-----------------------------------------------------------
Maximize   priority_score-weighted task completion (safety/urgency/asset
           importance are already baked into priority_score - see
           priority_engine.py)
Minimize   soft (MEDIUM/LOW) train conflicts accepted, and the number of
           separate blocks used (a flat per-option cost that fusion "pays
           only once" for two tasks instead of twice - see
           constants.OPT_WEIGHT_BLOCK_COUNT_PENALTY).

Public API:
    build_model(tasks_df, individual_candidates_by_task, fusion_candidates_by_pair,
                priority_by_task, horizon_minutes, step_minutes) -> dict
"""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

import pandas as pd
from ortools.sat.python import cp_model

from backend.app.services import conflict_engine
from backend.app.utils import constants


def _tasks_row_lookup(tasks_df: pd.DataFrame) -> Dict[str, pd.Series]:
    return {row["task_id"]: row for _, row in tasks_df.iterrows()}


def _add_individual_options(individual_candidates_by_task: Dict[str, List[dict]], options: dict) -> None:
    for task_id, candidates in individual_candidates_by_task.items():
        for candidate in candidates:
            options[candidate["candidate_id"]] = {
                "option_id": candidate["candidate_id"],
                "task_ids": [task_id],
                "is_fused": False,
                "block_start": candidate["start_minute"],
                "block_end": candidate["end_minute"],
                "start_time": candidate["start_time"],
                "end_time": candidate["end_time"],
                "sub_windows": {task_id: (candidate["start_minute"], candidate["end_minute"])},
                "soft_conflict_penalty": candidate.get("_assessment", {}).get("soft_conflict_penalty", 0),
                "soft_train_conflicts": {
                    task_id: candidate.get("_assessment", {}).get("soft_train_conflicts", [])
                },
                "fusion_reason": None,
            }


def _add_fusion_options(fusion_candidates_by_pair: Dict[str, List[dict]], options: dict) -> None:
    for candidates in fusion_candidates_by_pair.values():
        for candidate in candidates:
            task_ids = candidate["task_ids"]
            soft_penalty = sum(
                candidate["assessment_by_task"][tid]["soft_conflict_penalty"] for tid in task_ids
            )
            options[candidate["candidate_id"]] = {
                "option_id": candidate["candidate_id"],
                "task_ids": task_ids,
                "is_fused": True,
                "block_start": candidate["block_start"],
                "block_end": candidate["block_end"],
                "start_time": candidate["start_time"],
                "end_time": candidate["end_time"],
                "sub_windows": {
                    tid: (sw["start_minute"], sw["end_minute"]) for tid, sw in candidate["sub_windows"].items()
                },
                "soft_conflict_penalty": soft_penalty,
                "soft_train_conflicts": {
                    tid: candidate["assessment_by_task"][tid].get("soft_train_conflicts", []) for tid in task_ids
                },
                "fusion_reason": candidate["fusion_reason"],
            }


def _option_benefit(option: dict, priority_by_task: Dict[str, float], step_minutes: int) -> int:
    priority_sum = sum(priority_by_task.get(tid, 0.0) for tid in option["task_ids"])
    start_index = option["block_start"] // max(step_minutes, 1)
    benefit = (
        round(priority_sum * constants.OPT_WEIGHT_PRIORITY)
        - option["soft_conflict_penalty"] * constants.OPT_WEIGHT_SOFT_CONFLICT_PENALTY
        - constants.OPT_WEIGHT_BLOCK_COUNT_PENALTY
        - start_index * constants.OPT_WEIGHT_EARLY_START_BONUS
    )
    return int(benefit)


def build_model(
    tasks_df: pd.DataFrame,
    individual_candidates_by_task: Dict[str, List[dict]],
    fusion_candidates_by_pair: Dict[str, List[dict]],
    priority_by_task: Dict[str, float],
    horizon_minutes: int,
    step_minutes: int,
) -> dict:
    rows = _tasks_row_lookup(tasks_df)

    options: Dict[str, dict] = {}
    _add_individual_options(individual_candidates_by_task, options)
    _add_fusion_options(fusion_candidates_by_pair, options)

    model = cp_model.CpModel()
    var_by_option_id: Dict[str, cp_model.IntVar] = {
        option_id: model.NewBoolVar(option_id) for option_id in options
    }

    # Seed every task from tasks_df first (not just ones that ended up with an
    # option) so a task with zero feasible/fused options still appears in the
    # result, mapped to no options - callers (e.g. optimizer.solve_model) can
    # then uniformly report it as unscheduled rather than KeyError-ing.
    task_option_ids: Dict[str, List[str]] = defaultdict(list, {tid: [] for tid in rows})
    for option_id, option in options.items():
        for task_id in option["task_ids"]:
            task_option_ids[task_id].append(option_id)

    # Hard constraint 1: each task scheduled at most once (whether solo or fused).
    for task_id, option_ids in task_option_ids.items():
        model.Add(sum(var_by_option_id[oid] for oid in option_ids) <= 1)

    # Hard constraint 2: mutual exclusion between options that would put two
    # structurally-conflicting tasks into incompatible sub-windows.
    mutual_exclusions_applied: List[dict] = []
    task_ids = list(task_option_ids.keys())
    seen_option_pairs = set()
    for i, task_id_a in enumerate(task_ids):
        for task_id_b in task_ids[i + 1:]:
            task_a, task_b = rows.get(task_id_a), rows.get(task_id_b)
            if task_a is None or task_b is None:
                continue
            if conflict_engine.structural_conflict_reason(task_a, task_b) is None:
                continue

            for option_id_a in task_option_ids[task_id_a]:
                for option_id_b in task_option_ids[task_id_b]:
                    if option_id_a == option_id_b:
                        continue  # a single fused option already sequenced them safely
                    pair_key = tuple(sorted((option_id_a, option_id_b)))
                    if pair_key in seen_option_pairs:
                        continue

                    sub_a = options[option_id_a]["sub_windows"].get(task_id_a)
                    sub_b = options[option_id_b]["sub_windows"].get(task_id_b)
                    if sub_a is None or sub_b is None:
                        continue
                    cand_a = {"task_id": task_id_a, "start_minute": sub_a[0], "end_minute": sub_a[1]}
                    cand_b = {"task_id": task_id_b, "start_minute": sub_b[0], "end_minute": sub_b[1]}

                    conflict = conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b)
                    if conflict is None:
                        conflict = conflict_engine.check_infrastructure_conflict(cand_a, task_a, cand_b, task_b)
                    if conflict is None:
                        continue

                    seen_option_pairs.add(pair_key)
                    model.Add(var_by_option_id[option_id_a] + var_by_option_id[option_id_b] <= 1)
                    mutual_exclusions_applied.append(
                        {
                            "option_a": option_id_a,
                            "option_b": option_id_b,
                            "task_a": task_id_a,
                            "task_b": task_id_b,
                            "type": conflict["type"],
                            "severity": conflict["severity"],
                            "reason": conflict["reason"],
                        }
                    )

    # Soft objective.
    benefit_by_option_id = {
        option_id: _option_benefit(option, priority_by_task, step_minutes) for option_id, option in options.items()
    }
    model.Maximize(sum(benefit_by_option_id[oid] * var for oid, var in var_by_option_id.items()))

    return {
        "model": model,
        "var_by_option_id": var_by_option_id,
        "options": options,
        "task_option_ids": dict(task_option_ids),
        "mutual_exclusions_applied": mutual_exclusions_applied,
        "benefit_by_option_id": benefit_by_option_id,
    }
