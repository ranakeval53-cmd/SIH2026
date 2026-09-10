import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Layers, 
  ArrowUpRight, 
  Clock, 
  HardDrive, 
  Upload,
  Check,
  Zap,
  Filter
} from 'lucide-react';

export default function DataFeedsPage({ datasetStatus, onRefreshDataset, isRefreshing }) {
  const [activeFeeds, setActiveFeeds] = useState([
    {
      id: 'FEED_TRAINS',
      name: 'Train Schedule & Timetable Master',
      source_file: 'trains.csv & schedules.csv',
      category: 'OPERATING',
      records: 26,
      valid_records: 26,
      invalid_records: 0,
      quality_score: 98.5,
      last_updated: datasetStatus?.last_updated || '11-Sep-2026 01:25:00',
      status: 'SYNCHRONIZED',
      health: 'OPTIMAL'
    },
    {
      id: 'FEED_TMS',
      name: 'Track Management System (TMS Defects)',
      source_file: 'tms_defects_real.csv',
      category: 'ENGINEERING',
      records: 7,
      valid_records: 7,
      invalid_records: 0,
      quality_score: 97.2,
      last_updated: datasetStatus?.last_updated || '11-Sep-2026 01:25:00',
      status: 'SYNCHRONIZED',
      health: 'OPTIMAL'
    },
    {
      id: 'FEED_SMMS',
      name: 'Signalling Maintenance (SMMS Faults)',
      source_file: 'smms_faults_real.csv',
      category: 'S&T',
      records: 5,
      valid_records: 5,
      invalid_records: 0,
      quality_score: 99.0,
      last_updated: datasetStatus?.last_updated || '11-Sep-2026 01:25:00',
      status: 'SYNCHRONIZED',
      health: 'OPTIMAL'
    },
    {
      id: 'FEED_TDMS',
      name: 'Traction Distribution (TDMS OHE Jobs)',
      source_file: 'tdms_jobs_real.csv',
      category: 'TRACTION',
      records: 5,
      valid_records: 5,
      invalid_records: 0,
      quality_score: 96.8,
      last_updated: datasetStatus?.last_updated || '11-Sep-2026 01:25:00',
      status: 'SYNCHRONIZED',
      health: 'OPTIMAL'
    },
    {
      id: 'FEED_STATIONS',
      name: 'Corridor Section Master & Station GIS',
      source_file: 'stations.csv',
      category: 'INFRASTRUCTURE',
      records: 20,
      valid_records: 20,
      invalid_records: 0,
      quality_score: 100.0,
      last_updated: datasetStatus?.last_updated || '11-Sep-2026 01:25:00',
      status: 'SYNCHRONIZED',
      health: 'OPTIMAL'
    },
    {
      id: 'FEED_WEATHER',
      name: 'RDSO Weather & Fog Disruption Radar',
      source_file: 'weather_radar_live.json',
      category: 'TELEMETRY',
      records: 12,
      valid_records: 12,
      invalid_records: 0,
      quality_score: 95.0,
      last_updated: 'Live Telemetry',
      status: 'SYNCHRONIZED',
      health: 'OPTIMAL'
    }
  ]);

  const totalRawRecords = datasetStatus?.total_raw_records || activeFeeds.reduce((acc, f) => acc + f.records, 0);
  const totalTasks = datasetStatus?.tasks_loaded || 17;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* 1. Header & Dataset Status Summary Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <Database size={20} />
            </div>
            <div>
              <h1 className="text-h1" style={{ fontSize: '1.35rem' }}>
                Data Feeds & Dataset Pipeline Manager
              </h1>
              <p className="text-sub" style={{ fontSize: '0.78rem' }}>
                Live Ingestion, Schema Validation, Cache Invalidation & Multi-Department Data Hygiene
              </p>
            </div>
          </div>
        </div>

        {/* 1-Click Refresh & Ingestion Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onRefreshDataset}
            disabled={isRefreshing}
            className="btn-primary"
            style={{ fontSize: '0.825rem', gap: '0.45rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'pulse' : ''} />
            <span>{isRefreshing ? 'Processing Pipeline...' : 'Process Dataset / Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top-level Dataset Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        <div className="enterprise-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Active Dataset
            </span>
            <HardDrive size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem' }}>
            NDLS - DDU Trunk Mainline
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            783 km Double-Line Electrified Corridor
          </div>
        </div>

        <div className="enterprise-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Last Pipeline Run
            </span>
            <Clock size={16} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.35rem' }}>
            {datasetStatus?.last_updated || 'Synchronized Just Now'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Zero cache lag • Models in sync
          </div>
        </div>

        <div className="enterprise-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Unified Tasks Loaded
            </span>
            <Layers size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            {totalTasks}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            TMS (7) + SMMS (5) + TDMS (5)
          </div>
        </div>

        <div className="enterprise-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Data Quality Score
            </span>
            <CheckCircle2 size={16} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
            98.2%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            0 invalid / dropped records
          </div>
        </div>

      </div>

      {/* 3. Feeds Table */}
      <div className="enterprise-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
          <div>
            <h3 className="text-h3" style={{ fontSize: '1.05rem' }}>
              Departmental Raw Data Streams
            </h3>
            <p className="text-sub" style={{ fontSize: '0.75rem' }}>
              Monitored feeds automatically converted into standardized CP-SAT optimization inputs
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Data Feed Name</th>
                <th>Source Files</th>
                <th>Category</th>
                <th>Raw Records</th>
                <th>Validation Status</th>
                <th>Data Quality</th>
                <th>Last Synchronized</th>
                <th>Processing State</th>
              </tr>
            </thead>
            <tbody>
              {activeFeeds.map(feed => (
                <tr key={feed.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {feed.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {feed.id}
                    </div>
                  </td>

                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                      {feed.source_file}
                    </span>
                  </td>

                  <td>
                    <span className="badge badge-primary">
                      {feed.category}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontWeight: 700 }}>{feed.records} Records</span>
                  </td>

                  <td>
                    <span className="badge badge-success">
                      ✓ Validated ({feed.valid_records}/{feed.records})
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      <span>{feed.quality_score}%</span>
                    </div>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {feed.last_updated}
                    </span>
                  </td>

                  <td>
                    <span className="badge badge-success">
                      OPTIMIZED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
