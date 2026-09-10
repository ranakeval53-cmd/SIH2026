"""
Conflict Engine.

Detects every kind of conflict called for by the AI layer spec:
  - train/block overlap (a train is physically inside the task's km range
    while the candidate block is open)
  - overlapping km ranges between two maintenance tasks on the same
    section/track line
  - maintenance-task overlap (two tasks sharing required_machines or
    required_gangs at overlapping times, regardless of location)
  - station/infrastructure conflicts (two simultaneous traffic blocks at a
    station with no yard capacity)
  - unsafe critical conflicts (same-line conflict against a premium/high
    priority-rank train)

Train position modelling
-------------------------
The dataset gives us, at best, a handful of timestamped (time, distance_km)
waypoints per train (schedules_clean.csv) and at worst only an origin,
destination, departure/arrival time and an average speed_kmh
(trains_clean.csv). To find out *when* a train is inside a task's
[start_km, end_km] window without fabricating data, every train is modelled
at one of three fidelity tiers:

  SCHEDULE  - >=2 timestamped stops in schedules_clean.csv are available.
              The train's position is piecewise-linear between real
              (time, distance_km) points taken directly from the data
              (dwell time at a stop is modelled as a flat segment between
              its arrival and departure minute).
  ENDPOINTS - no schedules_clean.csv rows, but BOTH the origin and
              destination station codes resolve to a km_from_origin in
              stations_clean.csv (i.e. the whole trip lies on the modelled
              corridor). Position is linearly interpolated between
              (departure_time, km(origin)) and (arrival_time, km(destination)).
              This is an approximation (assumes constant speed) and is
              labelled as such in every conflict raised against it.
  UNRESOLVED - neither of the above. The train's physical position along the
              corridor cannot be determined from the available columns
              without guessing. Such trains are EXCLUDED from geometric
              conflict checks and listed separately so nothing is silently
              dropped - see `unresolved_trains` in build_train_position_models().

Trains are assumed to repeat on every day of the planning horizon (there is
no day-of-week/calendar data to say otherwise) - a conservative assumption
that can only add caution, never hide a real conflict.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import pandas as pd

from backend.app.utils import constants, time_utils

TIER_SCHEDULE = "SCHEDULE"
TIER_ENDPOINTS = "ENDPOINTS"
TIER_UNRESOLVED = "UNRESOLVED"


@dataclass
class TrainModel:
    train_no: str
    direction: Optional[str]
    priority_rank: Optional[int]
    is_freight: bool
    tier: str
    points: List[Tuple[float, float]] = field(default_factory=list)  # (time_min, km) within one day

    @property
    def resolved(self) -> bool:
        return self.tier != TIER_UNRESOLVED and len(self.points) >= 2


def _as_bool(value) -> bool:
    if isinstance(value, str):
        return value.strip().lower() == "true"
    if pd.isna(value):
        return False
    return bool(value)


def build_train_position_models(
    trains_df: pd.DataFrame,
    schedules_df: pd.DataFrame,
    stations_df: pd.DataFrame,
) -> Dict[str, TrainModel]:
    station_km = dict(zip(stations_df["station_code"], stations_df["km_from_origin"]))
    models: Dict[str, TrainModel] = {}

    schedules_by_train = {
        train_no: group.sort_values(by=["day_count", "arrival_minutes", "departure_minutes"], na_position="first")
        for train_no, group in schedules_df.groupby("train_no")
    }

    for _, row in trains_df.iterrows():
        train_no = row["train_no"]
        direction = row.get("direction")
        priority_rank = row.get("priority_rank")
        try:
            priority_rank = int(priority_rank) if not pd.isna(priority_rank) else None
        except (TypeError, ValueError):
            priority_rank = None
        is_freight = _as_bool(row.get("is_freight"))

        sched_rows = schedules_by_train.get(train_no)
        points: List[Tuple[float, float]] = []
        tier = TIER_UNRESOLVED

        if sched_rows is not None and len(sched_rows) >= 2:
            for _, srow in sched_rows.iterrows():
                day_count = srow.get("day_count") if not pd.isna(srow.get("day_count")) else 1
                distance_km = srow.get("distance_km")
                if pd.isna(distance_km):
                    continue
                arr = srow.get("arrival_minutes")
                dep = srow.get("departure_minutes")
                if not pd.isna(arr):
                    points.append((time_utils.add_day_offset(int(arr), day_count), float(distance_km)))
                if not pd.isna(dep):
                    points.append((time_utils.add_day_offset(int(dep), day_count), float(distance_km)))
            points = sorted(set(points))
            if len(points) >= 2:
                tier = TIER_SCHEDULE

        if tier == TIER_UNRESOLVED:
            origin = row.get("origin")
            destination = row.get("destination")
            if origin in station_km and destination in station_km:
                t0 = time_utils.parse_hhmm_to_minutes(row.get("departure_time"))
                t1 = time_utils.parse_hhmm_to_minutes(row.get("arrival_time"))
                if t0 is not None and t1 is not None:
                    if t1 <= t0:
                        # Overnight trip within a single wrap - only ever applied to
                        # short corridor-local trips (both endpoints on-corridor).
                        t1 += 1440
                    points = [(t0, float(station_km[origin])), (t1, float(station_km[destination]))]
                    tier = TIER_ENDPOINTS

        models[train_no] = TrainModel(
            train_no=train_no,
            direction=direction,
            priority_rank=priority_rank,
            is_freight=is_freight,
            tier=tier,
            points=points,
        )

    return models


def unresolved_trains(models: Dict[str, TrainModel]) -> List[str]:
    return [t for t, m in models.items() if not m.resolved]


def _interpolate_segment_crossing(t0, k0, t1, k1, start_km, end_km):
    """For a single (possibly flat) segment from (t0,k0) to (t1,k1), return the
    sub-interval of [t0, t1] during which km(t) in [start_km, end_km], or None.

    km(t) is linear (or constant) in t over the segment, so the set of times
    where it falls inside [start_km, end_km] is itself a single interval -
    computed directly by inverting the linear map at both range boundaries
    and clipping to the segment's own [t0, t1], rather than by hunting
    through a mixed bag of candidate timestamps.
    """
    if t1 < t0:
        t0, t1, k0, k1 = t1, t0, k1, k0

    if k0 == k1:
        if start_km <= k0 <= end_km:
            return (t0, t1)
        return None

    def time_at_km(target_km):
        ratio = (target_km - k0) / (k1 - k0)
        return t0 + ratio * (t1 - t0)

    t_at_start = time_at_km(start_km)
    t_at_end = time_at_km(end_km)
    lo_t, hi_t = (t_at_start, t_at_end) if t_at_start < t_at_end else (t_at_end, t_at_start)

    seg_start = max(t0, lo_t)
    seg_end = min(t1, hi_t)
    if seg_start >= seg_end:
        return None
    return (seg_start, seg_end)


def get_occupancy_intervals(
    model: TrainModel,
    start_km: float,
    end_km: float,
    horizon_minutes: int,
) -> List[Tuple[float, float]]:
    """Absolute-horizon-minute intervals during which `model`'s train is
    physically within [start_km, end_km], assuming the (single-day) point
    pattern repeats every 24h across the whole planning horizon."""
    if not model.resolved:
        return []

    intervals: List[Tuple[float, float]] = []
    max_point_time = max(t for t, _ in model.points)
    num_days_needed = int(max_point_time // 1440) + (horizon_minutes // 1440) + 2

    for day_shift in range(0, num_days_needed):
        offset = day_shift * 1440
        shifted = [(t + offset, k) for t, k in model.points]
        for (t0, k0), (t1, k1) in zip(shifted, shifted[1:]):
            if t0 > horizon_minutes:
                continue
            hit = _interpolate_segment_crossing(t0, k0, t1, k1, start_km, end_km)
            if hit:
                s, e = hit
                s = max(s, 0)
                e = min(e, horizon_minutes)
                if s < e:
                    intervals.append((s, e))

    return time_utils.merge_intervals(intervals)


def check_train_conflicts(
    candidate: dict,
    task_row,
    train_models: Dict[str, TrainModel],
    horizon_minutes: int,
) -> List[dict]:
    """Return every train conflict for a single candidate block."""
    conflicts = []
    start_km = float(task_row["start_km"])
    end_km = float(task_row["end_km"])
    task_line = task_row.get("track_line")
    requires_cross_line_risk = _as_bool(task_row.get("requires_power_block")) or _as_bool(
        task_row.get("requires_st_disconnection")
    )

    for train_no, model in train_models.items():
        if not model.resolved:
            continue
        same_line = model.direction == task_line
        if not same_line and not requires_cross_line_risk:
            continue  # opposite line, no cross-line risk factor -> not evaluated

        occupancy = get_occupancy_intervals(model, start_km, end_km, horizon_minutes)
        for occ_start, occ_end in occupancy:
            overlap = time_utils.overlap_span(
                candidate["start_minute"], candidate["end_minute"], occ_start, occ_end
            )
            if overlap is None:
                continue
            severity = constants.train_conflict_severity(model.priority_rank, model.is_freight, same_line)
            conflicts.append(
                {
                    "train_no": train_no,
                    "direction": model.direction,
                    "same_line": same_line,
                    "priority_rank": model.priority_rank,
                    "is_freight": model.is_freight,
                    "position_model_tier": model.tier,
                    "severity": severity,
                    "overlap_start": overlap[0],
                    "overlap_end": overlap[1],
                    "reason": (
                        f"Train {train_no} ({'freight' if model.is_freight else 'passenger'}, "
                        f"priority_rank={model.priority_rank}, direction={model.direction}) "
                        f"occupies km {start_km}-{end_km} of {task_row.get('section_id')} "
                        f"from {time_utils.minutes_to_label(occ_start)} to "
                        f"{time_utils.minutes_to_label(occ_end)}"
                        + ("" if same_line else " [opposite line, power/signal block risk]")
                    ),
                }
            )
    return conflicts


def _km_ranges_overlap(a_start, a_end, b_start, b_end) -> bool:
    return a_start < b_end and b_start < a_end


def check_task_pair_conflict(
    candidate_a: dict, task_a, candidate_b: dict, task_b
) -> Optional[dict]:
    """Hard conflict between two DIFFERENT tasks' candidate blocks: either a
    physical track overlap (same section+line, overlapping km, overlapping
    time) or a shared-resource clash (same machine/gang, overlapping time,
    regardless of location)."""
    if task_a["task_id"] == task_b["task_id"]:
        return None

    time_overlap = time_utils.overlap_span(
        candidate_a["start_minute"], candidate_a["end_minute"],
        candidate_b["start_minute"], candidate_b["end_minute"],
    )
    if time_overlap is None:
        return None

    same_section_line = (
        task_a.get("section_id") == task_b.get("section_id")
        and task_a.get("track_line") == task_b.get("track_line")
    )
    if same_section_line and _km_ranges_overlap(
        float(task_a["start_km"]), float(task_a["end_km"]),
        float(task_b["start_km"]), float(task_b["end_km"]),
    ):
        return {
            "task_a": task_a["task_id"],
            "task_b": task_b["task_id"],
            "type": "TRACK_KM_OVERLAP",
            "severity": constants.SEVERITY_CRITICAL,
            "overlap_start": time_overlap[0],
            "overlap_end": time_overlap[1],
            "reason": (
                f"{task_a['task_id']} and {task_b['task_id']} both occupy overlapping km "
                f"ranges on {task_a.get('section_id')} ({task_a.get('track_line')}) at the same time"
            ),
        }

    shared_resource = None
    for col in ("required_machines", "required_gangs"):
        val_a = task_a.get(col)
        val_b = task_b.get(col)
        if val_a and val_b and not pd.isna(val_a) and not pd.isna(val_b) and val_a == val_b:
            shared_resource = (col, val_a)
            break
    if shared_resource:
        return {
            "task_a": task_a["task_id"],
            "task_b": task_b["task_id"],
            "type": "RESOURCE_CONFLICT",
            "severity": constants.SEVERITY_CRITICAL,
            "overlap_start": time_overlap[0],
            "overlap_end": time_overlap[1],
            "reason": (
                f"{task_a['task_id']} and {task_b['task_id']} both require "
                f"{shared_resource[0]}={shared_resource[1]} at overlapping times"
            ),
        }

    return None


def check_infrastructure_conflict(
    candidate_a: dict, task_a, candidate_b: dict, task_b
) -> Optional[dict]:
    """Station-capacity conflict: two simultaneous traffic blocks at the same
    station when that station has no yard (assumed to lack the capacity to
    safely stage two concurrent blocks)."""
    if task_a["task_id"] == task_b["task_id"]:
        return None
    if not constants.INFRA_REQUIRES_YARD_FOR_CONCURRENT_BLOCKS:
        return None
    if task_a.get("station_code") != task_b.get("station_code"):
        return None
    if not (_as_bool(task_a.get("requires_traffic_block")) and _as_bool(task_b.get("requires_traffic_block"))):
        return None
    has_yard = task_a.get("has_yard")
    if _as_bool(has_yard):
        return None

    time_overlap = time_utils.overlap_span(
        candidate_a["start_minute"], candidate_a["end_minute"],
        candidate_b["start_minute"], candidate_b["end_minute"],
    )
    if time_overlap is None:
        return None

    return {
        "task_a": task_a["task_id"],
        "task_b": task_b["task_id"],
        "type": "STATION_CAPACITY_CONFLICT",
        "severity": constants.SEVERITY_HIGH,
        "overlap_start": time_overlap[0],
        "overlap_end": time_overlap[1],
        "reason": (
            f"{task_a['task_id']} and {task_b['task_id']} both need a traffic block at "
            f"{task_a.get('station_code')} simultaneously, and that station has no yard capacity"
        ),
    }


def structural_conflict_reason(task_a, task_b) -> Optional[str]:
    """Cheap, TIME-INDEPENDENT check: could these two (different) tasks EVER
    conflict, regardless of which candidate time each ends up with?

    Returns a short conflict-type string ("TRACK_KM_OVERLAP", "RESOURCE_CONFLICT",
    "STATION_CAPACITY_CONFLICT") if so, else None. This is the shared source of
    truth used by:
      - optimizer.py, to decide which candidate PAIRS are even worth the exact
        (time-aware) pairwise conflict check, and
      - block_fusion.py, to decide which task PAIRS are fusion candidates in
        the first place (fusion exists specifically to turn one of these
        structural conflicts into "do both, sequentially" instead of "pick one").
    """
    if task_a["task_id"] == task_b["task_id"]:
        return None

    same_section_line = (
        task_a.get("section_id") == task_b.get("section_id")
        and task_a.get("track_line") == task_b.get("track_line")
    )
    if same_section_line and _km_ranges_overlap(
        float(task_a["start_km"]), float(task_a["end_km"]),
        float(task_b["start_km"]), float(task_b["end_km"]),
    ):
        return "TRACK_KM_OVERLAP"

    for col in ("required_machines", "required_gangs"):
        va, vb = task_a.get(col), task_b.get(col)
        if va and vb and not pd.isna(va) and not pd.isna(vb) and va == vb:
            return "RESOURCE_CONFLICT"

    if constants.INFRA_REQUIRES_YARD_FOR_CONCURRENT_BLOCKS and task_a.get("station_code") == task_b.get(
        "station_code"
    ):
        req_a = _as_bool(task_a.get("requires_traffic_block"))
        req_b = _as_bool(task_b.get("requires_traffic_block"))
        has_yard = _as_bool(task_a.get("has_yard"))
        if req_a and req_b and not has_yard:
            return "STATION_CAPACITY_CONFLICT"

    return None


def check_duplicate_tasks(tasks_df: pd.DataFrame) -> List[dict]:
    """Typed conflict records (type/severity/affected task/reason) for any
    duplicate task_id in the input - reported both as a hard gate (callers
    should refuse to plan) and as an entry in the AI layer's conflicts list."""
    duplicate_ids = tasks_df["task_id"][tasks_df["task_id"].duplicated()].unique().tolist()
    return [
        {
            "type": "DUPLICATE_TASK",
            "severity": constants.SEVERITY_CRITICAL,
            "task_id": task_id,
            "reason": f"task_id '{task_id}' appears more than once in the input data.",
        }
        for task_id in duplicate_ids
    ]


def check_duration_validity(task_row) -> Optional[dict]:
    """Typed conflict record if a task's required_duration_mins is missing,
    non-positive, or exceeds the planning horizon entirely (caught later by
    the caller who knows the horizon; this only catches the task-level
    data-quality case)."""
    duration = task_row.get("required_duration_mins")
    try:
        duration = float(duration)
    except (TypeError, ValueError):
        duration = None
    if duration is None or pd.isna(duration) or duration <= 0:
        return {
            "type": "INSUFFICIENT_DURATION",
            "severity": constants.SEVERITY_CRITICAL,
            "task_id": task_row.get("task_id"),
            "reason": f"required_duration_mins is missing or non-positive ({task_row.get('required_duration_mins')!r}).",
        }
    return None


def check_time_range_validity(candidate: dict, horizon_minutes: int) -> Optional[dict]:
    """Typed conflict record if a candidate's own [start_minute, end_minute)
    window is not a valid range inside the planning horizon."""
    start = candidate.get("start_minute")
    end = candidate.get("end_minute")
    if start is None or end is None or start < 0 or end > horizon_minutes or start >= end:
        return {
            "type": "INVALID_TIME_RANGE",
            "severity": constants.SEVERITY_CRITICAL,
            "task_id": candidate.get("task_id"),
            "reason": f"candidate window [{start}, {end}) is not a valid range within horizon [0, {horizon_minutes}).",
        }
    return None
