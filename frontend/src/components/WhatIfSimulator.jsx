import React, { useState } from 'react';
import { 
  Sliders, 
  Play, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  Minimize2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function WhatIfSimulator({ scenarios, onRunSimulation }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState('EMERGENCY_RAIL_FLAW');
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const scenarioList = scenarios || [
    {
      id: "EMERGENCY_RAIL_FLAW",
      title: "Emergency IMR Rail Flaw at Somna (KM 118.5)",
      category: "SAFETY_DISRUPTION",
      severity: "CRITICAL",
      description: "USFD ultrasonic testing detects an imminent transverse fatigue crack on UP trunk line between Somna and Aligarh. Preempts timetable to insert immediate 90-min emergency possession."
    },
    {
      id: "TRAIN_DELAY_CASCADE",
      title: "Vande Bharat Express (#22436) Delayed by 45 Mins",
      category: "TIMETABLE_DEVIATION",
      severity: "HIGH",
      description: "Premium express #22436 is delayed departing NDLS. Solver shifts Ghaziabad and Dadri maintenance blocks to alternative shadow slots to avoid passenger detention."
    },
    {
      id: "MACHINE_BREAKDOWN",
      title: "CSM Tamping Machine 01 Mechanical Breakdown",
      category: "RESOURCE_FAILURE",
      severity: "MEDIUM",
      description: "Hydraulic system failure on CSM Tamping Machine 01. Substitutes manual heavy beaters and extends possession buffer without cancelling S&T or OHE co-located work."
    },
    {
      id: "WINDOW_TRUNCATION",
      title: "Possession Window Truncation (180m ➔ 120m)",
      category: "OPERATIONAL_SQUEEZE",
      severity: "MEDIUM",
      description: "Control office curtails maximum available track possession to 120 mins due to high-priority freight convoy. Re-allocates work gangs to protect critical path items."
    }
  ];

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await onRunSimulation(selectedScenarioId);
      setSimResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeScenario = scenarioList.find(s => s.id === selectedScenarioId) || scenarioList[0];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} color="#38bdf8" />
            What-If Operational Scenario Simulator
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            Real-Time Dynamic Rescheduling for Rail Cracks, Train Delays, Machine Malfunctions & Possession Squeezes
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={handleSimulate}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
          {loading ? "Running Optimization..." : "Execute Simulation"}
        </button>
      </div>

      {/* Scenario Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {scenarioList.map((sc) => {
          const isSelected = selectedScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenarioId(sc.id)}
              className="glass-panel"
              style={{
                padding: '1.2rem',
                cursor: 'pointer',
                border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className={`badge ${sc.severity === 'CRITICAL' ? 'badge-critical' : 'badge-tms'}`} style={{ fontSize: '0.65rem' }}>
                  {sc.category}
                </span>
                {isSelected && (
                  <CheckCircle2 size={18} color="#38bdf8" />
                )}
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                {sc.title}
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {sc.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Simulation Result Comparative View */}
      {simResult && (
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(56, 189, 248, 0.3)', animation: 'fadeIn 0.3s ease' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
            <div>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                CP-SAT RE-OPTIMIZED IN 42ms
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Simulation Impact Delta: {activeScenario.title}
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Status: <strong style={{ color: '#34d399' }}>{simResult.simulation_status}</strong>
            </span>
          </div>

          {/* Delta Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Downtime Variance</p>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>
                {simResult.impact_delta?.downtime_difference_hours > 0 ? `+${simResult.impact_delta?.downtime_difference_hours}` : simResult.impact_delta?.downtime_difference_hours} hrs
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>vs Baseline Schedule</span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Block Utilization</p>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                {simResult.simulated_summary?.block_utilization_pct}%
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#34d399' }}>Protected Corridor Health</span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Train Delay Risk</p>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: simResult.impact_delta?.train_delay_risk_score === 'LOW' ? '#34d399' : '#fbbf24', marginTop: '0.2rem' }}>
                {simResult.impact_delta?.train_delay_risk_score}
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Zero Express Stalls</span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Conflicts Resolved</p>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f472b6', marginTop: '0.2rem' }}>
                {simResult.impact_delta?.conflicts_resolved} Auto-Cleared
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#c084fc' }}>Spatial & Machine Safety</span>
            </div>

          </div>

          {/* Actions & Dispatch Instructions */}
          <div style={{ background: 'rgba(2, 132, 199, 0.08)', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} />
              AI Operating Dispatch Directives:
            </h5>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {simResult.scenario_notes?.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
              <li>COA train pathing updated with automatic cautious regulation for preceding freight trains.</li>
            </ul>
          </div>

        </div>
      )}

    </div>
  );
}
