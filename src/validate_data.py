"""
validate_data.py — Module 12: Comprehensive Data Validation Suite
================================================================
Validates all processed railway datasets against schema integrity rules,
range constraints, domain boundaries, and relational consistency.
Generates 'reports/validation_report.json'.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Ensure project root is in sys.path for direct script execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing import read_csv_records, get_project_root


class DataValidator:
    """Encapsulates validation rules and collects diagnostic results."""

    def __init__(self, project_root: Optional[Path] = None):
        self.root = project_root if project_root else get_project_root()
        self.raw_dir = self.root / "data" / "raw"
        self.proc_dir = self.root / "data" / "processed"
        self.reports_dir = self.root / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        self.checks: List[Dict[str, Any]] = []
        self.overall_pass = True

    def record_check(self, category: str, test_name: str, passed: bool, details: str, context: Optional[Dict[str, Any]] = None):
        """Records the outcome of a single validation test."""
        if not passed:
            self.overall_pass = False
        self.checks.append({
            "category": category,
            "test_name": test_name,
            "passed": passed,
            "details": details,
            "context": context or {}
        })

    def validate_maintenance_tasks(self, tasks: List[Dict[str, Any]], dataset_label: str = "maintenance_tasks", expected_count: Optional[int] = None):
        """Validates maintenance tasks dataset."""
        cat = f"Maintenance ({dataset_label})"

        # 1. Row count check
        target_count = expected_count if expected_count is not None else 17
        self.record_check(
            category=cat,
            test_name="task_count",
            passed=len(tasks) == target_count,
            details=f"Expected {target_count} maintenance tasks, found {len(tasks)}",
            context={"count": len(tasks), "expected": target_count}
        )

        # 2. Task ID uniqueness
        task_ids = [t.get("task_id", "").strip() for t in tasks]
        unique_ids = set(task_ids)
        is_unique = len(task_ids) == len(unique_ids) and all(bool(tid) for tid in task_ids)
        self.record_check(
            category=cat,
            test_name="task_id_uniqueness",
            passed=is_unique,
            details=f"Task IDs must be unique and non-empty. Unique: {len(unique_ids)}, Total: {len(task_ids)}",
            context={"duplicate_count": len(task_ids) - len(unique_ids)}
        )

        # 3. Required identifiers
        missing_identifiers = 0
        for t in tasks:
            if not t.get("task_id") or not t.get("department") or not t.get("station_code") or not t.get("section_id"):
                missing_identifiers += 1
        self.record_check(
            category=cat,
            test_name="required_identifiers_present",
            passed=missing_identifiers == 0,
            details="All tasks must have task_id, department, station_code, and section_id",
            context={"records_missing_identifiers": missing_identifiers}
        )

        # 4. Non-negative durations
        invalid_durations = []
        for t in tasks:
            dur = t.get("required_duration_mins")
            if dur is None or dur == "":
                invalid_durations.append((t.get("task_id"), "missing"))
            elif float(dur) <= 0:
                invalid_durations.append((t.get("task_id"), dur))
        self.record_check(
            category=cat,
            test_name="positive_required_durations",
            passed=len(invalid_durations) == 0,
            details="All required durations must be strictly positive",
            context={"invalid_durations": invalid_durations}
        )

        # 5. Criticality score ranges (0 to 10)
        invalid_scores = []
        for t in tasks:
            sc = t.get("safety_criticality")
            ads = t.get("asset_degradation_score")
            if sc is not None and sc != "" and not (0.0 <= float(sc) <= 10.0):
                invalid_scores.append((t.get("task_id"), "safety_criticality", sc))
            if ads is not None and ads != "" and not (0.0 <= float(ads) <= 10.0):
                invalid_scores.append((t.get("task_id"), "asset_degradation_score", ads))
        self.record_check(
            category=cat,
            test_name="valid_criticality_scores",
            passed=len(invalid_scores) == 0,
            details="Safety criticality and asset degradation scores must be in range [0.0, 10.0]",
            context={"invalid_scores": invalid_scores}
        )

        # 6. Valid track lines
        valid_lines = {"UP", "DN", "BOTH", "SINGLE"}
        invalid_track_lines = [
            (t.get("task_id"), t.get("track_line"))
            for t in tasks if str(t.get("track_line", "")).upper() not in valid_lines
        ]
        self.record_check(
            category=cat,
            test_name="valid_track_line_categories",
            passed=len(invalid_track_lines) == 0,
            details="Track lines must be one of UP, DN, BOTH, or SINGLE",
            context={"invalid_track_lines": invalid_track_lines}
        )

    def validate_stations(self, stations: List[Dict[str, Any]]):
        """Validates stations dataset."""
        cat = "Stations (stations_clean)"

        # 1. Station code uniqueness
        codes = [s.get("station_code", "").strip() for s in stations]
        unique_codes = set(codes)
        self.record_check(
            category=cat,
            test_name="station_code_uniqueness",
            passed=len(codes) == len(unique_codes) and len(codes) > 0,
            details=f"Station codes must be unique. Total: {len(codes)}, Unique: {len(unique_codes)}",
            context={"total_stations": len(codes)}
        )

        # 2. Coordinate range check (India boundary: Lat 6 to 38, Lon 68 to 98)
        invalid_coords = []
        for s in stations:
            lat = s.get("latitude")
            lon = s.get("longitude")
            if lat is None or lat == "" or not (6.0 <= float(lat) <= 38.0):
                invalid_coords.append((s.get("station_code"), "latitude", lat))
            if lon is None or lon == "" or not (68.0 <= float(lon) <= 98.0):
                invalid_coords.append((s.get("station_code"), "longitude", lon))
        self.record_check(
            category=cat,
            test_name="valid_geographic_coordinates",
            passed=len(invalid_coords) == 0,
            details="Station coordinates must fall within valid geographic bounds for Indian Railways",
            context={"invalid_coordinates": invalid_coords}
        )

        # 3. Platforms check
        invalid_platforms = [
            (s.get("station_code"), s.get("platforms"))
            for s in stations if s.get("platforms") is None or int(s.get("platforms")) < 1
        ]
        self.record_check(
            category=cat,
            test_name="positive_platform_counts",
            passed=len(invalid_platforms) == 0,
            details="Station platforms must be integers >= 1",
            context={"invalid_platforms": invalid_platforms}
        )

    def validate_trains(self, trains: List[Dict[str, Any]]):
        """Validates trains dataset."""
        cat = "Trains (trains_clean)"

        # 1. Train number uniqueness
        train_nos = [t.get("train_no", "").strip() for t in trains]
        unique_nos = set(train_nos)
        self.record_check(
            category=cat,
            test_name="train_no_uniqueness",
            passed=len(train_nos) == len(unique_nos) and len(train_nos) > 0,
            details=f"Train identifiers must be unique. Total: {len(train_nos)}, Unique: {len(unique_nos)}",
            context={"total_trains": len(train_nos)}
        )

        # 2. Direction check
        invalid_directions = [
            (t.get("train_no"), t.get("direction"))
            for t in trains if str(t.get("direction", "")).upper() not in {"UP", "DN"}
        ]
        self.record_check(
            category=cat,
            test_name="valid_train_directions",
            passed=len(invalid_directions) == 0,
            details="Train direction must be either 'UP' or 'DN'",
            context={"invalid_directions": invalid_directions}
        )

        # 3. Speed check
        invalid_speeds = [
            (t.get("train_no"), t.get("speed_kmh"))
            for t in trains if t.get("speed_kmh") is None or float(t.get("speed_kmh")) <= 0
        ]
        self.record_check(
            category=cat,
            test_name="positive_train_speeds",
            passed=len(invalid_speeds) == 0,
            details="Train speeds must be positive numeric values in km/h",
            context={"invalid_speeds": invalid_speeds}
        )

    def validate_schedules(self, schedules: List[Dict[str, Any]], trains: List[Dict[str, Any]]):
        """Validates schedules dataset."""
        cat = "Schedules (schedules_clean)"

        train_nos_set = {t.get("train_no", "").strip() for t in trains}

        # 1. Train number referential integrity
        unmatched_trains = [
            (s.get("train_no"), s.get("station_code"))
            for s in schedules if s.get("train_no", "").strip() not in train_nos_set
        ]
        self.record_check(
            category=cat,
            test_name="schedule_trains_exist_in_master",
            passed=len(unmatched_trains) == 0,
            details="All scheduled train numbers must exist in Train Master",
            context={"unmatched_trains": unmatched_trains}
        )

        # 2. Non-negative halt minutes
        invalid_halts = [
            (s.get("train_no"), s.get("station_code"), s.get("halt_mins"))
            for s in schedules if s.get("halt_mins") is None or int(s.get("halt_mins")) < 0
        ]
        self.record_check(
            category=cat,
            test_name="non_negative_halt_duration",
            passed=len(invalid_halts) == 0,
            details="Halt durations must be non-negative (>= 0 mins)",
            context={"invalid_halts": invalid_halts}
        )

        # 3. Valid day counts
        invalid_days = [
            (s.get("train_no"), s.get("station_code"), s.get("day_count"))
            for s in schedules if s.get("day_count") is None or int(s.get("day_count")) < 1
        ]
        self.record_check(
            category=cat,
            test_name="valid_day_counts",
            passed=len(invalid_days) == 0,
            details="Day count must be >= 1",
            context={"invalid_days": invalid_days}
        )

        # 4. Standardized minutes range
        invalid_arr_mins = [
            (s.get("train_no"), s.get("station_code"), s.get("arrival_minutes"))
            for s in schedules if s.get("arrival_minutes") not in (None, "") and not (0 <= int(s.get("arrival_minutes")) <= 1439)
        ]
        invalid_dep_mins = [
            (s.get("train_no"), s.get("station_code"), s.get("departure_minutes"))
            for s in schedules if s.get("departure_minutes") not in (None, "") and not (0 <= int(s.get("departure_minutes")) <= 1439)
        ]
        self.record_check(
            category=cat,
            test_name="valid_time_minutes_range",
            passed=len(invalid_arr_mins) == 0 and len(invalid_dep_mins) == 0,
            details="Arrival and departure minutes must be in range [0, 1439] (minutes in day)",
            context={"invalid_arrival_minutes": invalid_arr_mins, "invalid_departure_minutes": invalid_dep_mins}
        )

    def validate_integration(self, raw_tasks_count: int, unified_tasks_count: int, enriched_tasks_count: int):
        """Validates row count preservation across integration steps."""
        cat = "Integration & Enrichment"

        # 1. Concatenation preservation
        self.record_check(
            category=cat,
            test_name="concatenation_row_preservation",
            passed=(raw_tasks_count == unified_tasks_count and raw_tasks_count > 0),
            details=f"Total raw maintenance tasks ({raw_tasks_count}) must equal unified maintenance tasks ({unified_tasks_count})",
            context={"raw_total": raw_tasks_count, "unified_total": unified_tasks_count}
        )

        # 2. Station enrichment row preservation
        self.record_check(
            category=cat,
            test_name="station_enrichment_no_multiplication",
            passed=(unified_tasks_count == enriched_tasks_count and enriched_tasks_count > 0),
            details=f"Rows before enrichment ({unified_tasks_count}) must equal rows after enrichment ({enriched_tasks_count})",
            context={"rows_before": unified_tasks_count, "rows_after": enriched_tasks_count}
        )

    def run_all_validations(self) -> Dict[str, Any]:
        """Runs the entire validation test suite and writes reports/validation_report.json."""
        # Load processed datasets
        tasks_file = self.proc_dir / "maintenance_tasks.csv"
        enriched_file = self.proc_dir / "maintenance_tasks_enriched.csv"
        features_file = self.proc_dir / "task_features.csv"
        stations_file = self.proc_dir / "stations_clean.csv"
        trains_file = self.proc_dir / "trains_clean.csv"
        schedules_file = self.proc_dir / "schedules_clean.csv"

        tasks, _ = read_csv_records(tasks_file)
        enriched, _ = read_csv_records(enriched_file)
        features, _ = read_csv_records(features_file)
        stations, _ = read_csv_records(stations_file)
        trains, _ = read_csv_records(trains_file)
        schedules, _ = read_csv_records(schedules_file)

        # Count raw tasks (TMS + SMMS + TDMS)
        raw_tms, _ = read_csv_records(self.raw_dir / "tms_defects_real.csv")
        raw_smms, _ = read_csv_records(self.raw_dir / "smms_faults_real.csv")
        tdms_path = self.raw_dir / "tdms_jobs_real.csv"
        raw_tdms, _ = read_csv_records(tdms_path) if tdms_path.exists() else ([], [])
        raw_tasks_count = len(raw_tms) + len(raw_smms) + len(raw_tdms)

        # Run validation methods
        self.validate_maintenance_tasks(tasks, "maintenance_tasks", raw_tasks_count)
        self.validate_maintenance_tasks(enriched, "maintenance_tasks_enriched", raw_tasks_count)
        self.validate_maintenance_tasks(features, "task_features", raw_tasks_count)
        self.validate_stations(stations)
        self.validate_trains(trains)
        self.validate_schedules(schedules, trains)
        self.validate_integration(raw_tasks_count, len(tasks), len(enriched))

        total_tests = len(self.checks)
        passed_tests = sum(1 for c in self.checks if c["passed"])
        failed_tests = total_tests - passed_tests

        report = {
            "title": "SIH 26027 Data Pipeline Validation Report",
            "overall_status": "PASS" if self.overall_pass else "FAIL",
            "total_checks": total_tests,
            "passed_checks": passed_tests,
            "failed_checks": failed_tests,
            "checks": self.checks
        }

        output_path = self.reports_dir / "validation_report.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        return report


def run_validation(project_root: Optional[Path] = None) -> bool:
    """Entry point for standalone execution."""
    validator = DataValidator(project_root)
    report = validator.run_all_validations()

    print(f"Validation finished with status: {report['overall_status']}")
    print(f"Passed: {report['passed_checks']} / {report['total_checks']} checks.")
    if report["failed_checks"] > 0:
        print(f"Failed {report['failed_checks']} checks:")
        for c in report["checks"]:
            if not c["passed"]:
                print(f"  - [{c['category']}] {c['test_name']}: {c['details']}")
        return False
    return True


if __name__ == "__main__":
    success = run_validation()
    exit(0 if success else 1)
