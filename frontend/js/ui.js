// Shared UI helpers: toasts, badges, drawer/modal, confirm dialog, formatting.
const UI = (() => {
  function toast(message, { title = "", type = "" } = {}) {
    const root = document.getElementById("toast-root");
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.innerHTML = `${title ? `<div class="t-title">${escapeHtml(title)}</div>` : ""}<div>${escapeHtml(message)}</div>`;
    root.appendChild(node);
    setTimeout(() => {
      node.style.transition = "opacity .3s ease";
      node.style.opacity = "0";
      setTimeout(() => node.remove(), 300);
    }, 4200);
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function badge(text, cls) {
    return `<span class="badge ${cls || text}">${escapeHtml(text)}</span>`;
  }

  function loading(container, message = "Loading...") {
    container.innerHTML = `<div class="state-box"><div class="spinner"></div>${escapeHtml(message)}</div>`;
  }

  function empty(container, message = "Nothing here yet.") {
    container.innerHTML = `<div class="state-box"><div class="icon">&#9633;</div>${escapeHtml(message)}</div>`;
  }

  function errorBox(container, err) {
    container.innerHTML = `<div class="state-box"><div class="icon" style="color:#ff4d5e;">&#9888;</div>Failed to load: ${escapeHtml(err?.message || String(err))}</div>`;
  }

  function openDrawer(html) {
    closeOverlay();
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "active-overlay";
    overlay.innerHTML = `<div class="drawer">${html}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });
    document.getElementById("modal-root").appendChild(overlay);
    document.addEventListener("keydown", escCloseOnce);
    return overlay;
  }

  function openDialog(html) {
    closeOverlay();
    const overlay = document.createElement("div");
    overlay.className = "overlay center";
    overlay.id = "active-overlay";
    overlay.innerHTML = `<div class="dialog">${html}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });
    document.getElementById("modal-root").appendChild(overlay);
    document.addEventListener("keydown", escCloseOnce);
    return overlay;
  }

  function escCloseOnce(e) {
    if (e.key === "Escape") closeOverlay();
  }

  function closeOverlay() {
    const existing = document.getElementById("active-overlay");
    if (existing) existing.remove();
    document.removeEventListener("keydown", escCloseOnce);
  }

  function confirmDialog({ title, message, confirmLabel = "Confirm", confirmClass = "primary", onConfirm }) {
    const overlay = openDialog(`
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="btn-row">
        <button class="btn ghost" data-act="cancel">Cancel</button>
        <button class="btn ${confirmClass}" data-act="confirm">${escapeHtml(confirmLabel)}</button>
      </div>`);
    overlay.querySelector('[data-act="cancel"]').onclick = closeOverlay;
    overlay.querySelector('[data-act="confirm"]').onclick = async () => {
      await onConfirm();
      closeOverlay();
    };
  }

  function kv(pairs) {
    return `<div class="kv-block">${pairs
      .filter((p) => p[1] !== undefined && p[1] !== null && p[1] !== "")
      .map(([k, v]) => `<div class="kv"><div class="k">${escapeHtml(k)}</div><div>${v}</div></div>`)
      .join("")}</div>`;
  }

  function severityDot(sev) {
    const cls = sev === "CRITICAL" || sev === "HIGH" ? "bad" : sev === "MEDIUM" ? "warn" : "";
    return `<span class="status-dot ${cls}"></span>`;
  }

  return { toast, badge, loading, empty, errorBox, openDrawer, openDialog, closeOverlay, confirmDialog, kv, escapeHtml, severityDot };
})();
