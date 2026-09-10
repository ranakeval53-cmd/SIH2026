"""
FastAPI application for the Recommendation + Visualization + Planner
Dashboard layer (PS 26027, Team Techtonic).

This is a thin HTTP surface over backend/app/api/store.py (PlanStore), which
in turn only orchestrates the existing Scheduling Engine / Conflict Engine /
Schedule Validator services - no scheduling, conflict-detection, or
optimization logic is duplicated here.

Run:
    python -m backend.app.api.app
or
    uvicorn backend.app.api.app:app --reload
"""

from __future__ import annotations

import csv
import io
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api.models import EditRequest, RejectRequest
from backend.app.api.store import get_store
from backend.app.utils import constants

app = FastAPI(
    title="PS 26027 - Techtonic Planner Dashboard API",
    description="Recommendation + Visualization + Planner Dashboard layer over the AI Scheduling Engine.",
    version="1.0.0",
)

FRONTEND_DIR = os.path.join(constants.REPO_ROOT, "frontend")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.get("/api/dashboard/summary")
def dashboard_summary():
    return get_store().dashboard_summary()


@app.post("/api/system/recompute")
def system_recompute():
    """Manually re-run the AI Scheduling Engine against data/processed/ and
    rebuild recommendations. Existing planner decisions on recommendation_ids
    that still exist afterwards are preserved."""
    store = get_store()
    store.recompute()
    return {"success": True, "summary": store.dashboard_summary()}


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@app.get("/api/tasks")
def list_tasks(
    priority: Optional[str] = Query(default=None, description="CRITICAL/HIGH/MEDIUM/LOW"),
    department: Optional[str] = Query(default=None, description="TMS/SMMS/TDMS"),
    status: Optional[str] = Query(default=None),
    section: Optional[str] = Query(default=None),
    station: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None, description="matches task_id or task_name"),
    sort_by: Optional[str] = Query(default="priority_score"),
    sort_dir: Optional[str] = Query(default="desc"),
):
    tasks = get_store().list_tasks()

    if priority:
        tasks = [t for t in tasks if t["priority_class"] == priority.upper()]
    if department:
        tasks = [t for t in tasks if t["department"] == department.upper()]
    if status:
        tasks = [t for t in tasks if t["status"] == status.upper()]
    if section:
        tasks = [t for t in tasks if t["section_id"] == section]
    if station:
        tasks = [t for t in tasks if t["station_code"] == station]
    if search:
        needle = search.lower()
        tasks = [
            t for t in tasks if needle in str(t["task_id"]).lower() or needle in str(t["task_name"]).lower()
        ]

    reverse = (sort_dir or "desc").lower() != "asc"
    if sort_by and tasks and sort_by in tasks[0]:
        tasks = sorted(tasks, key=lambda t: (t[sort_by] is None, t[sort_by]), reverse=reverse)

    return {"count": len(tasks), "tasks": tasks}


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    tasks = {t["task_id"]: t for t in get_store().list_tasks()}
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="task not found")
    return task


# ---------------------------------------------------------------------------
# Recommendations (human-in-the-loop)
# ---------------------------------------------------------------------------

@app.get("/api/recommendations")
def list_recommendations(
    status: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None, description="SCHEDULE_BLOCK or DEFER_TASK"),
):
    recs = get_store().list_recommendations()
    if status:
        recs = [r for r in recs if r["status"] == status.upper()]
    if type:
        recs = [r for r in recs if r["type"] == type.upper()]
    return {"count": len(recs), "recommendations": recs}


@app.get("/api/recommendations/{rec_id}")
def get_recommendation(rec_id: str):
    rec = get_store().get_recommendation(rec_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="recommendation not found")
    return rec


@app.post("/api/recommendations/{rec_id}/approve")
def approve_recommendation(rec_id: str, body: dict | None = None):
    note = (body or {}).get("note") if body else None
    result = get_store().approve(rec_id, note=note)
    if not result["success"]:
        raise HTTPException(status_code=409 if result.get("error") == "revalidation_failed" else 400, detail=result)
    return result


@app.post("/api/recommendations/{rec_id}/edit")
def edit_recommendation(rec_id: str, body: EditRequest):
    result = get_store().edit(rec_id, body.new_start_minute, body.remove_task_ids, body.note)
    if not result["success"]:
        raise HTTPException(status_code=409 if result.get("error") == "revalidation_failed" else 400, detail=result)
    return result


@app.post("/api/recommendations/{rec_id}/reject")
def reject_recommendation(rec_id: str, body: RejectRequest):
    result = get_store().reject(rec_id, body.reason, note=body.note)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result)
    return result


@app.get("/api/rejection-reasons")
def rejection_reasons():
    from backend.app.api.store import REJECTION_REASONS

    return {"reasons": REJECTION_REASONS}


# ---------------------------------------------------------------------------
# Blocks (block plan / timeline)
# ---------------------------------------------------------------------------

@app.get("/api/blocks")
def list_blocks(status: Optional[str] = Query(default=None)):
    recs = [r for r in get_store().list_recommendations() if r["type"] == "SCHEDULE_BLOCK"]
    if status:
        recs = [r for r in recs if r["status"] == status.upper()]
    blocks = []
    for r in recs:
        block = dict(r["block"])
        block["recommendation_status"] = r["status"]
        block["recommendation_score"] = r["recommendation_score"]
        block["feasibility_score"] = r["feasibility_score"]
        block["priority_class"] = r["priority_class"]
        if r.get("effective_window"):
            block["effective_window"] = r["effective_window"]
        blocks.append(block)
    blocks.sort(key=lambda b: b["start_time"])
    return {"count": len(blocks), "blocks": blocks}


@app.get("/api/blocks/{block_id}")
def get_block(block_id: str):
    rec = get_store().get_recommendation(block_id)
    if rec is None or rec["type"] != "SCHEDULE_BLOCK":
        raise HTTPException(status_code=404, detail="block not found")
    return rec


# ---------------------------------------------------------------------------
# Conflicts, Analytics, Alerts, Reports
# ---------------------------------------------------------------------------

@app.get("/api/conflicts")
def list_conflicts():
    conflicts = get_store().conflicts_view()
    return {"count": len(conflicts), "conflicts": conflicts}


@app.get("/api/analytics")
def analytics():
    return get_store().analytics()


@app.get("/api/alerts")
def list_alerts(
    severity: Optional[str] = Query(default=None),
    unread_only: bool = Query(default=False),
    type: Optional[str] = Query(default=None),
):
    alerts = get_store().alerts()
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity.upper()]
    if type:
        alerts = [a for a in alerts if a["type"] == type.upper()]
    if unread_only:
        alerts = [a for a in alerts if not a.get("read")]
    return {"count": len(alerts), "alerts": alerts}


@app.post("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: str):
    return get_store().mark_alert(alert_id, read=True)


@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    return get_store().mark_alert(alert_id, read=True, acknowledged=True)


@app.get("/api/reports")
def reports():
    return get_store().reports()


@app.get("/api/reports/export.csv")
def export_reports_csv():
    store = get_store()
    recs = [r for r in store.list_recommendations() if r["type"] == "SCHEDULE_BLOCK"]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "block_id", "status", "start_time", "end_time", "duration_minutes", "fused",
            "task_ids", "departments", "sections", "stations", "priority_score", "priority_class",
            "recommendation_score", "feasibility_score", "soft_conflicts",
        ]
    )
    for r in recs:
        block = r["block"]
        writer.writerow(
            [
                r["recommendation_id"], r["status"], block["start_time"], block["end_time"],
                block["duration_minutes"], block["fused"], "|".join(r["task_ids"]),
                "|".join(block["departments"]), "|".join(block["sections"]), "|".join(block["stations"]),
                r["priority_score"], r["priority_class"], r["recommendation_score"], r["feasibility_score"],
                len(r["risk_conflicts"]),
            ]
        )
    writer.writerow([])
    writer.writerow(["-- Unscheduled tasks --"])
    writer.writerow(["task_id", "priority_score", "priority_class", "reason"])
    for r in store.list_recommendations():
        if r["type"] == "DEFER_TASK":
            writer.writerow([r["task_ids"][0], r["priority_score"], r["priority_class"], r["reason"]])

    return PlainTextResponse(
        buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=block_plan_report.csv"},
    )


# ---------------------------------------------------------------------------
# Frontend static files (served from the same origin - no CORS needed)
# ---------------------------------------------------------------------------

if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.api.app:app", host="127.0.0.1", port=8000, reload=False)
