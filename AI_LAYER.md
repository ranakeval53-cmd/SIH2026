# AI & Intelligence Layer — PS 26027, Team Techtonic

**Problem Statement 26027** — AI-Powered Automatic Block Planning to Maximize Asset
Availability for Train Operations on Indian Railways.

This document covers **only** the AI & Intelligence Layer (`backend/app/services/`,
`backend/app/utils/`, `tests/`). It consumes the already-cleaned data package produced
by the Data Integration module (`data/processed/*.csv`, documented in `DATA_PIPELINE.md`)
and is completely decoupled from it: nothing here writes to, mutates, or re-derives
`data/raw/` or `data/processed/`.

---

## 1. What this layer does

```text
data/processed/*.csv
        │
        ▼
Priority Engine            (backend/app/services/priority_engine.py)
        │
        ▼
Block Generator             (backend/app/services/block_generator.py)
        │
        ▼
Conflict Engine              (backend/app/services/conflict_engine.py)
        │
        ▼
Feasibility Engine            (backend/app/services/feasibility_engine.py)
        │
        ▼
OR-Tools CP-SAT Optimizer      (backend/app/services/optimizer.py)
        │
        ▼
Final Validator                 (backend/app/services/final_validator.py)
        │
        ▼
Explainability / Recommendation  (explainability_engine.py, recommendation_engine.py)
        │
        ▼
data/output/optimized_blocks.json
```

Run it with:

```bash
python -m backend.app.services.run_ai
```

This loads `data/processed/`, scores every task, generates candidate maintenance
windows, detects every conflict class, solves an OR-Tools CP-SAT model to pick a
conflict-free, priority-maximizing set of blocks, re-validates that set from scratch,
attaches a plain-English explanation to every task, and writes
`data/output/optimized_blocks.json`. Console output reports progress through all 8
stages and ends with a JSON summary; process exit code is `0` if the final validation
status is `APPROVED`, `1` if `REJECTED`.

---

## 2. Hybrid AI approach (no fake ML)

Per the brief, no ML model is trained on this 12-row prototype dataset — that would
overfit meaninglessly. Instead this is a **hybrid AI system**:

1. **Priority intelligence** — a configurable, weighted, multi-factor scoring function
   (not a black box) over real fields (`safety_criticality`, `asset_degradation_score`,
   `urgency_days_overdue`, `gmt_accumulated`, block-type flags, station importance).
2. **Rule/constraint reasoning** — explicit, documented domain rules (severity
   mapping, station-capacity assumption, horizon-based urgency caps).
3. **Conflict detection** — geometric (km × time) reasoning over train movements and
   task footprints.
4. **OR-Tools CP-SAT optimization** — a real combinatorial solver, not a heuristic
   greedy pass, choosing the objective-maximizing conflict-free subset.
5. **Explainability** — every decision traces back to the specific reason codes and
   conflict records that produced it.

### Extensibility for future ML

- `priority_engine.compute_priorities()` returns per-component scores
  (`components` dict) alongside the final score — a supervised model trained on
  future outcome data (e.g. actual delay caused, asset failures avoided) could
  later replace or blend with this scoring function without touching any other
  module, since every downstream engine only consumes `{task_id, priority_score,
  priority_class, reason_codes}`.
- `optimizer.solve()`'s objective coefficients (`_candidate_benefit`) are isolated
  in one function — an ML-predicted "operational disruption cost" could be added
  as another term there.
- `conflict_engine.TrainModel` tiers (`SCHEDULE` / `ENDPOINTS` / `UNRESOLVED`) are a
  natural seam for a future ML-based train ETA predictor to upgrade `UNRESOLVED`
  trains to a resolved position model.

---

## 3. Module map

| File | Responsibility |
|---|---|
| `backend/app/utils/constants.py` | Every tunable weight/threshold/path in one place. |
| `backend/app/utils/time_utils.py` | HH:MM parsing, day-offset handling, interval overlap/merge, horizon-minute labels. |
| `backend/app/services/data_loader.py` | Read-only CSV loading with correct dtypes (e.g. `train_no` kept as `str` for freight IDs like `G-COAL-101`); rejects duplicate `task_id`s. |
| `backend/app/services/priority_engine.py` | 0–100 priority score, CRITICAL/HIGH/MEDIUM/LOW class, reason codes. |
| `backend/app/services/block_generator.py` | Candidate block windows on a fixed time grid. |
| `backend/app/services/conflict_engine.py` | Train position modelling + every conflict check (train, task-pair, resource, infrastructure). |
| `backend/app/services/feasibility_engine.py` | Per-candidate hard/soft feasibility filter. |
| `backend/app/services/optimizer.py` | OR-Tools CP-SAT model: selection + mutual-exclusion constraints + objective. |
| `backend/app/services/final_validator.py` | Independent re-check of the optimizer's output; source of the `APPROVED`/`REJECTED` status. |
| `backend/app/services/explainability_engine.py` | Per-task natural-language explanation. |
| `backend/app/services/recommendation_engine.py` | Assembles final `explanations` list, including "lost to task X" attribution. |
| `backend/app/services/run_ai.py` | Orchestrator / `data/output/optimized_blocks.json` writer / CLI entry point. |

Every service module takes plain `pandas` objects / dicts in and returns plain
dicts/lists out — no shared global state — so a FastAPI or frontend teammate can
import and call any single function directly (e.g.
`from backend.app.services import priority_engine`) without pulling in the rest
of the pipeline.

---

## 4. Key assumptions (read this before trusting the numbers)

The source dataset is a **12-task, 20-station, 26-train prototype extract** with no
calendar dates and no explicit "permitted block hours" field. To produce a working
scheduler without fabricating data, the following engineering assumptions were made.
Each one is also cited at the point of use in code:

1. **Synthetic rolling horizon.** There is no calendar date anywhere in
   `data/processed/`. Planning happens over a synthetic 2-day (2880-minute) rolling
   horizon expressed as `Dn HH:MM` labels, not real dates. (`constants.py`,
   `time_utils.minutes_to_label`)
2. **Trains run every day of the horizon.** With no day-of-week data, every train in
   `trains_clean.csv` is assumed to run identically on every day of the planning
   horizon. This is conservative: it can only over-detect conflicts, never hide a
   real one. (`conflict_engine.get_occupancy_intervals`)
3. **Candidate grid, not a "night-only" business rule.** Candidates are generated
   every `CANDIDATE_STEP_MINUTES` (default 60) across the *entire* horizon, not
   restricted to assumed "maintenance hours" — that rule isn't in the data. Low-traffic
   (night) windows still naturally win because fewer trains occupy the section then.
4. **Train position modelling has 3 fidelity tiers**, because most trains
   (20 of 26) have no intermediate timetable in `schedules_clean.csv`:
   - **SCHEDULE** (6 trains: 22436, 22435, 12302, 12002, 12418, 64101) — real
     timestamped `distance_km` waypoints from `schedules_clean.csv`; position is
     piecewise-linear between them (dwell time modelled as a flat segment).
   - **ENDPOINTS** (10 trains: freights + EMU locals fully contained on the
     modelled NDLS–DDU corridor, e.g. `G-COAL-101`, `64102`) — only origin/departure
     and destination/arrival are known; position is linearly interpolated between
     them (constant-speed approximation).
   - **UNRESOLVED** (10 trains: long-distance expresses to BSB/HWH/DBRG/RKMP/
     GAYA/PURI/LKO with neither a detailed schedule nor a corridor-resolvable
     destination) — their physical position **cannot** be determined from the given
     columns without guessing, so they are **excluded from geometric conflict
     checks** rather than assumed either safe or dangerous. They are listed by name
     in `optimized_blocks.json` under `meta.unresolved_train_position_models` so
     nothing is silently dropped.
5. **Direction ↔ track line.** A train only physically conflicts with a task on the
   same `track_line` (UP/DN) it's running on, matching `direction` in
   `trains_clean.csv`. The one exception: if a task `requires_power_block` or
   `requires_st_disconnection`, opposite-line trains are also checked, but only as
   a **soft** (LOW severity) signal — a signalling/power block can plausibly bleed
   across both lines of a section, but this is a caution, not an asserted fact.
6. **Train conflict severity** is derived from real fields already in
   `trains_clean.csv` (`priority_rank`, `is_freight`), not fabricated per train:
   `priority_rank <= 2` (premium, e.g. Rajdhani/Vande Bharat/Shatabdi) → `CRITICAL`
   (hard); `priority_rank <= 4` → `HIGH` (hard); freight on the same line → `MEDIUM`
   (soft, allowed with a penalty — freight is the most reschedulable traffic in
   practice); everything else same-line → `HIGH` (hard).
7. **Station capacity for infrastructure conflicts.** A station with
   `has_yard == False` is assumed unable to safely host two simultaneous
   `requires_traffic_block` activities. This is the only infrastructure-conflict
   rule implemented; it is a modelling assumption, not a rule sourced from the data.
8. **Urgency normalization caps.** `urgency_days_overdue` is scaled to 0–100 against
   a horizon-dependent cap (DAILY: 3 days, WEEKLY: 14 days, MONTHLY: 30 days) rather
   than an arbitrary global cap, so a DAILY task 4 days overdue reads as more urgent
   than a MONTHLY task 4 days overdue. These cap values are configurable defaults in
   `constants.py`, not derived from any Railway Board standard.
9. **Missing data is never imputed.** If a priority-scoring field is `NaN` for a
   task (e.g. `speed_restriction_if_deferred_kmh` for SMMS tasks, which is `NaN` by
   design per `DATA_PIPELINE.md`), that component is dropped and the remaining
   weights are renormalised for that task only; a `NO_<X>_DATA` reason code is
   attached so the gap is visible in `optimized_blocks.json`, not silently
   papered over.

---

## 5. Conflict types implemented

| Type | Function | Hard or soft? |
|---|---|---|
| Train/block overlap (same line) | `conflict_engine.check_train_conflicts` | Hard (CRITICAL/HIGH) or soft (MEDIUM), by train priority/freight status |
| Train/block overlap (opposite line, power/signal risk only) | same | Soft (LOW) |
| Task-vs-task km/section/time overlap | `conflict_engine.check_task_pair_conflict` (`TRACK_KM_OVERLAP`) | Hard |
| Shared machine/gang at overlapping times, any location | `conflict_engine.check_task_pair_conflict` (`RESOURCE_CONFLICT`) | Hard |
| Station infrastructure capacity | `conflict_engine.check_infrastructure_conflict` (`STATION_CAPACITY_CONFLICT`) | Hard |
| Duplicate `task_id` | `feasibility_engine.find_duplicate_task_ids` | Hard (fails the whole run) |

All "Hard" conflicts are enforced as CP-SAT constraints the solver is structurally
unable to violate (individual hard train conflicts remove a candidate before the
solver ever sees it; pairwise hard conflicts become `x_i + x_j <= 1` constraints).
`final_validator.py` then independently re-derives every one of these checks against
the solver's actual output as a defence-in-depth safety net — if it ever finds a
violation, `run_ai.py` drops the offending task(s) and re-validates before writing
any output, so an unvalidated schedule is never written.

---

## 6. Output: `data/output/optimized_blocks.json`

Top-level keys:

- `meta` — generation timestamp, horizon settings, source files, unresolved trains.
- `summary` — task/scheduling counts, optimizer + validation status, runtime.
- `priority_scores` — every task's score/class/reason codes/components.
- `scheduled_tasks` — full detail (section, km, chosen window, soft conflicts) for
  every scheduled task.
- `unscheduled_tasks` — task_id + concrete reasons (no window fits the horizon / all
  windows hard-conflict / lost the optimizer's priority trade-off).
- `selected_blocks` — the spec's minimal block schema (`task_id`, `start_time`,
  `end_time`, `status`, `conflicting_trains`, `reason`).
- `conflicts` — every mutual-exclusion constraint the optimizer had to respect, and
  every soft train conflict that was knowingly accepted.
- `explanations` — one recommendation record per task (`Schedule`/`Defer`,
  priority score, plain-English explanation, factor list).
- `validation` — `{"status": "APPROVED"|"REJECTED", "violations": [...]}`.
- `asset_availability_metrics` — completion rate, priority-weighted completion %,
  scheduled vs. total maintenance minutes, backlog remaining, breakdown by priority
  class. All computed directly from this run's own results — nothing here is a
  fabricated or hard-coded metric.

---

## 7. Verified run against the actual dataset

Last executed against the real `data/processed/` package (12 tasks, 26 trains,
20 stations, 32 schedule stops):

```
16/26 trains have a resolvable position model (6 SCHEDULE-tier, 10 ENDPOINTS-tier).
553 raw candidate windows generated across 12 tasks (60-min grid, 48h horizon).
326/553 candidates individually feasible (no hard train conflict).
CP-SAT solver status: OPTIMAL.
632 pairwise mutual-exclusion constraints applied (real track/resource clashes
  found between e.g. TMS_KAG_001/TMS_KAG_002/SMMS_KAG_001 on SEC_GZB_MIU_UP, and
  TMS_KAG_001/TMS_KAG_006 sharing WELD_GENSET_01 + PWAY_GANG_01).
Result: all 12 tasks scheduled, 1 soft (freight) conflict knowingly accepted,
  0 hard violations.
Final validation: APPROVED.
```

Re-run any time with `python -m backend.app.services.run_ai`; it overwrites
`data/output/optimized_blocks.json` deterministically (same input ⇒ same output).

---

## 8. Limitations

- **Prototype-scale dataset.** 12 tasks all get scheduled inside a 48h horizon
  because there simply isn't enough contention in this extract to force real
  trade-offs beyond the ones already exercised (see §7). The optimizer and
  conflict engine are exercised far harder by the unit tests in `tests/`, which
  construct deliberately conflicting synthetic scenarios.
- **10 of 26 trains (long-distance expresses beyond the modelled corridor) are
  excluded from geometric conflict checks** because their physical position along
  the corridor genuinely cannot be derived from the given columns (see assumption
  4). This is a data coverage gap, not a bug — extending `schedules_clean.csv` with
  their intermediate stops would upgrade them to SCHEDULE tier automatically.
- **Constant-speed approximation for ENDPOINTS-tier trains.** These 10 trains'
  in-between position is linearly interpolated from just two points; real trains
  accelerate/decelerate near stations, so their exact minute-level position is
  approximate (though the overall window is still bounded by their real recorded
  departure/arrival times).
- **No explicit "permitted block hours" rule.** Any hour of the day is a
  candidate; a real deployment would likely want to encode actual permissible
  block-hour policy per section once that data exists.
- **Infrastructure conflict model is a single simple rule** (yard capacity for
  concurrent traffic blocks). Real infrastructure constraints (platform occupancy,
  crossing interlocking, single-line block-section signalling) are richer than
  this prototype models.
- **No persistence/API layer.** This module only produces
  `data/output/optimized_blocks.json`; wiring it into FastAPI endpoints or a
  database is explicitly out of scope here (per the brief) and left to the
  backend/API teammate — every function returns plain dicts/DataFrames precisely
  so that integration is a thin wrapper, not a rewrite.
- **`python-dateutil` was not needed** for this dataset (see `backend/requirements.txt`)
  since every time value in `data/processed/` is already a clean `HH:MM` string.

---

## 9. Running the tests

```bash
python -m pytest tests/ -v
```

35 tests across priority scoring, conflict detection (train/task/resource/
infrastructure, including exact boundary-time and duplicate-task edge cases),
block generation (including "duration exceeds horizon" insufficient-window
cases), and the optimizer (mutual exclusion, priority trade-offs, no-feasible-
candidate handling). All 35 currently pass.
