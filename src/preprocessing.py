"""
preprocessing.py — Modules 2, 3, 4, 6, 7, 8: Cleaning & Standardization
========================================================================
Implements reproducible cleaning, standardization, and normalization routines
for TMS, SMMS, stations, trains, and train schedules.
"""

import csv
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def get_project_root() -> Path:
    """Returns the root directory of the project using relative pathlib navigation."""
    return Path(__file__).resolve().parent.parent


def read_csv_records(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Reads a CSV file into a list of row dictionaries and preserves header order."""
    if not file_path.exists():
        raise FileNotFoundError(f"Input file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        try:
            raw_headers = next(reader)
        except StopIteration:
            return [], []

        headers = [h.strip() for h in raw_headers]
        records = []
        for row in reader:
            if not row or all(c.strip() == "" for c in row):
                continue
            row_dict = {}
            for idx, h in enumerate(headers):
                val = row[idx].strip() if idx < len(row) else ""
                row_dict[h] = val
            records.append(row_dict)

    return records, headers


def write_csv_records(file_path: Path, records: List[Dict[str, Any]], fieldnames: List[str]) -> None:
    """Writes a list of row dictionaries to a CSV file with explicit field ordering."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, restval="")
        writer.writeheader()
        for r in records:
            # Format None as empty string for CSV export
            clean_row = {
                k: ("" if v is None else v) for k, v in r.items()
            }
            writer.writerow(clean_row)


# -------------------------------------------------------------------------
# MODULE 2: Column Standardization
# -------------------------------------------------------------------------

def standardize_column_name(col_name: str) -> str:
    """
    Standardizes a column name to lowercase, snake_case, trimmed, and valid identifier.
    Example:
      'Required Duration (mins)' -> 'required_duration_mins'
      'Station Code' -> 'station_code'
    """
    cleaned = col_name.strip()
    # Replace unit indicators and punctuation
    cleaned = re.sub(r"[\(\[\{]mins?[\)\]\}]", "_mins", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[\(\[\{]km/h[\)\]\}]", "_kmh", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[\(\[\{]km[\)\]\}]", "_km", cleaned, flags=re.IGNORECASE)
    # Replace non-alphanumeric with underscores
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", cleaned)
    # Strip leading/trailing underscores and lowercase
    cleaned = cleaned.strip("_").lower()
    return cleaned


def standardize_records_columns(records: List[Dict[str, Any]], headers: List[str]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Applies standardize_column_name across all records and headers."""
    name_map = {orig: standardize_column_name(orig) for orig in headers}
    new_headers = [name_map[h] for h in headers]

    standardized_records = []
    for r in records:
        new_row = {name_map[k]: v for k, v in r.items()}
        standardized_records.append(new_row)

    return standardized_records, new_headers


# -------------------------------------------------------------------------
# Helper Conversion Functions
# -------------------------------------------------------------------------

def parse_bool(val: Any) -> Optional[bool]:
    """Safely converts string/boolean to boolean."""
    if val is None:
        return None
    s = str(val).strip().lower()
    if s in ("true", "1", "t", "yes", "y"):
        return True
    if s in ("false", "0", "f", "no", "n"):
        return False
    return None


def parse_float(val: Any) -> Optional[float]:
    """Safely converts string to float, treating 'none' and empty as None."""
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() == "none" or s.lower() == "nan":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_int(val: Any) -> Optional[int]:
    """Safely converts string to integer, treating 'none' and empty as None."""
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() == "none" or s.lower() == "nan":
        return None
    try:
        # First convert to float then int to handle strings like '150.0'
        return int(float(s))
    except ValueError:
        return None


def parse_time_to_minutes(val: Any) -> Optional[int]:
    """
    Converts railway time string 'HH:MM' to minutes from midnight (0 to 1439).
    Non-time strings such as 'Source', 'Destination', or empty strings safely return None.
    Example:
      '00:00' -> 0
      '01:00' -> 60
      '02:30' -> 150
      '23:45' -> 1425
      'Source' -> None
      'Destination' -> None
    """
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("source", "destination", "none", "nan"):
        return None

    time_match = re.match(r"^(\d{1,2}):(\d{2})$", s)
    if not time_match:
        return None

    hours = int(time_match.group(1))
    minutes = int(time_match.group(2))

    if 0 <= hours <= 24 and 0 <= minutes < 60:
        return (hours * 60) + minutes
    return None


# -------------------------------------------------------------------------
# MODULE 3: TMS Preprocessing
# -------------------------------------------------------------------------

def clean_tms_data(raw_path: Path) -> List[Dict[str, Any]]:
    """
    Processes tms_defects_real.csv:
    - Standardizes column names
    - Strips whitespace
    - Deduplicates records
    - Safely converts numeric and boolean types
    - Sets speed_restriction_if_deferred_kmh to None when missing/'None'
    - Injects department = 'TMS'
    """
    records, headers = read_csv_records(raw_path)
    records, headers = standardize_records_columns(records, headers)

    # Deduplication
    seen = set()
    cleaned = []
    for r in records:
        # Create a frozen row representation to check for exact duplicates
        row_key = tuple(sorted((k, str(v).strip()) for k, v in r.items()))
        if row_key in seen:
            continue
        seen.add(row_key)

        task = {
            "task_id": r.get("task_id", "").strip(),
            "department": "TMS",
            "task_name": r.get("task_name", "").strip(),
            "task_category": r.get("task_category", "").strip().upper(),
            "section_id": r.get("section_id", "").strip(),
            "track_line": r.get("track_line", "").strip().upper(),
            "start_km": parse_float(r.get("start_km")),
            "end_km": parse_float(r.get("end_km")),
            "station_code": r.get("station_code", "").strip().upper(),
            "required_duration_mins": parse_int(r.get("required_duration_mins")),
            "safety_criticality": parse_float(r.get("safety_criticality")),
            "asset_degradation_score": parse_float(r.get("asset_degradation_score")),
            "urgency_days_overdue": parse_int(r.get("urgency_days_overdue")),
            "gmt_accumulated": parse_float(r.get("gmt_accumulated")),
            "speed_restriction_if_deferred_kmh": parse_float(r.get("speed_restriction_if_deferred_kmh")),
            "requires_traffic_block": parse_bool(r.get("requires_traffic_block")),
            "requires_power_block": parse_bool(r.get("requires_power_block")),
            "required_machines": r.get("required_machines", "").strip(),
            "required_gangs": r.get("required_gangs", "").strip(),
            "horizon": r.get("horizon", "").strip().upper(),
            "status": r.get("status", "").strip().upper()
        }
        cleaned.append(task)

    return cleaned


# -------------------------------------------------------------------------
# MODULE 4: SMMS Preprocessing
# -------------------------------------------------------------------------

def clean_smms_data(raw_path: Path) -> List[Dict[str, Any]]:
    """
    Processes smms_faults_real.csv:
    - Standardizes column names
    - Strips whitespace
    - Deduplicates records
    - Safely converts numeric and boolean types
    - Injects department = 'SMMS'
    """
    records, headers = read_csv_records(raw_path)
    records, headers = standardize_records_columns(records, headers)

    seen = set()
    cleaned = []
    for r in records:
        row_key = tuple(sorted((k, str(v).strip()) for k, v in r.items()))
        if row_key in seen:
            continue
        seen.add(row_key)

        task = {
            "task_id": r.get("task_id", "").strip(),
            "department": "SMMS",
            "task_name": r.get("task_name", "").strip(),
            "task_category": r.get("task_category", "").strip().upper(),
            "section_id": r.get("section_id", "").strip(),
            "track_line": r.get("track_line", "").strip().upper(),
            "start_km": parse_float(r.get("start_km")),
            "end_km": parse_float(r.get("end_km")),
            "station_code": r.get("station_code", "").strip().upper(),
            "required_duration_mins": parse_int(r.get("required_duration_mins")),
            "safety_criticality": parse_float(r.get("safety_criticality")),
            "asset_degradation_score": parse_float(r.get("asset_degradation_score")),
            "urgency_days_overdue": parse_int(r.get("urgency_days_overdue")),
            "gmt_accumulated": parse_float(r.get("gmt_accumulated")),
            "requires_traffic_block": parse_bool(r.get("requires_traffic_block")),
            "requires_st_disconnection": parse_bool(r.get("requires_st_disconnection")),
            "required_gangs": r.get("required_gangs", "").strip(),
            "horizon": r.get("horizon", "").strip().upper(),
            "status": r.get("status", "").strip().upper()
        }
        cleaned.append(task)

    return cleaned


# -------------------------------------------------------------------------
# MODULE 6: Station Master Processing
# -------------------------------------------------------------------------

def clean_stations_data(raw_path: Path, output_path: Path) -> List[Dict[str, Any]]:
    """
    Processes stations.csv:
    - Validates station_code uniqueness
    - Standardizes coordinates, platforms, and yard indicators
    - Writes to data/processed/stations_clean.csv
    """
    records, headers = read_csv_records(raw_path)
    records, headers = standardize_records_columns(records, headers)

    seen_codes = set()
    cleaned = []
    fieldnames = [
        "station_code", "station_name", "division", "zone", "state",
        "latitude", "longitude", "km_from_origin", "has_yard", "platforms"
    ]

    for r in records:
        code = r.get("station_code", "").strip().upper()
        if not code:
            continue
        if code in seen_codes:
            print(f"Warning: Duplicate station code detected: {code}. Skipping duplicate.")
            continue
        seen_codes.add(code)

        cleaned.append({
            "station_code": code,
            "station_name": r.get("station_name", "").strip(),
            "division": r.get("division", "").strip(),
            "zone": r.get("zone", "").strip(),
            "state": r.get("state", "").strip(),
            "latitude": parse_float(r.get("latitude")),
            "longitude": parse_float(r.get("longitude")),
            "km_from_origin": parse_float(r.get("km_from_origin")),
            "has_yard": parse_bool(r.get("has_yard")),
            "platforms": parse_int(r.get("platforms"))
        })

    write_csv_records(output_path, cleaned, fieldnames)
    return cleaned


# -------------------------------------------------------------------------
# MODULE 7: Train Master Processing
# -------------------------------------------------------------------------

def clean_trains_data(raw_path: Path, output_path: Path) -> List[Dict[str, Any]]:
    """
    Processes trains.csv:
    - Retains train_no as clean string (preserving freight IDs and leading zeros)
    - Standardizes direction, speed, priority rank, is_freight
    - Writes to data/processed/trains_clean.csv
    """
    records, headers = read_csv_records(raw_path)
    records, headers = standardize_records_columns(records, headers)

    seen_trains = set()
    cleaned = []
    fieldnames = [
        "train_no", "train_name", "train_type", "direction",
        "origin", "destination", "departure_time", "arrival_time",
        "speed_kmh", "priority_rank", "is_freight"
    ]

    for r in records:
        t_no = r.get("train_no", "").strip()
        if not t_no:
            continue
        if t_no in seen_trains:
            print(f"Warning: Duplicate train number detected: {t_no}. Skipping duplicate.")
            continue
        seen_trains.add(t_no)

        cleaned.append({
            "train_no": t_no,
            "train_name": r.get("train_name", "").strip(),
            "train_type": r.get("train_type", "").strip().upper(),
            "direction": r.get("direction", "").strip().upper(),
            "origin": r.get("origin", "").strip().upper(),
            "destination": r.get("destination", "").strip().upper(),
            "departure_time": r.get("departure_time", "").strip(),
            "arrival_time": r.get("arrival_time", "").strip(),
            "speed_kmh": parse_float(r.get("speed_kmh")),
            "priority_rank": parse_int(r.get("priority_rank")),
            "is_freight": parse_bool(r.get("is_freight"))
        })

    write_csv_records(output_path, cleaned, fieldnames)
    return cleaned


# -------------------------------------------------------------------------
# MODULE 8: Train Schedule Processing
# -------------------------------------------------------------------------

def clean_schedules_data(raw_path: Path, output_path: Path) -> List[Dict[str, Any]]:
    """
    Processes schedules.csv:
    - Preserves train_no, station_code
    - Standardizes arrival_time and departure_time
    - Derives arrival_minutes and departure_minutes for valid HH:MM times
    - Preserves 'Source' / 'Destination' as None in minute columns
    - Validates halt_mins, distance_km, day_count
    - Writes to data/processed/schedules_clean.csv
    """
    records, headers = read_csv_records(raw_path)
    records, headers = standardize_records_columns(records, headers)

    cleaned = []
    fieldnames = [
        "train_no", "station_code", "arrival_time", "departure_time",
        "arrival_minutes", "departure_minutes", "halt_mins", "distance_km", "day_count"
    ]

    for r in records:
        t_no = r.get("train_no", "").strip()
        s_code = r.get("station_code", "").strip().upper()
        if not t_no or not s_code:
            continue

        raw_arrival = r.get("arrival_time", "").strip()
        raw_departure = r.get("departure_time", "").strip()

        arr_mins = parse_time_to_minutes(raw_arrival)
        dep_mins = parse_time_to_minutes(raw_departure)

        cleaned.append({
            "train_no": t_no,
            "station_code": s_code,
            "arrival_time": raw_arrival,
            "departure_time": raw_departure,
            "arrival_minutes": arr_mins,
            "departure_minutes": dep_mins,
            "halt_mins": parse_int(r.get("halt_mins")),
            "distance_km": parse_float(r.get("distance_km")),
            "day_count": parse_int(r.get("day_count"))
        })

    write_csv_records(output_path, cleaned, fieldnames)
    return cleaned
