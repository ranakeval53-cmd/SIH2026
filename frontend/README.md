# 🚆 TrackShield AI — Frontend Portal

This directory contains the enterprise single-page application (SPA) for **TrackShield AI**, built with **React 19**, **Vite 8.2**, **Lucide Icons**, and a custom **Indian Railways Vanilla CSS Design System**.

For full system architecture, optimization models, AI pipeline, and API documentation, see the [Main Project README](../README.md).

---

## 🌟 Key Frontend Features

1. **Dual Operating Modes:**
   - **Approver Command Center:** For Sr. DOM to review, sanction, revoke, and inspect multi-department concurrence.
   - **Operations & Live Gantt View:** Interactive timetable visualization across UP/DN lines with customizable time-window sliders (Past, Live, Future).
2. **Indian Railways Electronic Sanction Memo (Form T/409):**
   - Official bilingual letterhead, Section Controller endorsements, caution orders, and one-click print/PDF export.
3. **Advanced Visual Analytics:**
   - Comparative Grouped Bar Graph (Traditional Manual vs TrackShield AI).
   - Precision SVG Donut / Pie Chart with Department & Block Type toggles.
4. **Role-Based Access Control (RBAC):**
   - Quick login presets for Sr. DOM, Chief Planner, Civil P-Way, Electrical TRD, Signaling S&T, and Section Controller.
   - Enforces statutory sanction authority for Approver/Planner and provides transparent view-only concurrence for technical departments.
5. **Theme Engine:**
   - Full light and dark mode support with instant toggle in the navbar.
   - High-contrast typography and WCAG AA accessible color palettes.

---

## 🛠️ Development & Build Scripts

From the `frontend/` directory:

```bash
# Install dependencies
npm install

# Start Vite local development server (port 5173)
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📁 Component Directory

- `src/App.jsx`: Global state, route handling, role switching, and sync listeners.
- `src/components/Navbar.jsx`: Brand header, theme toggle, and role indicator.
- `src/components/ApproverDashboard.jsx`: Sr. DOM sanction queue, review drawer, rejection protocol, and concurrence checklists.
- `src/components/MasterGantt.jsx`: Interactive corridor timetable with time-window sliders.
- `src/components/KPIDashboard.jsx`: Grouped bar graph and SVG donut pie analytics.
- `src/components/SanctionModal.jsx`: Electronic Form T/409 printable sanction memo modal.
- `src/components/OperationsDashboard.jsx`: Live corridor feed and active block cards.
- `src/components/DataFeeds.jsx`: Real-time sensor and CSV feed monitoring.
- `src/components/LoginModal.jsx`: Evaluator quick-login presets for RBAC testing.
- `src/index.css`: Indian Railways CSS custom properties, tokens, and responsive utility classes.
