"""
feature_engineering.py — Modules 10 & 11: Feature Preparation & Leakage Protection
==================================================================================
Extracts and structures operational and asset condition features for AI/ML prioritization
and block scheduling optimization models.
Strictly prevents data leakage by excluding future operational outcomes, synthetic labels,
or schedule assumptions.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path for direct script execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing import write_csv_records, get_project_root


TASK_FEATURE_COLUMNS = [
    # Identifiers & Categorical Dimensions
    "task_id",
    "department",
    "task_category",
    "section_id",
    "track_line",
    "station_code",
    "start_km",
    "end_km",
    "work_length_km",
    "horizon",
    "status",

    # Asset Condition & Urgency (ML Prioritization Inputs)
    "safety_criticality",
    "asset_degradation_score",
    "urgency_days_overdue",
    "gmt_accumulated",
    "speed_restriction_if_deferred_kmh",
    "has_speed_restriction",

    # Operational Block Constraints (Optimization Inputs)
    "required_duration_mins",
    "requires_traffic_block",
    "requires_power_block",
    "requires_st_disconnection",
    "required_machines",
    "required_gangs",
    "required_power_cut_substation",

    # Station Operational Infrastructure
    "km_from_origin",
    "has_yard",
    "platforms"
]


def prepare_task_features(
    enriched_tasks: List[Dict[str, Any]],
    output_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """
    Transforms enriched maintenance tasks into a curated feature set for downstream models:
    - Calculates legitimate spatial feature: work_length_km = round(end_km - start_km, 2)
    - Computes has_speed_restriction boolean flag
    - Preserves missing numerical values as None (NaN) rather than imputing zero
    - Guarantees zero data leakage (no future delay outcomes, no target labels)
    """
    feature_records = []

    for t in enriched_tasks:
        start_km = t.get("start_km")
        end_km = t.get("end_km")
        work_len = None
        if start_km is not None and end_km is not None:
            work_len = round(float(end_km) - float(start_km), 2)

        sr_val = t.get("speed_restriction_if_deferred_kmh")
        has_sr = (sr_val is not None and float(sr_val) > 0) if sr_val is not None else False

        features = {
            # Identifiers
            "task_id": t.get("task_id"),
            "department": t.get("department"),
            "task_category": t.get("task_category"),
            "section_id": t.get("section_id"),
            "track_line": t.get("track_line"),
            "station_code": t.get("station_code"),
            "start_km": start_km,
            "end_km": end_km,
            "work_length_km": work_len,
            "horizon": t.get("horizon"),
            "status": t.get("status"),

            # Prioritization Inputs
            "safety_criticality": t.get("safety_criticality"),
            "asset_degradation_score": t.get("asset_degradation_score"),
            "urgency_days_overdue": t.get("urgency_days_overdue"),
            "gmt_accumulated": t.get("gmt_accumulated"),
            "speed_restriction_if_deferred_kmh": sr_val,
            "has_speed_restriction": has_sr,

            # Block Constraints
            "required_duration_mins": t.get("required_duration_mins"),
            "requires_traffic_block": t.get("requires_traffic_block"),
            "requires_power_block": t.get("requires_power_block"),
            "requires_st_disconnection": t.get("requires_st_disconnection"),
            "required_machines": t.get("required_machines"),
            "required_gangs": t.get("required_gangs"),
            "required_power_cut_substation": t.get("required_power_cut_substation"),

            # Infrastructure
            "km_from_origin": t.get("km_from_origin"),
            "has_yard": t.get("has_yard"),
            "platforms": t.get("platforms")
        }
        feature_records.append(features)

    if output_path is not None:
        write_csv_records(output_path, feature_records, TASK_FEATURE_COLUMNS)

    return feature_records
