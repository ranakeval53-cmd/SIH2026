// Thin fetch wrapper over the backend REST API. No hardcoded dashboard
// values live here or anywhere in the frontend - every screen renders
// whatever these calls return.
const Api = (() => {
  async function req(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    if (!res.ok) {
      const err = new Error((body && (body.detail?.error || body.detail)) || `Request failed (${res.status})`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  return {
    dashboardSummary: () => req("/api/dashboard/summary"),
    recompute: () => req("/api/system/recompute", { method: "POST" }),

    listTasks: (params = {}) => req(`/api/tasks?${new URLSearchParams(params)}`),
    getTask: (id) => req(`/api/tasks/${encodeURIComponent(id)}`),

    listRecommendations: (params = {}) => req(`/api/recommendations?${new URLSearchParams(params)}`),
    getRecommendation: (id) => req(`/api/recommendations/${encodeURIComponent(id)}`),
    approve: (id, note) => req(`/api/recommendations/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify({ note }) }),
    edit: (id, payload) => req(`/api/recommendations/${encodeURIComponent(id)}/edit`, { method: "POST", body: JSON.stringify(payload) }),
    reject: (id, reason, note) => req(`/api/recommendations/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({ reason, note }) }),
    rejectionReasons: () => req("/api/rejection-reasons"),

    listBlocks: (params = {}) => req(`/api/blocks?${new URLSearchParams(params)}`),
    getBlock: (id) => req(`/api/blocks/${encodeURIComponent(id)}`),

    listConflicts: () => req("/api/conflicts"),
    analytics: () => req("/api/analytics"),

    listAlerts: (params = {}) => req(`/api/alerts?${new URLSearchParams(params)}`),
    markAlertRead: (id) => req(`/api/alerts/${encodeURIComponent(id)}/read`, { method: "POST" }),
    acknowledgeAlert: (id) => req(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),

    reports: () => req("/api/reports"),
    exportCsvUrl: () => "/api/reports/export.csv",
  };
})();
