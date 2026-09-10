"""
Priority Engine.

Computes a configurable 0-100 priority score for every maintenance task using
only fields that are actually present in data/processed/task_features.csv:

    safety_criticality, asset_degradation_score, urgency_days_overdue,
    gmt_accumulated, speed_restriction_if_deferred_kmh, has_speed_restriction,
    requires_traffic_block, requires_power_block, requires_st_disconnection,
    horizon, platforms, has_yard

If a contributing field is missing (NaN) for a task, that component is
dropped and the remaining weights are renormalised for that task alone - the
score is never padded with a guessed value. Every score ships with
human-readable reason codes explaining what drove it.

Public API:
    compute_priorities(task_features_df) -> list[dict]
    classify(score) -> str
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd

from backend.app.utils import constants


def classify(score: float) -> str:
    if score >= constants.PRIORITY_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    if score >= constants.PRIORITY_THRESHOLDS["HIGH"]:
        return "HIGH"
    if score >= constants.PRIORITY_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


def _safe_float(value) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return float("nan")
    return f


def _dataset_max(df: pd.DataFrame, column: str) -> float:
    """Real min-max normalisation anchor computed from THIS dataset - not a
    fabricated constant. Falls back to 1.0 if the column is entirely missing
    or degenerate, so a component simply contributes 0 rather than dividing
    by zero."""
    if column not in df.columns:
        return 1.0
    series = pd.to_numeric(df[column], errors="coerce")
    max_val = series.max(skipna=True)
    if max_val is None or pd.isna(max_val) or max_val <= 0:
        return 1.0
    return float(max_val)


def _component_safety(row) -> tuple:
    val = _safe_float(row.get("safety_criticality"))
    if np.isnan(val):
        return None, None
    score = min(max(val / constants.SCORE_0_10_SCALE, 0.0), 1.0) * 100
    reason = None
    if val >= 9.0:
        reason = f"SAFETY_CRITICALITY_VERY_HIGH ({val:.1f}/10)"
    elif val >= 7.5:
        reason = f"SAFETY_CRITICALITY_HIGH ({val:.1f}/10)"
    return score, reason


def _component_degradation(row) -> tuple:
    val = _safe_float(row.get("asset_degradation_score"))
    if np.isnan(val):
        return None, None
    score = min(max(val / constants.SCORE_0_10_SCALE, 0.0), 1.0) * 100
    reason = None
    if val >= 9.0:
        reason = f"ASSET_DEGRADATION_SEVERE ({val:.1f}/10)"
    elif val >= 7.5:
        reason = f"ASSET_DEGRADATION_HIGH ({val:.1f}/10)"
    return score, reason


def _component_urgency(row) -> tuple:
    val = _safe_float(row.get("urgency_days_overdue"))
    if np.isnan(val):
        return None, None
    horizon = str(row.get("horizon") or "").upper()
    cap = constants.URGENCY_OVERDUE_CAP_DAYS.get(horizon, constants.DEFAULT_URGENCY_CAP_DAYS)
    ratio = min(max(val / cap, 0.0), 1.0)
    score = ratio * 100
    reason = None
    if ratio >= 1.0:
        reason = f"OVERDUE_AT_OR_BEYOND_CAP ({val:.0f}d overdue, {horizon or 'UNKNOWN'} cap={cap}d)"
    elif ratio >= 0.6:
        reason = f"OVERDUE_APPROACHING_CAP ({val:.0f}d overdue, {horizon or 'UNKNOWN'} cap={cap}d)"
    return score, reason


def _component_operational_impact(row, gmt_max: float) -> tuple:
    parts = []
    reasons = []

    gmt = _safe_float(row.get("gmt_accumulated"))
    if not np.isnan(gmt):
        parts.append(min(max(gmt / gmt_max, 0.0), 1.0) * 100)
        if gmt / gmt_max >= 0.9:
            reasons.append(f"HIGH_TRAFFIC_LOAD (gmt_accumulated={gmt:.1f}, dataset_max={gmt_max:.1f})")

    speed_restriction = row.get("speed_restriction_if_deferred_kmh")
    speed_val = _safe_float(speed_restriction)
    has_flag = bool(row.get("has_speed_restriction")) if "has_speed_restriction" in row else None
    if not np.isnan(speed_val) and has_flag:
        # Lower permissible speed if deferred => more severe operational impact.
        # Normalised against a reasonable Indian corridor max line speed (130 km/h,
        # the highest speed_kmh value present in trains_clean.csv) rather than a
        # made-up ceiling.
        severity_ratio = min(max(1.0 - (speed_val / 130.0), 0.0), 1.0)
        parts.append(severity_ratio * 100)
        if speed_val <= 30:
            reasons.append(f"SEVERE_SPEED_RESTRICTION_IF_DEFERRED ({speed_val:.0f} km/h)")
    else:
        reasons.append("NO_SPEED_RESTRICTION_DATA")

    block_flags = [
        bool(row.get("requires_traffic_block")) if not pd.isna(row.get("requires_traffic_block")) else False,
        bool(row.get("requires_power_block")) if not pd.isna(row.get("requires_power_block")) else False,
        bool(row.get("requires_st_disconnection")) if not pd.isna(row.get("requires_st_disconnection")) else False,
    ]
    flag_count = sum(block_flags)
    if flag_count:
        parts.append((flag_count / 3.0) * 100)
        if flag_count >= 2:
            reasons.append(f"MULTIPLE_BLOCK_TYPES_REQUIRED ({flag_count}/3)")

    if not parts:
        return None, reasons
    return float(np.mean(parts)), reasons


def _component_asset_importance(row, platforms_max: float) -> tuple:
    parts = []
    reasons = []

    platforms = _safe_float(row.get("platforms"))
    if not np.isnan(platforms):
        parts.append(min(max(platforms / platforms_max, 0.0), 1.0) * 100)

    has_yard = row.get("has_yard")
    if isinstance(has_yard, str):
        has_yard = has_yard.strip().lower() == "true"
    if has_yard is True:
        parts.append(70.0)
        reasons.append(f"MAJOR_JUNCTION_STATION (station_code={row.get('station_code')}, has_yard)")
    elif has_yard is False:
        parts.append(20.0)

    if not parts:
        return None, reasons
    return float(np.mean(parts)), reasons


def compute_priorities(task_features_df: pd.DataFrame) -> List[Dict]:
    """Compute priority score/class/reason codes for every row.

    Returns a list of dicts (one per task_id) rather than mutating the input
    DataFrame, keeping this function a pure read of the processed data.
    """
    gmt_max = _dataset_max(task_features_df, "gmt_accumulated")
    platforms_max = _dataset_max(task_features_df, "platforms")

    results = []
    for _, row in task_features_df.iterrows():
        components = {}
        reason_codes = []

        safety_score, safety_reason = _component_safety(row)
        if safety_score is not None:
            components["safety"] = safety_score
            if safety_reason:
                reason_codes.append(safety_reason)
        else:
            reason_codes.append("NO_SAFETY_CRITICALITY_DATA")

        deg_score, deg_reason = _component_degradation(row)
        if deg_score is not None:
            components["degradation"] = deg_score
            if deg_reason:
                reason_codes.append(deg_reason)
        else:
            reason_codes.append("NO_DEGRADATION_DATA")

        urgency_score, urgency_reason = _component_urgency(row)
        if urgency_score is not None:
            components["urgency"] = urgency_score
            if urgency_reason:
                reason_codes.append(urgency_reason)
        else:
            reason_codes.append("NO_URGENCY_DATA")

        op_score, op_reasons = _component_operational_impact(row, gmt_max)
        if op_score is not None:
            components["operational_impact"] = op_score
        reason_codes.extend(op_reasons)

        asset_score, asset_reasons = _component_asset_importance(row, platforms_max)
        if asset_score is not None:
            components["asset_importance"] = asset_score
        reason_codes.extend(asset_reasons)

        # Renormalise weights over whichever components actually have data.
        active_weight = sum(constants.PRIORITY_WEIGHTS[k] for k in components)
        if active_weight <= 0:
            final_score = 0.0
            reason_codes.append("NO_PRIORITY_INPUTS_AVAILABLE")
        else:
            final_score = sum(
                components[k] * (constants.PRIORITY_WEIGHTS[k] / active_weight) for k in components
            )
        final_score = round(min(max(final_score, 0.0), 100.0), 2)

        results.append(
            {
                "task_id": row.get("task_id"),
                "priority_score": final_score,
                "priority_class": classify(final_score),
                "reason_codes": reason_codes,
                "components": {k: round(v, 2) for k, v in components.items()},
            }
        )
    return results
