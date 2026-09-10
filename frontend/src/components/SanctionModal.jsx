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
  Sparkles
} from 'lucide-react';

export default function SanctionModal({ block, onClose, onApprove }) {
  const [controllerName, setControllerName] = useState('Sri Rajesh Sharma, IRTS');
  const [designation, setDesignation] = useState('Senior Divisional Operations Manager (Sr. DOM), Delhi Division');
  const [remarks, setRemarks] = useState('Sanctioned in accordance with Indian Railways G&SR Para 4.12. Speed restriction and OHE safety cut verified.');
  const [actionSuccess, setActionSuccess] = useState(false);

  if (!block) return null;

  const handleAction = (action) => {
    onApprove({
      block_id: block.id,
      action: action,
      controller_name: controllerName,
      designation: designation,
      remarks: remarks
    });
    setActionSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="ir-sanction-memo" style={{ position: 'relative' }}>
        
        {/* Close Button (Hidden on Print) */}
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          className="no-print"
        >
          <X size={22} />
        </button>

        {/* Official Indian Railways Memo Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            INDIAN RAILWAYS • GOVERNMENT OF INDIA
          </h2>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem' }}>
            NORTHERN RAILWAY / NORTH CENTRAL RAILWAY
          </h3>
          <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.15rem' }}>
            Office of the Divisional Railway Manager (Operating Branch) • Central Control Room
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem' }}>
            <span>Memo No: DRM/OPT/BLK/{new Date().toISOString().slice(0,10).replace(/-/g,'')}/{block.id}</span>
            <span>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, textDecoration: 'underline', textTransform: 'uppercase' }}>
            JOINT CIRCULAR: CORRIDOR MAINTENANCE BLOCK SANCTION ORDER
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>
            Sanctioned under the authority of Sr. DOM / Operating Control (RailOpt AI Assisted)
          </p>
        </div>

        {/* Block Specifications Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.825rem' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #d1d5db' }}>
              <td style={{ padding: '0.4rem', fontWeight: 700, width: '30%', background: '#f3f4f6' }}>Block Identifier:</td>
              <td style={{ padding: '0.4rem', fontFamily: 'monospace', fontWeight: 700 }}>{block.id} ({block.type})</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #d1d5db' }}>
              <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>Section & Track:</td>
              <td style={{ padding: '0.4rem' }}>{block.section_id} • <strong>{block.track_line} Line</strong> (Station: {block.station_code})</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #d1d5db' }}>
              <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>Sanctioned Timing:</td>
              <td style={{ padding: '0.4rem', fontWeight: 700 }}>
                {block.start_time_str} hrs to {block.end_time_str} hrs ({block.duration_mins} Minutes Possession)
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #d1d5db' }}>
              <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>Contributing Depts:</td>
              <td style={{ padding: '0.4rem', fontWeight: 600 }}>{block.departments?.join(' + ')}</td>
            </tr>
            {block.downtime_saved_mins > 0 && (
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>Downtime Saved:</td>
                <td style={{ padding: '0.4rem', color: '#059669', fontWeight: 700 }}>
                  +{block.downtime_saved_mins} minutes saved via Multi-Department Block Fusion
                </td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid #d1d5db' }}>
              <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>Required Machines:</td>
              <td style={{ padding: '0.4rem' }}>{block.required_machines || 'N/A (Standard Crew Only)'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #d1d5db' }}>
              <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>Assigned Gangs:</td>
              <td style={{ padding: '0.4rem' }}>{block.required_gangs || 'Standard Section Gang'}</td>
            </tr>
            {block.power_substation && (
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <td style={{ padding: '0.4rem', fontWeight: 700, background: '#f3f4f6' }}>25kV OHE Cut:</td>
                <td style={{ padding: '0.4rem', fontWeight: 700, color: '#dc2626' }}>{block.power_substation} (Discharge rods mandatory)</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mandatory Operating Precautions */}
        <div style={{ marginBottom: '1.25rem', fontSize: '0.78rem', lineHeight: 1.5 }}>
          <h5 style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            OPERATING PRECAUTIONS & G&SR MANDATES:
          </h5>
          <ol style={{ paddingLeft: '1.25rem' }}>
            <li>Controlling Station Master must verify signal disconnection & set points against blocked track before granting authority.</li>
            <li>Traction Power Controller (TPC) must de-energize 25kV OHE feeder and confirm discharge rods are clamped before work initiation.</li>
            <li>Engineering In-Charge must ensure protection banner flags at 600m and three detonators at 1200m on approaching track.</li>
            <li>Traffic block will be cancelled only after joint clearance message transmitted by Engineering, S&T, and TRD supervisors.</li>
          </ol>
        </div>

        {/* Interactive Human Approval Form (Hidden during print) */}
        <div className="no-print" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          <h5 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', marginBottom: '0.5rem' }}>
            Section Controller Sanction & Endorsement:
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4b5563' }}>Authorizing Official:</label>
              <input 
                type="text" 
                value={controllerName} 
                onChange={(e) => setControllerName(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4b5563' }}>Designation:</label>
              <input 
                type="text" 
                value={designation} 
                onChange={(e) => setDesignation(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4b5563' }}>Controller Endorsement / Remarks:</label>
            <textarea 
              rows={2}
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }} className="no-print">
          <button 
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1f2937' }}
          >
            <Printer size={16} />
            Print Official Memo
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleAction('REJECT')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#b91c1c' }}
            >
              <XCircle size={16} />
              Reject / Revoke
            </button>
            <button 
              onClick={() => handleAction('SANCTION')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: '#059669', border: '1px solid #047857', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', color: '#ffffff', boxShadow: '0 2px 6px rgba(5,150,105,0.4)' }}
            >
              <CheckCircle2 size={16} />
              Officially Sanction Block
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div style={{ marginTop: '0.75rem', background: '#d1fae5', color: '#065f46', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
            ✓ Block {block.id} Sanctioned & Broadcasted to Control Office Application (COA)!
          </div>
        )}

      </div>
    </div>
  );
}
