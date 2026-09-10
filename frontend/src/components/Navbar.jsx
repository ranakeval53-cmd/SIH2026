import React, { useState, useEffect } from 'react';
import { 
  Train, 
  Layers, 
  Activity, 
  AlertOctagon, 
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
  Moon
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, kpis, onRunPipeline, currentUser, onLogout, theme, onToggleTheme }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Command Hub', icon: Activity },
    { id: 'schedule', label: 'Master Gantt', icon: Layers },
    { id: 'prioritization', label: 'AI Risk Radar', icon: Cpu },
    { id: 'conflicts', label: 'Fusion & Conflicts', icon: AlertOctagon },
    { id: 'simulator', label: 'What-If Lab', icon: Sliders },
    { id: 'sanctions', label: 'Sanction Memos', icon: FileCheck2 },
    { id: 'pipeline', label: 'Data Feeds', icon: Database },
  ];

  return (
    <header className="glass-panel" style={{ borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderTop: 'none', position: 'sticky', top: 0, zIndex: 50, padding: '0.75rem 1.5rem', background: 'var(--navbar-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(23, 105, 170, 0.4)' }}>
            <Train size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-main)' }}>
                RailOpt AI
              </span>
              <span className="badge badge-tdms" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                SIH26027
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.5rem' }}>
                Team Techtonic
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              Indian Railways • AI Automatic Block Planning System
            </p>
          </div>
        </div>

        {/* Right Controls: Live Corridor Status + Theme Toggle + Officer Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Live Corridor Status Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'var(--bg-card)', padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>CORRIDOR:</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>NDLS ➔ PRYJ ➔ DDU</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.65rem' }}>
              <Zap size={13} color="var(--color-primary)" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Utilization:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {kpis?.summary?.block_utilization_pct || 85.4}%
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.65rem' }}>
              <Clock size={13} color="var(--color-warning)" />
              <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: 'var(--color-warning)', fontWeight: 600 }}>
                {currentTime.toLocaleTimeString('en-IN', { hour12: false })} IST
              </span>
            </div>
          </div>

          {/* Theme Toggle Button (☀️ Light / 🌙 Dark) */}
          <button
            type="button"
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.2s ease'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode (🌙)' : 'Switch to Light Mode (☀️)'}
          >
            {theme === 'light' ? (
              <>
                <Moon size={14} color="#1769AA" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={14} color="#FBBF24" />
                <span>Light</span>
              </>
            )}
          </button>

          {/* Logged in Officer Profile & Sign Out Button */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '0.25rem 0.5rem 0.25rem 0.65rem', borderRadius: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.725rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(23, 105, 170, 0.35)'
              }}>
                {currentUser.initials || 'IR'}
              </div>

              <div style={{ lineHeight: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {currentUser.name ? currentUser.name.split(',')[0] : 'Railway Officer'}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 600, display: 'block' }}>
                  {currentUser.role ? currentUser.role.split('(')[0] : 'Operating Control'}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.55rem',
                  marginLeft: '0.25rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: 'var(--color-critical)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                }}
                title="Sign out of Corridor Planning Session"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '7px',
                fontSize: '0.825rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-card-subtle)' : 'transparent',
                border: isActive ? '1px solid var(--border-card)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={16} color={isActive ? 'var(--color-primary)' : 'var(--text-dim)'} />
              <span>{item.label}</span>
              {item.id === 'conflicts' && (
                <span style={{ background: 'var(--color-fused)', color: '#fff', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.05rem 0.4rem', fontWeight: 800 }}>
                  5 Fused
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
