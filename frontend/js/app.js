// Main application: navigation, view rendering, human-in-the-loop actions,
// lightweight polling refresh. Every value shown comes from the backend API
// (backend/app/api/app.py) - nothing here is hardcoded sample data.

const VIEWS = ["dashboard", "planner", "recommendations", "tasks", "conflicts", "analytics", "reports"];
let currentView = "dashboard";
let pollHandle = null;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });
  document.getElementById("alert-bell").addEventListener("click", () => showView("conflicts"));
  document.getElementById("recompute-btn").addEventListener("click", onRecompute);

  showView("dashboard");
  refreshTopbar();
  pollHandle = setInterval(refreshTopbar, 15000);
});

function showView(name) {
  currentView = name;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === name));
  renderView(name);
}

function refreshCurrentView() {
  renderView(currentView);
  refreshTopbar();
}

function renderView(name) {
  const fn = { dashboard: renderDashboard, planner: renderPlanner, recommendations: renderRecommendations,
    tasks: renderTasks, conflicts: renderConflicts, analytics: renderAnalytics, reports: renderReports }[name];
  if (fn) fn();
}

async function onRecompute() {
  const btn = document.getElementById("recompute-btn");
  btn.disabled = true;
  btn.textContent = "Recomputing...";
  try {
    await Api.recompute();
    UI.toast("AI Scheduling Engine re-run against data/processed/.", { title: "Recomputed", type: "success" });
    refreshCurrentView();
  } catch (e) {
    UI.toast(e.message, { title: "Recompute failed", type: "error" });
  } finally {
    btn.disabled = false;
    btn.textContent = "↻ Recompute Plan";
  }
}

async function refreshTopbar() {
  try {
    const [summary, alerts] = await Promise.all([Api.dashboardSummary(), Api.listAlerts({ unread_only: "true" })]);
    document.getElementById("opt-status-pill").innerHTML =
      `<span class="status-dot ${summary.optimizer_status === "OPTIMAL" || summary.optimizer_status === "FEASIBLE" ? "" : "bad"}"></span>Optimizer: ${summary.optimizer_status}`;
    document.getElementById("val-status-pill").innerHTML =
      `<span class="status-dot ${summary.validation_status === "APPROVED" ? "" : "bad"}"></span>Validation: ${summary.validation_status}`;
    const count = alerts.count;
    const dotCount = document.getElementById("alert-dot-count");
    if (count > 0) {
      dotCount.style.display = "flex";
      dotCount.textContent = count > 99 ? "99+" : count;
    } else {
      dotCount.style.display = "none";
    }
    document.getElementById("last-updated").textContent = `Plan generated ${new Date(summary.generated_at_utc).toLocaleString()}`;
  } catch (e) {
    /* topbar refresh failures should not break navigation */
  }
}

function fmtErr(e) {
  const v = e.body?.detail?.violations?.[0];
  if (v) return `${v.type || "Conflict"}: ${v.reason || JSON.stringify(v)}`;
  return e.body?.detail?.error || e.message;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

async function renderDashboard() {
  const root = document.getElementById("dashboard-root");
  UI.loading(root);
  try {
    const [summary, recs, alerts] = await Promise.all([
      Api.dashboardSummary(),
      Api.listRecommendations({ status: "PENDING_REVIEW" }),
      Api.listAlerts(),
    ]);

    const stat = (label, value, sub, cls = "") =>
      `<div class="card"><div class="card-title">${label}</div><div class="stat-value ${cls}">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ""}</div>`;

    root.innerHTML = `
      <div class="grid cols-4" style="margin-bottom:14px;">
        ${stat("Total Maintenance Tasks", summary.total_maintenance_tasks)}
        ${stat("Critical / High Priority", summary.critical_high_priority_tasks, null, "critical")}
        ${stat("AI Recommended Blocks", summary.recommended_blocks, `${summary.fused_block_count} fused (saved ${summary.blocks_saved_by_fusion} blocks)`)}
        ${stat("Pending Approvals", summary.pending_approvals, null, "high")}
      </div>
      <div class="grid cols-4" style="margin-bottom:14px;">
        ${stat("Approved Blocks", summary.approved_blocks, `${summary.edited_blocks} edited · ${summary.rejected_blocks} rejected`, "good")}
        ${stat("Conflicts / Alerts", `${summary.active_conflicts} / ${summary.active_alerts}`, "unacknowledged alerts", "critical")}
        ${stat("Asset Availability (Approved)", `${summary.asset_availability_pct}%`, `AI-proposed: ${summary.ai_proposed_completion_pct}%`, "accent")}
        ${stat("Unscheduled Tasks", summary.unscheduled_tasks, "returned to planning queue", summary.unscheduled_tasks ? "high" : "good")}
      </div>
      <div class="grid cols-2">
        <div class="card">
          <div class="panel-title-row"><h2>Pending AI Recommendations</h2><span class="muted">${recs.count} awaiting review</span></div>
          <div id="dash-pending-list"></div>
        </div>
        <div class="card">
          <div class="panel-title-row"><h2>Top Alerts</h2><span class="muted">${alerts.count} total</span></div>
          <div id="dash-alerts-list"></div>
        </div>
      </div>`;

    const pendingList = document.getElementById("dash-pending-list");
    if (!recs.recommendations.length) {
      UI.empty(pendingList, "No recommendations pending review.");
    } else {
      pendingList.innerHTML = recs.recommendations
        .slice(0, 6)
        .map(
          (r) => `<div class="card tight" style="margin-bottom:8px; cursor:pointer;" data-open-rec="${r.recommendation_id}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div><strong>${r.recommendation_id}</strong> <span class="muted">· score ${r.recommendation_score}</span></div>
              ${UI.badge(r.priority_class, r.priority_class)}
            </div>
            <div class="muted" style="font-size:11.5px; margin-top:4px;">${r.recommended_action}</div>
          </div>`
        )
        .join("");
      pendingList.querySelectorAll("[data-open-rec]").forEach((n) => n.addEventListener("click", () => openRecommendationDrawer(n.dataset.openRec)));
    }

    const alertsList = document.getElementById("dash-alerts-list");
    if (!alerts.alerts.length) {
      UI.empty(alertsList, "No active alerts.");
    } else {
      alertsList.innerHTML = alerts.alerts
        .slice(0, 6)
        .map(
          (a) => `<div class="card tight" style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div>${UI.severityDot(a.severity)}<strong>${a.type.replaceAll("_", " ")}</strong></div>
              ${UI.badge(a.severity, a.severity)}
            </div>
            <div class="muted" style="font-size:11.5px; margin-top:4px;">${UI.escapeHtml(a.message)}</div>
          </div>`
        )
        .join("");
    }
  } catch (e) {
    UI.errorBox(root, e);
  }
}

// ---------------------------------------------------------------------------
// Planner / Block Plan (timeline + table)
// ---------------------------------------------------------------------------

function labelToMinutes(label) {
  const [d, t] = label.split(" ");
  const day = parseInt(d.slice(1), 10);
  const [hh, mm] = t.split(":").map(Number);
  return (day - 1) * 1440 + hh * 60 + mm;
}

async function renderPlanner() {
  const timelineRoot = document.getElementById("planner-timeline-root");
  const tableRoot = document.getElementById("planner-table-root");
  UI.loading(timelineRoot);
  tableRoot.innerHTML = "";
  try {
    const { blocks } = await Api.listBlocks();
    if (!blocks.length) {
      UI.empty(timelineRoot, "No blocks in the current plan.");
      return;
    }
    const horizonHours = 48;
    const pxPerHour = 28;
    let ruler = "";
    for (let h = 0; h < horizonHours; h++) ruler += `<span>${h % 24 === 0 ? `D${h / 24 + 1} ` : ""}${String(h % 24).padStart(2, "0")}:00</span>`;

    const rows = blocks
      .map((b) => {
        const start = labelToMinutes(b.start_time);
        const end = labelToMinutes(b.end_time);
        const left = (start / 60) * pxPerHour;
        const width = Math.max(4, ((end - start) / 60) * pxPerHour);
        const label = `${b.block_id} (${b.tasks.length} task${b.tasks.length > 1 ? "s" : ""})`;
        return `<div class="timeline-row">
          <div class="timeline-row-label mono">${b.block_id} <span class="faint">${b.sections.join(", ")}</span></div>
          <div class="timeline-track">
            <div class="timeline-block status-${b.recommendation_status}" style="left:${left}px; width:${width}px;" data-open-rec="${b.block_id}" title="${b.start_time} → ${b.end_time}">${label}</div>
          </div>
        </div>`;
      })
      .join("");

    timelineRoot.innerHTML = `<div class="timeline-wrap"><div class="timeline">
      <div class="timeline-ruler"><div class="timeline-row-label"></div>${ruler}</div>
      ${rows}
    </div></div>
    <div class="chart-legend" style="margin-top:10px;">
      ${["PENDING_REVIEW", "APPROVED", "EDITED", "REJECTED"].map((s) => `<div class="legend-item"><span class="legend-swatch" style="background:var(--${s === "PENDING_REVIEW" ? "pending" : s.toLowerCase()})"></span>${s.replaceAll("_", " ")}</div>`).join("")}
    </div>`;

    tableRoot.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Block</th><th>Status</th><th>Start</th><th>End</th><th>Duration</th><th>Section(s)</th><th>Station(s)</th><th>Tasks</th><th>Dept.</th><th>Priority</th><th>Fused</th></tr></thead>
      <tbody>${blocks
        .map(
          (b) => `<tr data-open-rec="${b.block_id}">
        <td class="mono">${b.block_id}</td>
        <td>${UI.badge(b.recommendation_status.replaceAll("_", " "), b.recommendation_status)}</td>
        <td>${b.start_time}</td><td>${b.end_time}</td><td>${b.duration_minutes} min</td>
        <td>${b.sections.join(", ")}</td><td>${b.stations.join(", ")}</td>
        <td>${b.tasks.map((t) => t.task_id).join(", ")}</td>
        <td>${b.departments.join(", ")}</td>
        <td>${UI.badge(b.priority_class, b.priority_class)}</td>
        <td>${b.fused ? "Yes" : "No"}</td>
      </tr>`
        )
        .join("")}</tbody></table></div>`;

    document.querySelectorAll("[data-open-rec]").forEach((n) => n.addEventListener("click", () => openRecommendationDrawer(n.dataset.openRec)));
  } catch (e) {
    UI.errorBox(timelineRoot, e);
  }
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

async function renderRecommendations() {
  const filtersRoot = document.getElementById("rec-filters");
  const root = document.getElementById("recommendations-root");
  filtersRoot.innerHTML = `
    <select id="rec-status-filter">
      <option value="">All statuses</option>
      ${["PENDING_REVIEW", "APPROVED", "EDITED", "REJECTED", "UNSCHEDULED"].map((s) => `<option value="${s}">${s.replaceAll("_", " ")}</option>`).join("")}
    </select>
    <select id="rec-type-filter">
      <option value="">All types</option>
      <option value="SCHEDULE_BLOCK">Proposed Blocks</option>
      <option value="DEFER_TASK">Deferred Tasks</option>
    </select>`;
  document.getElementById("rec-status-filter").onchange = loadRecs;
  document.getElementById("rec-type-filter").onchange = loadRecs;

  await loadRecs();

  async function loadRecs() {
    UI.loading(root);
    try {
      const params = {};
      const status = document.getElementById("rec-status-filter").value;
      const type = document.getElementById("rec-type-filter").value;
      if (status) params.status = status;
      if (type) params.type = type;
      const { recommendations } = await Api.listRecommendations(params);
      if (!recommendations.length) return UI.empty(root, "No recommendations match this filter.");
      root.innerHTML = `<div class="grid cols-2">${recommendations.map(recommendationCardHtml).join("")}</div>`;
      wireRecommendationCards(root);
    } catch (e) {
      UI.errorBox(root, e);
    }
  }
}

function recommendationCardHtml(r) {
  return `<div class="card">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
      <div>
        <div style="font-weight:800; font-size:13.5px;">${r.recommendation_id} <span class="faint">· ${r.type === "SCHEDULE_BLOCK" ? "Proposed Block" : "Deferred Task"}</span></div>
        <div class="muted" style="margin-top:2px; font-size:12px;">${r.recommended_action}</div>
      </div>
      <div style="text-align:right;">
        ${UI.badge(r.status.replaceAll("_", " "), r.status)}
        <div class="mono" style="margin-top:6px; font-size:11.5px;">rec ${r.recommendation_score} · feas ${r.feasibility_score}</div>
      </div>
    </div>
    <p style="font-size:12.3px; color:var(--text-dim); margin:10px 0; line-height:1.5;">${UI.escapeHtml(r.reason)}</p>
    <div class="pill-list">
      ${r.affected_section.filter(Boolean).map((s) => `<span class="pill">${s}</span>`).join("")}
      ${r.affected_trains.map((t) => `<span class="pill">train ${t}</span>`).join("")}
      ${!r.affected_trains.length ? `<span class="pill">conflict-free</span>` : ""}
    </div>
    <div class="btn-row" style="margin-top:12px;">
      <button class="btn sm ghost" data-act="view" data-id="${r.recommendation_id}">Details</button>
      ${r.type === "SCHEDULE_BLOCK" && r.status !== "REJECTED"
        ? `<button class="btn sm success" data-act="approve" data-id="${r.recommendation_id}">Approve</button>
           <button class="btn sm" data-act="edit" data-id="${r.recommendation_id}">Edit</button>
           <button class="btn sm danger" data-act="reject" data-id="${r.recommendation_id}">Reject</button>`
        : ""}
    </div>
  </div>`;
}

function wireRecommendationCards(root) {
  root.querySelectorAll('[data-act="view"]').forEach((b) => (b.onclick = () => openRecommendationDrawer(b.dataset.id)));
  root.querySelectorAll('[data-act="approve"]').forEach((b) => (b.onclick = () => doApprove(b.dataset.id)));
  root.querySelectorAll('[data-act="edit"]').forEach((b) => (b.onclick = () => doEdit(b.dataset.id)));
  root.querySelectorAll('[data-act="reject"]').forEach((b) => (b.onclick = () => doReject(b.dataset.id)));
}

// -- recommendation detail drawer --

async function openRecommendationDrawer(recId) {
  const overlay = UI.openDrawer(`<div class="drawer-body"><div class="spinner" style="margin-top:60px;"></div></div>`);
  try {
    const r = await Api.getRecommendation(recId);
    const b = r.block;
    overlay.querySelector(".drawer").innerHTML = `
      <div class="drawer-header">
        <div>
          <h2>${r.recommendation_id}</h2>
          <div class="muted">${r.type === "SCHEDULE_BLOCK" ? "AI-Recommended Maintenance Block" : "Deferred Task"} · ${UI.badge(r.status.replaceAll("_", " "), r.status)}</div>
        </div>
        <button class="close-x" data-act="close">&times;</button>
      </div>
      <div class="drawer-body">
        <div class="section-block">
          <h4>Recommendation</h4>
          ${UI.kv([
            ["Action", r.recommended_action],
            ["Recommendation score", `${r.recommendation_score} / 100`],
            ["Feasibility score", `${r.feasibility_score} / 100`],
            ["Priority", `${UI.badge(r.priority_class, r.priority_class)} (${r.priority_score})`],
          ])}
          <p style="font-size:12.8px; color:var(--text-dim); line-height:1.6; margin-top:10px;">${UI.escapeHtml(r.reason)}</p>
        </div>
        ${b ? `<div class="section-block">
          <h4>Block window</h4>
          ${UI.kv([
            ["Start → End", `${b.start_time} → ${b.end_time}`],
            ["Duration", `${b.duration_minutes} min`],
            ["Fused", b.fused ? "Yes" : "No"],
            ["Section(s)", b.sections.join(", ")],
            ["Station(s)", b.stations.join(", ")],
            ["Department(s)", b.departments.join(", ")],
          ])}
        </div>
        <div class="section-block">
          <h4>Tasks in this block</h4>
          <div class="table-wrap"><table class="data"><thead><tr><th>Task</th><th>Name</th><th>Window</th><th>Priority</th></tr></thead>
          <tbody>${b.tasks.map((t) => `<tr><td class="mono">${t.task_id}</td><td>${UI.escapeHtml(t.task_name)}</td><td>${t.start_time} → ${t.end_time}</td><td>${UI.badge(t.priority_class, t.priority_class)}</td></tr>`).join("")}</tbody></table></div>
        </div>` : ""}
        <div class="section-block">
          <h4>Expected benefit</h4>
          <p style="font-size:12.8px; color:var(--text-dim);">${UI.escapeHtml(r.expected_benefit)}</p>
        </div>
        <div class="section-block">
          <h4>Risk / conflicts (${r.risk_conflicts.length})</h4>
          ${r.risk_conflicts.length
            ? r.risk_conflicts.map((c) => `<div class="card tight" style="margin-bottom:6px;">${UI.badge(c.severity, c.severity)} <span class="muted" style="font-size:12px;">${UI.escapeHtml(c.reason || "")}</span></div>`).join("")
            : `<p class="muted" style="font-size:12.3px;">No conflicts - clean, hard-constraint-free window.</p>`}
        </div>
        <div class="section-block">
          <h4>Audit trail</h4>
          ${r.audit && r.audit.length
            ? `<div class="table-wrap"><table class="data"><thead><tr><th>Action</th><th>When</th><th>Notes</th></tr></thead>
               <tbody>${r.audit.map((a) => `<tr><td>${a.action}</td><td class="mono">${new Date(a.timestamp).toLocaleString()}</td><td>${UI.escapeHtml(a.reason || a.note || "")}</td></tr>`).join("")}</tbody></table></div>`
            : `<p class="muted" style="font-size:12.3px;">No planner action yet - AI RECOMMENDED → PENDING REVIEW.</p>`}
        </div>
      </div>
      <div class="drawer-footer">
        ${r.type === "SCHEDULE_BLOCK" && r.status !== "REJECTED"
          ? `<button class="btn danger" data-act="reject">Reject</button>
             <button class="btn" data-act="edit">Edit</button>
             <button class="btn success" data-act="approve">Approve</button>`
          : `<button class="btn ghost" data-act="close">Close</button>`}
      </div>`;
    overlay.querySelectorAll('[data-act="close"]').forEach((b) => (b.onclick = UI.closeOverlay));
    const approveBtn = overlay.querySelector('[data-act="approve"]');
    if (approveBtn) approveBtn.onclick = () => doApprove(r.recommendation_id);
    const editBtn = overlay.querySelector('[data-act="edit"]');
    if (editBtn) editBtn.onclick = () => doEdit(r.recommendation_id);
    const rejectBtn = overlay.querySelector('[data-act="reject"]');
    if (rejectBtn) rejectBtn.onclick = () => doReject(r.recommendation_id);
  } catch (e) {
    overlay.querySelector(".drawer").innerHTML = `<div class="drawer-body"></div>`;
    UI.errorBox(overlay.querySelector(".drawer-body"), e);
  }
}

// -- approve / edit / reject actions --

function doApprove(recId) {
  UI.confirmDialog({
    title: `Approve ${recId}?`,
    message: "The backend will re-validate this block against every currently active block (train, track, resource, and infrastructure conflicts) before marking it APPROVED.",
    confirmLabel: "Approve",
    confirmClass: "success",
    onConfirm: async () => {
      try {
        await Api.approve(recId);
        UI.closeOverlay();
        UI.toast(`${recId} approved after re-validation.`, { title: "Approved", type: "success" });
        refreshCurrentView();
      } catch (e) {
        UI.toast(fmtErr(e), { title: "Approval blocked", type: "error" });
      }
    },
  });
}

async function doReject(recId) {
  const { reasons } = await Api.rejectionReasons();
  const overlay = UI.openDialog(`
    <h3>Reject ${recId}</h3>
    <div class="field"><label>Reason</label>
      <select id="reject-reason">${reasons.map((r) => `<option>${UI.escapeHtml(r)}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Notes (optional)</label><textarea id="reject-note" placeholder="Additional context for the audit trail..."></textarea></div>
    <div class="btn-row">
      <button class="btn ghost" data-act="cancel">Cancel</button>
      <button class="btn danger" data-act="confirm">Reject Block</button>
    </div>`);
  overlay.querySelector('[data-act="cancel"]').onclick = UI.closeOverlay;
  overlay.querySelector('[data-act="confirm"]').onclick = async () => {
    try {
      await Api.reject(recId, overlay.querySelector("#reject-reason").value, overlay.querySelector("#reject-note").value);
      UI.closeOverlay();
      UI.toast(`${recId} rejected; its task(s) returned to the planning queue.`, { title: "Rejected", type: "success" });
      refreshCurrentView();
    } catch (e) {
      UI.toast(fmtErr(e), { title: "Rejection failed", type: "error" });
    }
  };
}

async function doEdit(recId) {
  const r = await Api.getRecommendation(recId);
  const block = r.block;
  const overlay = UI.openDialog(`
    <h3>Edit ${recId}</h3>
    <div class="field"><label>New start (minutes from horizon start)</label>
      <input type="number" id="edit-start" min="0" placeholder="Current: ${labelToMinutes(block.start_time)}">
      <div class="hint">Current window: ${block.start_time} → ${block.end_time}. Leave blank to keep the current start time.</div>
    </div>
    ${block.tasks.length > 1
      ? `<div class="field"><label>Tasks in this block</label>
        ${block.tasks.map((t) => `<label style="display:flex; gap:8px; align-items:center; margin-bottom:6px; font-size:12.5px;"><input type="checkbox" checked data-task="${t.task_id}"> ${t.task_id} — ${UI.escapeHtml(t.task_name)}</label>`).join("")}
        <div class="hint">Unchecking a task removes it from this block; it returns to the planning queue.</div></div>`
      : ""}
    <div class="field"><label>Notes (optional)</label><textarea id="edit-note"></textarea></div>
    <div class="btn-row">
      <button class="btn ghost" data-act="cancel">Cancel</button>
      <button class="btn primary" data-act="confirm">Save & Revalidate</button>
    </div>`);
  overlay.querySelector('[data-act="cancel"]').onclick = UI.closeOverlay;
  overlay.querySelector('[data-act="confirm"]').onclick = async () => {
    const startVal = overlay.querySelector("#edit-start").value;
    const removeIds = block.tasks.length > 1
      ? block.tasks.filter((t) => !overlay.querySelector(`[data-task="${t.task_id}"]`).checked).map((t) => t.task_id)
      : [];
    try {
      await Api.edit(recId, { new_start_minute: startVal === "" ? null : parseInt(startVal, 10), remove_task_ids: removeIds, note: overlay.querySelector("#edit-note").value });
      UI.closeOverlay();
      UI.toast(`${recId} edited and passed re-validation.`, { title: "Edited", type: "success" });
      refreshCurrentView();
    } catch (e) {
      UI.toast(fmtErr(e), { title: "Edit blocked", type: "error" });
    }
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

async function renderTasks() {
  const filtersRoot = document.getElementById("task-filters");
  const root = document.getElementById("tasks-root");
  filtersRoot.innerHTML = `
    <input type="text" id="task-search" placeholder="Search task id / name..." />
    <select id="task-priority"><option value="">All priorities</option>${["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => `<option>${p}</option>`).join("")}</select>
    <select id="task-department"><option value="">All departments</option><option value="TMS">TMS</option><option value="SMMS">SMMS</option><option value="TDMS">TDMS</option></select>
    <select id="task-status"><option value="">All statuses</option>${["PENDING_REVIEW", "APPROVED", "EDITED", "REJECTED", "UNSCHEDULED"].map((s) => `<option value="${s}">${s.replaceAll("_", " ")}</option>`).join("")}</select>
    <span class="spacer"></span>
    <span class="muted" id="task-count"></span>`;

  let debounce;
  ["task-search", "task-priority", "task-department", "task-status"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "task-search" ? "input" : "change", () => {
      clearTimeout(debounce);
      debounce = setTimeout(loadTasks, 200);
    });
  });

  await loadTasks();

  async function loadTasks() {
    UI.loading(root);
    try {
      const params = {};
      const search = document.getElementById("task-search").value;
      const priority = document.getElementById("task-priority").value;
      const department = document.getElementById("task-department").value;
      const status = document.getElementById("task-status").value;
      if (search) params.search = search;
      if (priority) params.priority = priority;
      if (department) params.department = department;
      if (status) params.status = status;

      const { tasks, count } = await Api.listTasks(params);
      document.getElementById("task-count").textContent = `${count} task(s)`;
      if (!tasks.length) return UI.empty(root, "No tasks match this filter.");

      root.innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr><th>Task</th><th>Name</th><th>Dept.</th><th>Category</th><th>Section</th><th>Station</th><th>Duration</th><th>Priority</th><th>Status</th><th>Block</th></tr></thead>
        <tbody>${tasks
          .map(
            (t) => `<tr data-task-id="${t.task_id}">
          <td class="mono">${t.task_id}</td><td>${UI.escapeHtml(t.task_name || "")}</td><td>${t.department}</td>
          <td class="faint">${t.task_category || ""}</td><td>${t.section_id || ""}</td><td>${t.station_code || ""}</td>
          <td>${t.required_duration_mins} min</td>
          <td>${UI.badge(t.priority_class, t.priority_class)}</td>
          <td>${UI.badge((t.status || "UNKNOWN").replaceAll("_", " "), t.status)}</td>
          <td class="mono">${t.block_id || "-"}</td>
        </tr>`
          )
          .join("")}</tbody></table></div>`;

      root.querySelectorAll("[data-task-id]").forEach((row) =>
        row.addEventListener("click", () => {
          const blockId = row.dataset.taskId && tasks.find((t) => t.task_id === row.dataset.taskId)?.block_id;
          if (blockId) openRecommendationDrawer(blockId);
          else openRecommendationDrawer(`DEFER_${row.dataset.taskId}`);
        })
      );
    } catch (e) {
      UI.errorBox(root, e);
    }
  }
}

// ---------------------------------------------------------------------------
// Conflicts & Alerts
// ---------------------------------------------------------------------------

async function renderConflicts() {
  const conflictsRoot = document.getElementById("conflicts-root");
  const alertsRoot = document.getElementById("alerts-root");
  UI.loading(conflictsRoot);
  UI.loading(alertsRoot);
  try {
    const [{ conflicts }, { alerts }] = await Promise.all([Api.listConflicts(), Api.listAlerts()]);

    if (!conflicts.length) UI.empty(conflictsRoot, "No active conflicts detected.");
    else
      conflictsRoot.innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr><th>Type</th><th>Severity</th><th>Task(s)</th><th>Train</th><th>Explanation</th><th>Suggested window</th></tr></thead>
        <tbody>${conflicts
          .map(
            (c) => `<tr>
          <td>${c.type}</td><td>${UI.badge(c.severity, c.severity)}</td>
          <td class="mono">${[c.task_a || c.task_id, c.task_b].filter(Boolean).join(" / ")}</td>
          <td>${c.train_no || "-"}</td>
          <td style="max-width:340px;" class="muted">${UI.escapeHtml(c.reason || "")}</td>
          <td>${c.suggested_alternative_window ? `${c.suggested_alternative_window.start_time} → ${c.suggested_alternative_window.end_time}` : "-"}</td>
        </tr>`
          )
          .join("")}</tbody></table></div>`;

    if (!alerts.length) UI.empty(alertsRoot, "No alerts.");
    else
      alertsRoot.innerHTML = alerts
        .map(
          (a) => `<div class="card tight" style="margin-bottom:8px; ${a.acknowledged ? "opacity:.55;" : ""}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>${UI.severityDot(a.severity)}<strong>${a.type.replaceAll("_", " ")}</strong></div>
          ${UI.badge(a.severity, a.severity)}
        </div>
        <div class="muted" style="font-size:12px; margin:5px 0 8px 0;">${UI.escapeHtml(a.message)}</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="faint" style="font-size:10.5px;">${new Date(a.timestamp).toLocaleString()}</span>
          <div class="btn-row">
            ${a.related_id ? `<button class="btn sm ghost" data-open="${a.related_id}">Open</button>` : ""}
            ${!a.read ? `<button class="btn sm ghost" data-read="${a.alert_id}">Mark read</button>` : ""}
            ${!a.acknowledged ? `<button class="btn sm" data-ack="${a.alert_id}">Acknowledge</button>` : ""}
          </div>
        </div>
      </div>`
        )
        .join("");

    alertsRoot.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openRecommendationDrawer(b.dataset.open.startsWith("BLK_") ? b.dataset.open : `DEFER_${b.dataset.open}`)));
    alertsRoot.querySelectorAll("[data-read]").forEach((b) => (b.onclick = async () => { await Api.markAlertRead(b.dataset.read); renderConflicts(); refreshTopbar(); }));
    alertsRoot.querySelectorAll("[data-ack]").forEach((b) => (b.onclick = async () => { await Api.acknowledgeAlert(b.dataset.ack); renderConflicts(); refreshTopbar(); }));
  } catch (e) {
    UI.errorBox(conflictsRoot, e);
    UI.errorBox(alertsRoot, e);
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

async function renderAnalytics() {
  const root = document.getElementById("analytics-root");
  UI.loading(root);
  try {
    const a = await Api.analytics();
    root.innerHTML = `
      <div class="grid cols-2">
        <div class="card chart-card"><div class="card-title">Maintenance by Department</div><div id="chart-dept"></div></div>
        <div class="card chart-card"><div class="card-title">Priority Distribution</div><div id="chart-priority"></div></div>
        <div class="card chart-card"><div class="card-title">Blocks by Status</div><div id="chart-status"></div></div>
        <div class="card chart-card"><div class="card-title">Asset Availability - Before vs After</div><div id="chart-availability"></div></div>
        <div class="card chart-card"><div class="card-title">Train Impact (soft conflicts accepted)</div><div id="chart-trains"></div></div>
        <div class="card chart-card"><div class="card-title">Conflicts by Type</div><div id="chart-conflicts"></div></div>
        <div class="card chart-card"><div class="card-title">Completed vs Unscheduled Tasks</div><div id="chart-completed"></div></div>
        <div class="card chart-card"><div class="card-title">Block Utilization of Planning Horizon</div><div id="chart-utilization"></div></div>
      </div>`;

    Charts.bar(document.getElementById("chart-dept"), { labels: Object.keys(a.maintenance_by_department), values: Object.values(a.maintenance_by_department) });
    Charts.donut(document.getElementById("chart-priority"), { labels: Object.keys(a.priority_distribution), values: Object.values(a.priority_distribution) });
    Charts.donut(document.getElementById("chart-status"), { labels: Object.keys(a.blocks_by_status), values: Object.values(a.blocks_by_status) });
    Charts.beforeAfter(document.getElementById("chart-availability"), {
      beforeLabel: "Before (nothing approved)", afterLabel: "After (planner-approved)",
      beforeVal: a.asset_availability_before_after.before_pct, afterVal: a.asset_availability_before_after.planner_approved_after_pct,
    });
    const trainLabels = Object.keys(a.train_impact);
    if (trainLabels.length) Charts.hbar(document.getElementById("chart-trains"), { labels: trainLabels, values: Object.values(a.train_impact) });
    else UI.empty(document.getElementById("chart-trains"), "No trains affected - all approved windows are conflict-free.");
    const conflictLabels = Object.keys(a.conflicts_by_type);
    if (conflictLabels.length) Charts.bar(document.getElementById("chart-conflicts"), { labels: conflictLabels, values: Object.values(a.conflicts_by_type) });
    else UI.empty(document.getElementById("chart-conflicts"), "No structural conflicts recorded.");
    Charts.donut(document.getElementById("chart-completed"), { labels: ["Scheduled", "Unscheduled"], values: [a.completed_vs_unscheduled.scheduled, a.completed_vs_unscheduled.unscheduled], colors: ["#37d67a", "#93a2c2"] });
    document.getElementById("chart-utilization").innerHTML = `<div style="text-align:center; padding:20px 0;"><div style="font-size:42px; font-weight:800; color:var(--accent);">${a.block_utilization_pct}%</div><div class="muted">of the ${48}-hour planning horizon is occupied by scheduled maintenance blocks</div></div>`;
  } catch (e) {
    UI.errorBox(root, e);
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

async function renderReports() {
  const root = document.getElementById("reports-root");
  UI.loading(root);
  try {
    const r = await Api.reports();
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:16px;">
        <a class="btn primary" href="${Api.exportCsvUrl()}" download>⬇ Export CSV</a>
        <button class="btn" id="print-btn">🖨 Export PDF (Print)</button>
      </div>
      <div class="card" style="margin-bottom:14px;">
        <div class="card-title">Report generated</div>
        <div>${new Date(r.generated_at_utc).toLocaleString()} · ${r.team} · PS ${r.problem_statement_id}</div>
      </div>
      <div class="grid cols-3" style="margin-bottom:14px;">
        ${Object.entries(r.maintenance_summary).slice(0, 6).map(([k, v]) => `<div class="card tight"><div class="card-title">${k.replaceAll("_", " ")}</div><div class="stat-value" style="font-size:18px;">${typeof v === "object" ? JSON.stringify(v) : v}</div></div>`).join("")}
      </div>
      <div class="card" style="margin-bottom:14px;">
        <div class="panel-title-row"><h2>Block Plan</h2></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Block</th><th>Start</th><th>End</th><th>Duration</th><th>Section(s)</th><th>Dept.</th><th>Tasks</th></tr></thead>
        <tbody>${r.block_plan.map((b) => `<tr><td class="mono">${b.block_id}</td><td>${b.start_time}</td><td>${b.end_time}</td><td>${b.duration_minutes}m</td><td>${b.sections.join(", ")}</td><td>${b.departments.join(", ")}</td><td>${b.tasks.map((t) => t.task_id).join(", ")}</td></tr>`).join("")}</tbody></table></div>
      </div>
      <div class="grid cols-2" style="margin-bottom:14px;">
        <div class="card">
          <div class="panel-title-row"><h2>Department Summary</h2></div>
          ${Object.entries(r.department_summary).map(([d, ids]) => `<div class="kv"><div class="k">${d}</div><div>${ids.length} block(s): ${ids.join(", ")}</div></div>`).join("") || '<p class="muted">No data.</p>'}
        </div>
        <div class="card">
          <div class="panel-title-row"><h2>Planner Decisions</h2></div>
          ${r.planner_decisions.length
            ? `<div class="table-wrap"><table class="data"><thead><tr><th>Block</th><th>Status</th><th>Last action</th></tr></thead>
               <tbody>${r.planner_decisions.map((d) => `<tr><td class="mono">${d.recommendation_id}</td><td>${UI.badge(d.status.replaceAll("_", " "), d.status)}</td><td class="muted">${d.audit.length ? d.audit[d.audit.length - 1].action + " @ " + new Date(d.audit[d.audit.length - 1].timestamp).toLocaleString() : "-"}</td></tr>`).join("")}</tbody></table></div>`
            : '<p class="muted">No planner decisions recorded yet.</p>'}
        </div>
      </div>
      <div class="card">
        <div class="panel-title-row"><h2>Unscheduled Tasks (${r.unscheduled_tasks.length})</h2></div>
        ${r.unscheduled_tasks.length
          ? `<div class="table-wrap"><table class="data"><thead><tr><th>Task</th><th>Priority</th><th>Reason</th></tr></thead>
             <tbody>${r.unscheduled_tasks.map((t) => `<tr><td class="mono">${t.task_ids[0]}</td><td>${UI.badge(t.priority_class, t.priority_class)}</td><td class="muted">${UI.escapeHtml(t.reason)}</td></tr>`).join("")}</tbody></table></div>`
          : '<p class="muted">All tasks are currently scheduled.</p>'}
      </div>`;
    document.getElementById("print-btn").onclick = () => window.print();
  } catch (e) {
    UI.errorBox(root, e);
  }
}
