import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Layers, 
  Train, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  SlidersHorizontal,
  ChevronRight,
  Zap,
  Radio
} from 'lucide-react';

export default function CorridorGantt({ scheduleData, onSelectBlock, onTriggerOptimize }) {
  const [horizon, setHorizon] = useState('DAILY');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  const blocks = scheduleData?.scheduled_blocks || [];

  // Corridor Sections modeled along the NDLS-DDU trunk
  const sections = [
    { id: 'SEC_GZB_MIU_UP', name: 'Ghaziabad - Maripat (UP Line)', km: '26.0 - 32.0', line: 'UP' },
    { id: 'SEC_DER_AJR_UP', name: 'Dadri - Ajaibpur (UP Line)', km: '42.0 - 44.0', line: 'UP' },
    { id: 'SEC_DKDE_WAIR_DN', name: 'Dankaur - Wair (DN Line)', km: '60.0 - 64.0', line: 'DN' },
    { id: 'SEC_KRJ_SOM_DN', name: 'Khurja - Somna (DN Line)', km: '93.5 - 98.0', line: 'DN' },
    { id: 'SEC_SOM_ALJN_UP', name: 'Somna - Aligarh (UP Line)', km: '118.0 - 120.0', line: 'UP' },
    { id: 'SEC_ALJN_HRS_DN', name: 'Aligarh - Hathras (DN Line)', km: '131.0 - 142.0', line: 'DN' }
  ];

  // Train paths passing through sections
  const sampleTrains = [
    { train_no: '22436', name: 'Vande Bharat Express', startMin: 360, endMin: 395, line: 'DN', type: 'PREMIUM' },
    { train_no: '12002', name: 'Bhopal Shatabdi', startMin: 375, endMin: 410, line: 'DN', type: 'PREMIUM' },
    { train_no: '12302', name: 'Howrah Rajdhani', startMin: 1010, endMin: 1045, line: 'DN', type: 'PREMIUM' },
    { train_no: '22435', name: 'Vande Bharat Express', startMin: 1320, endMin: 1355, line: 'UP', type: 'PREMIUM' },
    { train_no: 'G-COAL-101', name: 'Freight Coal Bulk Rake', startMin: 90, endMin: 150, line: 'DN', type: 'FREIGHT' }
  ];

  // Filter blocks
  const filteredBlocks = blocks.filter(b => {
    if (filterLine !== 'ALL' && b.track_line !== filterLine) return false;
    if (filterDept !== 'ALL') {
      if (filterDept === 'FUSED' && b.type !== 'FUSED_BLOCK') return false;
      if (filterDept !== 'FUSED' && !b.departments.includes(filterDept)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header & Controls Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="#38bdf8" />
            Master Corridor Timetable & Block Schedule
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            Multi-Department Possession Windows vs Passenger & Freight Timetable Paths (24-Hour Horizon)
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Horizon Selector */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['DAILY', 'WEEKLY', 'MONTHLY'].map(h => (
              <button
                key={h}
                onClick={() => { setHorizon(h); onTriggerOptimize(h); }}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: horizon === h ? 700 : 500,
                  color: horizon === h ? '#ffffff' : '#94a3b8',
                  background: horizon === h ? '#0284c7' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {h === 'DAILY' ? 'Daily (24h)' : h === 'WEEKLY' ? 'Weekly (7d)' : 'Monthly (30d)'}
              </button>
            ))}
          </div>

          {/* Track Line Filter */}
          <select 
            value={filterLine} 
            onChange={(e) => setFilterLine(e.target.value)}
            style={{ background: '#0f172a', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Track Lines</option>
            <option value="UP">UP Line Only</option>
            <option value="DN">DN Line Only</option>
          </select>

          {/* Department Filter */}
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ background: '#0f172a', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Departments</option>
            <option value="FUSED">✨ Fused Mega-Blocks Only</option>
            <option value="TMS">TMS (Engineering)</option>
            <option value="SMMS">SMMS (S&T)</option>
            <option value="TDMS">TDMS (Traction / OHE)</option>
          </select>

        </div>

      </div>

      {/* Legend Ribbon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#94a3b8' }}>LEGEND:</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ec4899', boxShadow: '0 0 6px #ec4899' }} />
            <span style={{ color: '#f472b6', fontWeight: 700 }}>Fused Mega-Block (Multi-Dept)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
            <span style={{ color: '#fbbf24' }}>Engineering (TMS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#a855f7' }} />
            <span style={{ color: '#c084fc' }}>Signalling (SMMS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#06b6d4' }} />
            <span style={{ color: '#38bdf8' }}>Traction (TDMS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }} />
            <span style={{ color: '#60a5fa' }}>Express Trains (Vande Bharat / Rajdhani)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 600 }}>
          <Clock size={14} />
          <span>Golden Night Window: 01:15 - 04:45</span>
        </div>
      </div>

      {/* Main Gantt Timeline Canvas */}
      <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <div style={{ minWidth: '1000px' }}>
          
          {/* Time axis header (00:00 to 24:00) */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '220px', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
              CORRIDOR SECTION / KM
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontFamily: 'JetBrains Mono', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
                <span key={h}>{String(h).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>

          {/* Golden Window Overlay indicators */}
          <div style={{ position: 'relative', height: '10px', marginBottom: '0.5rem' }}>
            <div style={{
              position: 'absolute',
              left: `calc(220px + (100% - 220px) * (75 / 1440))`,
              width: `calc((100% - 220px) * (210 / 1440))`,
              height: '6px',
              background: 'rgba(251, 191, 36, 0.4)',
              borderRadius: '3px',
              boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)'
            }} title="Golden Night Window (01:15 - 04:45)" />

            <div style={{
              position: 'absolute',
              left: `calc(220px + (100% - 220px) * (720 / 1440))`,
              width: `calc((100% - 220px) * (210 / 1440))`,
              height: '6px',
              background: 'rgba(6, 182, 212, 0.4)',
              borderRadius: '3px',
              boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)'
            }} title="Afternoon Shadow Window (12:00 - 15:30)" />
          </div>

          {/* Section Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sections.map((sec) => {
              // Find blocks for this section
              const secBlocks = filteredBlocks.filter(b => b.section_id === sec.id);

              return (
                <div key={sec.id} style={{ display: 'flex', alignItems: 'center' }}>
                  
                  {/* Left Label */}
                  <div style={{ width: '220px', flexShrink: 0, paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className={`badge ${sec.line === 'UP' ? 'badge-tdms' : 'badge-tms'}`} style={{ fontSize: '0.65rem' }}>
                        {sec.line}
                      </span>
                      <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sec.name.split('(')[0]}
                      </h5>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>KM {sec.km}</span>
                  </div>

                  {/* Right Timeline Canvas */}
                  <div className="timeline-track" style={{ flex: 1, position: 'relative' }}>
                    
                    {/* Train Paths in this section */}
                    {sampleTrains.filter(t => t.line === sec.line).map((tr, idx) => {
                      const leftPct = (tr.startMin / 1440) * 100;
                      const widthPct = ((tr.endMin - tr.startMin) / 1440) * 100;
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            width: `${Math.max(widthPct, 2)}%`,
                            top: '2px',
                            bottom: '2px',
                            background: tr.type === 'PREMIUM' ? 'rgba(59, 130, 246, 0.65)' : 'rgba(100, 116, 139, 0.5)',
                            border: tr.type === 'PREMIUM' ? '1px solid #60a5fa' : '1px solid #94a3b8',
                            borderRadius: '4px',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.625rem',
                            color: '#ffffff',
                            fontWeight: 700,
                            padding: '0 2px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}
                          title={`Train #${tr.train_no} (${tr.name}) [${String(Math.floor(tr.startMin/60)).padStart(2,'0')}:${String(tr.startMin%60).padStart(2,'0')}]`}
                        >
                          <Train size={10} style={{ marginRight: '2px' }} />
                          {tr.train_no}
                        </div>
                      );
                    })}

                    {/* Maintenance Blocks */}
                    {secBlocks.map((b) => {
                      const leftPct = (b.scheduled_start_min / 1440) * 100;
                      const widthPct = (b.duration_mins / 1440) * 100;
                      const isFused = b.type === 'FUSED_BLOCK';

                      let bg = 'rgba(245, 158, 11, 0.85)';
                      let border = '#fbbf24';
                      let color = '#ffffff';

                      if (isFused) {
                        bg = 'linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(168, 85, 247, 0.95))';
                        border = '#f472b6';
                      } else if (b.departments.includes('SMMS')) {
                        bg = 'rgba(168, 85, 247, 0.85)';
                        border = '#c084fc';
                      } else if (b.departments.includes('TDMS')) {
                        bg = 'rgba(6, 182, 212, 0.85)';
                        border = '#38bdf8';
                      }

                      return (
                        <div
                          key={b.id}
                          className="timeline-block"
                          onClick={() => onSelectBlock(b)}
                          style={{
                            left: `${leftPct}%`,
                            width: `${Math.max(widthPct, 4)}%`,
                            background: bg,
                            border: `1px solid ${border}`,
                            color: color,
                            zIndex: 10,
                            boxShadow: isFused ? '0 0 15px rgba(236, 72, 153, 0.5)' : '0 2px 8px rgba(0,0,0,0.5)'
                          }}
                          title={`Click to view: ${b.name} (${b.start_time_str} - ${b.end_time_str})`}
                        >
                          {isFused ? <Sparkles size={12} /> : <Wrench size={11} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isFused ? `FUSED (${b.departments.join('+')})` : b.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.9, marginLeft: 'auto', fontFamily: 'JetBrains Mono' }}>
                            {b.start_time_str}
                          </span>
                        </div>
                      );
                    })}

                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
}
