import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Activity, AlertTriangle, TrendingUp, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function LinkVelocityTracker({ projectId }) {
  const { token } = useAuth();
  const [velocityData, setVelocityData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchVelocity = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/link-velocity?projectId=${projectId}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setVelocityData(data.velocityReport);
      }
    } catch (err) {
      console.error('Error fetching velocity report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVelocity();
  }, [projectId, token]);

  if (!projectId) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1.5rem', borderRadius: '12px', color: 'var(--text-muted)' }}>
        Please select a project to view its Link Velocity Tracker.
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading link velocity analysis...</div>;
  }

  if (!velocityData) return null;

  const { targetPaceBand, currentWeekVelocity, avgVelocityPerWeek, hasSpikeAlert, weeks } = velocityData;
  const maxCountInTimeline = Math.max(...weeks.map(w => w.count), targetPaceBand.spikeThreshold, 10);

  return (
    <div style={{ display: 'grid', gap: '1.2rem' }}>
      {/* Velocity Spike Warning Alert */}
      {hasSpikeAlert && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
          <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Link Velocity Spike Warning Detected!</strong>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#fca5a5' }}>
              One or more weeks exceeded <strong>{targetPaceBand.spikeThreshold} new links/week</strong> (2x upper target pace band of {targetPaceBand.maxPace}/week). Unnatural spikes in link acquisition speed can trigger manual reviews or automated spam flags from search engines.
            </p>
          </div>
        </div>
      )}

      {/* Target Pace Band & Key Velocity Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Week Velocity</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: currentWeekVelocity > targetPaceBand.maxPace ? '#f59e0b' : 'var(--accent-cyan)' }}>
            {currentWeekVelocity} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>links</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Pace Band</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-green)' }}>
            {targetPaceBand.minPace} – {targetPaceBand.maxPace} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>links/wk</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>12-Week Rolling Average</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {avgVelocityPerWeek} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>avg/wk</span>
          </div>
        </div>
      </div>

      {/* 12-Week Rolling Timeline Progress Visualizer */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} color="var(--accent-green)" /> 12-Week Link Velocity Timeline
        </h3>

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {weeks.map(w => {
            const barWidthPct = Math.min(100, Math.max(4, (w.count / maxCountInTimeline) * 100));
            const isSpike = w.isSpike;

            return (
              <div key={w.label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px', alignItems: 'center', gap: '0.8rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{w.label}</span>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', height: '16px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${barWidthPct}%`,
                      height: '100%',
                      background: isSpike ? '#ef4444' : w.count > targetPaceBand.maxPace ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <span style={{ fontWeight: 600, color: isSpike ? '#ef4444' : 'var(--text-main)', textAlign: 'right' }}>
                  {w.count} links
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
