"""
data_pipeline.py — Module 15: One-Command Master Pipeline Orchestrator
======================================================================
Executes the end-to-end SIH 26027 Data Integration & Preprocessing Pipeline:
[1/7] Inspecting raw datasets...
[2/7] Cleaning TMS data...
[3/7] Cleaning SMMS data...
[4/7] Integrating maintenance datasets...
[5/7] Processing station/train/schedule data...
[6/7] Enriching maintenance data...
[7/7] Validating final datasets...
"""

import sys
import traceback
from pathlib import Path

# Ensure project root is in sys.path for direct execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.inspect_data import run_data_inspection
from src.preprocessing import (
    clean_tms_data,
    clean_smms_data,
    clean_stations_data,
    clean_trains_data,
    clean_schedules_data,
    get_project_root
)
from src.integration import (
    integrate_maintenance_tasks,
    enrich_maintenance_with_stations
)
from src.feature_engineering import prepare_task_features
from src.generate_data_dictionary import generate_data_dictionary
from src.validate_data import run_validation


def main():
    root = get_project_root()
    raw_dir = root / "data" / "raw"
    proc_dir = root / "data" / "processed"
    reports_dir = root / "reports"

    proc_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    print("==================================================")
    print("SIH 26027 DATA PIPELINE")
    print("==================================================")
    print()

    current_dataset = "N/A"
    current_column = "N/A"

    try:
        # [1/7] Inspecting raw datasets...
        print("[1/7] Inspecting raw datasets...")
        current_dataset = "All raw datasets"
        current_column = "N/A"
        run_data_inspection(root)
        print()

        # [2/7] Cleaning TMS data...
        print("[2/7] Cleaning TMS data...")
        current_dataset = "tms_defects_real.csv"
        current_column = "various"
        tms_raw = raw_dir / "tms_defects_real.csv"
        if not tms_raw.exists():
            raise FileNotFoundError(f"Missing raw TMS file at: {tms_raw}")
        tms_clean = clean_tms_data(tms_raw)
        print(f"      Cleaned {len(tms_clean)} TMS records.")
        print()

        # [3/7] Cleaning SMMS data...
        print("[3/7] Cleaning SMMS data...")
        current_dataset = "smms_faults_real.csv"
        current_column = "various"
        smms_raw = raw_dir / "smms_faults_real.csv"
        if not smms_raw.exists():
            raise FileNotFoundError(f"Missing raw SMMS file at: {smms_raw}")
        smms_clean = clean_smms_data(smms_raw)
        print(f"      Cleaned {len(smms_clean)} SMMS records.")
        print()

        # [4/7] Integrating maintenance datasets...
        print("[4/7] Integrating maintenance datasets...")
        current_dataset = "maintenance_tasks.csv"
        current_column = "task_id, department"
        tasks_path = proc_dir / "maintenance_tasks.csv"
        unified_tasks = integrate_maintenance_tasks(tms_clean, smms_clean, tasks_path)
        print(f"      Unified {len(unified_tasks)} maintenance tasks (TMS: {len(tms_clean)}, SMMS: {len(smms_clean)}).")
        print()

        # [5/7] Processing station/train/schedule data...
        print("[5/7] Processing station/train/schedule data...")
        # Stations
        current_dataset = "stations.csv"
        current_column = "station_code, latitude, longitude"
        stations_raw = raw_dir / "stations.csv"
        stations_clean = clean_stations_data(stations_raw, proc_dir / "stations_clean.csv")
        print(f"      Cleaned {len(stations_clean)} station records.")

        # Trains
        current_dataset = "trains.csv"
        current_column = "train_no, speed_kmh, priority_rank"
        trains_raw = raw_dir / "trains.csv"
        trains_clean = clean_trains_data(trains_raw, proc_dir / "trains_clean.csv")
        print(f"      Cleaned {len(trains_clean)} train records.")

        # Schedules
        current_dataset = "schedules.csv"
        current_column = "arrival_time, departure_time, arrival_minutes, departure_minutes"
        schedules_raw = raw_dir / "schedules.csv"
        schedules_clean = clean_schedules_data(schedules_raw, proc_dir / "schedules_clean.csv")
        print(f"      Cleaned {len(schedules_clean)} train schedule stops with time conversion.")
        print()

        # [6/7] Enriching maintenance data...
        print("[6/7] Enriching maintenance data...")
        current_dataset = "maintenance_tasks_enriched.csv"
        current_column = "station_code"
        enriched_path = proc_dir / "maintenance_tasks_enriched.csv"
        enriched_tasks = enrich_maintenance_with_stations(unified_tasks, stations_clean, enriched_path)
        print(f"      Enriched {len(enriched_tasks)} maintenance tasks with station metadata (no row explosion).")

        # Feature preparation
        current_dataset = "task_features.csv"
        current_column = "work_length_km, has_speed_restriction"
        features_path = proc_dir / "task_features.csv"
        features = prepare_task_features(enriched_tasks, features_path)
        print(f"      Prepared {len(features)} task feature records for AI/optimization.")

        # Data Dictionary
        current_dataset = "data_dictionary.csv"
        current_column = "all"
        dict_path = generate_data_dictionary(reports_dir / "data_dictionary.csv")
        print(f"      Generated data dictionary at {dict_path.name}.")
        print()

        # [7/7] Validating final datasets...
        print("[7/7] Validating final datasets...")
        current_dataset = "All processed datasets"
        current_column = "various constraints"
        validation_success = run_validation(root)
        print()

        if not validation_success:
            print("PIPELINE FAILED")
            print()
            print("Reason:")
            print("One or more validation constraints failed. See reports/validation_report.json for full details.")
            print()
            print("Dataset:")
            print(current_dataset)
            print()
            print("Column:")
            print(current_column)
            sys.exit(1)

        print("==================================================")
        print("DATA PIPELINE COMPLETED")
        print("==================================================")

    except Exception as e:
        print()
        print("PIPELINE FAILED")
        print()
        print("Reason:")
        print(f"{type(e).__name__}: {str(e)}")
        print()
        print("Dataset:")
        print(current_dataset)
        print()
        print("Column:")
        print(current_column)
        print()
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
