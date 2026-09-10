import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Train, 
  User, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Radio,
  Clock,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

const RAILWAY_WALLPAPERS = [
  {
    url: '/wallpapers/vande_bharat_dawn.jpg',
    fallback: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1920&auto=format&fit=crop',
    title: 'Vande Bharat Express on Northern Trunk Mainline',
    location: 'Ghaziabad - Kanpur Trunk Corridor'
  },
  {
    url: '/wallpapers/wap7_western_ghats.jpg',
    fallback: 'https://images.unsplash.com/photo-1515165562839-978bbcf18277?q=80&w=1920&auto=format&fit=crop',
    title: 'WAP-7 30201 Electric Locomotive at Morning Dawn',
    location: 'Northern Railway Electrified Trunk Section'
  },
  {
    url: '/wallpapers/railway_junction_twilight.jpg',
    fallback: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=1920&auto=format&fit=crop',
    title: 'Pt. Deen Dayal Upadhyaya (DDU) Interlocking Yard',
    location: 'East Central & Northern Trunk Confluence'
  }
];

export default function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState('approver@ir.gov.in');
  const [password, setPassword] = useState('TrackShield@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPresetRole, setSelectedPresetRole] = useState('APPROVER');
  const [isLoading, setIsLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    try {
      const prev = sessionStorage.getItem('trackshield_bg_idx');
      let nextIdx = 0;
      if (prev !== null) {
        nextIdx = (parseInt(prev, 10) + 1) % RAILWAY_WALLPAPERS.length;
      } else {
        nextIdx = Math.floor(Math.random() * RAILWAY_WALLPAPERS.length);
      }
      setBgIndex(nextIdx);
      sessionStorage.setItem('trackshield_bg_idx', nextIdx.toString());
    } catch {
      setBgIndex(0);
    }
  }, []);

  const handleRolePresetSelect = (roleKey) => {
    setSelectedPresetRole(roleKey);
    if (roleKey === 'APPROVER') {
      setEmail('approver@ir.gov.in');
      setPassword('TrackShield@2026');
    } else if (roleKey === 'PLANNER') {
      setEmail('planner@ir.gov.in');
      setPassword('TrackShield@2026');
    } else if (roleKey === 'DEPARTMENT') {
      setEmail('engineer.tms@ir.gov.in');
      setPassword('TrackShield@2026');
    } else {
      setEmail('admin.control@ir.gov.in');
      setPassword('TrackShield@2026');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      let roleName = 'Senior Divisional Operations Manager (Sr. DOM)';
      let officerName = 'Sri Rajesh Sharma, IRTS';
      let division = 'Delhi Division';
      let systemRole = 'APPROVER';

      if (email.includes('planner')) {
        roleName = 'Chief Corridor Controller';
        officerName = 'Shri Amit Verma';
        systemRole = 'PLANNER';
      } else if (email.includes('engineer') || email.includes('tms')) {
        roleName = 'Senior Section Engineer (P-Way)';
        officerName = 'Er. K. P. Singh';
        systemRole = 'DEPARTMENT_USER';
      } else if (email.includes('admin')) {
        roleName = 'Chief Corridor Operations Administrator';
        officerName = 'Smt. Ananya Sen, IRTS';
        systemRole = 'ADMIN';
      }

      onLogin({
        email,
        name: officerName,
        role: roleName,
        systemRole: systemRole,
        division: division
      });
      setIsLoading(false);
    }, 450);
  };

  const currentBg = RAILWAY_WALLPAPERS[bgIndex] || RAILWAY_WALLPAPERS[0];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      background: '#F5F8FC'
    }}>
      
      {/* Dynamic Background Image with Smooth Enterprise Gradient Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${currentBg.url}), url(${currentBg.fallback})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.92)'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(7, 17, 31, 0.72) 0%, rgba(23, 105, 170, 0.55) 100%)',
          backdropFilter: 'blur(3px)'
        }}
      />

      {/* Top Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              TrackShield AI
            </div>
            <div style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>
              Indian Railways Enterprise Decision Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#CBD5E1', fontSize: '0.75rem' }}>
            <Radio size={12} color="#22C55E" />
            <span>Northern & North Central Corridor Live</span>
          </div>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Moon size={13} color="#38BDF8" /> : <Sun size={13} color="#FBBF24" />}
              <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Centered Enterprise Login Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div className="enterprise-card" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.25rem 2rem',
          background: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          borderRadius: '16px'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(23, 105, 170, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto',
              color: 'var(--color-primary)'
            }}>
              <Train size={26} />
            </div>
            <h2 className="text-h2" style={{ fontSize: '1.35rem', color: '#172033' }}>
              Corridor Officer Sign In
            </h2>
            <p className="text-sub" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
              Access AI Block Planning & Sanction Authority
            </p>
          </div>

          {/* Quick Role Switcher Buttons */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Select Operational Role:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {[
                { id: 'APPROVER', label: 'Sr. DOM (Approver)', tag: 'Sanction Authority' },
                { id: 'PLANNER', label: 'Planner (Operating)', tag: 'Sanction Authority' },
                { id: 'DEPARTMENT', label: 'Department User', tag: 'View Only' },
                { id: 'ADMIN', label: 'Corridor Admin', tag: 'View Only' }
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRolePresetSelect(r.id)}
                  style={{
                    padding: '0.45rem 0.5rem',
                    borderRadius: '6px',
                    textAlign: 'left',
                    background: selectedPresetRole === r.id ? 'var(--color-primary)' : 'var(--bg-card-subtle)',
                    color: selectedPresetRole === r.id ? '#FFFFFF' : 'var(--text-main)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', opacity: selectedPresetRole === r.id ? 0.9 : 0.65, fontWeight: 500 }}>
                    {r.tag}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLoginSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Official Railway Email:
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    fontSize: '0.825rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Password:
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 2.25rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    fontSize: '0.825rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
            >
              <span>{isLoading ? 'Connecting to Corridor...' : 'Sign In to TrackShield AI'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: '#CBD5E1'
      }}>
        <span>Photo: {currentBg.title} ({currentBg.location})</span>
        <span>TrackShield AI Platform 2.0</span>
      </footer>

    </div>
  );
}
