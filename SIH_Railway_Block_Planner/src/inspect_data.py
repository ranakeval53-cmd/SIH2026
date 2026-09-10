"""
inspect_data.py — Module 1: Data Inspection
============================================
Inspects raw datasets for the SIH 2026 Railway Block Planning project.
Generates 'reports/data_quality_report.json' with metrics on rows, columns,
data types, nulls, duplicates, candidate keys, and relational linkages.
"""

import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


def get_project_root() -> Path:
    """Returns the root directory of the project using relative pathlib navigation."""
    return Path(__file__).resolve().parent.parent


def is_float(val: str) -> bool:
    """Checks if a string value represents a floating point number."""
    try:
        float(val)
        return True
    except (ValueError, TypeError):
        return False


def is_int(val: str) -> bool:
    """Checks if a string value represents an integer."""
    try:
        int(val)
        return True
    except (ValueError, TypeError):
        return False


def infer_data_type(values: List[str]) -> str:
    """Infers the dominant data type from a list of string values."""
    non_empty = [v.strip() for v in values if v is not None and v.strip() != "" and v.lower() != "none"]
    if not non_empty:
        return "string (all empty)"

    # Check boolean
    if all(v.lower() in ("true", "false", "t", "f", "1", "0") for v in non_empty):
        return "boolean"

    # Check integer
    if all(is_int(v) for v in non_empty):
        return "integer"

    # Check float
    if all(is_float(v) for v in non_empty):
        return "float"

    return "string"


def inspect_single_csv(file_path: Path) -> Dict[str, Any]:
    """Inspects a single CSV file and calculates data quality statistics."""
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = list(csv.reader(f))

    if not reader:
        return {
            "dataset_name": file_path.name,
            "rows": 0,
            "columns": 0,
            "column_names": [],
            "error": "File is empty"
        }

    raw_headers = reader[0]
    headers = [h.strip() for h in raw_headers]
    rows = reader[1:]
    total_rows = len(rows)

    # Check duplicate rows
    row_tuples = [tuple(r) for r in rows]
    duplicate_rows_count = total_rows - len(set(row_tuples))

    # Column-level inspection
    column_stats = {}
    candidate_primary_keys = []

    for idx, col_name in enumerate(headers):
        col_values = [r[idx] if idx < len(r) else "" for r in rows]
        
        # Missing values (empty, whitespace, or 'None')
        missing_count = sum(
            1 for v in col_values if v is None or v.strip() == "" or v.strip().lower() == "none"
        )
        missing_pct = round((missing_count / total_rows * 100), 2) if total_rows > 0 else 0.0

        # Unique values
        unique_vals = set(v.strip() for v in col_values if v is not None and v.strip() != "")
        unique_count = len(unique_vals)

        # Inferred type
        col_type = infer_data_type(col_values)

        # Min and max for numerical columns
        min_val: Optional[float] = None
        max_val: Optional[float] = None
        if col_type in ("integer", "float"):
            numeric_vals = []
            for v in col_values:
                v_clean = v.strip()
                if v_clean != "" and v_clean.lower() != "none" and is_float(v_clean):
                    numeric_vals.append(float(v_clean))
            if numeric_vals:
                min_val = min(numeric_vals)
                max_val = max(numeric_vals)

        # Primary key candidate check: non-null and all values strictly unique
        if missing_count == 0 and unique_count == total_rows and total_rows > 0:
            candidate_primary_keys.append(col_name)

        column_stats[col_name] = {
            "inferred_type": col_type,
            "missing_count": missing_count,
            "missing_percentage": missing_pct,
            "unique_count": unique_count,
            "min_value": min_val,
            "max_value": max_val,
            "sample_values": list(unique_vals)[:3]
        }

    return {
        "dataset_name": file_path.name,
        "file_size_bytes": file_path.stat().st_size,
        "rows": total_rows,
        "columns": len(headers),
        "column_names": headers,
        "duplicate_rows": duplicate_rows_count,
        "candidate_primary_keys": candidate_primary_keys,
        "columns_detail": column_stats
    }


def analyze_cross_dataset_relationships(raw_dir: Path) -> Dict[str, Any]:
    """Analyzes foreign-key relationships across raw datasets."""
    relationships = {}

    # Read station codes from stations.csv
    stations_file = raw_dir / "stations.csv"
    station_codes: Set[str] = set()
    if stations_file.exists():
        with open(stations_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            station_codes = {r.get("station_code", "").strip() for r in reader if r.get("station_code")}

    # Read train numbers from trains.csv
    trains_file = raw_dir / "trains.csv"
    train_numbers: Set[str] = set()
    if trains_file.exists():
        with open(trains_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            train_numbers = {r.get("train_no", "").strip() for r in reader if r.get("train_no")}

    # Check TMS -> stations.station_code
    tms_file = raw_dir / "tms_defects_real.csv"
    if tms_file.exists() and station_codes:
        with open(tms_file, "r", encoding="utf-8-sig") as f:
            tms_codes = {r.get("station_code", "").strip() for r in csv.DictReader(f) if r.get("station_code")}
        missing = tms_codes - station_codes
        relationships["tms.station_code -> stations.station_code"] = {
            "valid": len(missing) == 0,
            "total_distinct_keys": len(tms_codes),
            "matched_keys": len(tms_codes - missing),
            "unmatched_keys": list(missing)
        }

    # Check SMMS -> stations.station_code
    smms_file = raw_dir / "smms_faults_real.csv"
    if smms_file.exists() and station_codes:
        with open(smms_file, "r", encoding="utf-8-sig") as f:
            smms_codes = {r.get("station_code", "").strip() for r in csv.DictReader(f) if r.get("station_code")}
        missing = smms_codes - station_codes
        relationships["smms.station_code -> stations.station_code"] = {
            "valid": len(missing) == 0,
            "total_distinct_keys": len(smms_codes),
            "matched_keys": len(smms_codes - missing),
            "unmatched_keys": list(missing)
        }

    # Check schedules -> stations.station_code
    schedules_file = raw_dir / "schedules.csv"
    if schedules_file.exists() and station_codes:
        with open(schedules_file, "r", encoding="utf-8-sig") as f:
            sched_stations = {r.get("station_code", "").strip() for r in csv.DictReader(f) if r.get("station_code")}
        missing = sched_stations - station_codes
        relationships["schedules.station_code -> stations.station_code"] = {
            "valid": len(missing) == 0,
            "total_distinct_keys": len(sched_stations),
            "matched_keys": len(sched_stations - missing),
            "unmatched_keys": sorted(list(missing)),
            "note": "Unmatched stations (e.g. BSB, HWH) represent route terminuses outside the local NDLS-DDU master corridor."
        }

    # Check schedules -> trains.train_no
    if schedules_file.exists() and train_numbers:
        with open(schedules_file, "r", encoding="utf-8-sig") as f:
            sched_trains = {r.get("train_no", "").strip() for r in csv.DictReader(f) if r.get("train_no")}
        missing = sched_trains - train_numbers
        relationships["schedules.train_no -> trains.train_no"] = {
            "valid": len(missing) == 0,
            "total_distinct_keys": len(sched_trains),
            "matched_keys": len(sched_trains - missing),
            "unmatched_keys": sorted(list(missing))
        }

    return relationships


def run_data_inspection(project_root: Optional[Path] = None) -> Dict[str, Any]:
    """
    Main inspection function.
    Reads all raw datasets, produces data quality statistics, and saves report.
    """
    if project_root is None:
        project_root = get_project_root()

    raw_dir = project_root / "data" / "raw"
    reports_dir = project_root / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    dataset_files = [
        "smms_faults_real.csv",
        "tms_defects_real.csv",
        "schedules.csv",
        "stations.csv",
        "trains.csv"
    ]

    report = {
        "title": "SIH 26027 Data Quality & Inspection Report",
        "generated_by": "src/inspect_data.py",
        "datasets": {},
        "relational_integrity": {}
    }

    print(f"Inspecting raw datasets in: {raw_dir}")

    for filename in dataset_files:
        file_path = raw_dir / filename
        if file_path.exists():
            print(f"  [x] Inspecting {filename}...")
            stats = inspect_single_csv(file_path)
            report["datasets"][filename] = stats
        else:
            print(f"  [!] Missing dataset: {filename}")
            report["datasets"][filename] = {"error": "File not found"}

    # Auxiliary file check (TDMS)
    tdms_path = raw_dir / "tdms_jobs_real.csv"
    if tdms_path.exists():
        report["datasets"]["tdms_jobs_real.csv (auxiliary)"] = inspect_single_csv(tdms_path)

    # Analyze foreign key relationships
    report["relational_integrity"] = analyze_cross_dataset_relationships(raw_dir)

    # Save to JSON
    output_report_path = reports_dir / "data_quality_report.json"
    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Inspection complete. Report saved to: {output_report_path}")
    return report


if __name__ == "__main__":
    run_data_inspection()
