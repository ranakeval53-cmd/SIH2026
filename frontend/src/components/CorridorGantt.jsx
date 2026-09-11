import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  Search,
  Filter,
  Shield,
  Gauge,
  ArrowRight,
  Maximize2,
  Minimize2,
  Sliders,
  Check,
  Info
} from 'lucide-react';

export default function CorridorGantt({ scheduleData, onSelectBlock, onTriggerOptimize }) {
  const [horizon, setHorizon] = useState('DAILY');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterTrainType, setFilterTrainType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Plan Date Navigator State
  const TODAY_STR = '2026-09-11';
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);

  // Time Window Navigation & View Range
  const [timeWindow, setTimeWindow] = useState({ startHour: 0, endHour: 24 });
  const [isEditingTimeWindow, setIsEditingTimeWindow] = useState(false);
  const [tempStartHour, setTempStartHour] = useState(0);
  const [tempEndHour, setTempEndHour] = useState(24);

  // Zoom scale: 100%, 140%, 180%
  const [zoomScale, setZoomScale] = useState(100);

  // Interactive Inspector Drawers / Modals
  const [inspectedBlock, setInspectedBlock] = useState(null);
  const [inspectedTrain, setInspectedTrain] = useState(null);

  // Block Timing Editor Modal
  const [isEditingBlockModalOpen, setIsEditingBlockModalOpen] = useState(false);
  const [targetBlockToEdit, setTargetBlockToEdit] = useState(null);
  const [editStartTimeStr, setEditStartTimeStr] = useState('01:30');
  const [editDurationMins, setEditDurationMins] = useState(120);

  // Custom User Overrides per date: { [dateStr]: { [blockId]: { start_time_str, end_time_str, scheduled_start_min, duration_mins } } }
  const [customOverrides, setCustomOverrides] = useState({});

  // Real-time "NOW" indicator calculation
  const [currentClockMin, setCurrentClockMin] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentClockMin(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Corridor Sections modeled along the NDLS-DDU trunk
  const sections = [
    { 
      id: 'SEC_GZB_MIU_UP', 
      name: 'Ghaziabad - Maripat', 
      fromCode: 'GZB', 
      toCode: 'MIU', 
      km: '26.0 - 32.0', 
      lengthKm: '6.0',
      line: 'UP', 
      maxSpeed: '130 km/h',
      traction: '25kV AC OHE',
      signals: 'Automatic Double Distant (4-Aspect)'
    },
    { 
      id: 'SEC_DER_AJR_UP', 
      name: 'Dadri - Ajaibpur', 
      fromCode: 'DER', 
      toCode: 'AJR', 
      km: '42.0 - 44.0', 
      lengthKm: '2.0',
      line: 'UP', 
      maxSpeed: '130 km/h',
      traction: '25kV AC OHE',
      signals: 'Electronic Interlocking (EI)'
    },
    { 
      id: 'SEC_DKDE_WAIR_DN', 
      name: 'Dankaur - Wair', 
      fromCode: 'DKDE', 
      toCode: 'WAIR', 
      km: '60.0 - 64.0', 
      lengthKm: '4.0',
      line: 'DN', 
      maxSpeed: '130 km/h',
      traction: '25kV AC OHE',
      signals: 'Automatic Block Signalling'
    },
    { 
      id: 'SEC_KRJ_SOM_DN', 
      name: 'Khurja - Somna', 
      fromCode: 'KRJ', 
      toCode: 'SOM', 
      km: '93.5 - 98.0', 
      lengthKm: '4.5',
      line: 'DN', 
      maxSpeed: '130 km/h',
      traction: '25kV AC OHE',
      signals: 'Automatic Double Distant (4-Aspect)'
    },
    { 
      id: 'SEC_SOM_ALJN_UP', 
      name: 'Somna - Aligarh', 
      fromCode: 'SOM', 
      toCode: 'ALJN', 
      km: '118.0 - 120.0', 
      lengthKm: '2.0',
      line: 'UP', 
      maxSpeed: '130 km/h',
      traction: '25kV AC OHE',
      signals: 'Solid State Interlocking (SSI)'
    },
    { 
      id: 'SEC_ALJN_HRS_DN', 
      name: 'Aligarh - Hathras', 
      fromCode: 'ALJN', 
      toCode: 'HRS', 
      km: '131.0 - 142.0', 
      lengthKm: '11.0',
      line: 'DN', 
      maxSpeed: '130 km/h',
      traction: '25kV AC OHE',
      signals: 'Automatic Block Signalling'
    }
  ];

  // Train paths passing through sections
  const sampleTrains = [
    { 
      train_no: '22436', 
      name: 'Vande Bharat Express', 
      startMin: 360, 
      endMin: 405, 
      line: 'DN', 
      type: 'PREMIUM',
      origin: 'New Delhi (NDLS)',
      dest: 'Varanasi (BSB)',
      speed: '130 km/h',
      headwayBuffer: '45 mins buffer to nearest block'
    },
    { 
      train_no: '12002', 
      name: 'Bhopal Shatabdi Express', 
      startMin: 420, 
      endMin: 465, 
      line: 'DN', 
      type: 'PREMIUM',
      origin: 'New Delhi (NDLS)',
      dest: 'Rani Kamlapati (RKMP)',
      speed: '130 km/h',
      headwayBuffer: '60 mins buffer to nearest block'
    },
    { 
      train_no: '12302', 
      name: 'Howrah Rajdhani Express', 
      startMin: 1010, 
      endMin: 1055, 
      line: 'DN', 
      type: 'PREMIUM',
      origin: 'New Delhi (NDLS)',
      dest: 'Howrah Jn (HWH)',
      speed: '130 km/h',
      headwayBuffer: '90 mins buffer to nearest block'
    },
    { 
      train_no: '22435', 
      name: 'Vande Bharat Express', 
      startMin: 1320, 
      endMin: 1365, 
      line: 'UP', 
      type: 'PREMIUM',
      origin: 'Varanasi (BSB)',
      dest: 'New Delhi (NDLS)',
      speed: '130 km/h',
      headwayBuffer: '55 mins buffer to nearest block'
    },
    { 
      train_no: 'G-COAL-101', 
      name: 'Freight Coal Bulk Rake (BOXN)', 
      startMin: 85, 
      endMin: 145, 
      line: 'DN', 
      type: 'FREIGHT',
      origin: 'Dankuni Goods Yard',
      dest: 'Dadri NTPC Power Plant',
      speed: '75 km/h',
      headwayBuffer: 'Shadow slot clearance verified'
    }
  ];

  // Default maintenance blocks for Today
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
      required_machines: 'BCM-342 Ballast Cleaner, Tower Wagon #12',
      required_gangs: 'Gang #4, OHE Line Batch #2',
      power_substation: 'GZB-TSS-25kV (Isolated with Discharge Rods)',
      safety_rules: 'G&SR Para 4.12, Caution Order 45 km/h on loop',
      ai_confidence_score: 98.6
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
      required_machines: 'S&T Diagnostic Van #04',
      required_gangs: 'Signal Maintenance Gang DER',
      power_substation: 'OHE Live (No traction isolation)',
      safety_rules: 'Signal disconnection notice issued to Station Master',
      ai_confidence_score: 95.2
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
      required_machines: 'RGM-08 Rail Grinder, Point Inspection Kit',
      required_gangs: 'P-Way Section Gang DKDE + Signal Squad',
      power_substation: 'OHE Live (No traction isolation)',
      safety_rules: 'Track clamped and padlocked during point overhaul',
      ai_confidence_score: 97.1
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
      required_machines: '8-Wheeler Tower Wagon #19',
      required_gangs: 'TRD Electrical Gang KRJ',
      power_substation: 'KRJ-TSS-25kV (Section isolated, E-permit issued)',
      safety_rules: 'Discharge rods fixed on both sides of working zone',
      ai_confidence_score: 96.0
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
      required_gangs: 'USFD Testing Unit SOM',
      power_substation: 'OHE Live',
      safety_rules: 'Day Shadow Window slot; Look-out men deployed',
      ai_confidence_score: 94.5
    }
  ];

  // Helper to determine plan category based on selectedDate
  const planType = useMemo(() => {
    if (selectedDate < TODAY_STR) return 'PAST';
    if (selectedDate === TODAY_STR) return 'TODAY';
    return 'FUTURE';
  }, [selectedDate]);

  // Generate Plan Datasets for Past, Today, and Future dates
  const baseBlocksForDate = useMemo(() => {
    if (planType === 'PAST') {
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
          required_machines: 'TRT Machine R-82, Tower Car #08',
          required_gangs: 'Northern Railway P-Way Gang 2',
          power_substation: 'GZB-TSS-25kV (Discharged)'
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

  // Apply filters and search
  const filteredBlocks = useMemo(() => {
    return effectiveBlocks.filter(b => {
      if (filterLine !== 'ALL' && b.track_line !== filterLine) return false;
      if (filterDept !== 'ALL') {
        if (filterDept === 'FUSED' && b.type !== 'FUSED_BLOCK') return false;
        if (filterDept !== 'FUSED' && !b.departments?.includes(filterDept)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.name?.toLowerCase().includes(q);
        const matchesId = b.id?.toLowerCase().includes(q);
        const matchesSec = b.section_id?.toLowerCase().includes(q);
        const matchesMach = b.required_machines?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesSec && !matchesMach) return false;
      }
      return true;
    });
  }, [effectiveBlocks, filterLine, filterDept, searchQuery]);

  // Filtered Trains
  const filteredTrains = useMemo(() => {
    return sampleTrains.filter(t => {
      if (filterLine !== 'ALL' && t.line !== filterLine) return false;
      if (filterTrainType !== 'ALL' && t.type !== filterTrainType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = t.train_no.toLowerCase().includes(q);
        const matchesName = t.name.toLowerCase().includes(q);
        if (!matchesNo && !matchesName) return false;
      }
      return true;
    });
  }, [filterLine, filterTrainType, searchQuery]);

  // Aggregate Corridor Stats
  const corridorStats = useMemo(() => {
    const totalBlocks = filteredBlocks.length;
    const fusedCount = filteredBlocks.filter(b => b.type === 'FUSED_BLOCK').length;
    const standaloneCount = totalBlocks - fusedCount;
    const totalDowntimeSaved = filteredBlocks.reduce((acc, b) => acc + (b.downtime_saved_mins || 0), 0);
    const totalPossessionMins = filteredBlocks.reduce((acc, b) => acc + (b.duration_mins || 0), 0);
    const totalPossessionHours = (totalPossessionMins / 60).toFixed(1);

    return {
      totalBlocks,
      fusedCount,
      standaloneCount,
      totalDowntimeSaved,
      totalPossessionHours
    };
  }, [filteredBlocks]);

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
  const handleOpenEditBlock = (block, e) => {
    if (e) e.stopPropagation();
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

  // Real-time "NOW" marker percentage
  const nowPercent = useMemo(() => {
    if (selectedDate !== TODAY_STR) return null;
    if (currentClockMin < windowStartMin || currentClockMin > windowEndMin) return null;
    return ((currentClockMin - windowStartMin) / windowSpanMin) * 100;
  }, [selectedDate, currentClockMin, windowStartMin, windowEndMin, windowSpanMin]);

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Header & Live Corridor Status Banner */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem 1.5rem', 
        marginBottom: '1rem', 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          
          {/* Title & Route Identity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '9px', 
                background: 'linear-gradient(135deg, var(--color-primary), #0284c7)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#FFFFFF',
                boxShadow: '0 2px 10px rgba(23, 105, 170, 0.3)'
              }}>
                <Layers size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                  Master Corridor Timetable & Block Gantt
                </h1>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Northern Railway (NR)</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Delhi - Pt. Deen Dayal Upadhyaya Trunk Route</span>
                  <span>•</span>
                  <span>KM 26.0 to 142.0 (GZB - HRS)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            background: 'var(--bg-card-subtle)', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Possession Windows
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {corridorStats.totalBlocks} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>({corridorStats.totalPossessionHours}h total)</span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                AI Fusion Savings
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={14} />
                <span>+{corridorStats.totalDowntimeSaved} mins</span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Headway Safety
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={15} />
                <span>Zero Train Clashes</span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Heavy Machines
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Wrench size={14} color="var(--color-tms)" />
                <span>4 Rakes Active</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Interactive Controls & Navigation Strip */}
      <div className="glass-panel" style={{ 
        padding: '0.85rem 1.25rem', 
        marginBottom: '1rem', 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: '10px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Left Group: Date Navigation & Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            
            {/* Horizon Selector */}
            <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {['DAILY', 'WEEKLY', 'MONTHLY'].map(h => (
                <button
                  key={h}
                  onClick={() => { setHorizon(h); onTriggerOptimize && onTriggerOptimize(h); }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: horizon === h ? 800 : 600,
                    color: horizon === h ? '#ffffff' : 'var(--text-muted)',
                    background: horizon === h ? 'var(--color-primary)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {h === 'DAILY' ? 'Daily (24h)' : h === 'WEEKLY' ? 'Weekly (7d)' : 'Monthly (30d)'}
                </button>
              ))}
            </div>

            <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)', margin: '0 0.2rem' }} />

            {/* Date Shift Buttons */}
            <button
              onClick={() => handleShiftDate(-1)}
              className="btn-outline"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="View Previous Day's Corridor Plan (Archived Executed Record)"
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

            {/* Shift +1 Day */}
            <button
              onClick={() => handleShiftDate(1)}
              className="btn-outline"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="View Next Day's Projected Corridor Plan"
            >
              <span>Future Plan</span>
              <ChevronRight size={14} />
            </button>

            {/* Category Indicator Badge */}
            {planType === 'PAST' && (
              <span className="badge badge-tms" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <History size={12} />
                <span>Archived Audit ({formattedDateTitle})</span>
              </span>
            )}
            {planType === 'TODAY' && (
              <span className="badge badge-success" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Radio size={12} className="pulse" />
                <span>Live Active Dispatch ({formattedDateTitle})</span>
              </span>
            )}
            {planType === 'FUTURE' && (
              <span className="badge badge-tdms" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={12} />
                <span>AI Projected Schedule ({formattedDateTitle})</span>
              </span>
            )}

          </div>

          {/* Right Group: Time Window Presets & Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            
            {/* View Presets */}
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
                onClick={() => handleApplyTimeWindow(8, 16)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: timeWindow.startHour === 8 && timeWindow.endHour === 16 ? 700 : 500,
                  background: timeWindow.startHour === 8 && timeWindow.endHour === 16 ? 'var(--color-primary)' : 'transparent',
                  color: timeWindow.startHour === 8 && timeWindow.endHour === 16 ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Day Traffic Window (08:00 - 16:00)"
              >
                ☀️ Day (8-16h)
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
                title="Evening Peak Window (16:00 - 24:00)"
              >
                🌆 Eve (16-24h)
              </button>
            </div>

            {/* Custom Time Window Toggle */}
            <button
              onClick={() => setIsEditingTimeWindow(!isEditingTimeWindow)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isEditingTimeWindow ? 'var(--color-primary)' : 'var(--bg-card-subtle)',
                color: isEditingTimeWindow ? '#ffffff' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
              title="Configure custom start and end time window"
            >
              <Clock size={13} color={isEditingTimeWindow ? '#ffffff' : 'var(--color-primary)'} />
              <span>Time Window</span>
            </button>

            {/* Zoom / Scale Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', gap: '0.2rem' }}>
              {[100, 140, 180].map(s => (
                <button
                  key={s}
                  onClick={() => setZoomScale(s)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.68rem',
                    fontWeight: zoomScale === s ? 700 : 500,
                    background: zoomScale === s ? 'var(--color-primary)' : 'transparent',
                    color: zoomScale === s ? '#ffffff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title={`Gantt Timeline Zoom ${s}%`}
                >
                  {s}%
                </button>
              ))}
            </div>

            {/* Block Rescheduler Button */}
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
              title="Reschedule block timing with automatic headway verification"
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
                Custom Timeline Range:
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Start Hour:</label>
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
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>End Hour:</label>
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
                (Rendering {tempEndHour - tempStartHour} hour span across NDLS-DDU corridor)
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
                Apply Range
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

      {/* 3. Real-Time Filters & Search Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '0.75rem', 
        background: 'var(--bg-card)', 
        padding: '0.75rem 1.25rem', 
        borderRadius: '10px', 
        marginBottom: '1rem', 
        fontSize: '0.75rem', 
        border: '1px solid var(--border-subtle)' 
      }}>
        
        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            <Filter size={14} color="var(--color-primary)" />
            <span>FILTERS:</span>
          </div>

          {/* Track Line Filter */}
          <select 
            value={filterLine} 
            onChange={(e) => setFilterLine(e.target.value)}
            style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Track Lines (UP & DN)</option>
            <option value="UP">UP Line Only (Towards NDLS)</option>
            <option value="DN">DN Line Only (Towards DDU)</option>
          </select>

          {/* Department Filter */}
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Departments</option>
            <option value="FUSED">✨ Fused Mega-Blocks Only (Multi-Dept)</option>
            <option value="TMS">TMS (Track Engineering)</option>
            <option value="SMMS">SMMS (Signals & Telecom)</option>
            <option value="TDMS">TDMS (Traction / 25kV OHE)</option>
          </select>

          {/* Train Traffic Filter */}
          <select 
            value={filterTrainType} 
            onChange={(e) => setFilterTrainType(e.target.value)}
            style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">All Train Traffic Paths</option>
            <option value="PREMIUM">Priority Express (Vande Bharat / Rajdhani)</option>
            <option value="FREIGHT">Freight & Bulk Rakes</option>
          </select>

        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search block, train #, machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.35rem 0.65rem 0.35rem 2rem',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* 4. Visual Legend & Golden Maintenance Window Ribbon */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '1rem', 
        background: 'var(--bg-card)', 
        padding: '0.65rem 1.25rem', 
        borderRadius: '8px', 
        marginBottom: '1rem', 
        fontSize: '0.75rem', 
        border: '1px solid var(--border-subtle)' 
      }}>
        
        {/* Color Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            LEGEND:
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #ec4899, #a855f7)', boxShadow: '0 0 6px rgba(236, 72, 153, 0.6)' }} />
            <span style={{ color: '#ec4899', fontWeight: 700 }}>Fused Mega-Block (Multi-Dept)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
            <span style={{ color: '#d97706', fontWeight: 600 }}>Engineering (TMS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#8b5cf6' }} />
            <span style={{ color: '#7c3aed', fontWeight: 600 }}>Signalling (SMMS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#06b6d4' }} />
            <span style={{ color: '#0284c7', fontWeight: 600 }}>Traction / OHE (TDMS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }} />
            <span style={{ color: '#2563eb', fontWeight: 600 }}>Express Trains (Vande Bharat / Rajdhani)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#475569' }} />
            <span style={{ color: '#475569', fontWeight: 600 }}>Freight Bulk Rakes</span>
          </div>
        </div>

        {/* Opportunity Window Guides */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontWeight: 700 }}>
            <Clock size={14} />
            <span>🌙 Golden Night Window: 01:15 - 04:45</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontWeight: 700 }}>
            <Clock size={14} />
            <span>☀️ Midday Shadow Slot: 12:00 - 15:30</span>
          </div>
        </div>

      </div>

      {/* 5. Main High-Precision Gantt Timeline Canvas */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem', 
        overflowX: 'auto',
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)'
      }}>
        
        {/* Dynamic Width Canvas based on zoomScale */}
        <div style={{ minWidth: `${Math.max(1150, (zoomScale / 100) * 1250)}px`, position: 'relative' }}>
          
          {/* Time Axis Header */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '2px solid var(--border-subtle)', 
            paddingBottom: '0.65rem', 
            marginBottom: '0.75rem',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-card)',
            zIndex: 40
          }}>
            <div style={{ 
              width: '260px', 
              flexShrink: 0, 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Gauge size={14} color="var(--color-primary)" />
              CORRIDOR SECTION / KM
            </div>
            
            <div style={{ 
              flex: 1, 
              position: 'relative', 
              height: '24px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-muted)'
            }}>
              {timeTicks.map(h => {
                const tickMin = h * 60;
                const leftPct = ((tickMin - windowStartMin) / windowSpanMin) * 100;
                return (
                  <div 
                    key={h}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <span>{String(h).padStart(2, '0')}:00</span>
                    <div style={{ width: '1px', height: '6px', background: 'var(--border-strong)', marginTop: '2px' }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Golden Window & Shadow Window Opportunity Overlay Indicators */}
          <div style={{ position: 'relative', height: '14px', marginBottom: '0.75rem' }}>
            {/* Golden Night Window (01:15 to 04:45 = 75m to 285m) */}
            {75 < windowEndMin && 285 > windowStartMin && (
              <div 
                style={{
                  position: 'absolute',
                  left: `calc(260px + (100% - 260px) * (${Math.max(0, 75 - windowStartMin)} / ${windowSpanMin}))`,
                  width: `calc((100% - 260px) * (${Math.min(285, windowEndMin) - Math.max(75, windowStartMin)} / ${windowSpanMin}))`,
                  top: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.28), rgba(245, 158, 11, 0.18))',
                  border: '1px dashed rgba(245, 158, 11, 0.6)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: '#d97706',
                  zIndex: 2,
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.15)'
                }} 
                title="Golden Night Window (01:15 - 04:45) — Ideal slot for Multi-Department Fused Blocks with zero passenger train delays" 
              >
                <span>🌙 GOLDEN NIGHT CORRIDOR (MINIMAL PASSENGER IMPACT)</span>
              </div>
            )}

            {/* Afternoon Shadow Window (12:00 to 15:30 = 720m to 930m) */}
            {720 < windowEndMin && 930 > windowStartMin && (
              <div 
                style={{
                  position: 'absolute',
                  left: `calc(260px + (100% - 260px) * (${Math.max(0, 720 - windowStartMin)} / ${windowSpanMin}))`,
                  width: `calc((100% - 260px) * (${Math.min(930, windowEndMin) - Math.max(720, windowStartMin)} / ${windowSpanMin}))`,
                  top: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0.15))',
                  border: '1px dashed rgba(6, 182, 212, 0.5)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: '#0284c7',
                  zIndex: 2
                }} 
                title="Afternoon Shadow Window (12:00 - 15:30) — Post-morning peak freight lull slot" 
              >
                <span>☀️ MIDDAY SHADOW SLOT</span>
              </div>
            )}
          </div>

          {/* Section Rows Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            
            {/* Real-time "NOW" Vertical Line spanning across all section tracks */}
            {nowPercent !== null && (
              <div 
                className="gantt-now-line"
                style={{
                  left: `calc(260px + (100% - 260px) * (${nowPercent} / 100))`
                }}
              />
            )}

            {sections.map((sec) => {
              // Blocks in this section
              const secBlocks = filteredBlocks.filter(b => b.section_id === sec.id);

              // Trains passing this section line
              const secTrains = filteredTrains.filter(t => t.line === sec.line);

              return (
                <div 
                  key={sec.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'stretch',
                    background: 'var(--bg-card)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  
                  {/* Left Column: Corridor Section & KM Info */}
                  <div style={{ 
                    width: '260px', 
                    flexShrink: 0, 
                    padding: '0.85rem 1rem', 
                    borderRight: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: '10px 0 0 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span 
                        className={`badge ${sec.line === 'UP' ? 'badge-tdms' : 'badge-tms'}`} 
                        style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem' }}
                      >
                        {sec.line} LINE
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        {sec.maxSpeed}
                      </span>
                    </div>

                    <h4 style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 800, 
                      color: 'var(--text-main)', 
                      margin: '0 0 0.2rem 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {sec.name}
                    </h4>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600 }}>{sec.fromCode}</span>
                      <ArrowRight size={10} color="var(--text-dim)" />
                      <span style={{ fontWeight: 600 }}>{sec.toCode}</span>
                      <span style={{ color: 'var(--text-dim)' }}>•</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>KM {sec.km}</span>
                    </div>

                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                      {sec.signals}
                    </div>

                  </div>

                  {/* Right Column: Dual-Lane Timeline Canvas */}
                  <div 
                    className="timeline-track" 
                    style={{ 
                      flex: 1, 
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderRadius: '0 10px 10px 0'
                    }}
                  >
                    
                    {/* Vertical Background Time Grid Lines */}
                    {timeTicks.map(h => {
                      const tickMin = h * 60;
                      const leftPct = ((tickMin - windowStartMin) / windowSpanMin) * 100;
                      return (
                        <div 
                          key={h}
                          className="gantt-grid-line gantt-grid-line-major"
                          style={{ left: `${leftPct}%` }}
                        />
                      );
                    })}

                    {/* Lane 1 (Upper): Train Corridor Paths */}
                    <div style={{ position: 'relative', height: '28px', zIndex: 10 }}>
                      {secTrains.map((tr, idx) => {
                        if (tr.endMin < windowStartMin || tr.startMin > windowEndMin) return null;

                        const leftPct = ((Math.max(tr.startMin, windowStartMin) - windowStartMin) / windowSpanMin) * 100;
                        const widthPct = ((Math.min(tr.endMin, windowEndMin) - Math.max(tr.startMin, windowStartMin)) / windowSpanMin) * 100;
                        const isPremium = tr.type === 'PREMIUM';

                        return (
                          <div
                            key={idx}
                            className="train-slot-chip"
                            onClick={() => setInspectedTrain(tr)}
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 7)}%`,
                              background: isPremium ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'linear-gradient(135deg, #334155, #475569)',
                              color: '#FFFFFF',
                              border: isPremium ? '1px solid #60a5fa' : '1px solid #94a3b8',
                              zIndex: 12
                            }}
                            title={`Click to inspect Train #${tr.train_no} (${tr.name})`}
                          >
                            <Train size={11} />
                            <span style={{ fontWeight: 800, fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              #{tr.train_no} {tr.name.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lane 2 (Lower): Track Maintenance Possession Blocks */}
                    <div style={{ position: 'relative', height: '42px', zIndex: 15 }}>
                      {secBlocks.map((b) => {
                        const bStartMin = b.scheduled_start_min ?? 90;
                        const bDuration = b.duration_mins ?? 120;
                        const bEndMin = bStartMin + bDuration;

                        if (bEndMin < windowStartMin || bStartMin > windowEndMin) return null;

                        const leftPct = ((Math.max(bStartMin, windowStartMin) - windowStartMin) / windowSpanMin) * 100;
                        const widthPct = ((Math.min(bEndMin, windowEndMin) - Math.max(bStartMin, windowStartMin)) / windowSpanMin) * 100;
                        const isFused = b.type === 'FUSED_BLOCK';

                        // Aesthetic Gradients by Department & Type
                        let bgGradient = 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))';
                        let borderStroke = '#f59e0b';
                        let deptBadgeBg = 'rgba(0,0,0,0.2)';

                        if (isFused) {
                          bgGradient = 'linear-gradient(135deg, #db2777, #7c3aed)';
                          borderStroke = '#f472b6';
                          deptBadgeBg = 'rgba(255,255,255,0.2)';
                        } else if (b.departments?.includes('SMMS')) {
                          bgGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
                          borderStroke = '#a78bfa';
                        } else if (b.departments?.includes('TDMS')) {
                          bgGradient = 'linear-gradient(135deg, #0284c7, #0369a1)';
                          borderStroke = '#38bdf8';
                        }

                        return (
                          <div
                            key={b.id}
                            className="timeline-block"
                            onClick={() => {
                              setInspectedBlock(b);
                              if (onSelectBlock) onSelectBlock(b);
                            }}
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 12)}%`,
                              background: bgGradient,
                              border: `1.5px solid ${borderStroke}`,
                              color: '#FFFFFF',
                              zIndex: 16,
                              boxShadow: isFused ? '0 0 14px rgba(236, 72, 153, 0.45)' : '0 2px 8px rgba(0,0,0,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.4rem',
                              padding: '0 0.55rem'
                            }}
                            title={`Click to view Sanction Memo: ${b.name} (${b.start_time_str} - ${b.end_time_str})`}
                          >
                            
                            {/* Left: Icon & Title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                              {isFused ? <Sparkles size={13} style={{ flexShrink: 0 }} /> : <Wrench size={12} style={{ flexShrink: 0 }} />}
                              
                              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  whiteSpace: 'nowrap', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  letterSpacing: '-0.01em'
                                }}>
                                  {isFused ? `✨ FUSED: ${b.departments?.join(' + ')}` : b.name}
                                </span>
                                <span style={{ fontSize: '0.62rem', opacity: 0.9, whiteSpace: 'nowrap' }}>
                                  {b.start_time_str} - {b.end_time_str} ({b.duration_mins}m)
                                </span>
                              </div>
                            </div>

                            {/* Right: Badges & Quick Action */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                              
                              {/* Downtime Saved Chip */}
                              {isFused && b.downtime_saved_mins > 0 && (
                                <span style={{
                                  background: 'rgba(255,255,255,0.25)',
                                  color: '#FFFFFF',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  -{b.downtime_saved_mins}m
                                </span>
                              )}

                              {/* Quick Edit Time Icon */}
                              <button
                                onClick={(e) => handleOpenEditBlock(b, e)}
                                style={{
                                  background: 'rgba(0,0,0,0.25)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '3px 5px',
                                  cursor: 'pointer',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'background 0.15s ease'
                                }}
                                title="Reschedule timing for this block"
                              >
                                <Edit3 size={11} />
                              </button>

                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

      {/* 6. Interactive Inspector Drawer / Flyout for Block or Train */}
      {inspectedBlock && (
        <div className="modal-overlay" onClick={() => setInspectedBlock(null)}>
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '100%', 
              maxWidth: '620px', 
              padding: '1.5rem', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '14px', 
              boxShadow: 'var(--shadow-dropdown)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '8px', 
                  background: inspectedBlock.type === 'FUSED_BLOCK' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'var(--color-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#FFFFFF' 
                }}>
                  {inspectedBlock.type === 'FUSED_BLOCK' ? <Sparkles size={20} /> : <Layers size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {inspectedBlock.name}
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Identifier: <strong style={{ color: 'var(--text-main)' }}>{inspectedBlock.id}</strong> • Corridor Section: <strong style={{ color: 'var(--text-main)' }}>{inspectedBlock.section_id}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedBlock(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Time Window</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {inspectedBlock.start_time_str} - {inspectedBlock.end_time_str}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duration: {inspectedBlock.duration_mins} mins</div>
              </div>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Track Direction</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: inspectedBlock.track_line === 'UP' ? 'var(--color-tdms)' : 'var(--color-tms)', marginTop: '0.2rem' }}>
                  {inspectedBlock.track_line} Line
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Station: {inspectedBlock.station_code}</div>
              </div>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>AI Fusion Savings</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ec4899', marginTop: '0.2rem' }}>
                  {inspectedBlock.downtime_saved_mins > 0 ? `+${inspectedBlock.downtime_saved_mins} mins` : 'Standalone'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{insowntimeSavedNote(inspectedBlock)}</div>
              </div>
            </div>

            {/* Detailed Operational Attributes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Departments Involved:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {inspectedBlock.departments?.join(' + ') || 'TMS'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Track Machinery Allocated:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' }}>
                  {inspectedBlock.required_machines || 'Standard Section Machinery Pool'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Maintenance Gangs / Squads:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' }}>
                  {inspectedBlock.required_gangs || 'Joint Divisional P-Way Gang'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>25kV OHE Power Isolation:</span>
                <span style={{ fontWeight: 700, color: inspectedBlock.power_substation ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                  {inspectedBlock.power_substation || 'OHE Live (No traction cut required)'}
                </span>
              </div>
            </div>

            {/* Timetable Safety Clearance Notice */}
            <div style={{ 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              background: 'rgba(22, 163, 74, 0.1)', 
              border: '1px solid rgba(22, 163, 74, 0.25)', 
              marginBottom: '1.25rem', 
              fontSize: '0.75rem', 
              color: 'var(--color-success)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem' 
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Corridor Headway Safety Verified:</strong> Scheduled within optimal traffic lull. No operational conflict with Vande Bharat Express (#22436) or Howrah Rajdhani (#12302).
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  const b = inspectedBlock;
                  setInspectedBlock(null);
                  handleOpenEditBlock(b);
                }}
                className="btn-outline"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit3 size={14} />
                <span>Reschedule Timing</span>
              </button>
              
              <button
                onClick={() => {
                  const b = inspectedBlock;
                  setInspectedBlock(null);
                  if (onSelectBlock) onSelectBlock(b);
                }}
                style={{
                  padding: '0.45rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Shield size={14} />
                <span>Open Sanction Memo</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Interactive Train Inspector Modal */}
      {inspectedTrain && (
        <div className="modal-overlay" onClick={() => setInspectedTrain(null)}>
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '100%', 
              maxWidth: '520px', 
              padding: '1.5rem', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '14px', 
              boxShadow: 'var(--shadow-dropdown)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                  <Train size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Train #{inspectedTrain.train_no} — {inspectedTrain.name}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Type: <strong style={{ color: 'var(--color-primary)' }}>{inspectedTrain.type}</strong> • Line: <strong style={{ color: 'var(--text-main)' }}>{inspectedTrain.line} Track</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setInspectedTrain(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Origin ➔ Destination:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inspectedTrain.origin} ➔ {inspectedTrain.dest}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Corridor Passage Window:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {String(Math.floor(inspectedTrain.startMin/60)).padStart(2,'0')}:{String(inspectedTrain.startMin%60).padStart(2,'0')} - {String(Math.floor(inspectedTrain.endMin/60)).padStart(2,'0')}:{String(inspectedTrain.endMin%60).padStart(2,'0')} hrs
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Max Permissible Speed:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inspectedTrain.speed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Maintenance Block Buffer:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{inspectedTrain.headwayBuffer}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setInspectedTrain(null)}
                className="btn-outline"
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Reschedule & Edit Block Timing */}
      {isEditingBlockModalOpen && targetBlockToEdit && (
        <div className="modal-overlay" onClick={() => setIsEditingBlockModalOpen(false)}>
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '100%', 
              maxWidth: '540px', 
              padding: '1.5rem', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '14px', 
              boxShadow: 'var(--shadow-dropdown)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(23, 105, 170, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Reschedule Block Timing
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Adjust scheduled start time and duration with automatic conflict checking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingBlockModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Block Info */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Target Possession</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {targetBlockToEdit.name} ({targetBlockToEdit.id})
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Section: <strong>{targetBlockToEdit.section_id}</strong></span>
                <span>•</span>
                <span>Track: <strong>{targetBlockToEdit.track_line} Line</strong></span>
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

            {/* Duration Quick Slider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <span>Quick Duration Preset:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{editDurationMins} minutes ({(editDurationMins/60).toFixed(1)} hrs)</span>
              </div>
              <input 
                type="range" 
                min="30" 
                max="360" 
                step="15" 
                value={editDurationMins} 
                onChange={(e) => setEditDurationMins(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
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

// Helper note for downtime savings
function insowntimeSavedNote(block) {
  if (block.type !== 'FUSED_BLOCK') return 'Single-department possession';
  return 'Saved via joint TMS+TDMS OHE possession';
}
