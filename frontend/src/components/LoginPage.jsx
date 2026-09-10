import React, { useState, useEffect } from 'react';
import { 
  Train, 
  ShieldCheck, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  Zap,
  Building2,
  ChevronDown
} from 'lucide-react';

// Extensive, High-Resolution Indian Railways Photography Pool
const RAILWAY_WALLPAPERS = [
  {
    id: 'vande_bharat_sunrise',
    url: '/wallpapers/vande_bharat_sunrise.jpg',
    title: 'Vande Bharat Express on Northern Trunk Viaduct at Dawn',
    location: 'NDLS - PRYJ Corridor • Bridge #42 Over Yamuna River',
    photographer: 'Indian Railways Heritage & High-Speed Media'
  },
  {
    id: 'wap7_locomotive_morning',
    url: '/wallpapers/wap7_locomotive_morning.jpg',
    title: 'WAP-7 30201 Electric Locomotive on Misty Curve',
    location: 'North Central Railway • 25kV AC Electrified Route',
    photographer: 'Loco Operations & Rolling Stock Documentation'
  },
  {
    id: 'railway_junction_twilight',
    url: '/wallpapers/railway_junction_twilight.jpg',
    title: 'Pt. Deen Dayal Upadhyaya (DDU) Interlocking & Catenary Yard',
    location: 'KM 783.0 High-Density Trunk Junction • Electronic Interlocking',
    photographer: 'Signalling & Telecom (S&T) Engineering Review'
  },
  {
    id: 'vande_bharat_express_speed',
    url: '/wallpapers/vande_bharat_express_speed.jpg',
    title: 'Semi-High-Speed Vande Bharat on Elevated Viaduct Curve',
    location: 'Delhi - Prayagraj - Pt. DDU Superfast Trunk',
    photographer: 'Ministry of Railways High-Speed Rail Project'
  },
  {
    id: 'track_geometry_dusk',
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=2000&q=85',
    title: 'High-Density Trunk Mainline & Precision Track Geometry',
    location: 'Northern Railway Mainline • Ballasted Concrete Sleepers',
    photographer: 'Professional Track Infrastructure Archive'
  },
  {
    id: 'catenary_twilight',
    url: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=2000&q=85',
    title: 'Electrified 25kV OHE Catenary & Signaling Array at Twilight',
    location: 'Ghaziabad - Dadri High-Speed Quadruple Track',
    photographer: 'Indian Railways Corridor Perspective'
  },
  {
    id: 'chenab_bridge_perspective',
    url: 'https://images.unsplash.com/photo-1515165562839-978bbcf18277?auto=format&fit=crop&w=2000&q=85',
    title: 'Indian Railways Engineering Mastery — Trunk Route Perspectives',
    location: 'Northern Electrified Corridor Network',
    photographer: 'Indian Railways Civil Engineering Documentation'
  },
  {
    id: 'night_express_tracks',
    url: 'https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&w=2000&q=85',
    title: 'Illuminated High-Speed Train Crossing at Night',
    location: 'Delhi Division High-Density Trunk Route',
    photographer: 'National Rail Photography Collection'
  }
];

// Official Indian Railways Personnel Profiles for Quick Selection
const DEMO_PROFILES = [
  {
    id: 'sr_dom',
    name: 'Sri Rajesh Sharma, IRTS',
    role: 'Senior Divisional Operations Manager (Sr. DOM)',
    department: 'Operating Branch',
    division: 'Delhi Division (Northern Railway)',
    initials: 'RS',
    email: 'dom.delhi@indianrailways.gov.in',
    authority: 'Sanctioning Authority & Corridor Regulation'
  },
  {
    id: 'section_controller',
    name: 'Sri Amit Verma',
    role: 'Chief Section Controller (SCR)',
    department: 'Control Office Application (COA)',
    division: 'Prayagraj Control Room (North Central Railway)',
    initials: 'AV',
    email: 'controller.pryj@indianrailways.gov.in',
    authority: 'Real-Time Train Dispatching & Punctuality'
  },
  {
    id: 'sse_pway',
    name: 'Er. Vikramaditya Singh',
    role: 'Senior Section Engineer (P-Way / Track)',
    department: 'Engineering (TMS)',
    division: 'Aligarh Sub-Division (Northern Railway)',
    initials: 'VS',
    email: 'pway.aligarh@indianrailways.gov.in',
    authority: 'Track USFD Flaw Remediation & Tamping Plans'
  },
  {
    id: 'tpc_electrical',
    name: 'Er. Neha Kulshrestha',
    role: 'Traction Power Controller (TPC)',
    department: 'Traction / OHE (TDMS)',
    division: 'Kanpur Central SCADA Operating Cell',
    initials: 'NK',
    email: 'tpc.kanpur@indianrailways.gov.in',
    authority: '25kV Substation De-energization & Earthing'
  }
];

export default function LoginPage({ onLogin }) {
  // Always get a fresh, new photo on every page load/reload
  const [bgIndex, setBgIndex] = useState(() => {
    try {
      const prev = sessionStorage.getItem('railopt_bg_idx');
      let nextIdx = 0;
      if (prev !== null) {
        // Increment sequentially so reload ALWAYS yields a new photograph
        nextIdx = (parseInt(prev, 10) + 1) % RAILWAY_WALLPAPERS.length;
      } else {
        // Random initial start
        nextIdx = Math.floor(Math.random() * RAILWAY_WALLPAPERS.length);
      }
      sessionStorage.setItem('railopt_bg_idx', nextIdx.toString());
      return nextIdx;
    } catch {
      return 0;
    }
  });

  const [selectedProfile, setSelectedProfile] = useState(DEMO_PROFILES[0]);
  const [username, setUsername] = useState(DEMO_PROFILES[0].email);
  const [password, setPassword] = useState('RailOpt@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoFading, setIsPhotoFading] = useState(false);

  const currentBg = RAILWAY_WALLPAPERS[bgIndex];

  // Function to switch to a fresh new photo on demand
  const handleGetNewPhoto = () => {
    setIsPhotoFading(true);
    setTimeout(() => {
      setBgIndex((prev) => {
        const next = (prev + 1) % RAILWAY_WALLPAPERS.length;
        try {
          sessionStorage.setItem('railopt_bg_idx', next.toString());
        } catch (e) {
          console.error(e);
        }
        return next;
      });
      setIsPhotoFading(false);
    }, 200);
  };

  // Change selected profile from dropdown
  const handleRoleChange = (profileId) => {
    const p = DEMO_PROFILES.find(x => x.id === profileId) || DEMO_PROFILES[0];
    setSelectedProfile(p);
    setUsername(p.email);
    setPassword('RailOpt@2026');
  };

  // Handle Login submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: selectedProfile.name,
        role: selectedProfile.role,
        department: selectedProfile.department,
        division: selectedProfile.division,
        email: username,
        initials: selectedProfile.initials,
        authority: selectedProfile.authority,
        loginTime: new Date().toISOString()
      });
    }, 450);
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      color: '#ffffff',
      fontFamily: 'var(--font-sans)'
    }}>
      
      {/* Background Image Layer with dynamic smooth fade */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${currentBg.url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          transition: 'opacity 0.4s ease-in-out, filter 0.4s ease-in-out',
          opacity: isPhotoFading ? 0.4 : 1,
          filter: 'brightness(0.9)',
          zIndex: 0
        }}
      />

      {/* Atmospheric Contrast Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(7, 17, 31, 0.88) 0%, rgba(7, 17, 31, 0.72) 50%, rgba(7, 17, 31, 0.92) 100%)',
          zIndex: 1
        }}
      />
      
      {/* Subtle Micro-Grid */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.5,
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Top Header Bar */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(7, 17, 31, 0.8)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1769AA 0%, #38BDF8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
          }}>
            <Train size={24} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                fontSize: '1.3rem',
                fontWeight: '800',
                letterSpacing: '-0.025em',
                background: 'linear-gradient(to right, #38BDF8, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                RailOpt AI
              </span>
              <span className="badge badge-tdms" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                SIH26027
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '0.6rem' }}>
                Ministry of Railways
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
              AI Automatic Block Planning & Corridor Optimization System • Team Techtonic
            </p>
          </div>
        </div>

        {/* Live Corridor Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'rgba(16, 28, 45, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '0.4rem 0.9rem',
          borderRadius: '8px'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E8F0F8' }}>
            NDLS ➔ PRYJ ➔ DDU TRUNK CORRIDOR
          </span>
        </div>
      </header>

      {/* Main Content Area: Centered Login Card (Left Section Removed) */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem'
      }}>
        
        {/* Centered, Pristine Glassmorphic Login Card */}
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(16, 28, 45, 0.88)',
          backdropFilter: 'blur(32px)',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.28)',
          padding: '2.25rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(23, 105, 170, 0.25)',
          animation: 'fadeIn 0.35s ease'
        }}>
          
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(23, 105, 170, 0.35), rgba(56, 189, 248, 0.25))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.85rem auto',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)'
            }}>
              <ShieldCheck size={28} color="#38BDF8" />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#E8F0F8', letterSpacing: '-0.02em' }}>
              Operating Authority Sign In
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Indian Railways Central Operations & Corridor Maintenance
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* Quick Officer Role Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#E8F0F8', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Select Officer Role (Demo Quick-Fill)
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedProfile.id}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#07111F',
                    color: '#E8F0F8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    padding: '0.65rem 2rem 0.65rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {DEMO_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.role.split('(')[0]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#38BDF8" style={{ position: 'absolute', right: '12px', top: '13px', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Active Authority Badge Box */}
            <div style={{
              background: 'rgba(23, 105, 170, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              padding: '0.6rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8', display: 'block' }}>
                  {selectedProfile.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {selectedProfile.role} • {selectedProfile.division}
                </span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                AUTHORIZED
              </span>
            </div>

            {/* Employee Email / ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#E8F0F8', marginBottom: '0.35rem' }}>
                Official Railway Email / Employee ID
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#07111F',
                    border: '1px solid rgba(232, 240, 248, 0.15)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                    color: '#E8F0F8',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38BDF8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(232, 240, 248, 0.15)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E8F0F8' }}>
                  Password
                </label>
                <span style={{ fontSize: '0.7rem', color: '#38BDF8' }}>
                  Default: RailOpt@2026
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#07111F',
                    border: '1px solid rgba(232, 240, 248, 0.15)',
                    borderRadius: '8px',
                    padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                    color: '#E8F0F8',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38BDF8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(232, 240, 248, 0.15)'}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: '#94a3b8' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#1769AA' }}
                />
                <span>Remember session</span>
              </label>
              <span style={{ color: '#64748b' }}>G&SR Para 4.12 Verified</span>
            </div>

            {/* Sign In Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.75rem',
                fontSize: '0.925rem',
                fontWeight: 700,
                marginTop: '0.35rem',
                background: 'linear-gradient(135deg, #1769AA 0%, #0284c7 100%)',
                boxShadow: '0 6px 20px rgba(23, 105, 170, 0.45)'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Authenticating Corridor Session...</span>
                </>
              ) : (
                <>
                  <span>Enter Corridor Command Center</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
              🔒 Protected by Indian Railways Central Operations Network • 256-Bit TLS
            </p>
          </div>

        </div>

      </main>

      {/* Bottom Wallpaper Controls & Credit Attribution Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.85rem 2rem',
        background: 'rgba(7, 17, 31, 0.88)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '0.75rem'
      }}>
        {/* Photo Attribution Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            padding: '0.3rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Camera size={15} color="#38BDF8" />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#E8F0F8' }}>
              {currentBg.title}
            </span>
            <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
              • {currentBg.location}
            </span>
          </div>
        </div>

        {/* Dynamic Fresh Photo Switcher Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
            Always New Photos on Reload • #{bgIndex + 1} of {RAILWAY_WALLPAPERS.length}
          </span>

          <button
            type="button"
            onClick={handleGetNewPhoto}
            className="btn-outline"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.725rem',
              fontWeight: 600,
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(56, 189, 248, 0.35)',
              color: '#38BDF8'
            }}
            title="Fetch another professional Indian Railways photograph"
          >
            <RefreshCw size={13} color="#38BDF8" />
            <span>✨ Get New Photo</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
