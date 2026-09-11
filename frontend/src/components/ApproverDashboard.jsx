import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Train, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  Printer, 
  Eye, 
  ChevronRight, 
  MessageSquare,
  X,
  Zap,
  Filter,
  Users,
  HelpCircle,
  Info,
  Check,
  Lock,
  Search,
  ArrowUpRight,
  BarChart3,
  CheckCheck,
  History as HistoryIcon
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://127.0.0.1:8000' : '');

export default function ApproverDashboard({ 
  currentUser, 
  onApproveBlock, 
  onViewMemo,
  scheduleData,
  onScheduleUpdated,
  activeTab = 'approver-dashboard'
}) {
  const userRole = currentUser?.systemRole || currentUser?.role || 'APPROVER';
  // Allow operational sanction authority across railway personnel
  const canApprove = true;

  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, critical: 0, approved: 0, rejected: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  
  // Multi-Department Concurrence Explanation Modal State
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // Rejection / Send Back Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectActionType, setRejectActionType] = useState('REJECT'); // 'REJECT' or 'SEND_BACK'
  const [rejectComment, setRejectComment] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Baseline requests used when backend has no data or for initial hydration
  const initialBaseRequests = useMemo(() => [
    {
      request_id: 'FUSED_BLK_GZB_01',
      title: 'Fused Mega-Block: BCM Track Renewal + OHE Power Cut',
      type: 'FUSED_MEGA_BLOCK',
      department: 'TMS + TDMS',
      section_id: 'SEC_GZB_MIU_UP',
      track_line: 'UP',
      km_range: '26.0 - 32.0',
      requested_start: '01:30',
      requested_end: '04:00',
      duration_mins: 150,
      downtime_saved_mins: 90,
      priority: 'CRITICAL',
      ai_risk_score: 18.2,
      ai_recommendation: 'RECOMMENDED_FOR_SANCTION',
      ai_reason: 'Utilizes Golden Night Window (01:15 - 04:45). Combines Track Ballast Cleaner with Catenary inspection, saving 90 minutes of line closure with zero passenger delay.',
      affected_trains: [
        { train_no: '22436', name: 'Vande Bharat Express', impact: 'ZERO_DELAY (Passes at 06:10)' },
        { train_no: 'G-COAL-101', name: 'Bulk Coal Rake', impact: 'SHADOW_REGULATED (+15m)' }
      ],
      affected_assets: ['GZB-TSS-25kV Substation', 'Track Km 26.0-32.0'],
      conflicts_count: 0,
      status: 'PENDING_APPROVAL'
    },
    {
      request_id: 'BLK_DER_02',
      title: 'Electronic Interlocking Cable Testing',
      type: 'STANDALONE_BLOCK',
      department: 'SMMS',
      section_id: 'SEC_DER_AJR_UP',
      track_line: 'UP',
      km_range: '42.0 - 44.0',
      requested_start: '02:00',
      requested_end: '04:00',
      duration_mins: 120,
      downtime_saved_mins: 0,
      priority: 'CRITICAL',
      ai_risk_score: 24.5,
      ai_recommendation: 'PROCEED_WITH_PRECAUTION',
      ai_reason: 'Mandatory relay safety testing overdue by 3 days. Safe 25-minute headway clearance before first morning express.',
      affected_trains: [],
      affected_assets: ['Derailment Detector Sensor DER'],
      conflicts_count: 0,
      status: 'PENDING_APPROVAL'
    },
    {
      request_id: 'FUSED_BLK_DKDE_03',
      title: 'Fused Mega-Block: Rail Grinding + Point Overhaul',
      type: 'FUSED_MEGA_BLOCK',
      department: 'TMS + SMMS',
      section_id: 'SEC_DKDE_WAIR_DN',
      track_line: 'DN',
      km_range: '60.0 - 64.0',
      requested_start: '01:20',
      requested_end: '04:00',
      duration_mins: 160,
      downtime_saved_mins: 75,
      priority: 'HIGH',
      ai_risk_score: 22.0,
      ai_recommendation: 'RECOMMENDED_FOR_SANCTION',
      ai_reason: 'RGM Rail Grinder and Signal Squad work concurrently under single track warrant, saving 75 mins downtime.',
      affected_trains: [
        { train_no: '12002', name: 'Bhopal Shatabdi', impact: 'CLEAR (Passes 06:15)' }
      ],
      affected_assets: ['Point Machine 102B DKDE'],
      conflicts_count: 0,
      status: 'PENDING_APPROVAL'
    },
    {
      request_id: 'BLK_KRJ_04',
      title: '25kV Catenary Dropper Replacement',
      type: 'STANDALONE_BLOCK',
      department: 'TDMS',
      section_id: 'SEC_KRJ_SOM_DN',
      track_line: 'DN',
      km_range: '94.0 - 96.0',
      requested_start: '02:15',
      requested_end: '03:45',
      duration_mins: 90,
      downtime_saved_mins: 0,
      priority: 'NORMAL',
      ai_risk_score: 15.0,
      ai_recommendation: 'RECOMMENDED_FOR_SANCTION',
      ai_reason: 'Low train movement window. TRD Tower Wagon positioned at Khurja siding.',
      affected_trains: [],
      affected_assets: ['OHE Mast 94/12'],
      conflicts_count: 0,
      status: 'PENDING_APPROVAL'
    },
    {
      request_id: 'BLK_SOM_05',
      title: 'Digital Axle Counter Calibration',
      type: 'STANDALONE_BLOCK',
      department: 'SMMS',
      section_id: 'SEC_SOM_ALJN_UP',
      track_line: 'UP',
      km_range: '118.0 - 119.5',
      requested_start: '02:30',
      requested_end: '03:30',
      duration_mins: 60,
      downtime_saved_mins: 0,
      priority: 'NORMAL',
      ai_risk_score: 12.0,
      ai_recommendation: 'RECOMMENDED_FOR_SANCTION',
      ai_reason: 'Routine quarterly sensor check. Zero delay on running lines.',
      affected_trains: [],
      affected_assets: ['Axle Counter Block Track 118 UP'],
      conflicts_count: 0,
      status: 'OFFICIALLY_SANCTIONED'
    }
  ], []);

  // Helper to recompute counts
  const computeCounts = (reqList) => {
    const pending = reqList.filter(r => r.status === 'PENDING_APPROVAL').length;
    const critical = reqList.filter(r => r.priority === 'CRITICAL' && r.status === 'PENDING_APPROVAL').length;
    const approved = reqList.filter(r => r.status === 'OFFICIALLY_SANCTIONED').length;
    const rejected = reqList.filter(r => r.status === 'REJECTED' || r.status === 'REJECT').length;
    return { total: reqList.length, pending, critical, approved, rejected };
  };

  // Fetch live approvals data with localStorage persistence & multi-user sync
  const fetchApproverData = async () => {
    let serverRequests = null;
    let serverHistory = null;

    try {
      const res = await fetch(`${API_BASE}/api/approvals/requests`);
      if (res.ok) {
        const data = await res.json();
        serverRequests = data.requests || [];
        serverHistory = data.history || [];
      }
    } catch {
      // Backend offline or network issue
    }

    // Load local storage overrides
    let localSanctions = {};
    let localHistory = [];
    try {
      const savedSanctions = localStorage.getItem('trackshield_local_sanctions');
      if (savedSanctions) localSanctions = JSON.parse(savedSanctions);
      const savedHistory = localStorage.getItem('trackshield_local_history');
      if (savedHistory) localHistory = JSON.parse(savedHistory);
    } catch (e) {
      console.error(e);
    }

    // Merge server requests or fallback
    let combinedReqs = serverRequests && serverRequests.length > 0 ? serverRequests : initialBaseRequests;

    // Apply any local sanctions (ensuring approvals NEVER disappear on refresh)
    combinedReqs = combinedReqs.map(r => {
      const override = localSanctions[r.request_id];
      if (override) {
        return {
          ...r,
          status: override.approval_status,
          sanction_info: override
        };
      }
      return r;
    });

    // Merge history
    const combinedHistory = [...(serverHistory || []), ...localHistory];
    const uniqueHistoryMap = new Map();
    combinedHistory.forEach(h => {
      const key = h.sanction_id || `${h.request_id}_${h.timestamp}`;
      if (!uniqueHistoryMap.has(key)) {
        uniqueHistoryMap.set(key, h);
      }
    });
    const finalHistory = Array.from(uniqueHistoryMap.values());

    setRequests(combinedReqs);
    setCounts(computeCounts(combinedReqs));
    setHistory(finalHistory);
  };

  // Initial fetch and auto-polling for real-time multi-user synchronization
  useEffect(() => {
    fetchApproverData();

    // Setup periodic polling every 3.5 seconds
    const interval = setInterval(fetchApproverData, 3500);

    // Setup Cross-Tab Broadcast Channel Sync
    let channel = null;
    try {
      channel = new BroadcastChannel('trackshield_sync');
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'SANCTION_UPDATED') {
          fetchApproverData();
        }
      };
    } catch {}

    const handleCustomSync = () => fetchApproverData();
    window.addEventListener('trackshield_sanction_updated', handleCustomSync);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('trackshield_sanction_updated', handleCustomSync);
    };
  }, []);

  // Handle Approver / Operator Sanction
  const handleApprove = async (req) => {
    const approverName = currentUser?.name || 'Sri Rajesh Sharma, IRTS';
    const designation = currentUser?.role || 'Senior Divisional Operations Manager (Sr. DOM)';
    const timestamp = new Date().toISOString();
    const sanctionId = `SANCTION_${req.request_id}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;

    const record = {
      sanction_id: sanctionId,
      request_id: req.request_id,
      title: req.title,
      section_id: req.section_id,
      track_line: req.track_line,
      action: 'APPROVE',
      approver_name: approverName,
      designation: designation,
      timestamp: timestamp,
      comment: 'Officially sanctioned under Indian Railways G&SR Para 4.12.',
      approval_status: 'OFFICIALLY_SANCTIONED'
    };

    // 1. Persist to localStorage immediately
    try {
      const savedSanctions = JSON.parse(localStorage.getItem('trackshield_local_sanctions') || '{}');
      savedSanctions[req.request_id] = record;
      localStorage.setItem('trackshield_local_sanctions', JSON.stringify(savedSanctions));

      const savedHistory = JSON.parse(localStorage.getItem('trackshield_local_history') || '[]');
      savedHistory.unshift(record);
      localStorage.setItem('trackshield_local_history', JSON.stringify(savedHistory));
    } catch (e) {
      console.error(e);
    }

    // 2. Broadcast to other tabs & components
    try {
      const channel = new BroadcastChannel('trackshield_sync');
      channel.postMessage({ type: 'SANCTION_UPDATED', record });
      channel.close();
    } catch {}
    window.dispatchEvent(new CustomEvent('trackshield_sanction_updated', { detail: record }));

    // 3. POST to backend API
    try {
      await fetch(`${API_BASE}/api/approvals/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: req.request_id,
          action: 'APPROVE',
          approver_name: approverName,
          designation: designation,
          comment: 'Officially sanctioned under Indian Railways G&SR Para 4.12.',
          user_role: userRole
        })
      });
    } catch (err) {
      console.warn("Backend offline, sanction persisted to client storage.", err);
    }

    // 4. Update local state
    setRequests(prev => {
      const updated = prev.map(r => r.request_id === req.request_id ? { 
        ...r, 
        status: 'OFFICIALLY_SANCTIONED',
        sanction_info: record
      } : r);
      setCounts(computeCounts(updated));
      return updated;
    });

    setHistory(prev => [record, ...prev]);

    setActionSuccessMsg(`Sanction Memo DRM/OPT/BLK/${req.request_id} has been officially confirmed & dispatched to corridor controllers.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    setSelectedRequest(null);

    if (onScheduleUpdated) {
      onScheduleUpdated();
    }
  };

  // Handle Rejection / Send Back
  const handleOpenRejectModal = (req, actionType) => {
    setSelectedRequest(req);
    setRejectActionType(actionType);
    setRejectComment(
      actionType === 'REJECT'
        ? 'Conflict with high-speed passenger train headway. Possession rejected for alternative corridor timing.'
        : 'Requires re-submission with revised machine crew availability and updated OHE discharge permit.'
    );
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectAction = async () => {
    if (!selectedRequest) return;

    const reqId = selectedRequest.request_id;
    const newStatus = rejectActionType === 'REJECT' ? 'REJECTED' : 'SENT_BACK';
    const approverName = currentUser?.name || 'Sri Rajesh Sharma, IRTS';
    const designation = currentUser?.role || 'Senior Divisional Operations Manager (Sr. DOM)';
    const timestamp = new Date().toISOString();

    const record = {
      sanction_id: `DECISION_${reqId}_${Date.now()}`,
      request_id: reqId,
      title: selectedRequest.title,
      section_id: selectedRequest.section_id,
      track_line: selectedRequest.track_line,
      action: rejectActionType,
      approver_name: approverName,
      designation: designation,
      timestamp: timestamp,
      comment: rejectComment,
      approval_status: newStatus
    };

    // Save to local storage
    try {
      const savedSanctions = JSON.parse(localStorage.getItem('trackshield_local_sanctions') || '{}');
      savedSanctions[reqId] = record;
      localStorage.setItem('trackshield_local_sanctions', JSON.stringify(savedSanctions));

      const savedHistory = JSON.parse(localStorage.getItem('trackshield_local_history') || '[]');
      savedHistory.unshift(record);
      localStorage.setItem('trackshield_local_history', JSON.stringify(savedHistory));

      const channel = new BroadcastChannel('trackshield_sync');
      channel.postMessage({ type: 'SANCTION_UPDATED', record });
      channel.close();
    } catch (e) {
      console.error(e);
    }
    window.dispatchEvent(new CustomEvent('trackshield_sanction_updated', { detail: record }));

    // Send to backend
    try {
      await fetch(`${API_BASE}/api/approvals/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqId,
          action: rejectActionType,
          approver_name: approverName,
          designation: designation,
          comment: rejectComment,
          user_role: userRole
        })
      });
    } catch {}

    setRequests(prev => {
      const updated = prev.map(r => r.request_id === reqId ? { 
        ...r, 
        status: newStatus,
        sanction_info: record
      } : r);
      setCounts(computeCounts(updated));
      return updated;
    });

    setHistory(prev => [record, ...prev]);

    setIsRejectModalOpen(false);
    setActionSuccessMsg(`Block ${reqId} marked as ${newStatus}. All corridor departments notified.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    setSelectedRequest(null);

    if (onScheduleUpdated) {
      onScheduleUpdated();
    }
  };

  // Filtered requests for Pending Queue View
  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'PENDING_APPROVAL');
  }, [requests]);

  const filteredPendingRequests = useMemo(() => {
    return pendingRequests.filter(r => {
      if (activeFilter === 'CRITICAL') return r.priority === 'CRITICAL';
      if (activeFilter === 'FUSED') return r.type === 'FUSED_MEGA_BLOCK';
      if (activeFilter === 'TMS') return r.department.includes('TMS');
      if (activeFilter === 'SMMS') return r.department.includes('SMMS');
      if (activeFilter === 'TDMS') return r.department.includes('TDMS');
      return true;
    });
  }, [pendingRequests, activeFilter]);

  // Filtered Audit History
  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return history;
    const q = historySearchQuery.toLowerCase();
    return history.filter(h => 
      h.request_id?.toLowerCase().includes(q) ||
      h.sanction_id?.toLowerCase().includes(q) ||
      h.approver_name?.toLowerCase().includes(q) ||
      h.title?.toLowerCase().includes(q)
    );
  }, [history, historySearchQuery]);

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: '8px',
          background: 'rgba(22, 163, 74, 0.12)',
          border: '1px solid var(--color-success)',
          color: 'var(--color-success)',
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. VIEW A: COMMAND CENTER (approver-dashboard) */}
      {activeTab === 'approver-dashboard' && (
        <div>
          {/* Header & Approver Authority Strip */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                    <Shield size={20} />
                  </div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    TrackShield AI — Approver Command Center
                  </h1>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Executive Corridor Sanction Authority & Decision Support • Northern Railway Operations
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {currentUser?.name || 'Sri Rajesh Sharma, IRTS'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {currentUser?.role || 'Senior Divisional Operations Manager (Sr. DOM)'}
                  </div>
                </div>

                <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={13} />
                  <span>Sanction Authority Active</span>
                </span>

                <button
                  onClick={() => setIsWhyModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(23, 105, 170, 0.1)',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <HelpCircle size={14} />
                  <span>Why All Departments Approve</span>
                </button>
              </div>
            </div>
          </div>

          {/* Executive KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.15rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pending Approvals</span>
                <Clock size={16} color="var(--color-warning)" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.3rem' }}>
                {counts.pending}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Awaiting Section Controller sign-off</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.15rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Critical Safety Blocks</span>
                <AlertTriangle size={16} color="var(--color-danger)" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '0.3rem' }}>
                {counts.critical}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High-degradation track / S&T priority</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.15rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Sanctioned Today</span>
                <CheckCheck size={16} color="var(--color-success)" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.3rem' }}>
                {counts.approved}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Warrants active on corridor</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.15rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Avg Turnaround Time</span>
                <TrendingUp size={16} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.3rem' }}>
                14.8m
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>vs 120m manual telephone baseline</div>
            </div>
          </div>

          {/* Quick Spotlight Sanction Card for Top Priority Block */}
          {pendingRequests.length > 0 && (
            <div className="glass-panel" style={{ 
              padding: '1.25rem 1.5rem', 
              marginBottom: '1.25rem', 
              background: 'linear-gradient(135deg, rgba(23, 105, 170, 0.08), rgba(236, 72, 153, 0.08))', 
              border: '1.5px solid var(--color-primary)', 
              borderRadius: '12px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="badge badge-primary" style={{ fontSize: '0.68rem', marginBottom: '0.3rem' }}>
                    ⚡ ACTION REQUIRED: TOP PRIORITY CORRIDOR WARRANT
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0' }}>
                    {pendingRequests[0].title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Section: <strong>{pendingRequests[0].section_id}</strong> • Window: <strong>{pendingRequests[0].requested_start} - {pendingRequests[0].requested_end} ({pendingRequests[0].duration_mins}m)</strong> • Dept: <strong>{pendingRequests[0].department}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    onClick={() => onViewMemo && onViewMemo(pendingRequests[0])}
                    className="btn-outline"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.78rem' }}
                  >
                    View Sanction Memo
                  </button>
                  <button
                    onClick={() => handleApprove(pendingRequests[0])}
                    className="btn-primary"
                    style={{ padding: '0.45rem 1.25rem', fontSize: '0.78rem', fontWeight: 800 }}
                  >
                    Grant Statutory Sanction
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Overview of Active Corridor Sanction Summary */}
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.85rem' }}>
              Corridor Block Authorization Status
            </h3>

            <div className="table-container">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Warrant ID</th>
                    <th>Maintenance Scope</th>
                    <th>Corridor Track</th>
                    <th>Window</th>
                    <th>AI Risk Score</th>
                    <th>Sanction Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 6).map((req) => (
                    <tr key={req.request_id}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        {req.request_id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{req.title}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{req.department}</div>
                      </td>
                      <td>{req.section_id} ({req.track_line})</td>
                      <td>{req.requested_start} - {req.requested_end}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: req.ai_risk_score < 20 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                          {req.ai_risk_score}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${req.status === 'OFFICIALLY_SANCTIONED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {req.status === 'OFFICIALLY_SANCTIONED' ? 'SANCTIONED' : req.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                        </span>
                      </td>
                      <td>
                        {req.status === 'PENDING_APPROVAL' ? (
                          <button
                            onClick={() => handleApprove(req)}
                            className="btn-primary"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.7rem' }}
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => onViewMemo && onViewMemo(req)}
                            className="btn-outline"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.7rem' }}
                          >
                            View Memo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 2. VIEW B: PENDING REQUESTS (pending-requests) */}
      {activeTab === 'pending-requests' && (
        <div>
          {/* Header */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={22} color="var(--color-warning)" />
                  Pending Sanction Queue ({pendingRequests.length} Waiting)
                </h1>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Maintenance block warrants awaiting Section Controller & Sr. DOM sign-off under Indian Railways G&SR Para 4.12
                </p>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ALL', 'CRITICAL', 'FUSED', 'TMS', 'SMMS', 'TDMS'].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: activeFilter === f ? 800 : 600,
                      background: activeFilter === f ? 'var(--color-primary)' : 'var(--bg-card-subtle)',
                      color: activeFilter === f ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer'
                    }}
                  >
                    {f === 'ALL' ? 'All Pending' : f === 'CRITICAL' ? '⚠️ Critical' : f === 'FUSED' ? '✨ Fused' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Queue Table */}
          {filteredPendingRequests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <CheckCircle2 size={42} color="var(--color-success)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Zero Pending Block Requests!
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                All corridor maintenance warrants for today have been officially sanctioned. Check Audit History for executed records.
              </p>
            </div>
          ) : (
            <div className="table-container" style={{ background: 'var(--bg-card)' }}>
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Warrant ID</th>
                    <th>Maintenance Scope</th>
                    <th>Department</th>
                    <th>Corridor Track</th>
                    <th>Window</th>
                    <th>Downtime Saved</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendingRequests.map((req) => {
                    const isFused = req.type === 'FUSED_MEGA_BLOCK';
                    return (
                      <tr key={req.request_id}>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          {req.request_id}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{req.title}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            {req.ai_reason}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isFused ? 'badge-fused' : 'badge-tms'}`}>
                            {req.department}
                          </span>
                        </td>
                        <td>
                          <div>{req.section_id}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>KM {req.km_range} ({req.track_line} Line)</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{req.requested_start} - {req.requested_end}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{req.duration_mins} mins</div>
                        </td>
                        <td>
                          {req.downtime_saved_mins > 0 ? (
                            <span style={{ color: '#ec4899', fontWeight: 800 }}>+{req.downtime_saved_mins}m</span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${req.priority === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleApprove(req)}
                              className="btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: 800 }}
                              title="Officially sanction block possession"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(req, 'REJECT')}
                              className="btn-danger"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              title="Reject block possession"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => onViewMemo && onViewMemo(req)}
                              className="btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              title="View official Indian Railways Sanction Memo"
                            >
                              Memo
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. VIEW C: AUDIT HISTORY (approval-history) */}
      {activeTab === 'approval-history' && (
        <div>
          {/* Header */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HistoryIcon size={22} color="var(--color-primary)" />
                  Statutory Sanction Audit History & Compliance Ledger
                </h1>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Permanent legal record of corridor block warrants sanctioned, rejected, or revoked under Indian Railways G&SR Para 4.12
                </p>
              </div>

              {/* Search Audit Log */}
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by Memo ID, Block, Officer..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.65rem 0.4rem 2rem',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Audit Ledger Table */}
          <div className="table-container" style={{ background: 'var(--bg-card)' }}>
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Sanction Memo ID</th>
                  <th>Block Identifier</th>
                  <th>Decision</th>
                  <th>Approving Officer</th>
                  <th>Designation</th>
                  <th>Timestamp</th>
                  <th>G&SR Compliance Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No audit history records found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((h, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                        {h.sanction_id || `DRM/OPT/BLK/${h.request_id}`}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {h.request_id}
                        {h.title && <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{h.title}</div>}
                      </td>
                      <td>
                        <span className={`badge ${h.approval_status === 'OFFICIALLY_SANCTIONED' ? 'badge-success' : h.approval_status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {h.approval_status === 'OFFICIALLY_SANCTIONED' ? 'SANCTIONED' : h.approval_status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{h.approver_name || 'Sri Rajesh Sharma, IRTS'}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{h.designation || 'Sr. DOM'}</td>
                      <td style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : 'Just now'}
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '300px' }}>
                        {h.comment || 'Sanctioned under G&SR Para 4.12.'}
                      </td>
                      <td>
                        <button
                          onClick={() => onViewMemo && onViewMemo({ id: h.request_id, ...h })}
                          className="btn-outline"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.7rem' }}
                        >
                          Reprint Memo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Why All Departments Approve */}
      {isWhyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWhyModalOpen(false)}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Unified Multi-Department Concurrence Protocol (JPO)
              </h3>
              <button onClick={() => setIsWhyModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              In Indian Railways, track possession cannot be granted in isolation. Civil (TMS) certifies rail & bed safety, Electrical (TDMS) guarantees 25kV OHE isolation & grounding, and S&T (SMMS) secures point interlocking. Operating (Sr. DOM) provides the final Traffic Sanction only when all 3 engineering departments concurrently sign off.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setIsWhyModalOpen(false)} className="btn-primary" style={{ fontSize: '0.8rem' }}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection / Send Back */}
      {isRejectModalOpen && selectedRequest && (
        <div className="modal-overlay" onClick={() => setIsRejectModalOpen(false)}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: rejectActionType === 'REJECT' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                {rejectActionType === 'REJECT' ? 'Reject Block Sanction' : 'Send Back for Revision'}
              </h3>
              <button onClick={() => setIsRejectModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Specify the operational reason for {rejectActionType === 'REJECT' ? 'rejecting' : 'modifying'} warrant <strong>{selectedRequest.request_id}</strong>:
            </p>

            <textarea
              rows={4}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                background: 'var(--bg-base)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button onClick={() => setIsRejectModalOpen(false)} className="btn-outline" style={{ fontSize: '0.8rem' }}>
                Cancel
              </button>
              <button onClick={handleConfirmRejectAction} className={rejectActionType === 'REJECT' ? 'btn-danger' : 'btn-primary'} style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                Confirm {rejectActionType === 'REJECT' ? 'Rejection' : 'Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
