import React, { useState } from 'react';
import { 
  Cpu, 
  Search, 
  Filter, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  Clock, 
  Layers, 
  Gauge, 
  CheckCircle,
  HelpCircle,
  Wrench,
  ChevronDown
} from 'lucide-react';

export default function TaskPrioritizer({ tasks, onSelectTask }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const filteredTasks = tasks.filter(t => {
    const matchSearch = 
      (t.task_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.task_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.section_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.station_code || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDept === 'ALL' || t.department === selectedDept;
    const matchRisk = selectedRisk === 'ALL' || t.ml_risk?.risk_tier === selectedRisk;

    return matchSearch && matchDept && matchRisk;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} color="#06b6d4" />
            AI Asset Intelligence & Multi-Factor Prioritizer
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            Scikit-Learn ML Failure Risk Model & Multi-Dimensional Priority Engine (Safety 40%, Speed Impact 25%, Urgency 20%, Corridor Density 15%)
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text"
              placeholder="Search by task, ID, station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.78rem',
                outline: 'none',
                width: '220px'
              }}
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ background: '#0f172a', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Departments</option>
            <option value="TMS">Engineering (TMS)</option>
            <option value="SMMS">Signalling (SMMS)</option>
            <option value="TDMS">Traction / OHE (TDMS)</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{ background: '#0f172a', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="CRITICAL">🔴 Critical Risk</option>
            <option value="HIGH">🟠 High Risk</option>
            <option value="MEDIUM">🟡 Medium Risk</option>
            <option value="LOW">🟢 Low Risk</option>
          </select>

        </div>
      </div>

      {/* Task Queue Cards / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {filteredTasks.map((t) => {
          const rank = t.ai_rank || 1;
          const score = t.priority_score || 70.0;
          const risk = t.ml_risk || { failure_probability: 0.5, asset_health_index: 75, risk_tier: 'MEDIUM' };
          const breakdown = t.breakdown || { safety_points: 25, operational_impact_points: 15, urgency_points: 10, density_points: 10 };

          const isCritical = risk.risk_tier === 'CRITICAL' || score >= 85;

          return (
            <div 
              key={t.task_id} 
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderLeft: `4px solid ${isCritical ? '#ef4444' : t.department === 'TMS' ? '#f59e0b' : t.department === 'SMMS' ? '#a855f7' : '#06b6d4'}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                alignItems: 'center'
              }}
            >
              {/* Col 1: Identity & Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#1e293b', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                    #{rank}
                  </span>
                  <span className={`badge badge-${t.department?.toLowerCase()}`}>
                    {t.department}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                    {t.task_id}
                  </span>
                  <span className={`badge ${isCritical ? 'badge-critical' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                    {risk.risk_tier} RISK
                  </span>
                </div>

                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  {t.task_name}
                </h4>

                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  <strong>{t.section_id}</strong> • {t.track_line} Line • KM {t.start_km} - {t.end_km} ({t.station_name || t.station_code})
                </p>

                {/* Primary Rationale */}
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.725rem', color: '#cbd5e1' }}>
                    {t.primary_rationale || "Periodic preventive maintenance scheduled as per RDSO standards."}
                  </span>
                </div>
              </div>

              {/* Col 2: AI Priority Score & Explainability Breakdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    AI Priority Score
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: isCritical ? '#f87171' : '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                    {score} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 100</span>
                  </span>
                </div>

                {/* Multi-factor Score Breakdown Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.7rem' }}>
                  <div style={{ background: '#0a101d', padding: '0.3rem 0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Safety Hazard:</span>
                    <strong style={{ color: '#f87171' }}>+{breakdown.safety_points} pts</strong>
                  </div>
                  <div style={{ background: '#0a101d', padding: '0.3rem 0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Speed Penalty:</span>
                    <strong style={{ color: '#fbbf24' }}>+{breakdown.operational_impact_points} pts</strong>
                  </div>
                  <div style={{ background: '#0a101d', padding: '0.3rem 0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Overdue Days:</span>
                    <strong style={{ color: '#c084fc' }}>+{breakdown.urgency_points} pts</strong>
                  </div>
                  <div style={{ background: '#0a101d', padding: '0.3rem 0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Trunk Density:</span>
                    <strong style={{ color: '#38bdf8' }}>+{breakdown.density_points} pts</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginTop: '0.5rem' }}>
                  <div style={{ width: `${score}%`, height: '100%', background: isCritical ? 'linear-gradient(90deg, #f97316, #ef4444)' : 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '3px' }} />
                </div>
              </div>

              {/* Col 3: ML Risk & Resource Allocations */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Failure Probability:</span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: risk.failure_probability > 0.6 ? '#f87171' : '#34d399', fontFamily: 'JetBrains Mono' }}>
                      {(risk.failure_probability * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Asset Health Index:</span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: risk.asset_health_index < 40 ? '#f87171' : '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                      {risk.asset_health_index} / 100
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Duration:</span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'JetBrains Mono' }}>
                      {t.required_duration_mins}m
                    </p>
                  </div>
                </div>

                {/* Required Resources */}
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Machines: </span>
                    <span>{t.required_machines || "Hand Tool Equipment"}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Gangs / Crews: </span>
                    <span>{t.required_gangs || "Standard Section Gang"}</span>
                  </div>
                  {t.required_power_cut_substation && (
                    <div style={{ color: '#38bdf8' }}>
                      <span style={{ color: '#64748b' }}>25kV Substation Cut: </span>
                      <strong>{t.required_power_cut_substation}</strong>
                    </div>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
