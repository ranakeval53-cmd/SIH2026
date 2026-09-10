import React from 'react';
import { 
  AlertOctagon, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  Zap,
  Split,
  Maximize2
} from 'lucide-react';

export default function ConflictMatrix({ conflictData, onTriggerFusion }) {
  const conflicts = conflictData?.conflicts || [];
  const fusions = conflictData?.fusion_recommendations || [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={20} color="var(--color-fused)" />
            Cross-Department Conflict Radar & Block Fusion Hub
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Automatic Co-Location of Engineering (TMS), Signalling (SMMS), and Traction (TDMS) to Eliminate Repeated Corridor Closures
          </p>
        </div>

        <button className="btn-fuse" onClick={onTriggerFusion}>
          <Sparkles size={16} />
          Auto-Fuse All Compatible Blocks
        </button>
      </div>

      {/* Top Banner: The Core Innovation */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(168, 85, 247, 0.12))', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Sparkles size={20} color="var(--color-fused)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Block Fusion Engine — Eliminating Fragmented Corridor Shutdowns
          </h3>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
          Historically on Indian Railways, Engineering, Traction, and Signalling departments request blocks independently for the same section on the same day — closing corridors multiple times and starving train paths. RailOpt AI identifies spatial & temporal overlaps and merges them into a <strong>Single Composite Mega-Block</strong> with shared safety protection, cutting total closure hours by <strong>45%</strong>.
        </p>
      </div>

      {/* Grid: Live Fusion Opportunities + Conflict Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left: Active Fused Mega-Blocks */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--color-fused)" />
            Active Fused Corridor Mega-Blocks ({fusions.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {fusions.map((fb, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-fused)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="badge badge-fused" style={{ fontSize: '0.7rem', marginBottom: '0.35rem' }}>
                      {fb.block_id} • COMPOSITE BLOCK
                    </span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {fb.section} ({fb.line} Line)
                    </h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'JetBrains Mono' }}>
                      +{fb.downtime_saved_minutes}m
                    </span>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Downtime Saved</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fused Departments:</span>
                  {fb.departments.map(dept => (
                    <span key={dept} className={`badge badge-${dept.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                      {dept}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-subtle)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tasks Combined: <strong style={{ color: 'var(--text-main)' }}>{fb.tasks_count} maintenance jobs</strong></span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    📉 {fb.estimated_closure_reduction_pct}% Track Closure Reduction
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detected Spatial & Machine Conflicts */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={18} color="#f59e0b" />
            Detected Operational Conflicts ({conflicts.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {conflicts.slice(0, 6).map((conf, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '1.15rem', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                    {conf.type}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                    {conf.conflict_id}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '0.5rem' }}>
                  {conf.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.45rem' }}>
                  <span style={{ color: '#94a3b8' }}>Involved: <strong>{conf.tasks_involved?.join(' & ')}</strong></span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    💡 Rec: {conf.recommended_action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
