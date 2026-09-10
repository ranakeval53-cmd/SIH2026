"""
generate_data_dictionary.py — Module 13: Data Dictionary Generator
==================================================================
Creates 'reports/data_dictionary.csv' documenting every column across all
processed datasets, including data types, descriptions, sources, nullability,
and transformations applied.
"""

import csv
import sys
from pathlib import Path
from typing import List, Dict, Optional

# Ensure project root is in sys.path for direct script execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing import get_project_root


DATA_DICTIONARY_ENTRIES: List[Dict[str, str]] = [
    # -------------------------------------------------------------
    # maintenance_tasks
    # -------------------------------------------------------------
    {
        "dataset": "maintenance_tasks",
        "column": "task_id",
        "data_type": "string",
        "description": "Unique maintenance task identifier",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "department",
        "data_type": "string",
        "description": "Railway maintenance department responsible for asset (TMS=Track/P-Way, SMMS=Signal & Telecom)",
        "source": "Derived during integration",
        "nullable": "false",
        "transformation": "Added during integration pipeline (TMS or SMMS)"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "task_name",
        "data_type": "string",
        "description": "Human-readable description of maintenance work or fault",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "task_category",
        "data_type": "string",
        "description": "Standardized category code of maintenance task",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "section_id",
        "data_type": "string",
        "description": "Corridor track section identifier between bounding stations",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "track_line",
        "data_type": "string",
        "description": "Directional railway line (UP or DN)",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "start_km",
        "data_type": "float",
        "description": "Start kilometer post of the maintenance section",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "end_km",
        "data_type": "float",
        "description": "End kilometer post of the maintenance section",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "station_code",
        "data_type": "string",
        "description": "Alpha code of the governing railway station (foreign key to stations_clean)",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "required_duration_mins",
        "data_type": "integer",
        "description": "Required duration for maintenance block in minutes",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to integer"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "safety_criticality",
        "data_type": "float",
        "description": "Safety criticality score on 0 to 10 scale (higher indicates greater safety risk if deferred)",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "asset_degradation_score",
        "data_type": "float",
        "description": "Asset physical degradation score on 0 to 10 scale",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "urgency_days_overdue",
        "data_type": "integer",
        "description": "Number of days elapsed past maintenance inspection/servicing due date",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to integer"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "gmt_accumulated",
        "data_type": "float",
        "description": "Gross Million Tonnes of rail traffic carried by asset section",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "speed_restriction_if_deferred_kmh",
        "data_type": "float",
        "description": "Imposed speed restriction in km/h if maintenance block is deferred (TMS only)",
        "source": "tms_defects_real.csv",
        "nullable": "true",
        "transformation": "Parsed as float; 'None' or non-TMS set to null (NaN)"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "requires_traffic_block",
        "data_type": "boolean",
        "description": "Indicates whether train traffic must be halted during work",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Standardized to boolean"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "requires_power_block",
        "data_type": "boolean",
        "description": "Indicates whether OHE electrical traction power shutdown is required",
        "source": "tms_defects_real.csv",
        "nullable": "true",
        "transformation": "Standardized to boolean; null for SMMS"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "requires_st_disconnection",
        "data_type": "boolean",
        "description": "Indicates whether signaling & telecom disconnection memo is required",
        "source": "smms_faults_real.csv",
        "nullable": "true",
        "transformation": "Standardized to boolean; null for TMS"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "required_machines",
        "data_type": "string",
        "description": "Track maintenance machine identifier required (e.g. CSM tamping, BCM screening)",
        "source": "tms_defects_real.csv",
        "nullable": "true",
        "transformation": "Whitespace trimmed; null for SMMS"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "required_gangs",
        "data_type": "string",
        "description": "Maintenance crew or gang team designated for the task",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "horizon",
        "data_type": "string",
        "description": "Planning scheduling horizon (DAILY, WEEKLY, MONTHLY)",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "maintenance_tasks",
        "column": "status",
        "data_type": "string",
        "description": "Operational lifecycle status of maintenance task",
        "source": "tms_defects_real.csv / smms_faults_real.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },

    # -------------------------------------------------------------
    # stations_clean
    # -------------------------------------------------------------
    {
        "dataset": "stations_clean",
        "column": "station_code",
        "data_type": "string",
        "description": "Standard Indian Railways alpha code for station",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized, uniqueness validated"
    },
    {
        "dataset": "stations_clean",
        "column": "station_name",
        "data_type": "string",
        "description": "Full formal name of railway station",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "stations_clean",
        "column": "division",
        "data_type": "string",
        "description": "Railway operational administrative division",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "stations_clean",
        "column": "zone",
        "data_type": "string",
        "description": "Zonal railway headquarters abbreviation (e.g. NR, NCR, ECR)",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "stations_clean",
        "column": "state",
        "data_type": "string",
        "description": "State or Union Territory location of station",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "stations_clean",
        "column": "latitude",
        "data_type": "float",
        "description": "Geographic latitude of station in decimal degrees",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Converted to float, validated within bounds"
    },
    {
        "dataset": "stations_clean",
        "column": "longitude",
        "data_type": "float",
        "description": "Geographic longitude of station in decimal degrees",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Converted to float, validated within bounds"
    },
    {
        "dataset": "stations_clean",
        "column": "km_from_origin",
        "data_type": "float",
        "description": "Cumulative distance along corridor from origin (NDLS = 0.0 km)",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "stations_clean",
        "column": "has_yard",
        "data_type": "boolean",
        "description": "Indicates whether the station has marshalling/stabling yard facilities",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Standardized to boolean"
    },
    {
        "dataset": "stations_clean",
        "column": "platforms",
        "data_type": "integer",
        "description": "Total number of passenger platforms available at station",
        "source": "stations.csv",
        "nullable": "false",
        "transformation": "Converted to integer"
    },

    # -------------------------------------------------------------
    # trains_clean
    # -------------------------------------------------------------
    {
        "dataset": "trains_clean",
        "column": "train_no",
        "data_type": "string",
        "description": "Train identifier or 5-digit train number (string to preserve freight IDs)",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed, uniqueness validated"
    },
    {
        "dataset": "trains_clean",
        "column": "train_name",
        "data_type": "string",
        "description": "Official train service name or freight service description",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "trains_clean",
        "column": "train_type",
        "data_type": "string",
        "description": "Train service tier (PREMIUM_EXP, MAIL_EXPRESS, PASSENGER, FREIGHT_BULK, FREIGHT_CONTAINER)",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "trains_clean",
        "column": "direction",
        "data_type": "string",
        "description": "Movement direction of train (UP or DN)",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "trains_clean",
        "column": "origin",
        "data_type": "string",
        "description": "Origin station code",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "trains_clean",
        "column": "destination",
        "data_type": "string",
        "description": "Destination station code",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "trains_clean",
        "column": "departure_time",
        "data_type": "string",
        "description": "Scheduled departure time from origin station (HH:MM)",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "trains_clean",
        "column": "arrival_time",
        "data_type": "string",
        "description": "Scheduled arrival time at destination station (HH:MM)",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "trains_clean",
        "column": "speed_kmh",
        "data_type": "float",
        "description": "Maximum permissible operational speed in km/h",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "trains_clean",
        "column": "priority_rank",
        "data_type": "integer",
        "description": "Operational train priority rank (1 = highest priority, e.g. Vande Bharat / Rajdhani)",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Converted to integer"
    },
    {
        "dataset": "trains_clean",
        "column": "is_freight",
        "data_type": "boolean",
        "description": "Indicates whether the train is a goods/freight train",
        "source": "trains.csv",
        "nullable": "false",
        "transformation": "Standardized to boolean"
    },

    # -------------------------------------------------------------
    # schedules_clean
    # -------------------------------------------------------------
    {
        "dataset": "schedules_clean",
        "column": "train_no",
        "data_type": "string",
        "description": "Train number matching trains_clean",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Whitespace trimmed"
    },
    {
        "dataset": "schedules_clean",
        "column": "station_code",
        "data_type": "string",
        "description": "Station code along the train route",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Uppercase standardized"
    },
    {
        "dataset": "schedules_clean",
        "column": "arrival_time",
        "data_type": "string",
        "description": "Scheduled arrival time string (HH:MM or 'Source')",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Preserved original string format"
    },
    {
        "dataset": "schedules_clean",
        "column": "departure_time",
        "data_type": "string",
        "description": "Scheduled departure time string (HH:MM or 'Destination')",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Preserved original string format"
    },
    {
        "dataset": "schedules_clean",
        "column": "arrival_minutes",
        "data_type": "integer",
        "description": "Standardized arrival time in minutes from midnight (0 to 1439)",
        "source": "Derived from arrival_time",
        "nullable": "true",
        "transformation": "Converted HH:MM to (HH*60)+MM; 'Source' safely converted to null"
    },
    {
        "dataset": "schedules_clean",
        "column": "departure_minutes",
        "data_type": "integer",
        "description": "Standardized departure time in minutes from midnight (0 to 1439)",
        "source": "Derived from departure_time",
        "nullable": "true",
        "transformation": "Converted HH:MM to (HH*60)+MM; 'Destination' safely converted to null"
    },
    {
        "dataset": "schedules_clean",
        "column": "halt_mins",
        "data_type": "integer",
        "description": "Scheduled stoppage duration at station in minutes",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Converted to integer"
    },
    {
        "dataset": "schedules_clean",
        "column": "distance_km",
        "data_type": "float",
        "description": "Cumulative route distance in km from train origin",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Converted to float"
    },
    {
        "dataset": "schedules_clean",
        "column": "day_count",
        "data_type": "integer",
        "description": "Journey day index (1 for day 1, 2 for day 2, etc.)",
        "source": "schedules.csv",
        "nullable": "false",
        "transformation": "Converted to integer"
    },

    # -------------------------------------------------------------
    # task_features
    # -------------------------------------------------------------
    {
        "dataset": "task_features",
        "column": "work_length_km",
        "data_type": "float",
        "description": "Physical span of track maintenance block in km (end_km - start_km)",
        "source": "Derived from start_km and end_km",
        "nullable": "false",
        "transformation": "Calculated as round(end_km - start_km, 2)"
    },
    {
        "dataset": "task_features",
        "column": "has_speed_restriction",
        "data_type": "boolean",
        "description": "Indicator whether deferral causes an active temporary speed restriction (TSR)",
        "source": "Derived from speed_restriction_if_deferred_kmh",
        "nullable": "false",
        "transformation": "Boolean flag: True if speed_restriction_if_deferred_kmh > 0, else False"
    }
]


def generate_data_dictionary(output_path: Optional[Path] = None) -> Path:
    """Writes reports/data_dictionary.csv with all documented columns."""
    if output_path is None:
        output_path = get_project_root() / "reports" / "data_dictionary.csv"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["dataset", "column", "data_type", "description", "source", "nullable", "transformation"]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in DATA_DICTIONARY_ENTRIES:
            writer.writerow(row)

    return output_path


if __name__ == "__main__":
    out = generate_data_dictionary()
    print(f"Data dictionary generated: {out}")
