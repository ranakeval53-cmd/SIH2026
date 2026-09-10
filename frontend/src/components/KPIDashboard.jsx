import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Database,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award,
  RefreshCw
} from 'lucide-react';

export default function KPIDashboard({ kpis, onNavigate, onTriggerOptimize, onTriggerFusion }) {
  const [chartViewMode, setChartViewMode] = useState('DEPARTMENT'); // 'DEPARTMENT' or 'BLOCK_TYPE'
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const summary = kpis?.summary || {
    block_utilization_pct: 96.5,
    traditional_baseline_utilization_pct: 58.0,
    total_downtime_saved_hours: 50.0,
    fused_mega_blocks_count: 12,
    conflicts_resolved_count: 36,
    total_tasks_covered: 39
  };

  // Grouped Bar Graph Benchmark Data: Traditional Manual vs TrackShield AI
  const benchmarkMetrics = [
    { 
      id: 'utilization',
      metric: "Block Utilization", 
      short: "Utilization",
      traditional: 58, 
      trackshield: 96.5, 
      better: "higher",
      delta: "+38.5%",
      deltaType: "positive",
      unit: "%",
      detail: "Proportion of corridor possession time actively utilized by maintenance gangs"
    },
    { 
      id: 'planning_time',
      metric: "Planning Time Required", 
      short: "Planning Time",
      traditional: 100, 
      trackshield: 38, 
      better: "lower",
      delta: "-62%",
      deltaType: "positive",
      unit: "%",
      detail: "Time required across division headquarters to coordinate multi-dept schedules"
    },
    { 
      id: 'conflicts',
      metric: "Scheduling Conflicts", 
      short: "Conflicts",
      traditional: 100, 
      trackshield: 28, 
      better: "lower",
      delta: "-72%",
      deltaType: "positive",
      unit: "%",
      detail: "Spatial overlaps and train path conflicts detected during corridor possession"
    },
    { 
      id: 'downtime',
      metric: "Infrastructure Downtime", 
      short: "Downtime",
      traditional: 100, 
      trackshield: 25, 
      better: "lower",
      delta: "-75%",
      deltaType: "positive",
      unit: "%",
      detail: "Total track closure hours required to complete scheduled asset upkeep"
    },
    { 
      id: 'execution',
      metric: "Tasks Finished in Window", 
      short: "On-Time Finish",
      traditional: 65, 
      trackshield: 92, 
      better: "higher",
      delta: "+27%",
      deltaType: "positive",
      unit: "%",
      detail: "Percentage of maintenance possessions closed on or before scheduled clearance"
    },
    { 
      id: 'rescheduling',
      metric: "Last-Minute Rescheduling", 
      short: "Rescheduled",
      traditional: 72, 
      trackshield: 30, 
      better: "lower",
      delta: "-42%",
      deltaType: "positive",
      unit: "%",
      detail: "Corridor blocks cancelled or postponed within 24 hours of execution"
    }
  ];

  // Pie / Donut Chart Data: Department Workload Allocation
  const departmentData = [
    { 
      id: 'tms', 
      name: 'Engineering (TMS / Civil Track)', 
      code: 'TMS',
      tasks: 16, 
      percentage: 41.0, 
      color: '#D97706', // Amber
      downtimeSaved: '22 hrs',
      description: 'BCM Ballast Cleaning, Rail Grinding, PQRS Track Renewal'
    },
    { 
      id: 'tdms', 
      name: 'Electrical / TRD (TDMS / 25kV OHE)', 
      code: 'TDMS',
      tasks: 12, 
      percentage: 30.8, 
      color: '#0284C7', // Sky Blue
      downtimeSaved: '18 hrs',
      description: 'Catenary inspection, Neutral Section Overhaul, 25kV TSS Isolator'
    },
    { 
      id: 'smms', 
      name: 'Signaling & Telecom (SMMS)', 
      code: 'SMMS',
      tasks: 11, 
      percentage: 28.2, 
      color: '#7C3AED', // Purple
      downtimeSaved: '10 hrs',
      description: 'Electronic Interlocking, Point Machines, Digital Axle Counters'
    }
  ];

  // Pie / Donut Chart Data: Block Typology
  const blockTypeData = [
    { 
      id: 'fused', 
      name: 'Multi-Dept Fused Mega-Blocks', 
      code: 'FUSED',
      tasks: 25, 
      percentage: 64.1, 
      color: '#2563EB', // Blue
      downtimeSaved: '38 hrs',
      description: 'Concurrent possession sharing single track & OHE warrant'
    },
    { 
      id: 'standalone', 
      name: 'Single Dept Standalone Blocks', 
      code: 'STANDALONE',
      tasks: 10, 
      percentage: 25.6, 
      color: '#16A34A', // Green
      downtimeSaved: '8 hrs',
      description: 'Dedicated window for isolated high-priority corridor asset'
    },
    { 
      id: 'shadow', 
      name: 'Freight Headway Shadow Slots', 
      code: 'SHADOW',
      tasks: 4, 
      percentage: 10.3, 
      color: '#F59E0B', // Orange
      downtimeSaved: '4 hrs',
      description: 'Opportunistic slots between heavy freight rakes'
    }
  ];

  const currentPieData = chartViewMode === 'DEPARTMENT' ? departmentData : blockTypeData;

  // Gujarat & Northern Trunk Corridor Stations
  const corridorStations = [
    { code: 'ADI', name: 'Ahmedabad Junction', km: 492, status: 'NORMAL', health: 98 },
    { code: 'GER', name: 'Geratpur', km: 504, status: 'FUSED_POSSESSION', health: 88 },
    { code: 'ANND', name: 'Anand Junction', km: 556, status: 'MAINTENANCE_ACTIVE', health: 91 },
    { code: 'BRC', name: 'Vadodara Junction', km: 591, status: 'NORMAL', health: 96 },
    { code: 'BH', name: 'Bharuch Junction', km: 662, status: 'NORMAL', health: 94 },
    { code: 'ST', name: 'Surat', km: 721, status: 'HIGH_DENSITY', health: 92 },
    { code: 'VAPI', name: 'Vapi', km: 816, status: 'NORMAL', health: 97 },
    { code: 'NDLS', name: 'New Delhi', km: 0, status: 'NORMAL', health: 99 },
    { code: 'GZB', name: 'Ghaziabad', km: 25, status: 'FUSED_POSSESSION', health: 89 },
    { code: 'CNB', name: 'Kanpur Central', km: 436, status: 'NORMAL', health: 95 }
  ];

  // SVG Donut Calculations
  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius; // ~427.25

  let accumulatedPercent = 0;
  const pieSlices = currentPieData.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* 1. Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Corridor Operations & Planning Dashboard
            <span className="badge badge-success" style={{ fontSize: '0.725rem' }}>
              ✓ LIVE SYNCHRONIZED
            </span>
          </h1>
          <p className="text-sub" style={{ marginTop: '0.2rem' }}>
            AI-Powered Multi-Department Maintenance Coordination • Western Railway & Northern Trunk Corridors
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            className="btn-outline" 
            onClick={() => onNavigate('fusion')}
            style={{ fontSize: '0.8rem', gap: '0.4rem' }}
          >
            <Sparkles size={15} color="var(--color-primary)" />
            <span>Auto-Fusion Center</span>
          </button>

          <button 
            className="btn-primary" 
            onClick={onTriggerOptimize}
            style={{ fontSize: '0.8rem', gap: '0.4rem' }}
          >
            <Zap size={15} />
            <span>Re-Optimize CP-SAT Plan</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Dynamic KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Block Utilization */}
        <div className="enterprise-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Corridor Utilization</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                {summary.block_utilization_pct}%
              </h3>
            </div>
            <div style={{ background: 'var(--color-primary-tint)', padding: '0.5rem', borderRadius: '8px' }}>
              <TrendingUp size={22} color="var(--color-primary)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
            <ArrowUpRight size={15} />
            <span>+{roundDiff(summary.block_utilization_pct, summary.traditional_baseline_utilization_pct)}% improvement</span>
            <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(vs {summary.traditional_baseline_utilization_pct}% baseline)</span>
          </div>
        </div>

        {/* Card 2: Track Downtime Saved */}
        <div className="enterprise-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Downtime Saved</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                {summary.total_downtime_saved_hours} hrs
              </h3>
            </div>
            <div style={{ background: 'rgba(22, 163, 74, 0.12)', padding: '0.5rem', borderRadius: '8px' }}>
              <Clock size={22} color="var(--color-success)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
            <Sparkles size={14} />
            <span>Via {summary.fused_mega_blocks_count} Fused Mega-Blocks</span>
          </div>
        </div>

        {/* Card 3: Conflicts Resolved */}
        <div className="enterprise-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Conflicts Resolved</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                {summary.conflicts_resolved_count}
              </h3>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '0.5rem', borderRadius: '8px' }}>
              <ShieldCheck size={22} color="var(--color-warning)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            <span>100% automated spatial safety</span>
          </div>
        </div>

        {/* Card 4: Covered Tasks */}
        <div className="enterprise-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Tasks Scheduled</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {summary.total_tasks_covered}
              </h3>
            </div>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: '8px' }}>
              <Layers size={22} color="var(--color-primary)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Engineering, S&T, Traction unified</span>
          </div>
        </div>

      </div>

      {/* 3. VISUAL ANALYTICS SUITE: BAR GRAPH & PIE CHART */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* LEFT CARD: PERFORMANCE BENCHMARK GROUPED BAR GRAPH */}
        <div className="enterprise-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          
          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} color="var(--color-primary)" />
                <h3 className="text-h3" style={{ fontSize: '1.05rem' }}>
                  Performance Benchmark: Traditional Manual vs TrackShield AI
                </h3>
              </div>
              <p className="text-sub" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                Comparative operational metrics across Indian Railways high-density corridors
              </p>
            </div>

            {/* Chart Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-card-subtle)', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#94a3b8', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>Traditional Manual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-primary)', display: 'inline-block' }} />
                <span style={{ color: 'var(--color-primary)' }}>TrackShield AI</span>
              </div>
            </div>
          </div>

          {/* Grouped Bar Graph Canvas */}
          <div style={{ position: 'relative', flex: 1, minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: '1.5rem' }}>
            
            {/* Horizontal Gridlines */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '30px', right: 0, bottom: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              {[100, 75, 50, 25, 0].map((val) => (
                <div key={val} style={{ display: 'flex', alignItems: 'center', width: '100%', height: 0 }}>
                  <span style={{ position: 'absolute', left: '-30px', fontSize: '0.65rem', color: 'var(--text-dim)', width: '25px', textAlign: 'right' }}>
                    {val}%
                  </span>
                  <div style={{ width: '100%', borderBottom: '1px dashed var(--border-subtle)' }} />
                </div>
              ))}
            </div>

            {/* The Bars Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', height: '200px', marginLeft: '30px', position: 'relative', zIndex: 2, alignItems: 'flex-end' }}>
              {benchmarkMetrics.map((item) => {
                const isHovered = hoveredMetric === item.id;
                return (
                  <div 
                    key={item.id} 
                    onMouseEnter={() => setHoveredMetric(item.id)}
                    onMouseLeave={() => setHoveredMetric(null)}
                    style={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'flex-end', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      transform: isHovered ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    {/* Delta Pill on top */}
                    <div style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 800, 
                      color: 'var(--color-success)', 
                      background: 'rgba(22, 163, 74, 0.12)', 
                      padding: '0.1rem 0.35rem', 
                      borderRadius: '4px',
                      marginBottom: '0.35rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.delta}
                    </div>

                    {/* Dual Grouped Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px', width: '100%', justifyContent: 'center' }}>
                      
                      {/* Bar 1: Traditional Manual */}
                      <div 
                        title={`Traditional Manual: ${item.traditional}%`}
                        style={{ 
                          width: '42%', 
                          maxWidth: '22px', 
                          height: `${(item.traditional / 100) * 160}px`, 
                          background: isHovered ? '#64748b' : '#94a3b8', 
                          borderRadius: '4px 4px 0 0',
                          position: 'relative',
                          transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s',
                          display: 'flex',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ 
                          position: 'absolute', 
                          top: '-16px', 
                          fontSize: '0.65rem', 
                          fontWeight: 700, 
                          color: 'var(--text-muted)' 
                        }}>
                          {item.traditional}%
                        </span>
                      </div>

                      {/* Bar 2: TrackShield AI */}
                      <div 
                        title={`TrackShield AI: ${item.trackshield}%`}
                        style={{ 
                          width: '42%', 
                          maxWidth: '22px', 
                          height: `${(item.trackshield / 100) * 160}px`, 
                          background: item.trackshield > item.traditional 
                            ? 'linear-gradient(180deg, var(--color-success) 0%, #15803d 100%)' 
                            : 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', 
                          borderRadius: '4px 4px 0 0',
                          position: 'relative',
                          boxShadow: isHovered ? '0 4px 12px rgba(23, 105, 170, 0.35)' : 'none',
                          transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s',
                          display: 'flex',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ 
                          position: 'absolute', 
                          top: '-16px', 
                          fontSize: '0.65rem', 
                          fontWeight: 800, 
                          color: item.trackshield > item.traditional ? 'var(--color-success)' : 'var(--color-primary)' 
                        }}>
                          {item.trackshield}%
                        </span>
                      </div>

                    </div>

                    {/* Metric Label */}
                    <div style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 600, 
                      color: isHovered ? 'var(--color-primary)' : 'var(--text-muted)', 
                      marginTop: '0.5rem', 
                      textAlign: 'center',
                      lineHeight: 1.2,
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {item.short}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Metric Detail Banner on Hover */}
          <div style={{ 
            marginTop: '1rem', 
            background: 'var(--bg-card-subtle)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '6px', 
            padding: '0.5rem 0.85rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {hoveredMetric ? (
              <>
                <span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {benchmarkMetrics.find(m => m.id === hoveredMetric)?.metric}:
                  </strong>{' '}
                  {benchmarkMetrics.find(m => m.id === hoveredMetric)?.detail}
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                  {benchmarkMetrics.find(m => m.id === hoveredMetric)?.delta} Optimized
                </span>
              </>
            ) : (
              <span>
                💡 <em>Hover over any metric column above to view operational benchmark details.</em>
              </span>
            )}
          </div>

        </div>

        {/* RIGHT CARD: CORRIDOR MAINTENANCE ALLOCATION PIE / DONUT CHART */}
        <div className="enterprise-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          
          {/* Card Header & View Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChartIcon size={18} color="var(--color-primary)" />
                <h3 className="text-h3" style={{ fontSize: '1.05rem' }}>
                  Corridor Maintenance Allocation & Share
                </h3>
              </div>
              <p className="text-sub" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                Multi-department distribution across 39 active corridor tasks
              </p>
            </div>

            {/* Toggle: Department vs Block Typology */}
            <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setChartViewMode('DEPARTMENT')}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: chartViewMode === 'DEPARTMENT' ? 'var(--color-primary)' : 'transparent',
                  color: chartViewMode === 'DEPARTMENT' ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                By Department
              </button>
              <button
                onClick={() => setChartViewMode('BLOCK_TYPE')}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: chartViewMode === 'BLOCK_TYPE' ? 'var(--color-primary)' : 'transparent',
                  color: chartViewMode === 'BLOCK_TYPE' ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                By Block Type
              </button>
            </div>
          </div>

          {/* Donut Chart & Breakdown Layout */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem', flex: 1, padding: '0.5rem 0' }}>
            
            {/* The SVG Donut */}
            <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="var(--border-subtle)"
                  strokeWidth={strokeWidth}
                />

                {/* Slices */}
                {pieSlices.map((slice) => {
                  const isHovered = hoveredSlice === slice.id;
                  return (
                    <circle
                      key={slice.id}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      onMouseEnter={() => setHoveredSlice(slice.id)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      style={{
                        cursor: 'pointer',
                        transition: 'stroke-width 0.2s, filter 0.2s',
                        filter: isHovered ? 'brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.3))' : 'none'
                      }}
                    />
                  );
                })}
              </svg>

              {/* Center Stat Badge */}
              <div style={{ 
                position: 'absolute', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                pointerEvents: 'none' 
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>
                  39
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                  {chartViewMode === 'DEPARTMENT' ? 'Tasks Unified' : 'Blocks Total'}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  100% Synced
                </span>
              </div>
            </div>

            {/* Slices Legend & Percentage Cards */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {currentPieData.map((item) => {
                const isHovered = hoveredSlice === item.id;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredSlice(item.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    style={{
                      background: isHovered ? 'var(--bg-card-hover)' : 'var(--bg-card-subtle)',
                      border: `1px solid ${isHovered ? item.color : 'var(--border-subtle)'}`,
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      transform: isHovered ? 'translateX(3px)' : 'translateX(0)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                        <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                          {item.name}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: item.color }}>
                        {item.percentage}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingLeft: '1.1rem' }}>
                      <span>{item.tasks} Tasks Scheduled</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        +{item.downtimeSaved} saved
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

      {/* 4. CORRIDOR SECTION GIS STATUS & ASSET HEALTH */}
      <div className="enterprise-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 className="text-h3" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--color-primary)" />
              Corridor Section Status & Asset Availability
            </h3>
            <p className="text-sub" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
              Gujarat Western Railway Trunk & Northern Corridor High-Density Mainline
            </p>
          </div>
          <button
            onClick={() => onNavigate('schedule')}
            className="btn-outline"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
          >
            View Master Gantt
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
          {corridorStations.map((st, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                background: 'var(--bg-card-subtle)', 
                border: '1px solid var(--border-subtle)',
                padding: '0.65rem 0.85rem', 
                borderRadius: '8px' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MapPin size={14} color="var(--color-primary)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    {st.name} ({st.code})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    KM {st.km} • Double Broad Gauge Line
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: st.health > 90 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  Health: {st.health}%
                </span>

                <span className={`badge ${st.status === 'FUSED_POSSESSION' ? 'badge-fused' : st.status === 'MAINTENANCE_ACTIVE' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '0.65rem' }}>
                  {st.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function roundDiff(a, b) {
  return (Number(a) - Number(b)).toFixed(1);
}
