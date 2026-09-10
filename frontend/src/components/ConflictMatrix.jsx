import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Train, 
  Wrench, 
  Layers, 
  Filter,
  Check
} from 'lucide-react';

export default function ConflictMatrix({ conflictData, onTriggerFusion, onNavigate }) {
  const rawConflicts = conflictData?.conflicts || [];
  const fusions = conflictData?.fusion_recommendations || [];

  // Expanded categorized conflicts with explainability
  const [conflictItems, setConflictItems] = useState([
    {
      id: 'CONF_CRIT_01',
      severity: 'CRITICAL',
      type: 'SPATIAL_AND_TRAIN_CLASH',
      title: 'TMS Track Renewal vs Rajdhani Express Headway',
      section: 'Dankaur - Wair (DN Line)',
      section_id: 'SEC_DKDE_WAIR_DN',
      track_line: 'DN',
      blocks_involved: ['TMS_BLK_201', 'Train #12302'],
      departments: ['TMS (Engineering)', 'Operating'],
      time_overlap: '10:10 - 10:45 hrs',
      affected_trains: ['12302 Howrah Rajdhani', 'G-COAL-101'],
      affected_assets: ['Turnout Point 102B DKDE'],
      risk_score: 88.5,
      ai_recommendation: 'SHIFT_TO_NIGHT_WINDOW',
      ai_reason: 'High-speed Rajdhani clearance buffer requires 25m headway. Moving track possession to Golden Night Window (01:15-04:45) completely resolves passenger train conflict.',
      status: 'RESOLVED_BY_AI'
    },
    {
      id: 'CONF_HIGH_02',
      severity: 'HIGH',
      type: 'CROSS_DEPARTMENT_OHE_CONCURRENCY',
      title: 'SMMS Point Testing vs TDMS 25kV Catenary Isolation',
      section: 'Ghaziabad - Maripat (UP Line)',
      section_id: 'SEC_GZB_MIU_UP',
      track_line: 'UP',
      blocks_involved: ['SMMS_BLK_103', 'TDMS_BLK_102'],
      departments: ['SMMS', 'TDMS'],
      time_overlap: '01:45 - 03:15 hrs',
      affected_trains: ['None (Within night window)'],
      affected_assets: ['GZB-TSS-25kV Substation'],
      risk_score: 72.0,
      ai_recommendation: 'FUSE_INTO_MEGA_BLOCK',
      ai_reason: 'Independent execution requires double power cut. Co-locating under a unified Fused Mega-Block saves 75 minutes of track downtime.',
      status: 'FUSION_READY'
    },
    {
      id: 'CONF_MED_03',
      severity: 'MEDIUM',
      type: 'MACHINERY_CONTENTION',
      title: 'Ballast Cleaner (BCM-09) Simultaneous Claim',
      section: 'Dadri - Ajaibpur vs Ghaziabad',
      section_id: 'SEC_DER_AJR_UP',
      track_line: 'UP',
      blocks_involved: ['TMS_DER_01', 'TMS_GZB_01'],
      departments: ['TMS'],
      time_overlap: '02:00 - 04:00 hrs',
      affected_trains: [],
      affected_assets: ['Track Tamping Rake'],
      risk_score: 54.0,
      ai_recommendation: 'SERIALIZE_DISPATCH',
      ai_reason: 'BCM-09 allocated to Ghaziabad priority section. Dadri rescheduled to D+1 shadow slot.',
      status: 'SCHEDULED'
    },
    {
      id: 'CONF_LOW_04',
      severity: 'LOW',
      type: 'HEADWAY_BUFFER_ENCROACHMENT',
      title: 'Slow Freight Loop Regulation Headway',
      section: 'Somna - Aligarh (UP Line)',
      section_id: 'SEC_SOM_ALJN_UP',
      track_line: 'UP',
      blocks_involved: ['G-COAL-105', 'USFD_SOM_05'],
      departments: ['TMS', 'Operating'],
      time_overlap: '12:30 - 13:00 hrs',
      affected_trains: ['G-COAL-105 Freight'],
      affected_assets: ['Somna Loop Line #2'],
      risk_score: 28.0,
      ai_recommendation: 'PROCEED_UNDER_CAUTION',
      ai_reason: 'USFD ultrasonic testing vehicle moves under normal track clearance rules.',
      status: 'APPROVED'
    }
  ]);

  const [activeTab, setActiveTab] = useState('ALL');

  const filteredConflicts = conflictItems.filter(c => {
    if (activeTab === 'CRITICAL') return c.severity === 'CRITICAL';
    if (activeTab === 'HIGH') return c.severity === 'HIGH';
    if (activeTab === 'MEDIUM') return c.severity === 'MEDIUM';
    if (activeTab === 'LOW') return c.severity === 'LOW';
    return true;
  });

  const handleResolveConflict = (id) => {
    setConflictItems(prev => prev.map(c => c.id === id ? { ...c, status: 'RESOLVED_BY_AI' } : c));
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h1 className="text-h1" style={{ fontSize: '1.35rem' }}>
                Risk & Conflict Detection Center
              </h1>
              <p className="text-sub" style={{ fontSize: '0.78rem' }}>
                Spatial Overlap, Resource Contention & Timetable Conflict Analysis with Explainable AI
              </p>
            </div>
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={onTriggerFusion}
          style={{ fontSize: '0.8rem', gap: '0.4rem' }}
        >
          <Sparkles size={15} />
          <span>Auto-Fuse Compatible Clashes</span>
        </button>
      </div>

      {/* Severity Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All Conflicts (${conflictItems.length})` },
          { id: 'CRITICAL', label: 'Critical Conflicts', count: conflictItems.filter(c => c.severity === 'CRITICAL').length, color: 'var(--color-danger)' },
          { id: 'HIGH', label: 'High Risk', count: conflictItems.filter(c => c.severity === 'HIGH').length, color: 'var(--color-warning)' },
          { id: 'MEDIUM', label: 'Medium Risk', count: conflictItems.filter(c => c.severity === 'MEDIUM').length, color: 'var(--color-primary)' },
          { id: 'LOW', label: 'Low Risk', count: conflictItems.filter(c => c.severity === 'LOW').length, color: 'var(--color-success)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--bg-card)',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conflict Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredConflicts.map(item => {
          const isCritical = item.severity === 'CRITICAL';
          const isHigh = item.severity === 'HIGH';
          const borderColor = isCritical ? 'var(--color-danger)' : isHigh ? 'var(--color-warning)' : 'var(--border-subtle)';

          return (
            <div 
              key={item.id} 
              className="enterprise-card"
              style={{
                padding: '1.25rem 1.5rem',
                borderLeft: `4px solid ${borderColor}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span className={`badge ${isCritical ? 'badge-danger' : isHigh ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                      {item.severity} SEVERITY
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {item.id}
                    </span>
                  </div>

                  <h3 className="text-h3" style={{ fontSize: '1.05rem' }}>
                    {item.title}
                  </h3>
                  <p className="text-sub" style={{ fontSize: '0.75rem' }}>
                    Section: <strong>{item.section}</strong> • Time Overlap: <strong style={{ color: 'var(--color-danger)' }}>{item.time_overlap}</strong>
                  </p>
                </div>

                {/* Risk Score & Status */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isCritical ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                    Risk: {item.risk_score} / 100
                  </div>
                  <span className={`badge ${item.status.includes('RESOLVED') ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: '0.2rem' }}>
                    {item.status}
                  </span>
                </div>
              </div>

              {/* Entities Involved Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: 'var(--bg-card-subtle)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.85rem', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>BLOCKS INVOLVED:</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                    {item.blocks_involved.join(' ⚡ ')}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>DEPARTMENTS:</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.1rem' }}>
                    {item.departments.join(' + ')}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>AFFECTED TRAIN PATHS:</span>
                  <div style={{ fontWeight: 700, color: item.affected_trains.length > 0 ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '0.1rem' }}>
                    {item.affected_trains.length > 0 ? item.affected_trains.join(', ') : 'Zero passenger impact'}
                  </div>
                </div>
              </div>

              {/* Explainable AI Box */}
              <div style={{
                background: 'rgba(23, 105, 170, 0.06)',
                border: '1px solid rgba(23, 105, 170, 0.2)',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>
                  <Sparkles size={14} />
                  <span>AI Recommended Resolution (WHY):</span>
                </div>
                <p style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {item.ai_reason}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  onClick={() => onNavigate && onNavigate('schedule')}
                  className="btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Open in Master Gantt
                </button>

                {item.status !== 'RESOLVED_BY_AI' && (
                  <button
                    onClick={() => handleResolveConflict(item.id)}
                    className="btn-primary"
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', background: 'var(--color-success)', gap: '0.35rem' }}
                  >
                    <Check size={13} />
                    <span>Apply AI Resolution</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
