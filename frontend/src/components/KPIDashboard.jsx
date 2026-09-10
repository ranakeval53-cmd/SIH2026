import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Zap, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function KPIDashboard({ kpis, onNavigate, onTriggerOptimize, onTriggerFusion }) {
  const summary = kpis?.summary || {
    block_utilization_pct: 85.4,
    traditional_baseline_utilization_pct: 60.0,
    total_downtime_saved_hours: 23.8,
    fused_mega_blocks_count: 5,
    conflicts_resolved_count: 18,
    total_tasks_covered: 17
  };

  const comparison = kpis?.comparison_metrics || [
    { metric: "Block Utilization (%)", traditional: 60, railopt_ai: 85, better: "higher" },
    { metric: "Planning Time (Relative %)", traditional: 100, railopt_ai: 40, better: "lower" },
    { metric: "Scheduling Conflicts (%)", traditional: 100, railopt_ai: 30, better: "lower" },
    { metric: "Infrastructure Downtime (Relative %)", traditional: 100, railopt_ai: 55, better: "lower" },
    { metric: "Tasks Completed in Planned Blocks (%)", traditional: 65, railopt_ai: 90, better: "higher" },
    { metric: "Last Minute Rescheduling (%)", traditional: 75, railopt_ai: 35, better: "lower" }
  ];

  const corridorStations = [
    { code: 'NDLS', name: 'New Delhi', km: 0, status: 'NORMAL', health: 98 },
    { code: 'GZB', name: 'Ghaziabad', km: 25, status: 'FUSED_POSSESSION', health: 86 },
    { code: 'DER', name: 'Dadri', km: 42, status: 'MAINTENANCE_ACTIVE', health: 89 },
    { code: 'KRJ', name: 'Khurja', km: 89, status: 'NORMAL', health: 94 },
    { code: 'SOM', name: 'Somna', km: 110, status: 'WATCHLIST', health: 74 },
    { code: 'ALJN', name: 'Aligarh', km: 131, status: 'NORMAL', health: 91 },
    { code: 'TDL', name: 'Tundla', km: 204, status: 'NORMAL', health: 95 },
    { code: 'CNB', name: 'Kanpur Central', km: 436, status: 'HIGH_TRAFFIC', health: 92 },
    { code: 'PRYJ', name: 'Prayagraj', km: 630, status: 'NORMAL', health: 96 },
    { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya', km: 783, status: 'NORMAL', health: 97 }
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Hero Welcome & Quick Launch */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Executive Corridor Command Center
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              LIVE OPTIMIZED
            </span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-Time AI Multi-Department Maintenance Block Planning • Northern & North Central Railway
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-fuse" onClick={onTriggerFusion}>
            <Sparkles size={16} />
            Auto-Fuse Compatible Blocks
          </button>
          <button className="btn-primary" onClick={onTriggerOptimize}>
            <Zap size={16} />
            Run CP-SAT Optimizer
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Block Utilization */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Block Utilization</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
                {summary.block_utilization_pct}%
              </h3>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <TrendingUp size={22} color="#38bdf8" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
            <ArrowUpRight size={16} />
            <span>+25.4% improvement</span>
            <span style={{ color: '#64748b', fontWeight: 400 }}>(vs 60% traditional)</span>
          </div>
        </div>

        {/* Card 2: Track Downtime Saved */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Downtime Saved</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                {summary.total_downtime_saved_hours} hrs
              </h3>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <Clock size={22} color="#fbbf24" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
            <ArrowDownRight size={16} />
            <span>45% reduction in closures</span>
            <span style={{ color: '#64748b', fontWeight: 400 }}>(daily corridor)</span>
          </div>
        </div>

        {/* Card 3: Fused Mega-Blocks */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Fused Mega-Blocks</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#f472b6', marginTop: '0.25rem' }}>
                {summary.fused_mega_blocks_count} Blocks
              </h3>
            </div>
            <div style={{ background: 'rgba(236, 72, 153, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <Layers size={22} color="#f472b6" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#c084fc', fontWeight: 600 }}>
            <Sparkles size={16} />
            <span>TMS + SMMS + TDMS unified</span>
          </div>
        </div>

        {/* Card 4: Financial Impact */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Annual Financial ROI</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                ₹14.8 Cr
              </h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <IndianRupee size={22} color="#10b981" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
            <span>1,960 hrs train delay prevented</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Comparison Chart + Corridor Health Map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Before vs After Simulated Impact (Matching Slide 5 of Presentation) */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Before vs After Operational Impact (Simulated)
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Performance Benchmark: Traditional Manual Dispatching vs RailOpt AI
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#475569' }} />
                <span style={{ color: '#94a3b8' }}>Traditional (Before)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0284c7' }} />
                <span style={{ color: '#38bdf8' }}>RailOpt AI (After)</span>
              </div>
            </div>
          </div>

          {/* Metric Comparison Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comparison.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{item.metric}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {item.traditional}% ➔ <strong style={{ color: '#34d399' }}>{item.railopt_ai}%</strong>
                  </span>
                </div>
                {/* Dual bar */}
                <div style={{ position: 'relative', height: '18px', background: '#0a101d', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {/* Traditional baseline bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${item.traditional}%`,
                    background: '#334155',
                    borderRadius: '4px',
                    opacity: 0.8
                  }} />
                  {/* RailOpt AI bar */}
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    bottom: '2px',
                    left: 0,
                    width: `${item.railopt_ai}%`,
                    background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                    borderRadius: '4px',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corridor Route Topology & Asset Health Map */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                NDLS - DDU Corridor Asset Health
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                783.0 KM High-Density Trunk Route (Track, S&T, and 25kV OHE)
              </p>
            </div>
            <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }} onClick={() => onNavigate('schedule')}>
              View on Gantt
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {corridorStations.map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: st.health < 80 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: st.health < 80 ? '#f87171' : '#38bdf8'
                  }}>
                    {st.code}
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{st.name}</h5>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>KM {st.km} • Delhi/Prayagraj Division</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {st.status === 'FUSED_POSSESSION' && (
                    <span className="badge badge-fused" style={{ fontSize: '0.65rem' }}>
                      FUSED BLOCK
                    </span>
                  )}
                  {st.status === 'WATCHLIST' && (
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                      IMR DEFECT WATCH
                    </span>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: st.health > 85 ? '#34d399' : '#f87171' }}>
                      {st.health}%
                    </span>
                    <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Asset Health</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
