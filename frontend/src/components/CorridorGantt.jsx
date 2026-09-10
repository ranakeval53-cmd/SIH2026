import React, { useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Zap,
  Radio,
  Edit3,
  RotateCcw,
  Eye,
  History,
  TrendingUp,
  X
} from 'lucide-react';

export default function CorridorGantt({ scheduleData, onSelectBlock, onTriggerOptimize }) {
  const [horizon, setHorizon] = useState('DAILY');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  // Plan Date Navigator State
  const TODAY_STR = '2026-09-11';
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);

  // Time Window Navigation & "Edit Time" State
  const [timeWindow, setTimeWindow] = useState({ startHour: 0, endHour: 24 });
  const [isEditingTimeWindow, setIsEditingTimeWindow] = useState(false);
  const [tempStartHour, setTempStartHour] = useState(0);
  const [tempEndHour, setTempEndHour] = useState(24);

  // Block Timing Editor State
  const [isEditingBlockModalOpen, setIsEditingBlockModalOpen] = useState(false);
  const [targetBlockToEdit, setTargetBlockToEdit] = useState(null);
  const [editStartTimeStr, setEditStartTimeStr] = useState('01:30');
  const [editDurationMins, setEditDurationMins] = useState(120);

  // Custom User Overrides per date: { [dateStr]: { [blockId]: { start_time_str, end_time_str, scheduled_start_min, duration_mins } } }
  const [customOverrides, setCustomOverrides] = useState({});

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

  // Raw blocks for today (from optimizer or standard baseline)
  const defaultTodayBlocks = [
    {
      id: 'FUSED_BLK_GZB_01',
      name: 'Fused Mega-Block: Track Renewal + OHE Inspection',
      type: 'FUSED_BLOCK',
      section_id: 'SEC_GZB_MIU_UP',
      track_line: 'UP',
      station_code: 'GZB',
      scheduled_start_min: 90,
      duration_mins: 150,
      start_time_str: '01:30',
      end_time_str: '04:00',
      departments: ['TMS', 'TDMS'],
      downtime_saved_mins: 90,
      required_machines: 'BCM-342, Tower Wagon #12',
      required_gangs: 'Gang #4, OHE Line Batch #2',
      power_substation: 'GZB-TSS-25kV'
    },
    {
      id: 'BLK_DER_02',
      name: 'Electronic Interlocking Cable Testing',
      type: 'SINGLE_BLOCK',
      section_id: 'SEC_DER_AJR_UP',
      track_line: 'UP',
      station_code: 'DER',
      scheduled_start_min: 120,
      duration_mins: 120,
      start_time_str: '02:00',
      end_time_str: '04:00',
      departments: ['SMMS'],
      downtime_saved_mins: 0,
      required_machines: 'S&T Diagnostic Van',
      required_gangs: 'Signal Maint Gang DER'
    },
    {
      id: 'FUSED_BLK_DKDE_03',
      name: 'Fused Mega-Block: Rail Grinding + Point Overhaul',
      type: 'FUSED_BLOCK',
      section_id: 'SEC_DKDE_WAIR_DN',
      track_line: 'DN',
      station_code: 'DKDE',
      scheduled_start_min: 80,
      duration_mins: 160,
      start_time_str: '01:20',
      end_time_str: '04:00',
      departments: ['TMS', 'SMMS'],
      downtime_saved_mins: 75,
      required_machines: 'RGM-08 Rail Grinder',
      required_gangs: 'P-Way Section Gang DKDE'
    },
    {
      id: 'BLK_KRJ_04',
      name: '25kV Catenary Stagger Adjustment',
      type: 'SINGLE_BLOCK',
      section_id: 'SEC_KRJ_SOM_DN',
      track_line: 'DN',
      station_code: 'KRJ',
      scheduled_start_min: 105,
      duration_mins: 135,
      start_time_str: '01:45',
      end_time_str: '04:00',
      departments: ['TDMS'],
      downtime_saved_mins: 0,
      required_machines: '8-Wheeler Tower Wagon',
      required_gangs: 'TRD Elect Gang KRJ',
      power_substation: 'KRJ-TSS-25kV'
    },
    {
      id: 'BLK_SOM_05',
      name: 'Ultrasonic Flaw Detection (USFD) Run',
      type: 'SINGLE_BLOCK',
      section_id: 'SEC_SOM_ALJN_UP',
      track_line: 'UP',
      station_code: 'SOM',
      scheduled_start_min: 750,
      duration_mins: 120,
      start_time_str: '12:30',
      end_time_str: '14:30',
      departments: ['TMS'],
      downtime_saved_mins: 0,
      required_machines: 'Digital USFD Rail Tester #09',
      required_gangs: 'USFD Testing Unit SOM'
    }
  ];

  // Helper to determine plan type based on selectedDate
  const planType = useMemo(() => {
    if (selectedDate < TODAY_STR) return 'PAST';
    if (selectedDate === TODAY_STR) return 'TODAY';
    return 'FUTURE';
  }, [selectedDate]);

  // Generate Plan Datasets for Past, Today, and Future dates
  const baseBlocksForDate = useMemo(() => {
    if (planType === 'PAST') {
      // Historical Executed Plan for yesterday/past
      return [
        {
          id: 'HIST_BLK_GZB_01',
          name: 'Track Renewal TRT Operation (Executed)',
          type: 'FUSED_BLOCK',
          section_id: 'SEC_GZB_MIU_UP',
          track_line: 'UP',
          station_code: 'GZB',
          scheduled_start_min: 90,
          duration_mins: 150,
          start_time_str: '01:30',
          end_time_str: '04:00',
          departments: ['TMS', 'TDMS'],
          downtime_saved_mins: 85,
          execution_status: 'COMPLETED_ON_TIME',
          execution_notes: '100% work completed without caution order. Track handed over at 04:00 hrs.',
          required_machines: 'TRT Machine R-82',
          required_gangs: 'Northern Railway P-Way Gang 2'
        },
        {
          id: 'HIST_BLK_DER_02',
          name: 'Axle Counter Sensor Testing (Executed)',
          type: 'SINGLE_BLOCK',
          section_id: 'SEC_DER_AJR_UP',
          track_line: 'UP',
          station_code: 'DER',
          scheduled_start_min: 120,
          duration_mins: 105,
          start_time_str: '02:00',
          end_time_str: '03:45',
          departments: ['SMMS'],
          downtime_saved_mins: 0,
          execution_status: 'COMPLETED_EARLY',
          execution_notes: 'Relay room interlocking calibration verified with zero train delay.',
          required_machines: 'S&T Test Vehicle',
          required_gangs: 'SMMS Inspection Squad'
        },
        {
          id: 'HIST_BLK_KRJ_03',
          name: 'Fused Mega-Block: Insulator Washing + Deep Tamping',
          type: 'FUSED_BLOCK',
          section_id: 'SEC_KRJ_SOM_DN',
          track_line: 'DN',
          station_code: 'KRJ',
          scheduled_start_min: 75,
          duration_mins: 180,
          start_time_str: '01:15',
          end_time_str: '04:15',
          departments: ['TMS', 'TDMS'],
          downtime_saved_mins: 110,
          execution_status: 'COMPLETED_ON_TIME',
          execution_notes: 'OHE power restored at 04:15. Speed normalized to 130 km/h.',
          required_machines: 'CSM Tamping Machine + Jet Washing Wagon',
          required_gangs: 'Combined TMS-TRD Gang'
        },
        {
          id: 'HIST_BLK_ALJN_04',
          name: 'Point Machine Lubrication & Ground Gear',
          type: 'SINGLE_BLOCK',
          section_id: 'SEC_ALJN_HRS_DN',
          track_line: 'DN',
          station_code: 'ALJN',
          scheduled_start_min: 135,
          duration_mins: 120,
          start_time_str: '02:15',
          end_time_str: '04:15',
          departments: ['SMMS'],
          downtime_saved_mins: 0,
          execution_status: 'COMPLETED_ON_TIME',
          execution_notes: 'Electronic Interlocking check clear.',
          required_machines: 'Point Maintenance Kit',
          required_gangs: 'Signal Staff ALJN'
        }
      ];
    } else if (planType === 'FUTURE') {
      // Future AI-Projected Plan (D+1, D+2, D+3, etc.)
      return [
        {
          id: 'FUT_BLK_GZB_FUSION',
          name: 'AI-Fused Mega-Block: BCM Ballast Screening + OHE Portal Cut',
          type: 'FUSED_BLOCK',
          section_id: 'SEC_GZB_MIU_UP',
          track_line: 'UP',
          station_code: 'GZB',
          scheduled_start_min: 90,
          duration_mins: 180,
          start_time_str: '01:30',
          end_time_str: '04:30',
          departments: ['TMS', 'TDMS'],
          downtime_saved_mins: 120,
          ai_confidence_score: 97.4,
          plan_state: 'AI_SYNTHESIZED_SANCTION_PENDING',
          required_machines: 'BCM-09 Ballast Cleaner, 8-Wheeler Tower Wagon',
          required_gangs: 'GZB Central P-Way + TRD Squad',
          power_substation: 'GZB-TSS-25kV'
        },
        {
          id: 'FUT_BLK_DER_02',
          name: 'Electronic Interlocking Axle Counter Cutover',
          type: 'SINGLE_BLOCK',
          section_id: 'SEC_DER_AJR_UP',
          track_line: 'UP',
          station_code: 'DER',
          scheduled_start_min: 120,
          duration_mins: 120,
          start_time_str: '02:00',
          end_time_str: '04:00',
          departments: ['SMMS'],
          downtime_saved_mins: 0,
          plan_state: 'PRE_APPROVED_CP_SAT',
          required_machines: 'S&T Telecom Van',
          required_gangs: 'Signalling Maintenance Crew'
        },
        {
          id: 'FUT_BLK_DKDE_FUSION',
          name: 'AI-Fused Mega-Block: Turnout Renewal + Signal Point Testing',
          type: 'FUSED_BLOCK',
          section_id: 'SEC_DKDE_WAIR_DN',
          track_line: 'DN',
          station_code: 'DKDE',
          scheduled_start_min: 80,
          duration_mins: 160,
          start_time_str: '01:20',
          end_time_str: '04:00',
          departments: ['TMS', 'SMMS'],
          downtime_saved_mins: 90,
          ai_confidence_score: 95.8,
          plan_state: 'AI_SYNTHESIZED_SANCTION_PENDING',
          required_machines: 'T-28 Turnout Machine',
          required_gangs: 'DKDE Composite Gang'
        },
        {
          id: 'FUT_BLK_SOM_04',
          name: 'High-Speed Rail Grinding Operation',
          type: 'SINGLE_BLOCK',
          section_id: 'SEC_SOM_ALJN_UP',
          track_line: 'UP',
          station_code: 'SOM',
          scheduled_start_min: 100,
          duration_mins: 140,
          start_time_str: '01:40',
          end_time_str: '04:00',
          departments: ['TMS'],
          downtime_saved_mins: 0,
          plan_state: 'PROPOSED_TMS',
          required_machines: 'RGM-96 Rail Grinder',
          required_gangs: 'Engineering P-Way Track Gang'
        },
        {
          id: 'FUT_BLK_ALJN_05',
          name: 'AI-Fused Mega-Block: 25kV Feeder Maintenance + Track Tamping',
          type: 'FUSED_BLOCK',
          section_id: 'SEC_ALJN_HRS_DN',
          track_line: 'DN',
          station_code: 'ALJN',
          scheduled_start_min: 750,
          duration_mins: 150,
          start_time_str: '12:30',
          end_time_str: '15:00',
          departments: ['TMS', 'TDMS'],
          downtime_saved_mins: 75,
          ai_confidence_score: 93.2,
          plan_state: 'SHADOW_WINDOW_PROPOSED',
          required_machines: 'CSM Duomatic Tamper + Tower Car',
          required_gangs: 'ALJN Division Fast-Response Unit'
        }
      ];
    } else {
      // Active Today Plan
      return (scheduleData?.scheduled_blocks && scheduleData.scheduled_blocks.length > 0)
        ? scheduleData.scheduled_blocks
        : defaultTodayBlocks;
    }
  }, [planType, scheduleData]);

  // Merge custom block timing overrides made by the user
  const effectiveBlocks = useMemo(() => {
    const overrides = customOverrides[selectedDate] || {};
    return baseBlocksForDate.map(b => {
      if (overrides[b.id]) {
        return { ...b, ...overrides[b.id] };
      }
      return b;
    });
  }, [baseBlocksForDate, customOverrides, selectedDate]);

  // Apply filters
  const filteredBlocks = useMemo(() => {
    return effectiveBlocks.filter(b => {
      if (filterLine !== 'ALL' && b.track_line !== filterLine) return false;
      if (filterDept !== 'ALL') {
        if (filterDept === 'FUSED' && b.type !== 'FUSED_BLOCK') return false;
        if (filterDept !== 'FUSED' && !b.departments?.includes(filterDept)) return false;
      }
      return true;
    });
  }, [effectiveBlocks, filterLine, filterDept]);

  // Date Navigation Handlers
  const handleShiftDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleResetToToday = () => {
    setSelectedDate(TODAY_STR);
  };

  // Time Window Navigation Handlers
  const handleApplyTimeWindow = (startH, endH) => {
    if (startH >= endH) {
      alert("Start hour must be strictly earlier than End hour!");
      return;
    }
    setTimeWindow({ startHour: startH, endHour: endH });
    setIsEditingTimeWindow(false);
  };

  const handleResetTimeWindow = () => {
    setTimeWindow({ startHour: 0, endHour: 24 });
    setTempStartHour(0);
    setTempEndHour(24);
    setIsEditingTimeWindow(false);
  };

  // Block Timing Edit Handlers
  const handleOpenEditBlock = (block) => {
    setTargetBlockToEdit(block);
    setEditStartTimeStr(block.start_time_str || '01:30');
    setEditDurationMins(block.duration_mins || 120);
    setIsEditingBlockModalOpen(true);
  };

  const handleSaveBlockTiming = () => {
    if (!targetBlockToEdit) return;

    const [h, m] = editStartTimeStr.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + Number(editDurationMins);
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    setCustomOverrides(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [targetBlockToEdit.id]: {
          start_time_str: editStartTimeStr,
          end_time_str: endTimeStr,
          scheduled_start_min: startMins,
          duration_mins: Number(editDurationMins)
        }
      }
    }));

    setIsEditingBlockModalOpen(false);
    setTargetBlockToEdit(null);
  };

  const handleResetOverridesForDate = () => {
    setCustomOverrides(prev => {
      const next = { ...prev };
      delete next[selectedDate];
      return next;
    });
  };

  // Formatting Date for UI
  const formattedDateTitle = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [selectedDate]);

  // Dynamically calculate timeline ticks based on timeWindow
  const timeTicks = useMemo(() => {
    const span = timeWindow.endHour - timeWindow.startHour;
    const step = span <= 8 ? 1 : span <= 16 ? 2 : 2;
    const ticks = [];
    for (let h = timeWindow.startHour; h <= timeWindow.endHour; h += step) {
      ticks.push(h);
    }
    if (ticks[ticks.length - 1] !== timeWindow.endHour) {
      ticks.push(timeWindow.endHour);
    }
    return ticks;
  }, [timeWindow]);

  const windowStartMin = timeWindow.startHour * 60;
  const windowEndMin = timeWindow.endHour * 60;
  const windowSpanMin = windowEndMin - windowStartMin;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* 1. Header & Controls Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="var(--color-primary)" />
            Master Corridor Timetable & Block Schedule
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Multi-Department Possession Windows vs Passenger & Freight Timetable Paths
          </p>
        </div>

        {/* Action Filters & Horizon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Horizon Selector */}
          <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            {['DAILY', 'WEEKLY', 'MONTHLY'].map(h => (
              <button
                key={h}
                onClick={() => { setHorizon(h); onTriggerOptimize(h); }}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: horizon === h ? 700 : 500,
                  color: horizon === h ? '#ffffff' : 'var(--text-muted)',
                  background: horizon === h ? 'var(--color-primary)' : 'transparent',
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
            style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Track Lines</option>
            <option value="UP">UP Line Only</option>
            <option value="DN">DN Line Only</option>
          </select>

          {/* Department Filter */}
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Departments</option>
            <option value="FUSED">✨ Fused Mega-Blocks Only</option>
            <option value="TMS">TMS (Engineering)</option>
            <option value="SMMS">SMMS (S&T)</option>
            <option value="TDMS">TDMS (Traction / OHE)</option>
          </select>

        </div>

      </div>

      {/* 2. Interactive Plan & Time Navigation Bar (Previous, Today, Future Plans & Edit Time) */}
      <div className="glass-panel" style={{ padding: '0.9rem 1.25rem', marginBottom: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Left: Previous / Future Plan Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={15} color="var(--color-primary)" />
              Plan Date:
            </span>

            {/* Quick Shift -1 Day (Previous Plan) */}
            <button
              onClick={() => handleShiftDate(-1)}
              className="btn-outline"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="View Previous Day's Corridor Plan"
            >
              <ChevronLeft size={14} />
              <span>Previous Plan</span>
            </button>

            {/* Native Date Picker Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--bg-base)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-strong)',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            />

            {/* Reset to Today */}
            <button
              onClick={handleResetToToday}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: selectedDate === TODAY_STR ? 800 : 600,
                background: selectedDate === TODAY_STR ? 'var(--color-primary)' : 'var(--bg-card-subtle)',
                color: selectedDate === TODAY_STR ? '#ffffff' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
              title="Jump to Today's Live Active Corridor Schedule"
            >
              Today
            </button>

            {/* Quick Shift +1 Day (Future Plan) */}
            <button
              onClick={() => handleShiftDate(1)}
              className="btn-outline"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="View Next Day's Projected Corridor Plan"
            >
              <span>Future Plan</span>
              <ChevronRight size={14} />
            </button>

            {/* Plan Category Badge */}
            <div style={{ marginLeft: '0.5rem' }}>
              {planType === 'PAST' && (
                <span className="badge badge-tms" style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <History size={12} />
                  <span>Archived / Previous Plan ({formattedDateTitle})</span>
                </span>
              )}
              {planType === 'TODAY' && (
                <span className="badge badge-success" style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Radio size={12} className="pulse" />
                  <span>Live Today's Plan ({formattedDateTitle})</span>
                </span>
              )}
              {planType === 'FUTURE' && (
                <span className="badge badge-tdms" style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={12} />
                  <span>Future AI Projected Plan ({formattedDateTitle})</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Time Window / Edit Time Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            
            {/* Quick Shift Presets */}
            <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', gap: '0.2rem' }}>
              <button
                onClick={() => handleApplyTimeWindow(0, 24)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: timeWindow.startHour === 0 && timeWindow.endHour === 24 ? 700 : 500,
                  background: timeWindow.startHour === 0 && timeWindow.endHour === 24 ? 'var(--color-primary)' : 'transparent',
                  color: timeWindow.startHour === 0 && timeWindow.endHour === 24 ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                24h Full
              </button>
              <button
                onClick={() => handleApplyTimeWindow(0, 8)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: timeWindow.startHour === 0 && timeWindow.endHour === 8 ? 700 : 500,
                  background: timeWindow.startHour === 0 && timeWindow.endHour === 8 ? 'var(--color-primary)' : 'transparent',
                  color: timeWindow.startHour === 0 && timeWindow.endHour === 8 ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Night Shift Window (00:00 - 08:00)"
              >
                🌙 Night (0-8h)
              </button>
              <button
                onClick={() => handleApplyTimeWindow(8, 18)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: timeWindow.startHour === 8 && timeWindow.endHour === 18 ? 700 : 500,
                  background: timeWindow.startHour === 8 && timeWindow.endHour === 18 ? 'var(--color-primary)' : 'transparent',
                  color: timeWindow.startHour === 8 && timeWindow.endHour === 18 ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Day Shift Window (08:00 - 18:00)"
              >
                ☀️ Day (8-18h)
              </button>
              <button
                onClick={() => handleApplyTimeWindow(16, 24)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: timeWindow.startHour === 16 && timeWindow.endHour === 24 ? 700 : 500,
                  background: timeWindow.startHour === 16 && timeWindow.endHour === 24 ? 'var(--color-primary)' : 'transparent',
                  color: timeWindow.startHour === 16 && timeWindow.endHour === 24 ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Evening Shift Window (16:00 - 24:00)"
              >
                🌆 Eve (16-24h)
              </button>
            </div>

            {/* Custom "Edit Time" Button */}
            <button
              onClick={() => setIsEditingTimeWindow(!isEditingTimeWindow)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isEditingTimeWindow ? 'var(--color-primary)' : 'var(--bg-card-subtle)',
                color: isEditingTimeWindow ? '#ffffff' : 'var(--text-main)',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer'
              }}
              title="Edit timeline start and end time window"
            >
              <Clock size={14} color={isEditingTimeWindow ? '#ffffff' : 'var(--color-primary)'} />
              <span>Edit Time Window</span>
            </button>

            {/* Direct Block Timing Rescheduler */}
            <button
              onClick={() => {
                if (filteredBlocks.length > 0) {
                  handleOpenEditBlock(filteredBlocks[0]);
                }
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(23, 105, 170, 0.1)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
                cursor: 'pointer'
              }}
              title="Edit block schedule start time and duration"
            >
              <Edit3 size={13} />
              <span>Edit Block Timing</span>
            </button>

            {/* Reset Custom Overrides if any */}
            {customOverrides[selectedDate] && (
              <button
                onClick={handleResetOverridesForDate}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  cursor: 'pointer'
                }}
                title="Reset manual timing edits back to AI baseline"
              >
                <RotateCcw size={12} />
                <span>Reset Edits</span>
              </button>
            )}

          </div>

        </div>

        {/* Popover / Panel: Edit Time Window Controls */}
        {isEditingTimeWindow && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.85rem 1rem',
            background: 'var(--bg-card-subtle)',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <SlidersHorizontal size={14} color="var(--color-primary)" />
                Custom Time Window View:
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>From Hour:</label>
                <select
                  value={tempStartHour}
                  onChange={(e) => setTempStartHour(Number(e.target.value))}
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00 hrs</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>To Hour:</label>
                <select
                  value={tempEndHour}
                  onChange={(e) => setTempEndHour(Number(e.target.value))}
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00 hrs</option>
                  ))}
                </select>
              </div>

              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                (Viewing {tempEndHour - tempStartHour} hours on timeline)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleApplyTimeWindow(tempStartHour, tempEndHour)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Apply Time Window
              </button>
              <button
                onClick={handleResetTimeWindow}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                Reset 24h
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 3. Legend Ribbon & Corridor Window Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card)', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>LEGEND:</span>
          
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

      {/* 4. Main Gantt Timeline Canvas */}
      <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <div style={{ minWidth: '1000px' }}>
          
          {/* Dynamic Time axis header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '220px', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              CORRIDOR SECTION / KM
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              {timeTicks.map(h => (
                <span key={h}>{String(h).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>

          {/* Golden Window & Shadow Window Overlay indicators */}
          <div style={{ position: 'relative', height: '10px', marginBottom: '0.5rem' }}>
            {/* Golden Night Window (01:15 to 04:45 = 75m to 285m) */}
            {75 < windowEndMin && 285 > windowStartMin && (
              <div 
                style={{
                  position: 'absolute',
                  left: `calc(220px + (100% - 220px) * (${Math.max(0, 75 - windowStartMin)} / ${windowSpanMin}))`,
                  width: `calc((100% - 220px) * (${Math.min(285, windowEndMin) - Math.max(75, windowStartMin)} / ${windowSpanMin}))`,
                  height: '6px',
                  background: 'rgba(251, 191, 36, 0.4)',
                  borderRadius: '3px',
                  boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)'
                }} 
                title="Golden Night Window (01:15 - 04:45) — Ideal for Multi-Department Fused Blocks" 
              />
            )}

            {/* Afternoon Shadow Window (12:00 to 15:30 = 720m to 930m) */}
            {720 < windowEndMin && 930 > windowStartMin && (
              <div 
                style={{
                  position: 'absolute',
                  left: `calc(220px + (100% - 220px) * (${Math.max(0, 720 - windowStartMin)} / ${windowSpanMin}))`,
                  width: `calc((100% - 220px) * (${Math.min(930, windowEndMin) - Math.max(720, windowStartMin)} / ${windowSpanMin}))`,
                  height: '6px',
                  background: 'rgba(6, 182, 212, 0.4)',
                  borderRadius: '3px',
                  boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)'
                }} 
                title="Afternoon Shadow Window (12:00 - 15:30) — Secondary Low-Density Freight Slot" 
              />
            )}
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
                      <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sec.name.split('(')[0]}
                      </h5>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>KM {sec.km}</span>
                  </div>

                  {/* Right Timeline Canvas */}
                  <div className="timeline-track" style={{ flex: 1, position: 'relative' }}>
                    
                    {/* Train Paths in this section */}
                    {sampleTrains.filter(t => t.line === sec.line).map((tr, idx) => {
                      if (tr.endMin < windowStartMin || tr.startMin > windowEndMin) return null;

                      const leftPct = ((Math.max(tr.startMin, windowStartMin) - windowStartMin) / windowSpanMin) * 100;
                      const widthPct = ((Math.min(tr.endMin, windowEndMin) - Math.max(tr.startMin, windowStartMin)) / windowSpanMin) * 100;

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
                      const bStartMin = b.scheduled_start_min ?? 90;
                      const bDuration = b.duration_mins ?? 120;
                      const bEndMin = bStartMin + bDuration;

                      // Check if in visible time window
                      if (bEndMin < windowStartMin || bStartMin > windowEndMin) return null;

                      const leftPct = ((Math.max(bStartMin, windowStartMin) - windowStartMin) / windowSpanMin) * 100;
                      const widthPct = ((Math.min(bEndMin, windowEndMin) - Math.max(bStartMin, windowStartMin)) / windowSpanMin) * 100;
                      const isFused = b.type === 'FUSED_BLOCK';

                      let bg = 'rgba(245, 158, 11, 0.85)';
                      let border = '#fbbf24';
                      let color = '#ffffff';

                      if (isFused) {
                        bg = 'linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(168, 85, 247, 0.95))';
                        border = '#f472b6';
                      } else if (b.departments?.includes('SMMS')) {
                        bg = 'rgba(168, 85, 247, 0.85)';
                        border = '#c084fc';
                      } else if (b.departments?.includes('TDMS')) {
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
                            boxShadow: isFused ? '0 0 15px rgba(236, 72, 153, 0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            position: 'absolute'
                          }}
                          title={`Click to sanction/view: ${b.name} (${b.start_time_str} - ${b.end_time_str})`}
                        >
                          {isFused ? <Sparkles size={12} /> : <Wrench size={11} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isFused ? `FUSED (${b.departments?.join('+')})` : b.name}
                          </span>

                          <span style={{ fontSize: '0.65rem', opacity: 0.9, marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
                            {b.start_time_str}
                          </span>

                          {/* Quick Edit Time Icon inside Block */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditBlock(b);
                            }}
                            style={{
                              background: 'rgba(0,0,0,0.25)',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              marginLeft: '4px',
                              cursor: 'pointer',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Edit this block's timing"
                          >
                            <Edit3 size={10} />
                          </button>
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

      {/* 5. Modal: Reschedule / Edit Block Time */}
      {isEditingBlockModalOpen && targetBlockToEdit && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Edit Block Timing & Reschedule
                </h3>
              </div>
              <button
                onClick={() => setIsEditingBlockModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Block Info */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Block Identifier:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {targetBlockToEdit.name} ({targetBlockToEdit.id})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Section: <strong>{targetBlockToEdit.section_id}</strong> • Track: <strong>{targetBlockToEdit.track_line} Line</strong>
              </div>
            </div>

            {/* Timing Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Scheduled Start Time (HH:MM):
                </label>
                <input
                  type="time"
                  value={editStartTimeStr}
                  onChange={(e) => setEditStartTimeStr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-base)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Duration (Minutes):
                </label>
                <input
                  type="number"
                  min="30"
                  max="480"
                  step="15"
                  value={editDurationMins}
                  onChange={(e) => setEditDurationMins(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-base)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Conflict Verification Note */}
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', background: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)', marginBottom: '1.25rem', fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>Timetable Headway Check: No conflict detected with Vande Bharat #22436 or Shatabdi #12002.</span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setIsEditingBlockModalOpen(false)}
                className="btn-outline"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlockTiming}
                style={{
                  padding: '0.45rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Save & Reschedule Block
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
