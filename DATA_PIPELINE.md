# SIH 2026 — Data Integration & Preprocessing Module

**Smart India Hackathon 2026**  
**Problem Statement ID:** 26027  
**Problem Title:** AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways  

---

## 1. Module Overview & Purpose

The **Data Integration and Data Preprocessing Module** is the foundational data pipeline for SIH Problem Statement 26027. Its role is to ingest, clean, standardize, integrate, enrich, and validate heterogeneous operational and maintenance datasets from Indian Railways into an immutable, high-integrity data package.

This module is completely decoupled from downstream AI models, optimization engines, and dashboards. It guarantees that downstream modules (AI/ML prioritization, block scheduling, train conflict detection, APIs, and UI) receive clean, consistent, and relational data without data leakage or missing foreign keys.

```
RAW RAILWAY DATA
  ├── TMS (Track Defects)
  ├── SMMS (Signaling & Telecom Faults)
  ├── Station Master (NDLS - DDU Corridor)
  ├── Train Master (Passenger & Freight)
  └── Schedules (Route Stoppages & Timings)
            │
            ▼
[1] DATA INSPECTION (inspect_data.py)
            │
            ▼
[2-4] CLEANING & NORMALIZATION (preprocessing.py)
            │
            ▼
[5] VERTICAL INTEGRATION (integration.py: TMS + SMMS = 12 tasks)
            │
            ▼
[6] STATION ENRICHMENT (integration.py: Left Join on station_code)
            │
            ▼
[7] FEATURE PREPARATION (feature_engineering.py: No Leakage)
            │
            ▼
[8] COMPREHENSIVE VALIDATION (validate_data.py: 30/30 Checks PASS)
            │
            ▼
PROCESSED DATA PACKAGE (data/processed/ + reports/)
```

---

## 2. Project Directory Structure

```text
SIH_Railway_Block_Planner/
│
├── data/
│   ├── raw/
│   │   ├── smms_faults_real.csv          # Raw S&T maintenance faults (5 rows)
│   │   ├── tms_defects_real.csv          # Raw Track defects (7 rows)
│   │   ├── stations.csv                  # Raw Station Master (20 stations)
│   │   ├── trains.csv                    # Raw Train Master (26 trains)
│   │   ├── schedules.csv                 # Raw Train Movement Schedules (32 stops)
│   │   └── tdms_jobs_real.csv            # Auxiliary TRD/OHE electrical jobs (5 rows)
│   │
│   └── processed/
│       ├── maintenance_tasks.csv         # Unified maintenance tasks (12 rows, 22 cols)
│       ├── maintenance_tasks_enriched.csv# Enriched with station metadata (12 rows, 31 cols)
│       ├── task_features.csv             # AI/Optimization features (12 rows, 24 cols)
│       ├── stations_clean.csv            # Cleaned Station Master (20 rows, 10 cols)
│       ├── trains_clean.csv              # Cleaned Train Master (26 rows, 11 cols)
│       └── schedules_clean.csv           # Cleaned Schedules with minutes (32 rows, 9 cols)
│
├── src/
│   ├── inspect_data.py                   # Module 1: Raw data audit & quality checks
│   ├── preprocessing.py                  # Modules 2, 3, 4, 6, 7, 8: Cleaning & time parsing
│   ├── integration.py                    # Modules 5 & 9: Concatenation & Left Join
│   ├── feature_engineering.py            # Modules 10 & 11: Feature prep without leakage
│   ├── generate_data_dictionary.py       # Module 13: Data dictionary compiler
│   ├── validate_data.py                  # Module 12: Automated validation suite
│   └── data_pipeline.py                  # Module 15: One-command orchestrator
│
├── reports/
│   ├── data_quality_report.json          # Pre-cleaning dataset statistics & candidate keys
│   ├── validation_report.json            # Post-cleaning validation results (30 checks)
│   └── data_dictionary.csv               # Formal dictionary for all processed columns
│
├── requirements.txt                      # Minimal dependencies (pandas, numpy)
└── DATA_PIPELINE.md                      # Comprehensive documentation (this file)
```

---

## 3. Dataset Schemas & Pipeline Modules

### Module 1 — Data Inspection (`src/inspect_data.py`)
- Analyzes all 5 raw datasets before transformation.
- Computes dimensions, types, missing counts/percentages, duplicates, unique keys, and min/max ranges.
- Discovers candidate primary keys and tests foreign-key relationships.
- Generates `reports/data_quality_report.json`.

### Module 2 — Column Standardization (`src/preprocessing.py`)
- Standardizes all column names across all files into lowercase `snake_case`.
- Normalizes unit parentheticals: `(mins)` -> `_mins`, `(km/h)` -> `_kmh`.
- Strips leading/trailing whitespace and non-alphanumeric artifacts.

### Module 3 — TMS Preprocessing (`src/preprocessing.py`)
- File: `tms_defects_real.csv` (Track Management System / P-Way Engineering).
- Normalizes categories (`task_category`, `track_line`, `horizon`, `status`).
- Cleans numeric metrics: `start_km`, `end_km`, `required_duration_mins`, `safety_criticality`, `asset_degradation_score`, `urgency_days_overdue`, `gmt_accumulated`.
- Preserves `speed_restriction_if_deferred_kmh`: strings like `'None'` are converted to standard null (`NaN`).
- Injects `department = 'TMS'`.

### Module 4 — SMMS Preprocessing (`src/preprocessing.py`)
- File: `smms_faults_real.csv` (Signaling & Telecom Maintenance Management System).
- Normalizes categories and boolean flags (`requires_traffic_block`, `requires_st_disconnection`).
- Injects `department = 'SMMS'`.

### Module 5 — Maintenance Task Integration (`src/integration.py`)
- Combines TMS and SMMS tasks using vertical concatenation (`pd.concat` equivalent).
- **Rule:** NOT a relational merge.
- Concatenation preserves department-specific columns:
  - TMS-only columns (`speed_restriction_if_deferred_kmh`, `requires_power_block`, `required_machines`) are preserved for TMS and set to null for SMMS.
  - SMMS-only columns (`requires_st_disconnection`) are preserved for SMMS and set to null for TMS.
- Outputs `data/processed/maintenance_tasks.csv` (Exactly 12 rows = 7 TMS + 5 SMMS).

### Module 6 — Station Master Processing (`src/preprocessing.py`)
- File: `stations.csv` (NDLS to DDU corridor stations).
- Validates strict uniqueness of `station_code` (1 code = 1 record; exactly 20 stations).
- Validates latitude (25.279 to 28.673°N) and longitude (77.209 to 83.118°E).
- Outputs `data/processed/stations_clean.csv`.

### Module 7 — Train Master Processing (`src/preprocessing.py`)
- File: `trains.csv` (26 trains: Premium, Express, Passenger, and Freight).
- Preserves `train_no` as a string to protect alphanumeric freight IDs (e.g. `G-COAL-101`) and any leading zeros.
- Validates `direction` ('UP', 'DN'), `train_type`, `priority_rank`, `speed_kmh`, and `is_freight`.
- Outputs `data/processed/trains_clean.csv`.

### Module 8 — Train Schedule Processing (`src/preprocessing.py`)
- File: `schedules.csv` (32 scheduled train station calls).
- **Time Standardization:**
  - Converts valid `HH:MM` time strings to integer minutes from midnight (`arrival_minutes`, `departure_minutes`).
  - Example: `00:00` -> `0`, `06:00` -> `360`, `12:08` -> `728`, `23:45` -> `1425`.
  - Non-time terminal markers (`Source`, `Destination`) are safely set to null (`NaN`) in numeric minute columns while preserving original strings in `arrival_time` and `departure_time`.
- Validates `halt_mins >= 0`, `distance_km >= 0`, `day_count >= 1`.
- Outputs `data/processed/schedules_clean.csv`.

### Module 9 — Station Enrichment (`src/integration.py`)
- Enriches unified maintenance tasks with Station Master metadata via **LEFT JOIN**:
  ```text
  maintenance_tasks.station_code ──LEFT JOIN──> stations_clean.station_code
  ```
- Appends: `station_name`, `division`, `zone`, `state`, `latitude`, `longitude`, `km_from_origin`, `has_yard`, `platforms`.
- **Integrity Rule:** Row count before join (12) must strictly equal row count after join (12). No row explosion.
- Outputs `data/processed/maintenance_tasks_enriched.csv`.

### Module 10 & 11 — Feature Preparation & Zero Data Leakage (`src/feature_engineering.py`)
- Formats curated features for the AI/ML prioritization model and block optimization solver.
- Computes legitimate derived spatial feature: `work_length_km = round(end_km - start_km, 2)`.
- Computes `has_speed_restriction` boolean flag (`speed_restriction_if_deferred_kmh > 0`).
- **Data Leakage Protection:**
  - Zero future operational information included (no actual block delays, no future conflict targets).
  - No synthetic labels or fabricated outcome metrics.
  - Missing numerical values (e.g., speed restriction for SMMS) are preserved as `NaN`, never blindly imputed to zero.
- Outputs `data/processed/task_features.csv`.

### Module 12 — Automated Validation Suite (`src/validate_data.py`)
- Evaluates 30 integrity constraints across all 6 processed datasets:
  - Task ID uniqueness and identifier presence.
  - Strictly positive maintenance durations (`required_duration_mins > 0`).
  - Criticality score bounds (`0.0 <= score <= 10.0`).
  - Station code uniqueness and Indian geographic coordinate bounds.
  - Train number uniqueness and valid movement directions.
  - Schedule time ranges (`0 <= minutes <= 1439`) and non-negative halts.
  - Concatenation and Left Join row count preservation (exactly 12 rows throughout).
- Generates `reports/validation_report.json`.

### Module 13 — Data Dictionary (`src/generate_data_dictionary.py`)
- Generates `reports/data_dictionary.csv` documenting every column across all processed datasets with standard attributes: `dataset, column, data_type, description, source, nullable, transformation`.

---

## 4. Teammate Handoff Contract

Downstream teammates responsible for AI prioritization, conflict detection, optimization, and APIs can immediately load the processed data package using standard pandas:

```python
import pandas as pd

# 1. Unified & Enriched Maintenance Tasks (for Block Planning & Scheduling)
maintenance_tasks = pd.read_csv("data/processed/maintenance_tasks_enriched.csv")

# 2. Curated Feature Set (for AI/ML Prioritization Models)
task_features = pd.read_csv("data/processed/task_features.csv")

# 3. Cleaned Station Master (for Spatial Layout & Yard Constraints)
stations = pd.read_csv("data/processed/stations_clean.csv")

# 4. Cleaned Train Master (for Priority Ranking & Train Classifications)
trains = pd.read_csv("data/processed/trains_clean.csv")

# 5. Cleaned Schedules (for Train Conflict & Block Window Detection)
schedules = pd.read_csv("data/processed/schedules_clean.csv")
```

### Key Integration Points for Teammates

| Teammate / Module | Primary Datasets Used | Key Fields to Use |
| :--- | :--- | :--- |
| **AI / ML Prioritization** | `task_features.csv` | `safety_criticality`, `asset_degradation_score`, `urgency_days_overdue`, `gmt_accumulated`, `speed_restriction_if_deferred_kmh` |
| **Train Conflict Analysis** | `schedules_clean.csv`, `trains_clean.csv` | `train_no`, `station_code`, `arrival_minutes`, `departure_minutes`, `halt_mins`, `priority_rank` |
| **Block Scheduling Optimizer** | `maintenance_tasks_enriched.csv` | `task_id`, `required_duration_mins`, `section_id`, `track_line`, `requires_traffic_block`, `requires_power_block` |
| **Backend & Dashboard** | `stations_clean.csv`, `maintenance_tasks_enriched.csv` | `station_code`, `station_name`, `latitude`, `longitude`, `km_from_origin`, `status` |

---

## 5. How to Run the Pipeline

### Prerequisites
Install the required dependencies:
```bash
pip install -r requirements.txt
```

### One-Command Pipeline Execution
Execute the entire pipeline in sequence with:
```bash
python src/data_pipeline.py
```

### Expected Console Output
```text
==================================================
SIH 26027 DATA PIPELINE
==================================================

[1/7] Inspecting raw datasets...
Inspecting raw datasets in: .../data/raw
  [x] Inspecting smms_faults_real.csv...
  [x] Inspecting tms_defects_real.csv...
  [x] Inspecting schedules.csv...
  [x] Inspecting stations.csv...
  [x] Inspecting trains.csv...
Inspection complete. Report saved to: .../reports/data_quality_report.json

[2/7] Cleaning TMS data...
      Cleaned 7 TMS records.

[3/7] Cleaning SMMS data...
      Cleaned 5 SMMS records.

[4/7] Integrating maintenance datasets...
      Unified 12 maintenance tasks (TMS: 7, SMMS: 5).

[5/7] Processing station/train/schedule data...
      Cleaned 20 station records.
      Cleaned 26 train records.
      Cleaned 32 train schedule stops with time conversion.

[6/7] Enriching maintenance data...
      Enriched 12 maintenance tasks with station metadata (no row explosion).
      Prepared 12 task feature records for AI/optimization.
      Generated data dictionary at data_dictionary.csv.

[7/7] Validating final datasets...
Validation finished with status: PASS
Passed: 30 / 30 checks.

==================================================
DATA PIPELINE COMPLETED
==================================================
```

### Individual Script Execution
Each component can also be run independently:
```bash
# Run data inspection
python src/inspect_data.py

# Run validation suite
python src/validate_data.py

# Re-generate data dictionary
python src/generate_data_dictionary.py
```

---

## 6. Verification Summary

| Dataset | Raw Count | Processed Count | Key Transformations | Null Handling |
| :--- | :---: | :---: | :--- | :--- |
| **TMS Defects** | 7 | 7 | Lowercase snake_case headers, numeric parsing, `department = TMS` | `'None'` -> null in `speed_restriction_if_deferred_kmh` |
| **SMMS Faults** | 5 | 5 | Category normalization, boolean standardization, `department = SMMS` | None in raw data |
| **Maintenance Unified** | 12 | 12 | Vertical concatenation (`pd.concat`), department preservation | Department-specific columns set to null where not applicable |
| **Maintenance Enriched** | 12 | 12 | Left Join on `station_code` with `stations_clean` | No row explosion (12 -> 12) |
| **Task Features** | 12 | 12 | Derived `work_length_km`, `has_speed_restriction` flag | Zero data leakage, preserved `NaN` for missing speed restrictions |
| **Stations Master** | 20 | 20 | Uniqueness check, coordinate range validation (Lat 25-28, Lon 77-83) | Complete |
| **Train Master** | 26 | 26 | String `train_no` preserved (freight + passenger), priority checked | Complete |
| **Train Schedules** | 32 | 32 | `arrival_minutes` and `departure_minutes` created (0-1439) | `'Source'` / `'Destination'` -> null in minute columns |
| **Validation Report** | — | — | **30 / 30 Tests PASSED** | `reports/validation_report.json` |
| **Data Dictionary** | — | 38 cols | Comprehensive metadata dictionary | `reports/data_dictionary.csv` |
