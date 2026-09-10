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
  Zap
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, kpis, onRunPipeline }) {
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
    <header className="glass-panel" style={{ borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderTop: 'none', position: 'sticky', top: 0, zIndex: 50, padding: '0.75rem 1.5rem', background: 'rgba(9, 14, 26, 0.92)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)' }}>
            <Train size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                RailOpt AI
              </span>
              <span className="badge badge-tdms" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                SIH26027
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '0.5rem' }}>
                Team Techtonic
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
              Indian Railways • AI Automatic Block Planning System
            </p>
          </div>
        </div>

        {/* Live Corridor Status Ribbon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>CORRIDOR:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>NDLS ➔ PRYJ ➔ DDU</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.75rem' }}>
            <Zap size={14} color="#06b6d4" />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Block Utilization:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
              {kpis?.summary?.block_utilization_pct || 85.4}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.75rem' }}>
            <Clock size={14} color="#fbbf24" />
            <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#fbbf24', fontWeight: 600 }}>
              {currentTime.toLocaleTimeString('en-IN', { hour12: false })} IST
            </span>
          </div>
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
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(37, 99, 235, 0.25))' : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={16} color={isActive ? '#38bdf8' : '#64748b'} />
              <span>{item.label}</span>
              {item.id === 'conflicts' && (
                <span style={{ background: '#ec4899', color: '#fff', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.05rem 0.4rem', fontWeight: 800 }}>
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
