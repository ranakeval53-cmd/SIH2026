"""
integration.py — Modules 5 & 9: Dataset Integration and Station Enrichment
==========================================================================
Unifies TMS and SMMS maintenance tasks using vertical concatenation (pd.concat equivalent)
and enriches unified maintenance tasks with Station Master metadata via Left Join.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path for direct script execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing import write_csv_records, get_project_root


# Canonical schema order for unified maintenance tasks
UNIFIED_TASK_COLUMNS = [
    "task_id",
    "department",
    "task_name",
    "task_category",
    "section_id",
    "track_line",
    "start_km",
    "end_km",
    "station_code",
    "required_duration_mins",
    "safety_criticality",
    "asset_degradation_score",
    "urgency_days_overdue",
    "gmt_accumulated",
    "speed_restriction_if_deferred_kmh",
    "requires_traffic_block",
    "requires_power_block",
    "requires_st_disconnection",
    "required_machines",
    "required_gangs",
    "required_power_cut_substation",
    "horizon",
    "status"
]

ENRICHED_TASK_COLUMNS = UNIFIED_TASK_COLUMNS + [
    "station_name",
    "division",
    "zone",
    "state",
    "latitude",
    "longitude",
    "km_from_origin",
    "has_yard",
    "platforms"
]


# -------------------------------------------------------------------------
# MODULE 5: TMS + SMMS + TDMS Integration (Vertical Concatenation)
# -------------------------------------------------------------------------

def integrate_maintenance_tasks(
    tms_records: List[Dict[str, Any]],
    smms_records: List[Dict[str, Any]],
    tdms_records: Optional[List[Dict[str, Any]]] = None,
    output_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """
    Combines TMS, SMMS, and TDMS maintenance tasks into a single unified dataset.
    Preserves all department-specific attributes across Engineering, S&T, and Traction Distribution.
    Equivalent to pd.concat([tms_df, smms_df, tdms_df], ignore_index=True).
    """
    unified_records = []
    tdms_list = tdms_records or []

    # Process TMS tasks
    for r in tms_records:
        row = {col: r.get(col, None) for col in UNIFIED_TASK_COLUMNS}
        row["department"] = "TMS"
        unified_records.append(row)

    # Process SMMS tasks
    for r in smms_records:
        row = {col: r.get(col, None) for col in UNIFIED_TASK_COLUMNS}
        row["department"] = "SMMS"
        unified_records.append(row)

    # Process TDMS tasks
    for r in tdms_list:
        row = {col: r.get(col, None) for col in UNIFIED_TASK_COLUMNS}
        row["department"] = "TDMS"
        unified_records.append(row)

    expected_count = len(tms_records) + len(smms_records) + len(tdms_list)
    if len(unified_records) != expected_count:
        raise ValueError(
            f"Integration row count mismatch: expected {expected_count}, got {len(unified_records)}"
        )

    if output_path is not None:
        write_csv_records(output_path, unified_records, UNIFIED_TASK_COLUMNS)

    return unified_records


# -------------------------------------------------------------------------
# MODULE 9: Station Master Enrichment (Left Join)
# -------------------------------------------------------------------------

def enrich_maintenance_with_stations(
    tasks_records: List[Dict[str, Any]],
    stations_records: List[Dict[str, Any]],
    output_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """
    Enriches maintenance tasks with station metadata via a LEFT JOIN on station_code:
      maintenance_tasks.station_code -> stations_clean.station_code

    Guarantees:
    - Pre-validates that station_code is strictly unique in station master.
    - Verifies row count equality: rows_before == rows_after (preventing accidental row multiplication).
    - Preserves all maintenance tasks even if station metadata is absent.
    """
    # 1. Validate station master uniqueness
    stations_map = {}
    duplicate_station_codes = []
    for s in stations_records:
        code = s.get("station_code", "").strip().upper()
        if not code:
            continue
        if code in stations_map:
            duplicate_station_codes.append(code)
        else:
            stations_map[code] = s

    if duplicate_station_codes:
        raise ValueError(
            f"Station Master integrity violation: duplicate station codes detected: {duplicate_station_codes}. "
            "Resolve duplicate station records before enrichment to prevent row explosion."
        )

    # 2. Perform LEFT JOIN
    rows_before = len(tasks_records)
    enriched_records = []

    for t in tasks_records:
        task_code = t.get("station_code", "").strip().upper()
        station_info = stations_map.get(task_code, {})

        enriched_row = dict(t)
        enriched_row["station_name"] = station_info.get("station_name", None)
        enriched_row["division"] = station_info.get("division", None)
        enriched_row["zone"] = station_info.get("zone", None)
        enriched_row["state"] = station_info.get("state", None)
        enriched_row["latitude"] = station_info.get("latitude", None)
        enriched_row["longitude"] = station_info.get("longitude", None)
        enriched_row["km_from_origin"] = station_info.get("km_from_origin", None)
        enriched_row["has_yard"] = station_info.get("has_yard", None)
        enriched_row["platforms"] = station_info.get("platforms", None)

        enriched_records.append(enriched_row)

    rows_after = len(enriched_records)

    # 3. Integrity verification: rows before must equal rows after
    if rows_before != rows_after:
        raise ValueError(
            f"Row count integrity violation during Station Enrichment! "
            f"Rows before join: {rows_before}, rows after join: {rows_after}. "
            f"Unexpected row multiplication occurred."
        )

    if output_path is not None:
        write_csv_records(output_path, enriched_records, ENRICHED_TASK_COLUMNS)

    return enriched_records
