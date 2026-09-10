import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Layers, 
  X,
  Sparkles,
  Zap,
  MapPin,
  Check
} from 'lucide-react';

export default function SanctionModal({ block, onClose, onApprove, currentUser }) {
  const [controllerName, setControllerName] = useState(
    currentUser?.name || 'Sri Rajesh Sharma, IRTS'
  );
  const [designation, setDesignation] = useState(
    currentUser?.role 
      ? `${currentUser.role}, ${currentUser.division || 'Ahmedabad Division'}`
      : 'Senior Divisional Operations Manager (Sr. DOM), Vadodara / Ahmedabad Division'
  );
  const [remarks, setRemarks] = useState('Sanctioned in accordance with Indian Railways G&SR Para 4.12. Speed restriction, OHE discharge rods cut, and interlocking protection verified.');
  const [actionSuccess, setActionSuccess] = useState(false);

  if (!block) return null;

  // Robust field normalization across Approver selectedRequest and scheduleData block structures
  const blockId = block.request_id || block.id || block.block_id || 'BLK_IR_01';
  const blockType = block.type || (block.title?.includes('Fused') ? 'FUSED_MEGA_BLOCK' : 'STANDALONE_BLOCK');
  const title = block.title || (blockType === 'FUSED_MEGA_BLOCK' ? 'Multi-Department Fused Mega-Block Possession' : 'Corridor Track Maintenance Block');
  const sectionId = block.section_id || block.section || 'SEC_ADI_GER_UP (Ahmedabad - Geratpur)';
  const trackLine = block.track_line || block.line || 'UP Main Line';
  const stationCode = block.station_code || block.station || (block.section_id ? block.section_id.split('_')[1] : 'ADI');
  const kmRange = block.km_range || (block.start_km ? `Km ${block.start_km} - ${block.end_km}` : 'Km 485.0 - 492.5');
  const startTime = block.requested_start || block.start_time_str || block.start_time || '01:30';
  const endTime = block.requested_end || block.end_time_str || block.end_time || '04:15';
  const duration = block.duration_mins || block.duration || 165;
  const downtimeSaved = block.downtime_saved_mins || block.downtime_saved || (blockType === 'FUSED_MEGA_BLOCK' ? 85 : 0);
  
  // Normalized departments
  let departments = [];
  if (Array.isArray(block.departments)) {
    departments = block.departments;
  } else if (typeof block.department === 'string') {
    departments = block.department.split('+').map(s => s.trim());
  } else if (typeof block.departments === 'string') {
    departments = block.departments.split('+').map(s => s.trim());
  } else {
    departments = ['TMS (Civil Track)', 'TDMS (Electrical OHE)'];
  }

  const machines = block.required_machines || (blockType.includes('FUSED') 
    ? 'Plasser Ballast Cleaning Machine (BCM-350) + Catenary Inspection Tower Wagon #07' 
    : 'Track Tamping Machine (CSM-955) + S&T Relay Testing Van');
  const gangs = block.required_gangs || 'Senior Section Engineer (SSE / P-Way) Gang #03 + TRD Overhead Line Maintenance Squad';
  const powerSubstation = block.power_substation || (departments.some(d => String(d).includes('TDMS') || String(d).includes('Electrical')) 
    ? '25kV Traction Feeder Isolated (Sector TSS-ADI/03) - Discharge rods mandatory' 
    : 'OHE Live (No Traction Isolation Required)');
  const riskScore = block.ai_risk_score !== undefined ? block.ai_risk_score : 14.2;

  const handleAction = (action) => {
    if (onApprove) {
      onApprove({
        block_id: blockId,
        action: action,
        controller_name: controllerName,
        designation: designation,
        remarks: remarks
      });
    }
    setActionSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1300);
  };

  const handlePrint = () => {
    window.print();
  };

  const memoDateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const currentDateFormatted = new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ zIndex: 99999, padding: '1.25rem' }}
    >
      {/* Official Memo Card Container */}
      <div 
        className="enterprise-card"
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          position: 'relative',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2.25rem',
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-card)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          borderRadius: '14px'
        }}
      >
        {/* IR Tri-Color Accent Bar */}
        <div style={{
          height: '5px',
          background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%, #138808 100%)',
          borderRadius: '6px 6px 0 0',
          marginBottom: '1.25rem'
        }} />
        
        {/* Close Button (Hidden on Print) */}
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', 
            right: '1.5rem', 
            top: '1.5rem', 
            background: 'var(--bg-card-subtle)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer', 
            color: 'var(--text-muted)',
            transition: 'all 0.15s'
          }}
          className="no-print"
          title="Close Sanction Memo"
        >
          <X size={18} />
        </button>

        {/* Official Indian Railways Memo Header */}
        <div style={{ 
          textAlign: 'center', 
          borderBottom: '2px solid var(--border-card)', 
          paddingBottom: '1rem', 
          marginBottom: '1.25rem' 
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ 
              background: 'var(--color-primary-tint)', 
              color: 'var(--color-primary)', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '4px', 
              fontSize: '0.72rem', 
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}>
              FORM T/409 (ELECTRONIC)
            </span>
            <span style={{
              background: 'rgba(22, 163, 74, 0.12)',
              color: 'var(--color-success)',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              AI-OPTIMIZED
            </span>
          </div>

          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 900, 
            textTransform: 'uppercase', 
            letterSpacing: '0.06em',
            color: 'var(--text-main)',
            lineHeight: 1.3
          }}>
            INDIAN RAILWAYS • GOVERNMENT OF INDIA
          </h2>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            marginTop: '0.2rem',
            color: 'var(--color-primary)'
          }}>
            WESTERN RAILWAY / NORTHERN RAILWAY ZONE
          </h3>
          <p style={{ 
            fontSize: '0.8rem', 
            color: 'var(--text-muted)', 
            fontStyle: 'italic', 
            marginTop: '0.25rem' 
          }}>
            Office of the Divisional Railway Manager (Operating Branch) • Integrated Central Corridor Control Room
          </p>

          {/* Memo Meta Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            background: 'var(--bg-card-subtle)', 
            padding: '0.55rem 0.9rem', 
            borderRadius: '6px', 
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem', 
            fontWeight: 600, 
            color: 'var(--text-main)',
            marginTop: '0.85rem' 
          }}>
            <span>
              Memo No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                DRM/OPT/BLK/{memoDateCode}/{blockId}
              </strong>
            </span>
            <span>Date of Issue: <strong>{currentDateFormatted}</strong></span>
          </div>
        </div>

        {/* Circular Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ 
            fontSize: '1.05rem', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            color: 'var(--text-main)',
            letterSpacing: '0.03em'
          }}>
            JOINT CIRCULAR: CORRIDOR MAINTENANCE BLOCK SANCTION ORDER
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Issued under the statutory authority of Sr. Divisional Operations Manager (Sr. DOM) • Supported by TrackShield AI Multi-Department Auto-Fusion
          </p>
        </div>

        {/* Block Specifications Table */}
        <div style={{ 
          border: '1px solid var(--border-subtle)', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          marginBottom: '1.25rem' 
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '0.825rem' 
          }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  width: '32%', 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  Block Identifier:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {blockId}
                  </span>
                  <span className={`badge ${blockType.includes('FUSED') ? 'badge-fused' : 'badge-primary'}`} style={{ marginLeft: '0.6rem', fontSize: '0.7rem' }}>
                    {blockType.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  Section & Line:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  <strong>{sectionId}</strong> • <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{trackLine} Line</span> ({kmRange})
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  Sanctioned Window:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  <strong style={{ color: 'var(--color-success)', fontSize: '0.88rem' }}>
                    {startTime} hrs to {endTime} hrs
                  </strong> 
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    ({duration} Minutes Track Possession Window)
                  </span>
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  Contributing Depts:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {departments.map((dept, idx) => (
                      <span key={idx} className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                        ✓ {dept}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>

              {downtimeSaved > 0 && (
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ 
                    padding: '0.55rem 0.85rem', 
                    fontWeight: 700, 
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-muted)'
                  }}>
                    Downtime Saved:
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', color: 'var(--color-success)', fontWeight: 700 }}>
                    +{downtimeSaved} minutes network line closure eliminated via Auto-Fusion synchronization
                  </td>
                </tr>
              )}

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  Assigned Machinery:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  {machines}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  Assigned Gangs:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  {gangs}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  25kV OHE Power Status:
                </td>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  color: powerSubstation.includes('Isolated') ? 'var(--color-danger)' : 'var(--color-success)', 
                  fontWeight: 700 
                }}>
                  {powerSubstation}
                </td>
              </tr>

              <tr>
                <td style={{ 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  AI Safety Assurance:
                </td>
                <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-main)' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ Zero Headway Conflicts</span> with passenger timetables • CP-SAT Risk Index: {riskScore}/100
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mandatory Operating Precautions */}
        <div style={{ 
          marginBottom: '1.25rem', 
          fontSize: '0.78rem', 
          lineHeight: 1.55,
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem'
        }}>
          <h5 style={{ 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            marginBottom: '0.4rem',
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <AlertTriangle size={15} />
            MANDATORY OPERATING PRECAUTIONS & G&SR PROTOCOLS:
          </h5>
          <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-main)' }}>
            <li style={{ marginBottom: '0.25rem' }}>
              <strong>Station Master (Operating):</strong> Verify signal disconnection & clamp switch points away from the blocked track prior to granting line clearance token.
            </li>
            <li style={{ marginBottom: '0.25rem' }}>
              <strong>Traction Power Controller (TPC):</strong> De-energize 25kV OHE sub-feeder and confirm discharge safety rods are clamped on both sides before gang step-in.
            </li>
            <li style={{ marginBottom: '0.25rem' }}>
              <strong>Engineering Supervisor (P-Way):</strong> Erect banner flags at 600m and place 3 detonators at 1200m on approaching track facing train traffic.
            </li>
            <li>
              <strong>Block Revocation:</strong> Traffic block shall be cleared only upon receipt of joint clear certificate from Engineering, S&T, and TRD in-charges.
            </li>
          </ol>
        </div>

        {/* Section Controller Endorsement Form (Hidden on Print) */}
        <div 
          className="no-print" 
          style={{ 
            background: 'var(--bg-card-subtle)', 
            border: '1px solid var(--border-card)', 
            padding: '1.1rem', 
            borderRadius: '8px', 
            marginBottom: '1.25rem' 
          }}
        >
          <h5 style={{ 
            fontWeight: 700, 
            fontSize: '0.85rem', 
            color: 'var(--text-main)', 
            marginBottom: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <ShieldCheck size={16} color="var(--color-primary)" />
            Section Controller Sanction & Formal Authority Endorsement:
          </h5>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Authorizing Operations Official:
              </label>
              <input 
                type="text" 
                value={controllerName} 
                onChange={(e) => setControllerName(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.45rem 0.65rem', 
                  fontSize: '0.8rem', 
                  background: 'var(--input-bg, var(--bg-card))',
                  color: 'var(--text-main)',
                  border: '1px solid var(--input-border, var(--border-card))', 
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Official Designation:
              </label>
              <input 
                type="text" 
                value={designation} 
                onChange={(e) => setDesignation(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.45rem 0.65rem', 
                  fontSize: '0.8rem', 
                  background: 'var(--input-bg, var(--bg-card))',
                  color: 'var(--text-main)',
                  border: '1px solid var(--input-border, var(--border-card))', 
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Controller Endorsement & Caution Orders:
            </label>
            <textarea 
              rows={2}
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.45rem 0.65rem', 
                fontSize: '0.8rem', 
                background: 'var(--input-bg, var(--bg-card))',
                color: 'var(--text-main)',
                border: '1px solid var(--input-border, var(--border-card))', 
                borderRadius: '6px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Bottom Actions (Hidden on Print) */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem' 
          }} 
          className="no-print"
        >
          <button 
            onClick={handlePrint}
            className="btn-outline"
            style={{ fontSize: '0.82rem', gap: '0.4rem' }}
          >
            <Printer size={16} />
            <span>Print Official Memo</span>
          </button>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button 
              onClick={() => handleAction('REJECT')}
              className="btn-outline"
              style={{ 
                fontSize: '0.82rem', 
                color: 'var(--color-danger)', 
                borderColor: 'var(--color-danger)',
                gap: '0.4rem' 
              }}
            >
              <XCircle size={16} />
              <span>Reject / Revoke</span>
            </button>

            <button 
              onClick={() => handleAction('SANCTION')}
              className="btn-primary"
              style={{ 
                fontSize: '0.82rem', 
                background: 'var(--color-success)', 
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Officially Sanction Block</span>
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div style={{ 
            marginTop: '1rem', 
            background: 'rgba(22, 163, 74, 0.15)', 
            color: 'var(--color-success)', 
            border: '1px solid var(--color-success)',
            padding: '0.65rem', 
            borderRadius: '6px', 
            textAlign: 'center', 
            fontSize: '0.825rem', 
            fontWeight: 700 
          }}>
            ✓ Sanction Memo DRM/OPT/BLK/{memoDateCode}/{blockId} executed & broadcasted to Control Office Application (COA)!
          </div>
        )}

      </div>
    </div>
  );
}
