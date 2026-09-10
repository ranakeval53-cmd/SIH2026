// Minimal dependency-free SVG chart helpers. No external charting library:
// the dashboard must run even with zero network access during a demo.
const Charts = (() => {
  const PALETTE = ["#3aa0ff", "#ff9a3d", "#37d67a", "#ffd23d", "#ff4d5e", "#a78bfa", "#2dd4bf", "#f472b6"];
  const STATUS_COLORS = {
    CRITICAL: "#ff4d5e", HIGH: "#ff9a3d", MEDIUM: "#ffd23d", LOW: "#37d67a",
    PENDING_REVIEW: "#ffd23d", APPROVED: "#37d67a", EDITED: "#3aa0ff", REJECTED: "#ff4d5e", UNSCHEDULED: "#93a2c2",
  };

  function colorFor(label, index) {
    return STATUS_COLORS[label] || PALETTE[index % PALETTE.length];
  }

  function el(html) {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  function legend(labels, colors) {
    return `<div class="chart-legend">${labels
      .map((l, i) => `<div class="legend-item"><span class="legend-swatch" style="background:${colors[i]}"></span>${escapeHtml(String(l))}</div>`)
      .join("")}</div>`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function emptyState(container, message) {
    container.innerHTML = `<div class="state-box"><div class="icon">&#9711;</div>${message || "No data"}</div>`;
  }

  function bar(container, { labels, values, colors, height = 190, valueSuffix = "" }) {
    if (!labels || !labels.length) return emptyState(container, "No data yet");
    const w = Math.max(container.clientWidth || 360, labels.length * 60);
    const max = Math.max(...values, 1);
    const barW = Math.min(46, (w - 40) / labels.length - 14);
    const topPad = 18; // room for the value label above the tallest bar
    const chartH = height - 34;
    let bars = "";
    let labelsHtml = "";
    labels.forEach((label, i) => {
      const v = values[i] || 0;
      const h = Math.max(2, (v / max) * chartH);
      const x = 24 + i * ((w - 48) / labels.length);
      const y = topPad + (chartH - h);
      const color = colors ? colors[i] : colorFor(label, i);
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${color}">
        <title>${escapeHtml(String(label))}: ${v}${valueSuffix}</title>
      </rect>
      <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#e6ecf7">${v}</text>`;
      labelsHtml += `<div style="width:${(w - 48) / labels.length}px; text-align:center; font-size:10.5px; color:#93a2c2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(String(label))}">${escapeHtml(String(label))}</div>`;
    });
    container.innerHTML = `
      <svg viewBox="0 0 ${w} ${chartH + topPad + 6}" width="100%" height="${chartH + topPad + 6}" preserveAspectRatio="xMinYMin meet">${bars}</svg>
      <div style="display:flex;">${labelsHtml}</div>`;
  }

  function hbar(container, { labels, values, colors, valueSuffix = "" }) {
    if (!labels || !labels.length) return emptyState(container, "No data yet");
    const max = Math.max(...values, 1);
    const rows = labels
      .map((label, i) => {
        const v = values[i] || 0;
        const pct = Math.max(2, (v / max) * 100);
        const color = colors ? colors[i] : colorFor(label, i);
        return `<div style="display:flex; align-items:center; gap:8px; margin-bottom:9px;">
          <div style="width:120px; font-size:11.5px; color:#93a2c2; text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(String(label))}">${escapeHtml(String(label))}</div>
          <div style="flex:1; background:rgba(255,255,255,0.04); border-radius:5px; height:16px; position:relative;">
            <div style="width:${pct}%; background:${color}; height:100%; border-radius:5px;"></div>
          </div>
          <div style="width:42px; font-size:11.5px; font-weight:700;">${v}${valueSuffix}</div>
        </div>`;
      })
      .join("");
    container.innerHTML = `<div>${rows}</div>`;
  }

  function donut(container, { labels, values, colors, size = 160 }) {
    if (!labels || !labels.length || values.reduce((a, b) => a + b, 0) === 0) return emptyState(container, "No data yet");
    const total = values.reduce((a, b) => a + b, 0);
    const r = size / 2 - 14;
    const cx = size / 2, cy = size / 2;
    let angle = -90;
    let paths = "";
    const cols = [];
    labels.forEach((label, i) => {
      const v = values[i] || 0;
      if (v <= 0) { cols.push(colors ? colors[i] : colorFor(label, i)); return; }
      const frac = v / total;
      const sweep = frac * 360;
      const large = sweep > 180 ? 1 : 0;
      const x1 = cx + r * Math.cos((Math.PI * angle) / 180);
      const y1 = cy + r * Math.sin((Math.PI * angle) / 180);
      const endAngle = angle + sweep;
      const x2 = cx + r * Math.cos((Math.PI * endAngle) / 180);
      const y2 = cy + r * Math.sin((Math.PI * endAngle) / 180);
      const color = colors ? colors[i] : colorFor(label, i);
      cols.push(color);
      paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" stroke="${getComputedStyle(document.body).getPropertyValue('--panel') || '#141f36'}" stroke-width="2">
        <title>${escapeHtml(String(label))}: ${v}</title>
      </path>`;
      angle = endAngle;
    });
    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          ${paths}
          <circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="${getComputedStyle(document.body).getPropertyValue('--panel') || '#141f36'}"/>
          <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="15" font-weight="800" fill="#e6ecf7">${total}</text>
        </svg>
        ${legend(labels.map((l, i) => `${l} (${values[i]})`), cols)}
      </div>`;
  }

  function beforeAfter(container, { beforeLabel, afterLabel, beforeVal, afterVal, unit = "%" }) {
    const max = Math.max(beforeVal, afterVal, 1);
    const row = (label, val, color) => `
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#93a2c2; margin-bottom:5px;">
          <span>${escapeHtml(label)}</span><span style="font-weight:800; color:#e6ecf7;">${val}${unit}</span>
        </div>
        <div style="background:rgba(255,255,255,0.04); border-radius:6px; height:20px;">
          <div style="width:${Math.max(2, (val / max) * 100)}%; background:${color}; height:100%; border-radius:6px;"></div>
        </div>
      </div>`;
    container.innerHTML = row(beforeLabel, beforeVal, "#93a2c2") + row(afterLabel, afterVal, "#37d67a");
  }

  return { bar, hbar, donut, beforeAfter, emptyState, colorFor };
})();
