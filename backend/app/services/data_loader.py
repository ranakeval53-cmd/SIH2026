"""
Read-only loader for the processed data package produced by the Data
Integration module (data/processed/*.csv).

This module never writes to, mutates in place, or fabricates values for any
of these files. It only reads them into pandas DataFrames with explicit
dtypes so downstream engines don't each re-implement CSV parsing quirks
(e.g. train_no must stay a string because of alphanumeric freight IDs like
'G-COAL-101').
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from backend.app.utils import constants


@dataclass
class ProcessedData:
    tasks: pd.DataFrame            # maintenance_tasks_enriched.csv
    task_features: pd.DataFrame    # task_features.csv
    stations: pd.DataFrame         # stations_clean.csv
    trains: pd.DataFrame           # trains_clean.csv
    schedules: pd.DataFrame        # schedules_clean.csv


def load_processed_data() -> ProcessedData:
    tasks = pd.read_csv(
        constants.MAINTENANCE_TASKS_ENRICHED_CSV,
        dtype={"task_id": str, "section_id": str, "station_code": str},
    )
    task_features = pd.read_csv(
        constants.TASK_FEATURES_CSV,
        dtype={"task_id": str, "section_id": str, "station_code": str},
    )
    stations = pd.read_csv(constants.STATIONS_CLEAN_CSV, dtype={"station_code": str})
    trains = pd.read_csv(constants.TRAINS_CLEAN_CSV, dtype={"train_no": str})
    schedules = pd.read_csv(
        constants.SCHEDULES_CLEAN_CSV,
        dtype={"train_no": str, "station_code": str},
    )

    _validate_no_duplicate_task_ids(tasks)

    return ProcessedData(
        tasks=tasks,
        task_features=task_features,
        stations=stations,
        trains=trains,
        schedules=schedules,
    )


def _validate_no_duplicate_task_ids(tasks: pd.DataFrame) -> None:
    duplicates = tasks["task_id"][tasks["task_id"].duplicated()].unique().tolist()
    if duplicates:
        raise ValueError(
            f"data/processed/maintenance_tasks_enriched.csv contains duplicate "
            f"task_id values, refusing to plan against corrupt input: {duplicates}"
        )
