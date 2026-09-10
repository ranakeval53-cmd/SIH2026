"""
OR-Tools CP-SAT Optimizer.

Chooses at most one feasible candidate block per task so as to:
    MAXIMIZE   priority-weighted maintenance completion, minus
    MINIMIZE   soft (MEDIUM/LOW) train conflicts and a tiny earliest-start
               tie-breaker,
while NEVER selecting two candidates (across any two different tasks) that
would create a hard track/resource/infrastructure conflict - those pairs are
encoded as mutual-exclusion (x_i + x_j <= 1) constraints, so the solver is
structurally unable to output a hard violation. final_validator.py
independently re-checks the chosen set as a defence-in-depth safety net.

Public API:
    solve(tasks_df, feasible_candidates_by_task, priority_by_task, horizon_minutes) -> dict
"""

from __future__ import annotations

from typing import Dict, List, Optional

import pandas as pd
from ortools.sat.python import cp_model

from backend.app.services import conflict_engine
from backend.app.utils import constants


def _tasks_row_lookup(tasks_df: pd.DataFrame) -> Dict[str, pd.Series]:
    return {row["task_id"]: row for _, row in tasks_df.iterrows()}


def _tasks_potentially_conflict(task_a: pd.Series, task_b: pd.Series) -> bool:
    """Cheap, time-independent pre-filter: can these two tasks EVER conflict,
    regardless of which candidate time each ends up with? Used to avoid an
    O(tasks^2 * candidates^2) scan when most task pairs share nothing.

    Delegates to conflict_engine.structural_conflict_reason(), which is also
    the seam block_fusion.py uses to find fusion candidates - the two stay
    in lockstep by construction rather than by convention.
    """
    return conflict_engine.structural_conflict_reason(task_a, task_b) is not None


def _pairwise_hard_conflicts(
    tasks_df: pd.DataFrame, feasible_candidates_by_task: Dict[str, List[dict]]
):
    """Yield (candidate_a, candidate_b, conflict_dict) for every pair of
    candidates (from two different, structurally-conflicting tasks) that are
    a hard conflict once their exact time windows are compared."""
    rows = _tasks_row_lookup(tasks_df)
    task_ids = list(feasible_candidates_by_task.keys())

    for i, task_id_a in enumerate(task_ids):
        for task_id_b in task_ids[i + 1:]:
            task_a, task_b = rows.get(task_id_a), rows.get(task_id_b)
            if task_a is None or task_b is None:
                continue
            if not _tasks_potentially_conflict(task_a, task_b):
                continue
            for cand_a in feasible_candidates_by_task[task_id_a]:
                for cand_b in feasible_candidates_by_task[task_id_b]:
                    conflict = conflict_engine.check_task_pair_conflict(cand_a, task_a, cand_b, task_b)
                    if conflict is None:
                        conflict = conflict_engine.check_infrastructure_conflict(cand_a, task_a, cand_b, task_b)
                    if conflict is not None:
                        yield cand_a, cand_b, conflict


def _candidate_benefit(candidate: dict, priority_score: float, step_minutes: int) -> int:
    soft_penalty = candidate.get("_assessment", {}).get("soft_conflict_penalty", 0)
    start_index = candidate["start_minute"] // max(step_minutes, 1)
    benefit = (
        round(priority_score * constants.OPT_WEIGHT_PRIORITY)
        - soft_penalty * constants.OPT_WEIGHT_SOFT_CONFLICT_PENALTY
        - start_index * constants.OPT_WEIGHT_EARLY_START_BONUS
    )
    return int(benefit)


def solve(
    tasks_df: pd.DataFrame,
    feasible_candidates_by_task: Dict[str, List[dict]],
    priority_by_task: Dict[str, float],
    horizon_minutes: int,
    step_minutes: int,
    time_limit_seconds: float = None,
) -> dict:
    time_limit_seconds = time_limit_seconds or constants.OPT_SOLVER_TIME_LIMIT_SECONDS

    model = cp_model.CpModel()
    var_by_candidate_id: Dict[str, cp_model.IntVar] = {}
    candidate_by_id: Dict[str, dict] = {}
    task_vars: Dict[str, list] = {}
    benefit_by_candidate_id: Dict[str, int] = {}

    for task_id, candidates in feasible_candidates_by_task.items():
        priority_score = priority_by_task.get(task_id, 0.0)
        my_vars = []
        for candidate in candidates:
            var = model.NewBoolVar(candidate["candidate_id"])
            var_by_candidate_id[candidate["candidate_id"]] = var
            candidate_by_id[candidate["candidate_id"]] = candidate
            benefit_by_candidate_id[candidate["candidate_id"]] = _candidate_benefit(
                candidate, priority_score, step_minutes
            )
            my_vars.append(var)
        task_vars[task_id] = my_vars
        if my_vars:
            model.Add(sum(my_vars) <= 1)

    mutual_exclusions_applied = []
    for cand_a, cand_b, conflict in _pairwise_hard_conflicts(tasks_df, feasible_candidates_by_task):
        var_a = var_by_candidate_id.get(cand_a["candidate_id"])
        var_b = var_by_candidate_id.get(cand_b["candidate_id"])
        if var_a is None or var_b is None:
            continue
        model.Add(var_a + var_b <= 1)
        mutual_exclusions_applied.append(
            {
                "candidate_a": cand_a["candidate_id"],
                "candidate_b": cand_b["candidate_id"],
                "task_a": conflict["task_a"],
                "task_b": conflict["task_b"],
                "type": conflict["type"],
                "reason": conflict["reason"],
            }
        )

    model.Maximize(sum(benefit_by_candidate_id[cid] * var for cid, var in var_by_candidate_id.items()))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    status_name = solver.StatusName(status)

    selection: Dict[str, dict] = {}
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for task_id, my_vars in task_vars.items():
            chosen = None
            for var in my_vars:
                if solver.Value(var) == 1:
                    chosen = candidate_by_id[var.Name()]
                    break
            selection[task_id] = chosen
        objective_value = solver.ObjectiveValue()
    else:
        selection = {task_id: None for task_id in feasible_candidates_by_task}
        objective_value = None

    return {
        "status": status_name,
        "objective_value": objective_value,
        "selection": selection,
        "mutual_exclusions_applied": mutual_exclusions_applied,
        "benefit_by_candidate_id": benefit_by_candidate_id,
    }


def solve_model(built: dict, time_limit_seconds: float = None) -> dict:
    """Solve a pre-built CP-SAT model from constraint_engine.build_model().

    This is the "Optimization" half of the Scheduling Engine's pipeline: it
    does not know or care what a block/option/fusion IS - it just solves the
    model it's handed and translates the chosen boolean variables back into
    (a) which option_id (if any) was chosen and (b) which option_id each task
    ended up in, so the caller can assemble the human-facing schedule.

    Never greedy: the whole model (every task x every individual/fused option,
    every hard mutual-exclusion constraint) is solved globally in one CP-SAT
    call, exactly like solve() above.
    """
    time_limit_seconds = time_limit_seconds or constants.OPT_SOLVER_TIME_LIMIT_SECONDS

    model = built["model"]
    var_by_option_id = built["var_by_option_id"]
    task_option_ids = built["task_option_ids"]

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    status_name = solver.StatusName(status)

    selected_option_ids: List[str] = []
    selection_by_task: Dict[str, Optional[str]] = {task_id: None for task_id in task_option_ids}
    objective_value = None

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        objective_value = solver.ObjectiveValue()
        for option_id, var in var_by_option_id.items():
            if solver.Value(var) == 1:
                selected_option_ids.append(option_id)
        for task_id, option_ids in task_option_ids.items():
            for option_id in option_ids:
                if option_id in selected_option_ids:
                    selection_by_task[task_id] = option_id
                    break

    return {
        "status": status_name,
        "objective_value": objective_value,
        "selected_option_ids": selected_option_ids,
        "selection_by_task": selection_by_task,
    }
