"""
Tunable configuration for the AI & Intelligence Layer (PS 26027 - Team Techtonic).

Every threshold/weight here is an engineering assumption made explicit because the
source dataset (data/processed/) does not carry an authoritative value for it
(e.g. there is no "block hours" or "acceptable delay" column). None of these
numbers are derived from or presented as real Indian Railways operating rules -
they are configurable defaults for the prototype and are documented in AI_LAYER.md.
Change them here; no other module hard-codes a magic number.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Paths (resolved relative to the repository root, independent of CWD)
# ---------------------------------------------------------------------------
import os

_THIS_FILE = os.path.abspath(__file__)
# backend/app/utils/constants.py -> repo root is 3 levels up
REPO_ROOT = os.path.abspath(os.path.join(_THIS_FILE, "..", "..", "..", ".."))

DATA_PROCESSED_DIR = os.path.join(REPO_ROOT, "data", "processed")
DATA_OUTPUT_DIR = os.path.join(REPO_ROOT, "data", "output")
OPTIMIZED_BLOCKS_PATH = os.path.join(DATA_OUTPUT_DIR, "optimized_blocks.json")
OPTIMIZED_BLOCK_PLAN_PATH = os.path.join(DATA_OUTPUT_DIR, "optimized_block_plan.json")

MAINTENANCE_TASKS_ENRICHED_CSV = os.path.join(DATA_PROCESSED_DIR, "maintenance_tasks_enriched.csv")
MAINTENANCE_TASKS_CSV = os.path.join(DATA_PROCESSED_DIR, "maintenance_tasks.csv")
TASK_FEATURES_CSV = os.path.join(DATA_PROCESSED_DIR, "task_features.csv")
STATIONS_CLEAN_CSV = os.path.join(DATA_PROCESSED_DIR, "stations_clean.csv")
TRAINS_CLEAN_CSV = os.path.join(DATA_PROCESSED_DIR, "trains_clean.csv")
SCHEDULES_CLEAN_CSV = os.path.join(DATA_PROCESSED_DIR, "schedules_clean.csv")

# ---------------------------------------------------------------------------
# Planning horizon
# ---------------------------------------------------------------------------
# The dataset has no calendar date - schedules/trains only carry time-of-day
# (+ a day_count of 1 or 2 for overnight trips). We therefore plan over a
# synthetic rolling horizon of N days expressed in minutes-from-horizon-start,
# and ASSUME every train in trains_clean.csv runs every day of that horizon
# (a conservative/safe assumption: it can only over-detect conflicts, never
# hide a real one).
PLANNING_HORIZON_DAYS = 2
PLANNING_HORIZON_MINUTES = PLANNING_HORIZON_DAYS * 1440

# Candidate block windows are generated on this step grid (minutes).
CANDIDATE_STEP_MINUTES = 60

# Reference label for day 1 of the synthetic horizon (documentation only).
HORIZON_REFERENCE_LABEL = "Synthetic rolling horizon (no calendar date in source data)"

# ---------------------------------------------------------------------------
# Priority Engine
# ---------------------------------------------------------------------------
# Component weights must sum to 1.0. Redistributed automatically at runtime
# for a task whose contributing field is missing (never fabricated/imputed).
PRIORITY_WEIGHTS = {
    "safety": 0.35,
    "degradation": 0.20,
    "urgency": 0.20,
    "operational_impact": 0.15,
    "asset_importance": 0.10,
}

# safety_criticality / asset_degradation_score are already on a 0-10 scale
# in the source data -> simple *10 rescale to 0-100.
SCORE_0_10_SCALE = 10.0

# urgency_days_overdue is normalised against a horizon-dependent cap (days
# after which a task of that frequency class is considered maximally
# urgent). DAILY tasks saturate fastest, MONTHLY tasks slowest.
URGENCY_OVERDUE_CAP_DAYS = {
    "DAILY": 3,
    "WEEKLY": 14,
    "MONTHLY": 30,
}
DEFAULT_URGENCY_CAP_DAYS = 14  # used if horizon value is unrecognised

# Priority classification thresholds (0-100 score).
PRIORITY_THRESHOLDS = {
    "CRITICAL": 85,
    "HIGH": 65,
    "MEDIUM": 40,
    # anything below MEDIUM threshold -> LOW
}

# ---------------------------------------------------------------------------
# Conflict severities
# ---------------------------------------------------------------------------
SEVERITY_CRITICAL = "CRITICAL"
SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"

# Severities that make a candidate block individually INFEASIBLE (hard).
HARD_SEVERITIES = {SEVERITY_CRITICAL, SEVERITY_HIGH}
# Severities that are allowed but penalised in the optimizer objective (soft).
SOFT_SEVERITIES = {SEVERITY_MEDIUM, SEVERITY_LOW}

# Train-conflict severity is derived from real fields (priority_rank,
# is_freight) already present in trains_clean.csv - this is a rule mapping,
# not a fabricated per-train value.
def train_conflict_severity(priority_rank: int, is_freight: bool, same_line: bool) -> str:
    if not same_line:
        # Opposite-direction line: only relevant at all when the task needs a
        # power/signal disconnection that can bleed across both lines - see
        # conflict_engine.check_train_conflicts(). Treated as a soft signal.
        return SEVERITY_LOW
    if priority_rank is None:
        return SEVERITY_HIGH
    if priority_rank <= 2:
        return SEVERITY_CRITICAL
    if priority_rank <= 4:
        return SEVERITY_HIGH
    if is_freight:
        return SEVERITY_MEDIUM
    return SEVERITY_HIGH


# Station capacity assumption for infrastructure conflicts: a station
# without a yard (has_yard == False) is assumed unable to host two
# simultaneous traffic-block maintenance activities.
INFRA_REQUIRES_YARD_FOR_CONCURRENT_BLOCKS = True

# ---------------------------------------------------------------------------
# Optimizer (OR-Tools CP-SAT) objective weights
# ---------------------------------------------------------------------------
# Objective is built from integers; scores/penalties below are scaled before
# being summed so that CP-SAT's integer objective still reflects the intended
# priorities.
OPT_WEIGHT_PRIORITY = 10          # per priority_score point (0-100)
OPT_WEIGHT_SOFT_CONFLICT_PENALTY = 25   # per soft (MEDIUM/LOW) train conflict
OPT_WEIGHT_EARLY_START_BONUS = 1  # tiny tie-breaker: prefer earlier / less idle scheduling
OPT_SOLVER_TIME_LIMIT_SECONDS = 20

# Flat cost charged per SELECTED block option (whether it carries one task or
# several fused ones). Minimizing "number of separate blocks" then falls out
# of the same objective for free: fusing 2 tasks into 1 option costs this
# penalty once instead of twice, so the solver prefers fusion whenever it
# doesn't cost priority/conflict penalty elsewhere. This is the mechanism
# behind "minimize number of separate blocks / unnecessary fragmentation".
OPT_WEIGHT_BLOCK_COUNT_PENALTY = 30

# ---------------------------------------------------------------------------
# Block Fusion
# ---------------------------------------------------------------------------
# Two tasks are only ever considered for fusion if conflict_engine already
# flags them as "structurally conflicting" (same section/line with
# overlapping km, or a shared machine/gang, or a shared no-yard station) -
# i.e. fusion is specifically the mechanism that turns a would-be hard
# exclusion into "do both, sequentially, inside one shared traffic block"
# instead of forcing a choice between them.
FUSION_ENABLED = True

# A fused block's tasks run SEQUENTIALLY inside one shared traffic block
# (task A's own duration, then task B's own duration back-to-back). If the
# summed duration of a fusion candidate exceeds this cap, fusion is rejected
# for that pair (recorded as a fusion rejection reason) and each task falls
# back to being scheduled individually. This cap is an engineering default,
# not a Railway Board standard - long combined blocks defeat the point of
# minimizing disruption/maximizing asset availability.
FUSION_MAX_COMBINED_DURATION_MINUTES = 360

# Only pairwise fusion (2 tasks per fused block) is implemented in this
# prototype - see AI_LAYER.md / SCHEDULING_ENGINE.md limitations.
FUSION_MAX_GROUP_SIZE = 2

# ---------------------------------------------------------------------------
# Recommendation ranking (Recommendation + Dashboard layer)
# ---------------------------------------------------------------------------
# recommendation_score blends three already-computed, real signals - it is a
# rule-based ranking score, NOT a machine-learning confidence value (no ML
# model exists or is trained anywhere in this project - see AI_LAYER.md /
# DASHBOARD.md). Weights sum to 1.0.
REC_WEIGHT_PRIORITY = 0.55
REC_WEIGHT_CONFLICT_RISK = 0.25
REC_WEIGHT_AVAILABILITY_BENEFIT = 0.20

# feasibility_score starts at 100 (the block already passed schedule_validator)
# and is docked per accepted soft conflict / per extra fused task, reflecting
# real coordination complexity - again a rule, not an ML confidence figure.
REC_FEASIBILITY_PENALTY_PER_SOFT_CONFLICT = 12
REC_FEASIBILITY_PENALTY_PER_EXTRA_FUSED_TASK = 5

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
TEAM_NAME = "Techtonic"
PROBLEM_STATEMENT_ID = "26027"
PROBLEM_STATEMENT_TITLE = (
    "AI-Powered Automatic Block Planning to Maximize Asset Availability "
    "for Train Operations on Indian Railways"
)
