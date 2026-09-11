import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Shield, 
  Train, 
  Layers, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Wrench, 
  TrendingUp, 
  ArrowRight, 
  MapPin, 
  Radio, 
  Cpu, 
  Check, 
  FileText, 
  ExternalLink,
  Sliders,
  ChevronRight,
  Gauge
} from 'lucide-react';

export default function OperationsDashboard({ 
  kpis, 
  onNavigate, 
  onTriggerOptimize, 
  onTriggerFusion,
  onOpenReportProblem,
  scheduleData,
  onSelectBlock
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSection, setSelectedSection] = useState('SEC_GZB_MIU_UP');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Corridor schematic sections
  const corridorSections = [
    {
      id: 'SEC_GZB_MIU_UP',
      name: 'Ghaziabad - Maripat',
      line: 'UP',
      from: 'GZB',
      to: 'MIU',
      km: '26.0 - 32.0',
      speed: '130 km/h',
      status: 'FUSED_BLOCK_SCHEDULED',
      statusLabel: 'Fused Block (TMS+TDMS)',
      statusColor: '#ec4899',
      powerState: '25kV Isolation Planned',
      nextTrain: '22435 Vande Bharat (22:00)'
    },
    {
      id: 'SEC_DER_AJR_UP',
      name: 'Dadri - Ajaibpur',
      line: 'UP',
      from: 'DER',
      to: 'AJR',
      km: '42.0 - 44.0',
      speed: '130 km/h',
      status: 'SMMS_BLOCK_SCHEDULED',
      statusLabel: 'EI Cable Testing (SMMS)',
      statusColor: '#8b5cf6',
      powerState: 'OHE Live',
      nextTrain: '12302 Rajdhani (16:50)'
    },
    {
      id: 'SEC_DKDE_WAIR_DN',
      name: 'Dankaur - Wair',
      line: 'DN',
      from: 'DKDE',
      to: 'WAIR',
      km: '60.0 - 64.0',
      speed: '130 km/h',
      status: 'FUSED_BLOCK_SCHEDULED',
      statusLabel: 'Rail Grinding (TMS+SMMS)',
      statusColor: '#ec4899',
      powerState: 'OHE Live',
      nextTrain: '22436 Vande Bharat (06:00)'
    },
    {
      id: 'SEC_KRJ_SOM_DN',
      name: 'Khurja - Somna',
      line: 'DN',
      from: 'KRJ',
      to: 'SOM',
      km: '93.5 - 98.0',
      speed: '130 km/h',
      status: 'TDMS_BLOCK_SCHEDULED',
      statusLabel: 'Catenary Stagger (TDMS)',
      statusColor: '#0284c7',
      powerState: 'KRJ-TSS Cut Scheduled',
      nextTrain: '12002 Shatabdi (07:00)'
    },
    {
      id: 'SEC_SOM_ALJN_UP',
      name: 'Somna - Aligarh',
      line: 'UP',
      from: 'SOM',
      to: 'ALJN',
      km: '118.0 - 120.0',
      speed: '130 km/h',
      status: 'USFD_DAY_SHADOW',
      statusLabel: 'USFD Testing (TMS)',
      statusColor: '#f59e0b',
      powerState: 'OHE Live',
      nextTrain: 'G-COAL-101 Freight (13:15)'
    },
    {
      id: 'SEC_ALJN_HRS_DN',
      name: 'Aligarh - Hathras',
      line: 'DN',
      from: 'ALJN',
      to: 'HRS',
      km: '131.0 - 142.0',
      speed: '130 km/h',
      status: 'CLEAR_TRAFFIC',
      statusLabel: 'Clear High-Speed Corridor',
      statusColor: '#16a34a',
      powerState: 'OHE Live',
      nextTrain: '12302 Rajdhani (17:15)'
    }
  ];

  // Active blocks for Today
  const activeBlocks = [
    {
      id: 'FUSED_BLK_GZB_01',
      name: 'Fused Mega-Block: BCM Track Renewal + OHE Inspection',
      type: 'FUSED_BLOCK',
      section: 'SEC_GZB_MIU_UP (Ghaziabad - Maripat)',
      track: 'UP Line (KM 26.0 - 32.0)',
      window: '01:30 - 04:00 (150 mins)',
      departments: ['TMS', 'TDMS'],
      downtimeSaved: 90,
      machines: 'BCM-342 Ballast Cleaner, Tower Wagon #12',
      status: 'OFFICIALLY_SANCTIONED'
    },
    {
      id: 'BLK_DER_02',
      name: 'Electronic Interlocking Cable Testing',
      type: 'SINGLE_BLOCK',
      section: 'SEC_DER_AJR_UP (Dadri - Ajaibpur)',
      track: 'UP Line (KM 42.0 - 44.0)',
      window: '02:00 - 04:00 (120 mins)',
      departments: ['SMMS'],
      downtimeSaved: 0,
      machines: 'S&T Diagnostic Van #04',
      status: 'PENDING_APPROVAL'
    },
    {
      id: 'FUSED_BLK_DKDE_03',
      name: 'Fused Mega-Block: Rail Grinding + Point Overhaul',
      type: 'FUSED_BLOCK',
      section: 'SEC_DKDE_WAIR_DN (Dankaur - Wair)',
      track: 'DN Line (KM 60.0 - 64.0)',
      window: '01:20 - 04:00 (160 mins)',
      departments: ['TMS', 'SMMS'],
      downtimeSaved: 75,
      machines: 'RGM-08 Rail Grinder, Point Inspection Kit',
      status: 'OFFICIALLY_SANCTIONED'
    },
    {
      id: 'BLK_KRJ_04',
      name: '25kV Catenary Stagger Adjustment',
      type: 'SINGLE_BLOCK',
      section: 'SEC_KRJ_SOM_DN (Khurja - Somna)',
      track: 'DN Line (KM 93.5 - 98.0)',
      window: '01:45 - 04:00 (135 mins)',
      departments: ['TDMS'],
      downtimeSaved: 0,
      machines: '8-Wheeler Tower Wagon #19',
      status: 'PENDING_APPROVAL'
    }
  ];

  // Live Telemetry Event Feed
  const telemetryEvents = [
    {
      time: '09:42:10',
      type: 'DISPATCH',
      icon: Train,
      color: '#2563eb',
      title: 'Train #22436 Vande Bharat Express cleared Dadri Interlocking',
      detail: 'Running on schedule at 130 km/h. Headway buffer to Golden Night Window: 100% clear.'
    },
    {
      time: '09:35:00',
      type: 'SANCTION',
      icon: Shield,
      color: '#16a34a',
      title: 'Joint Sanction Memo DRM/OPT/BLK/FUSED_GZB_01 Confirmed',
      detail: 'Civil (TMS), Traction (TDMS), and Operating (Sr. DOM) concurrent concurrence signed.'
    },
    {
      time: '09:15:22',
      type: 'OHE',
      icon: Zap,
      color: '#0284c7',
      title: 'KRJ-TSS-25kV Feeder Pre-Check Completed',
      detail: 'Discharge rods and traction isolation permits generated for TRD Gang #19.'
    },
    {
      time: '08:50:14',
      type: 'TMS',
      icon: Wrench,
      color: '#f59e0b',
      title: 'BCM-342 Ballast Cleaner Staged at GZB Holding Siding',
      detail: 'Machine crew and safety pilot on board. Ready for 01:30 possession.'
    }
  ];

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Header & Live Corridor Status Strip */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem 1.5rem', 
        marginBottom: '1.25rem', 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Corridor Brand & Shift Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, var(--color-primary), #0284c7)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(23, 105, 170, 0.3)'
            }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                  Corridor Operations Command Center
                </h1>
                <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Radio size={10} className="pulse" />
                  <span>LIVE TRAFFIC ACTIVE</span>
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Northern Railway (NR) • Delhi - Kanpur - Pt. Deen Dayal Upadhyaya Trunk Route (KM 26.0 - 142.0)
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate && onNavigate('fusion')}
              className="btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={14} />
              <span>Auto-Fusion Engine</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('schedule')}
              className="btn-outline"
              style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Layers size={14} color="var(--color-primary)" />
              <span>Master Gantt</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('conflicts')}
              className="btn-outline"
              style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <AlertTriangle size={14} color="var(--color-warning)" />
              <span>Risk & Conflicts</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. Key Operational KPI Cards Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.25rem' 
      }}>
        
        {/* Card 1: Line Availability */}
        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Corridor Line Availability
            </span>
            <Gauge size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            97.2%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <TrendingUp size={12} />
            <span>+2.8% above baseline target</span>
          </div>
        </div>

        {/* Card 2: Express Train Punctuality */}
        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Corridor Punctuality Index
            </span>
            <Train size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            99.4%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <CheckCircle2 size={12} />
            <span>Zero maintenance-induced train delay</span>
          </div>
        </div>

        {/* Card 3: AI Fusion Downtime Saved */}
        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AI Fusion Capacity Saved
            </span>
            <Sparkles size={16} color="#ec4899" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ec4899', letterSpacing: '-0.02em' }}>
            165 mins
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
            2 Fused Mega-Blocks (42% closure saved)
          </div>
        </div>

        {/* Card 4: Golden Window Readiness */}
        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Golden Window (01:15-04:45)
            </span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706', letterSpacing: '-0.02em' }}>
            4 Possessions
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
            Pre-sanctioned with OHE grounding permits
          </div>
        </div>

      </div>

      {/* 3. Main Grid: Corridor Schematic & Multi-Dept Readiness */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* Left: Live Corridor Schematic & Section Health */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: '12px' 
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MapPin size={18} color="var(--color-primary)" />
                Real-Time Corridor Topology & Section Health
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Live double-line status along Ghaziabad (KM 26.0) ➔ Hathras (KM 142.0) trunk mainline
              </p>
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              Double BG Electrified • 130 km/h Max
            </span>
          </div>

          {/* Section Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {corridorSections.map((sec) => (
              <div 
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: selectedSection === sec.id ? 'var(--bg-card-hover)' : 'var(--bg-card-subtle)',
                  border: selectedSection === sec.id ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  transition: 'all 0.15s ease'
                }}
              >
                
                {/* Left: Section details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span 
                    className={`badge ${sec.line === 'UP' ? 'badge-tdms' : 'badge-tms'}`}
                    style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.5rem' }}
                  >
                    {sec.line} LINE
                  </span>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {sec.name}
                    </h4>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <span>KM {sec.km}</span>
                      <span>•</span>
                      <span>{sec.speed}</span>
                      <span>•</span>
                      <span style={{ color: sec.powerState.includes('Isolated') ? '#ef4444' : 'var(--text-dim)' }}>
                        {sec.powerState}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Operational Status Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: sec.statusColor, 
                    background: `${sec.statusColor}18`, 
                    padding: '0.25rem 0.65rem', 
                    borderRadius: '6px',
                    border: `1px solid ${sec.statusColor}40`
                  }}>
                    {sec.statusLabel}
                  </span>

                  <ChevronRight size={16} color="var(--text-dim)" />
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Right: Multi-Department Concurrence & Readiness Matrix */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: '12px' 
        }}>
          
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Shield size={18} color="var(--color-primary)" />
              Department Concurrence Matrix
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Statutory 3-department sign-off status (G&SR Para 4.12)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            
            {/* TMS Box */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706' }}>Track Engineering (TMS)</span>
                <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>READY</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Gang #4 stationed at GZB. BCM-342 Ballast Cleaner certified. Track speed restriction notice 45 km/h prepared.
              </div>
            </div>

            {/* SMMS Box */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed' }}>Signals & Telecom (SMMS)</span>
                <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>READY</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Electronic Interlocking (EI) testing at Dadri verified. Relay room access permits signed with Station Master.
              </div>
            </div>

            {/* TDMS Box */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>Traction / 25kV OHE (TDMS)</span>
                <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>READY</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                GZB-TSS-25kV feeder sector isolated. 8-Wheeler Tower Wagon #12 standing by with earthing discharge rods.
              </div>
            </div>

            {/* Operating Box */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a' }}>Operating Control (Sr. DOM)</span>
                <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>SANCTIONED</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Green corridor confirmed between 01:15 - 04:45. Zero disruption to Vande Bharat #22436 & Rajdhani #12302.
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 4. Bottom Grid: Today's Actionable Possessions & Live Event Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.25rem' }}>
        
        {/* Left: Scheduled Possessions Queue */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: '12px' 
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Layers size={18} color="var(--color-primary)" />
                Today's Corridor Maintenance Possessions
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Active multi-department block windows ready for execution & sanction
              </p>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('schedule')}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>View Full Gantt</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeBlocks.map((b) => {
              const isFused = b.type === 'FUSED_BLOCK';
              return (
                <div 
                  key={b.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span className={`badge ${isFused ? 'badge-fused' : 'badge-tms'}`} style={{ fontSize: '0.65rem' }}>
                        {isFused ? '✨ FUSED MEGA-BLOCK' : 'STANDALONE'}
                      </span>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        {b.name}
                      </h4>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{b.section}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.window}</span>
                      {b.downtimeSaved > 0 && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#ec4899', fontWeight: 700 }}>+{b.downtimeSaved}m saved</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${b.status === 'OFFICIALLY_SANCTIONED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                      {b.status === 'OFFICIALLY_SANCTIONED' ? 'SANCTIONED' : 'PENDING'}
                    </span>

                    <button
                      onClick={() => onSelectBlock && onSelectBlock(b)}
                      className="btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                    >
                      Sanction Memo
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* Right: Live Telemetry & Dispatch Feed */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: '12px' 
        }}>
          
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Radio size={18} color="var(--color-primary)" className="pulse" />
              Live Telemetry & Activity Feed
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Real-time corridor events, train passages, and block updates
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {telemetryEvents.map((ev, idx) => {
              const IconComp = ev.icon;
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '6px', 
                    background: `${ev.color}18`, 
                    color: ev.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <IconComp size={15} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {ev.title}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {ev.time}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                      {ev.detail}
                    </p>
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
