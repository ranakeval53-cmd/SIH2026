"""
Time helpers shared by the AI & Intelligence Layer.

All "minutes" values in this layer are minutes-from-horizon-start (an
absolute offset into the synthetic multi-day planning horizon defined in
constants.PLANNING_HORIZON_MINUTES), NOT minutes-since-midnight-of-today and
NOT tied to any real calendar date (the source dataset has none). Use
minutes_to_label() to render a human-readable "Dn HH:MM" string.

Intervals are treated as half-open [start, end): a block ending exactly when
another starts/a train arrives is NOT considered an overlap.
"""

from __future__ import annotations

import math
from typing import Optional


def parse_hhmm_to_minutes(value) -> Optional[int]:
    """Parse an 'HH:MM' string to minutes-since-midnight (0-1439).

    Returns None for missing/non-time values such as NaN, '', 'Source',
    'Destination' (these appear verbatim in schedules_clean.csv / are how
    pandas may surface a missing cell). Never guesses a time.
    """
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() in ("nan", "source", "destination"):
        return None
    if ":" not in text:
        return None
    try:
        hh, mm = text.split(":")
        hh_i, mm_i = int(hh), int(mm)
    except ValueError:
        return None
    if not (0 <= hh_i <= 23 and 0 <= mm_i <= 59):
        return None
    return hh_i * 60 + mm_i


def add_day_offset(minutes_in_day: int, day_count: int) -> int:
    """Shift a within-day minute value onto the absolute horizon timeline.

    day_count follows schedules_clean.csv convention: 1 = first day of the
    trip, 2 = the following calendar day (used for overnight journeys).
    """
    if minutes_in_day is None:
        return None
    day_index = max(int(day_count) - 1, 0)
    return minutes_in_day + day_index * 1440


def intervals_overlap(start_a: float, end_a: float, start_b: float, end_b: float) -> bool:
    """True if half-open intervals [start_a, end_a) and [start_b, end_b) overlap."""
    return start_a < end_b and start_b < end_a


def overlap_span(start_a: float, end_a: float, start_b: float, end_b: float):
    """Return (overlap_start, overlap_end) or None if the intervals do not overlap."""
    if not intervals_overlap(start_a, end_a, start_b, end_b):
        return None
    return max(start_a, start_b), min(end_a, end_b)


def minutes_to_label(minutes: float) -> str:
    """Render an absolute horizon-minute offset as e.g. 'D1 06:00' / 'D2 23:45'."""
    minutes = int(round(minutes))
    day = minutes // 1440 + 1
    time_of_day = minutes % 1440
    hh = time_of_day // 60
    mm = time_of_day % 60
    return f"D{day} {hh:02d}:{mm:02d}"


def merge_intervals(intervals):
    """Merge a list of (start, end) tuples into a minimal sorted non-overlapping list.

    Touching intervals (end_a == start_b) ARE merged here because they
    represent one continuous physical occupancy, not two separate visits.
    """
    if not intervals:
        return []
    ordered = sorted(intervals, key=lambda pair: pair[0])
    merged = [list(ordered[0])]
    for start, end in ordered[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return [tuple(pair) for pair in merged]
