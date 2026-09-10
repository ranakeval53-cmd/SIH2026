import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Train, 
  Layers, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  Sliders, 
  FileCheck2, 
  Database,
  Clock,
  CheckCircle2,
  Zap,
  LogOut,
  User,
  Sun,
  Moon,
  Sparkles,
  BarChart3,
  FileText,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

export default function Navbar({ 
  mode, 
  setMode, 
  activeTab, 
  setActiveTab, 
  kpis, 
  currentUser, 
  onLogout, 
  theme, 
  onToggleTheme,
  onOpenReportProblem,
  datasetStatus,
  onRefreshDataset,
  isRefreshingData
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Operations Navigation Tabs
  const operationsNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'schedule', label: 'Master Gantt', icon: Layers },
    { id: 'fusion', label: 'Auto-Fusion Center', icon: Sparkles },
    { id: 'conflicts', label: 'Risk & Conflicts', icon: AlertTriangle },
    { id: 'feeds', label: 'Data Feeds', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  // Approver Navigation Tabs
  const approverNavItems = [
    { id: 'approver-dashboard', label: 'Command Center', icon: Shield },
    { id: 'pending-requests', label: 'Pending Requests', icon: FileCheck2 },
    { id: 'sanctions', label: 'Sanction Memos', icon: FileText },
    { id: 'approver-analytics', label: 'Approval Analytics', icon: BarChart3 },
    { id: 'approval-history', label: 'Audit History', icon: Clock }
  ];

  const currentNavItems = mode === 'APPROVER' ? approverNavItems : operationsNavItems;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--navbar-bg)',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Brand & Utility Bar */}
      <div style={{
        padding: '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        
        {/* Left: Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-primary)' }}>
                TrackShield AI
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}>
                ENTERPRISE
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.5rem' }}>
                Indian Railways
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              AI-Powered Railway Block Planning & Asset Availability Platform
            </p>
          </div>
        </div>

        {/* Center: Dual Mode Switcher (Operations vs Approver) */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card-subtle)',
          padding: '0.2rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => {
              setMode('OPERATIONS');
              if (activeTab.startsWith('approver') || activeTab === 'pending-requests') {
                setActiveTab('dashboard');
              }
            }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: mode === 'OPERATIONS' ? 700 : 500,
              background: mode === 'OPERATIONS' ? 'var(--color-primary)' : 'transparent',
              color: mode === 'OPERATIONS' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={14} />
            <span>Operations Side</span>
          </button>

          <button
            onClick={() => {
              setMode('APPROVER');
              if (!activeTab.startsWith('approver') && activeTab !== 'sanctions') {
                setActiveTab('approver-dashboard');
              }
            }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: mode === 'APPROVER' ? 700 : 500,
              background: mode === 'APPROVER' ? 'var(--color-primary)' : 'transparent',
              color: mode === 'APPROVER' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={14} />
            <span>Approver Command</span>
          </button>
        </div>

        {/* Right: Actions, Live Status, Theme, Officer Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
          {/* Instant Problem / Incident Button */}
          <button
            onClick={onOpenReportProblem}
            className="btn-danger"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', gap: '0.35rem' }}
            title="Report emergency train delay, track fracture, or asset failure"
          >
            <AlertOctagon size={13} />
            <span>Report Problem</span>
          </button>

          {/* Dataset Status & Refresh Indicator */}
          <button
            onClick={onRefreshDataset}
            disabled={isRefreshingData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
            title="Refresh and recalculate all AI models against latest dataset"
          >
            <RefreshCw size={12} className={isRefreshingData ? 'pulse' : ''} color="var(--color-primary)" />
            <span>{isRefreshingData ? 'Syncing...' : 'Data Synced'}</span>
          </button>

          {/* Clock */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--color-primary)'
          }}>
            <Clock size={12} />
            <span>{currentTime.toLocaleTimeString('en-IN', { hour12: false })} IST</span>
          </div>

          {/* Enterprise Theme Toggle Pill (☀️ Light / 🌙 Dark) */}
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              background: theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#E2E8F0',
              border: `1px solid ${theme === 'dark' ? 'rgba(56, 189, 248, 0.5)' : '#CBD5E1'}`,
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
            title={`Current: ${theme === 'dark' ? 'Dark Mode' : 'Light Mode'}. Click to toggle.`}
          >
            {theme === 'dark' ? (
              <>
                <Moon size={13} color="#38BDF8" />
                <span style={{ color: '#38BDF8' }}>Dark</span>
              </>
            ) : (
              <>
                <Sun size={13} color="#D97706" />
                <span style={{ color: '#1E293B' }}>Light</span>
              </>
            )}
          </button>

          {/* User Profile & Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.6rem',
            borderRadius: '6px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <User size={13} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                {currentUser?.name || 'Rail Officer'}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', lineHeight: 1.1 }}>
                {currentUser?.role || 'Sr. DOM (Approver)'}
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px', marginLeft: '0.2rem' }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>

        </div>

      </div>

      {/* Navigation Tabs Bar */}
      <nav style={{
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        overflowX: 'auto',
        background: 'var(--bg-card)'
      }}>
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 0.9rem',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
