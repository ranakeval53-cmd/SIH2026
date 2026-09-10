"""
PlanStore - the single in-process source of truth for the Planner Dashboard.

Holds:
  1. The AI-generated base plan (from scheduling_engine.run() - reused
     unchanged, not recomputed here) and its ranked recommendations
     (from recommendation_ranking.build_recommendations() - also reused).
  2. Human review state layered on top: PENDING_REVIEW / APPROVED / EDITED /
     REJECTED per recommendation, with a full audit trail. Persisted as
     plain JSON (data/output/review_state.json) - not a database, just
     durable state for a prototype control-room tool.
  3. An alert log for schedule-change / approval events, plus deterministic
     alert ids for state-derived alerts (critical maintenance, overdue,
     conflicts, optimization failure, asset availability risk) so read/ack
     flags survive a recompute.

Every mutation (approve/edit/reject) re-derives the FULL effective schedule
(every non-rejected recommendation's current, possibly-edited window) and
re-runs schedule_validator.validate_schedule() - the exact same independent
safety net the Scheduling Engine itself uses - before committing. Nothing
here re-implements conflict detection; it only orchestrates calls into the
existing services.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.app.services import (
    conflict_engine,
    data_loader,
    recommendation_ranking,
    scheduling_engine,
    schedule_validator,
)
from backend.app.utils import constants

REVIEW_STATE_PATH = os.path.join(constants.DATA_OUTPUT_DIR, "review_state.json")

STATUS_PENDING_REVIEW = "PENDING_REVIEW"
STATUS_APPROVED = "APPROVED"
STATUS_EDITED = "EDITED"
STATUS_REJECTED = "REJECTED"
STATUS_UNSCHEDULED = "UNSCHEDULED"  # DEFER_TASK recommendations only

REJECTION_REASONS = [
    "Train schedule conflict not acceptable",
    "Infrastructure/yard capacity insufficient",
    "Resource (machine/gang) unavailable at this time",
    "Operationally disruptive window",
    "Needs re-prioritization",
    "Other (see notes)",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class PlanStore:
    def __init__(self):
        self._lock = threading.RLock()
        self.data = data_loader.load_processed_data()
        self.train_models = conflict_engine.build_train_position_models(
            self.data.trains, self.data.schedules, self.data.stations
        )
        self.horizon_minutes = constants.PLANNING_HORIZON_MINUTES
        self.step_minutes = constants.CANDIDATE_STEP_MINUTES

        self.base_plan: dict = {}
        self.recommendations: Dict[str, dict] = {}
        self.review_state: Dict[str, dict] = {}
        self.alert_log: List[dict] = []
        self.alert_flags: Dict[str, dict] = {}

        self._load_persisted()
        self.recompute(persist=False)

    # -- persistence -------------------------------------------------------

    def _load_persisted(self) -> None:
        if not os.path.exists(REVIEW_STATE_PATH):
            return
        try:
            with open(REVIEW_STATE_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
            self.review_state = saved.get("review_state", {})
            self.alert_log = saved.get("alert_log", [])
            self.alert_flags = saved.get("alert_flags", {})
        except (json.JSONDecodeError, OSError):
            self.review_state, self.alert_log, self.alert_flags = {}, [], {}

    def _save(self) -> None:
        os.makedirs(constants.DATA_OUTPUT_DIR, exist_ok=True)
        with open(REVIEW_STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "review_state": self.review_state,
                    "alert_log": self.alert_log[-300:],
                    "alert_flags": self.alert_flags,
                },
                f,
                indent=2,
                default=str,
            )

    # -- base plan -----------------------------------------------------------

    def recompute(self, persist: bool = True) -> None:
        """Re-run the AI Scheduling Engine (unchanged, reused as-is) to
        (re)build the base plan and its ranked recommendations. Human review
        decisions already made on recommendation_ids that still exist are
        kept; decisions on ids that no longer exist are dropped."""
        with self._lock:
            self.base_plan = scheduling_engine.run(
                horizon_minutes=self.horizon_minutes, step_minutes=self.step_minutes, write_output=True
            )
            ranked = recommendation_ranking.build_recommendations(self.base_plan, self.data.tasks)
            self.recommendations = {r["recommendation_id"]: r for r in ranked}
            self.review_state = {
                rid: state for rid, state in self.review_state.items() if rid in self.recommendations
            }
            if persist:
                self._save()

    def task_row(self, task_id: str):
        rows = {row["task_id"]: row for _, row in self.data.tasks.iterrows()}
        return rows.get(task_id)

    # -- review-state helpers -------------------------------------------------

    def _state(self, rec_id: str) -> dict:
        return self.review_state.setdefault(
            rec_id,
            {"status": STATUS_PENDING_REVIEW, "audit": [], "edited_sub_windows": None, "edited_task_ids": None},
        )

    def status_of(self, rec_id: str) -> str:
        rec = self.recommendations.get(rec_id)
        if rec is None:
            return "UNKNOWN"
        if rec["type"] == "DEFER_TASK":
            return STATUS_UNSCHEDULED
        return self.review_state.get(rec_id, {}).get("status", STATUS_PENDING_REVIEW)

    def effective_window(self, rec_id: str) -> dict:
        """Current (possibly edited) {task_id: (start,end)} + task_ids for a
        SCHEDULE_BLOCK recommendation."""
        rec = self.recommendations[rec_id]
        state = self.review_state.get(rec_id, {})
        block = rec["block"]
        if state.get("edited_sub_windows"):
            return {
                "task_ids": state["edited_task_ids"],
                "sub_windows": {tid: tuple(w) for tid, w in state["edited_sub_windows"].items()},
            }
        return {
            "task_ids": rec["task_ids"],
            "sub_windows": {task_id: _find_task_window(block, task_id) for task_id in rec["task_ids"]},
        }

    def _effective_options(self, exclude_rec_id: Optional[str] = None) -> List[dict]:
        options = []
        for rec_id, rec in self.recommendations.items():
            if rec["type"] != "SCHEDULE_BLOCK":
                continue
            if rec_id == exclude_rec_id:
                continue
            if self.status_of(rec_id) == STATUS_REJECTED:
                continue
            window = self.effective_window(rec_id)
            options.append(
                {
                    "option_id": rec_id,
                    "task_ids": window["task_ids"],
                    "is_fused": len(window["task_ids"]) > 1,
                    "sub_windows": window["sub_windows"],
                }
            )
        return options

    def removed_or_rejected_task_ids(self) -> Dict[str, str]:
        """task_id -> human-readable reason, for tasks that WERE in a block
        but are no longer scheduled because of an edit (removed) or a
        rejection (whole block returned to the queue)."""
        result = {}
        for rec_id, rec in self.recommendations.items():
            if rec["type"] != "SCHEDULE_BLOCK":
                continue
            state = self.review_state.get(rec_id, {})
            if state.get("status") == STATUS_REJECTED:
                for task_id in rec["task_ids"]:
                    result[task_id] = f"Block {rec_id} was rejected by the planner: {state.get('rejection_reason', '')}"
            elif state.get("edited_task_ids") is not None:
                removed = [t for t in rec["task_ids"] if t not in state["edited_task_ids"]]
                for task_id in removed:
                    result[task_id] = f"Removed from block {rec_id} during a planner edit; awaiting re-planning."
        return result

    # -- listing ---------------------------------------------------------------

    def list_recommendations(self) -> List[dict]:
        with self._lock:
            out = []
            for rec_id, rec in self.recommendations.items():
                enriched = dict(rec)
                enriched["status"] = self.status_of(rec_id)
                state = self.review_state.get(rec_id, {})
                enriched["audit"] = state.get("audit", [])
                if rec["type"] == "SCHEDULE_BLOCK" and state.get("edited_sub_windows"):
                    enriched["effective_window"] = self.effective_window(rec_id)
                out.append(enriched)

            removed = self.removed_or_rejected_task_ids()
            existing_defer_ids = {r["task_ids"][0] for r in out if r["type"] == "DEFER_TASK"}
            for task_id, reason in removed.items():
                if task_id in existing_defer_ids:
                    continue
                task_row = self.task_row(task_id)
                priority = next((p for p in self.base_plan["priority_scores"] if p["task_id"] == task_id), {})
                out.append(
                    {
                        "recommendation_id": f"DEFER_{task_id}",
                        "type": "DEFER_TASK",
                        "recommended_action": "Manual Planner Review Required",
                        "recommendation_score": priority.get("priority_score", 0.0),
                        "feasibility_score": 0.0,
                        "priority_score": priority.get("priority_score"),
                        "priority_class": priority.get("priority_class"),
                        "reason": reason,
                        "affected_section": [task_row.get("section_id")] if task_row is not None else [],
                        "affected_stations": [task_row.get("station_code")] if task_row is not None else [],
                        "affected_trains": [],
                        "expected_benefit": "None yet - returned to the planning queue.",
                        "risk_conflicts": [],
                        "block": None,
                        "task_ids": [task_id],
                        "status": STATUS_UNSCHEDULED,
                        "audit": [],
                    }
                )
            out.sort(key=lambda r: r["recommendation_score"], reverse=True)
            return out

    def list_tasks(self) -> List[dict]:
        with self._lock:
            status_and_block_by_task: Dict[str, dict] = {}
            for rec in self.list_recommendations():
                for task_id in rec["task_ids"]:
                    status_and_block_by_task[task_id] = {
                        "status": rec["status"],
                        "block_id": rec["recommendation_id"] if rec["type"] == "SCHEDULE_BLOCK" else None,
                    }

            priority_by_task = {p["task_id"]: p for p in self.base_plan["priority_scores"]}
            out = []
            for _, row in self.data.tasks.iterrows():
                task_id = row["task_id"]
                priority = priority_by_task.get(task_id, {})
                status_info = status_and_block_by_task.get(task_id, {"status": "UNKNOWN", "block_id": None})
                out.append(
                    {
                        "task_id": task_id,
                        "task_name": row.get("task_name"),
                        "department": row.get("department"),
                        "task_category": row.get("task_category"),
                        "section_id": row.get("section_id"),
                        "track_line": row.get("track_line"),
                        "station_code": row.get("station_code"),
                        "station_name": row.get("station_name"),
                        "start_km": row.get("start_km"),
                        "end_km": row.get("end_km"),
                        "required_duration_mins": row.get("required_duration_mins"),
                        "horizon": row.get("horizon"),
                        "priority_score": priority.get("priority_score"),
                        "priority_class": priority.get("priority_class"),
                        "status": status_info["status"],
                        "block_id": status_info["block_id"],
                    }
                )
            return out

    def get_recommendation(self, rec_id: str) -> Optional[dict]:
        for r in self.list_recommendations():
            if r["recommendation_id"] == rec_id:
                return r
        return None

    # -- human-in-the-loop actions ----------------------------------------------

    def approve(self, rec_id: str, note: Optional[str] = None) -> dict:
        with self._lock:
            rec = self.recommendations.get(rec_id)
            if rec is None:
                return {"success": False, "error": "not_found"}
            if rec["type"] != "SCHEDULE_BLOCK":
                return {"success": False, "error": "only a proposed block can be approved"}
            current_status = self.status_of(rec_id)
            if current_status == STATUS_REJECTED:
                return {"success": False, "error": "already rejected; cannot approve"}

            options = self._effective_options()
            validation = schedule_validator.validate_schedule(
                options, self.data.tasks, self.train_models, self.horizon_minutes
            )
            if validation["status"] == "REJECTED":
                relevant = [
                    v
                    for v in validation["violations"]
                    if v.get("task_id") in rec["task_ids"] or v.get("other_task_id") in rec["task_ids"]
                ] or validation["violations"]
                return {"success": False, "error": "revalidation_failed", "violations": relevant}

            state = self._state(rec_id)
            state["status"] = STATUS_APPROVED
            state["audit"].append({"action": "APPROVE", "timestamp": _now(), "note": note or ""})
            self._log_alert("SCHEDULE_CHANGE", constants.SEVERITY_LOW, f"Block {rec_id} approved by planner.", rec_id)
            self._save()
            return {"success": True, "recommendation": self.get_recommendation(rec_id)}

    def edit(self, rec_id: str, new_start_minute: Optional[int], remove_task_ids: Optional[List[str]], note: Optional[str]) -> dict:
        with self._lock:
            rec = self.recommendations.get(rec_id)
            if rec is None:
                return {"success": False, "error": "not_found"}
            if rec["type"] != "SCHEDULE_BLOCK":
                return {"success": False, "error": "only a proposed block can be edited"}
            if self.status_of(rec_id) == STATUS_REJECTED:
                return {"success": False, "error": "already rejected; cannot edit"}

            original_task_ids = rec["task_ids"]
            remove_task_ids = set(remove_task_ids or [])
            keep_task_ids = [t for t in original_task_ids if t not in remove_task_ids]
            if not keep_task_ids:
                return {"success": False, "error": "cannot remove every task from a block; reject it instead"}

            current_window = self.effective_window(rec_id)
            start_minute = new_start_minute if new_start_minute is not None else min(
                current_window["sub_windows"][t][0] for t in keep_task_ids
            )
            if start_minute < 0:
                return {"success": False, "error": "start time cannot be negative"}

            new_sub_windows = {}
            cursor = start_minute
            for task_id in keep_task_ids:
                task_row = self.task_row(task_id)
                duration = int(task_row["required_duration_mins"])
                new_sub_windows[task_id] = (cursor, cursor + duration)
                cursor += duration

            time_violations = []
            for task_id, (s, e) in new_sub_windows.items():
                v = conflict_engine.check_time_range_validity(
                    {"task_id": task_id, "start_minute": s, "end_minute": e}, self.horizon_minutes
                )
                if v:
                    time_violations.append(v)
            if time_violations:
                return {"success": False, "error": "invalid_time_range", "violations": time_violations}

            hypothetical_options = self._effective_options(exclude_rec_id=rec_id)
            hypothetical_options.append(
                {
                    "option_id": rec_id,
                    "task_ids": keep_task_ids,
                    "is_fused": len(keep_task_ids) > 1,
                    "sub_windows": new_sub_windows,
                }
            )
            validation = schedule_validator.validate_schedule(
                hypothetical_options, self.data.tasks, self.train_models, self.horizon_minutes
            )
            if validation["status"] == "REJECTED":
                return {"success": False, "error": "revalidation_failed", "violations": validation["violations"]}

            state = self._state(rec_id)
            state["status"] = STATUS_EDITED
            state["edited_sub_windows"] = {tid: list(w) for tid, w in new_sub_windows.items()}
            state["edited_task_ids"] = keep_task_ids
            state["audit"].append(
                {
                    "action": "EDIT",
                    "timestamp": _now(),
                    "note": note or "",
                    "new_start_minute": start_minute,
                    "removed_task_ids": sorted(remove_task_ids),
                }
            )
            self._log_alert("SCHEDULE_CHANGE", "MEDIUM", f"Block {rec_id} edited by planner.", rec_id)
            self._save()
            return {"success": True, "recommendation": self.get_recommendation(rec_id)}

    def reject(self, rec_id: str, reason: str, note: Optional[str] = None) -> dict:
        with self._lock:
            rec = self.recommendations.get(rec_id)
            if rec is None:
                return {"success": False, "error": "not_found"}
            if rec["type"] != "SCHEDULE_BLOCK":
                return {"success": False, "error": "only a proposed block can be rejected"}
            if not reason or not reason.strip():
                return {"success": False, "error": "a rejection reason is required"}

            state = self._state(rec_id)
            state["status"] = STATUS_REJECTED
            state["rejection_reason"] = reason
            state["audit"].append({"action": "REJECT", "timestamp": _now(), "reason": reason, "note": note or ""})
            self._log_alert("SCHEDULE_CHANGE", "HIGH", f"Block {rec_id} rejected by planner: {reason}", rec_id)
            self._save()
            return {"success": True, "recommendation": self.get_recommendation(rec_id)}

    # -- alerts -------------------------------------------------------------

    def _log_alert(self, alert_type: str, severity: str, message: str, related_id: Optional[str]) -> None:
        alert_id = f"EVT_{len(self.alert_log)}_{int(datetime.now().timestamp() * 1000)}"
        self.alert_log.append(
            {
                "alert_id": alert_id,
                "type": alert_type,
                "severity": severity,
                "message": message,
                "related_id": related_id,
                "timestamp": _now(),
                "read": False,
                "acknowledged": False,
            }
        )

    def _flag(self, alert_id: str) -> dict:
        return self.alert_flags.setdefault(alert_id, {"read": False, "acknowledged": False})

    def alerts(self) -> List[dict]:
        with self._lock:
            derived = []

            for rec in self.recommendations.values():
                if rec["priority_class"] == "CRITICAL":
                    aid = f"CRIT_{rec['recommendation_id']}"
                    flag = self._flag(aid)
                    derived.append(
                        {
                            "alert_id": aid,
                            "type": "CRITICAL_MAINTENANCE",
                            "severity": "CRITICAL",
                            "message": f"{rec['recommendation_id']} involves CRITICAL-priority maintenance work.",
                            "related_id": rec["recommendation_id"],
                            "timestamp": self.base_plan["meta"]["generated_at_utc"],
                            **flag,
                        }
                    )
                for conflict in rec.get("risk_conflicts", []):
                    aid = f"TRAIN_{rec['recommendation_id']}_{conflict.get('train_no')}"
                    flag = self._flag(aid)
                    derived.append(
                        {
                            "alert_id": aid,
                            "type": "TRAIN_CONFLICT",
                            "severity": conflict.get("severity", "MEDIUM"),
                            "message": conflict.get(
                                "reason", f"Soft train conflict on {rec['recommendation_id']} with train {conflict.get('train_no')}."
                            ),
                            "related_id": rec["recommendation_id"],
                            "timestamp": self.base_plan["meta"]["generated_at_utc"],
                            **flag,
                        }
                    )
                if rec["type"] == "SCHEDULE_BLOCK" and rec.get("risk_conflicts") and rec["priority_class"] in ("CRITICAL", "HIGH"):
                    aid = f"UNSAFE_{rec['recommendation_id']}"
                    flag = self._flag(aid)
                    derived.append(
                        {
                            "alert_id": aid,
                            "type": "UNSAFE_BLOCK",
                            "severity": "HIGH",
                            "message": (
                                f"{rec['recommendation_id']} pairs {rec['priority_class']}-priority work with an "
                                f"accepted soft conflict - review before approving."
                            ),
                            "related_id": rec["recommendation_id"],
                            "timestamp": self.base_plan["meta"]["generated_at_utc"],
                            **flag,
                        }
                    )
                if self.status_of(rec["recommendation_id"]) == STATUS_PENDING_REVIEW and rec["type"] == "SCHEDULE_BLOCK":
                    aid = f"APPROVAL_{rec['recommendation_id']}"
                    flag = self._flag(aid)
                    derived.append(
                        {
                            "alert_id": aid,
                            "type": "PLANNER_APPROVAL_REQUIRED",
                            "severity": "MEDIUM",
                            "message": f"{rec['recommendation_id']} is awaiting planner review.",
                            "related_id": rec["recommendation_id"],
                            "timestamp": self.base_plan["meta"]["generated_at_utc"],
                            **flag,
                        }
                    )

            for task_id, reason in self.removed_or_rejected_task_ids().items():
                aid = f"OVERDUE_{task_id}"
                flag = self._flag(aid)
                priority = next((p for p in self.base_plan["priority_scores"] if p["task_id"] == task_id), {})
                if priority.get("priority_class") in ("CRITICAL", "HIGH"):
                    derived.append(
                        {
                            "alert_id": aid,
                            "type": "EXPIRING_OVERDUE_MAINTENANCE",
                            "severity": "HIGH",
                            "message": f"{task_id} is unscheduled and {priority.get('priority_class')} priority: {reason}",
                            "related_id": task_id,
                            "timestamp": self.base_plan["meta"]["generated_at_utc"],
                            **flag,
                        }
                    )

            for u in self.base_plan["unscheduled_tasks"]:
                if u.get("priority_class") in ("CRITICAL", "HIGH"):
                    aid = f"OVERDUE_BASE_{u['task_id']}"
                    flag = self._flag(aid)
                    derived.append(
                        {
                            "alert_id": aid,
                            "type": "EXPIRING_OVERDUE_MAINTENANCE",
                            "severity": "HIGH",
                            "message": f"{u['task_id']} ({u.get('priority_class')}) could not be placed by the optimizer: "
                            + " ".join(u.get("reasons", [])),
                            "related_id": u["task_id"],
                            "timestamp": self.base_plan["meta"]["generated_at_utc"],
                            **flag,
                        }
                    )

            if self.base_plan.get("status") != "APPROVED" or self.base_plan["meta"].get("optimizer_status") not in (
                "OPTIMAL",
                "FEASIBLE",
            ):
                aid = "OPT_FAILURE"
                flag = self._flag(aid)
                derived.append(
                    {
                        "alert_id": aid,
                        "type": "OPTIMIZATION_FAILURE",
                        "severity": "CRITICAL",
                        "message": f"AI optimizer/validation status is {self.base_plan['meta'].get('optimizer_status')}"
                        f"/{self.base_plan.get('status')} - review before trusting recommendations.",
                        "related_id": None,
                        "timestamp": self.base_plan["meta"]["generated_at_utc"],
                        **flag,
                    }
                )

            metrics = self.base_plan["metrics"]
            unapproved_minutes = metrics["total_required_maintenance_minutes"] - self._approved_minutes()
            backlog_fraction = (
                unapproved_minutes / metrics["total_required_maintenance_minutes"]
                if metrics["total_required_maintenance_minutes"]
                else 0
            )
            if backlog_fraction > 0.5:
                aid = "AVAILABILITY_RISK"
                flag = self._flag(aid)
                derived.append(
                    {
                        "alert_id": aid,
                        "type": "ASSET_AVAILABILITY_RISK",
                        "severity": "MEDIUM" if backlog_fraction < 0.8 else "HIGH",
                        "message": (
                            f"{round(backlog_fraction * 100, 1)}% of required maintenance minutes are not yet "
                            f"planner-approved."
                        ),
                        "related_id": None,
                        "timestamp": self.base_plan["meta"]["generated_at_utc"],
                        **flag,
                    }
                )

            event_alerts = [dict(a) for a in self.alert_log]
            for a in event_alerts:
                a.update(
                    self.alert_flags.get(
                        a["alert_id"], {"read": a.get("read", False), "acknowledged": a.get("acknowledged", False)}
                    )
                )

            all_alerts = derived + event_alerts
            severity_rank = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
            all_alerts.sort(key=lambda a: (severity_rank.get(a["severity"], 5), a["timestamp"]), reverse=False)
            return all_alerts

    def _approved_minutes(self) -> int:
        total = 0
        for rec_id, rec in self.recommendations.items():
            if rec["type"] != "SCHEDULE_BLOCK":
                continue
            if self.status_of(rec_id) not in (STATUS_APPROVED, STATUS_EDITED):
                continue
            window = self.effective_window(rec_id)
            for s, e in window["sub_windows"].values():
                total += e - s
        return total

    def mark_alert(self, alert_id: str, read: Optional[bool] = None, acknowledged: Optional[bool] = None) -> dict:
        with self._lock:
            flag = self._flag(alert_id)
            if read is not None:
                flag["read"] = read
            if acknowledged is not None:
                flag["acknowledged"] = acknowledged
            for a in self.alert_log:
                if a["alert_id"] == alert_id:
                    a.update(flag)
            self._save()
            return flag

    # -- dashboard / analytics / conflicts / reports ----------------------------

    def dashboard_summary(self) -> dict:
        recs = self.list_recommendations()
        blocks = [r for r in recs if r["type"] == "SCHEDULE_BLOCK"]
        metrics = self.base_plan["metrics"]

        approved_minutes = self._approved_minutes()
        total_required = metrics["total_required_maintenance_minutes"] or 1

        return {
            "total_maintenance_tasks": metrics["total_tasks"],
            "critical_high_priority_tasks": sum(
                1 for p in self.base_plan["priority_scores"] if p["priority_class"] in ("CRITICAL", "HIGH")
            ),
            "recommended_blocks": len(blocks),
            "pending_approvals": sum(1 for r in blocks if r["status"] == STATUS_PENDING_REVIEW),
            "approved_blocks": sum(1 for r in blocks if r["status"] == STATUS_APPROVED),
            "edited_blocks": sum(1 for r in blocks if r["status"] == STATUS_EDITED),
            "rejected_blocks": sum(1 for r in blocks if r["status"] == STATUS_REJECTED),
            "unscheduled_tasks": sum(1 for r in recs if r["type"] == "DEFER_TASK"),
            "active_alerts": sum(1 for a in self.alerts() if not a.get("acknowledged")),
            "active_conflicts": len(self.conflicts_view()),
            "ai_proposed_completion_pct": metrics["task_completion_rate_pct"],
            "planner_approved_completion_pct": round(approved_minutes / total_required * 100, 2),
            "asset_availability_pct": round(approved_minutes / total_required * 100, 2),
            "train_impact_count": len({c["train_no"] for r in blocks for c in r.get("risk_conflicts", [])}),
            "fused_block_count": metrics["fused_block_count"],
            "blocks_saved_by_fusion": metrics["blocks_saved_by_fusion"],
            "optimizer_status": self.base_plan["meta"]["optimizer_status"],
            "validation_status": self.base_plan["status"],
            "generated_at_utc": self.base_plan["meta"]["generated_at_utc"],
        }

    def conflicts_view(self) -> List[dict]:
        out = []
        for c in self.base_plan["conflicts"]:
            suggestion = self._suggest_alternative(c.get("task_a") or c.get("task_id"))
            out.append({**c, "suggested_alternative_window": suggestion})
        for rec in self.recommendations.values():
            for conflict in rec.get("risk_conflicts", []):
                out.append(
                    {
                        "type": "TRAIN_CONFLICT_SOFT",
                        "severity": conflict.get("severity", "MEDIUM"),
                        "task_id": conflict.get("task_id"),
                        "train_no": conflict.get("train_no"),
                        "block_id": rec["recommendation_id"],
                        "reason": conflict.get("reason"),
                        "suggested_alternative_window": None,
                    }
                )
        return out

    def _suggest_alternative(self, task_id: Optional[str]) -> Optional[dict]:
        if not task_id:
            return None
        for r in self.recommendations.values():
            if task_id in r.get("task_ids", []) and r["type"] == "SCHEDULE_BLOCK":
                window = self.effective_window(r["recommendation_id"])
                if task_id in window["sub_windows"]:
                    s, e = window["sub_windows"][task_id]
                    from backend.app.utils import time_utils

                    return {
                        "note": "Currently scheduled window (already conflict-free on hard constraints)",
                        "start_time": time_utils.minutes_to_label(s),
                        "end_time": time_utils.minutes_to_label(e),
                    }
        return None

    def analytics(self) -> dict:
        recs = self.list_recommendations()
        blocks = [r for r in recs if r["type"] == "SCHEDULE_BLOCK"]
        tasks_df = self.data.tasks
        metrics = self.base_plan["metrics"]

        by_department: Dict[str, int] = {}
        for _, row in tasks_df.iterrows():
            by_department[row["department"]] = by_department.get(row["department"], 0) + 1

        by_priority: Dict[str, int] = {}
        for p in self.base_plan["priority_scores"]:
            by_priority[p["priority_class"]] = by_priority.get(p["priority_class"], 0) + 1

        by_status: Dict[str, int] = {}
        for r in blocks:
            by_status[r["status"]] = by_status.get(r["status"], 0) + 1
        by_status[STATUS_UNSCHEDULED] = sum(1 for r in recs if r["type"] == "DEFER_TASK")

        total_required = metrics["total_required_maintenance_minutes"] or 1
        asset_availability_before_after = {
            "before_pct": 0.0,
            "ai_proposed_after_pct": metrics["task_completion_rate_pct"],
            "planner_approved_after_pct": round(self._approved_minutes() / total_required * 100, 2),
        }

        train_impact: Dict[str, int] = {}
        for r in blocks:
            for c in r.get("risk_conflicts", []):
                train_impact[c["train_no"]] = train_impact.get(c["train_no"], 0) + 1

        conflicts_by_type: Dict[str, int] = {}
        for c in self.base_plan["conflicts"]:
            conflicts_by_type[c["type"]] = conflicts_by_type.get(c["type"], 0) + 1

        completed_vs_unscheduled = {
            "scheduled": metrics["scheduled_task_count"],
            "unscheduled": len([r for r in recs if r["type"] == "DEFER_TASK"]),
        }

        block_utilization_pct = round(metrics["scheduled_maintenance_minutes"] / self.horizon_minutes * 100, 2)

        return {
            "maintenance_by_department": by_department,
            "priority_distribution": by_priority,
            "blocks_by_status": by_status,
            "asset_availability_before_after": asset_availability_before_after,
            "train_impact": train_impact,
            "conflicts_by_type": conflicts_by_type,
            "completed_vs_unscheduled": completed_vs_unscheduled,
            "block_utilization_pct": block_utilization_pct,
            "fusion": {
                "fused_block_count": metrics["fused_block_count"],
                "blocks_saved_by_fusion": metrics["blocks_saved_by_fusion"],
                "fusion_rejections": metrics["fusion_rejections"],
            },
        }

    def reports(self) -> dict:
        recs = self.list_recommendations()
        blocks = [r for r in recs if r["type"] == "SCHEDULE_BLOCK"]
        by_department: Dict[str, List[str]] = {}
        for r in blocks:
            for d in r["block"]["departments"]:
                by_department.setdefault(d, []).append(r["recommendation_id"])

        return {
            "generated_at_utc": _now(),
            "team": constants.TEAM_NAME,
            "problem_statement_id": constants.PROBLEM_STATEMENT_ID,
            "block_plan": [r["block"] for r in blocks],
            "maintenance_summary": self.base_plan["metrics"],
            "department_summary": by_department,
            "asset_availability": self.analytics()["asset_availability_before_after"],
            "train_impact": self.analytics()["train_impact"],
            "conflicts": self.conflicts_view(),
            "planner_decisions": [
                {
                    "recommendation_id": r["recommendation_id"],
                    "status": r["status"],
                    "audit": r["audit"],
                }
                for r in blocks
                if r["status"] != STATUS_PENDING_REVIEW
            ],
            "unscheduled_tasks": [r for r in recs if r["type"] == "DEFER_TASK"],
        }


def _find_task_window(block: dict, task_id: str):
    from backend.app.utils import time_utils

    for t in block["tasks"]:
        if t["task_id"] == task_id:
            # start_time/end_time are "Dn HH:MM" labels; recover minutes by
            # reusing the same parser time_utils exposes for horizon labels.
            return (
                _label_to_minutes(t["start_time"]),
                _label_to_minutes(t["end_time"]),
            )
    raise KeyError(task_id)


def _label_to_minutes(label: str) -> int:
    # "D1 03:00" -> (1-1)*1440 + 3*60
    day_part, time_part = label.split(" ")
    day = int(day_part[1:])
    hh, mm = time_part.split(":")
    return (day - 1) * 1440 + int(hh) * 60 + int(mm)


_store: Optional[PlanStore] = None
_store_lock = threading.Lock()


def get_store() -> PlanStore:
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = PlanStore()
    return _store
