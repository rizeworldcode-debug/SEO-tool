import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { PieChart, AlertTriangle, ShieldCheck, Info, Tag, Layers } from 'lucide-react';

export default function AnchorDistributionReport({ projectId }) {
  const { token } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/anchor-distribution?projectId=${projectId}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setReportData(data.report);
      }
    } catch (err) {
      console.error('Error fetching anchor report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [projectId, token]);

  if (!projectId) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1.5rem', borderRadius: '12px', color: 'var(--text-muted)' }}>
        Please select a project to view its Anchor Text Distribution Report.
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading anchor text distribution analysis...</div>;
  }

  if (!reportData) return null;

  const { percentages, counts, isOverOptimized, threshold, hasTargetKeywords, notice } = reportData;

  const categoryColors = {
    naked_url: '#3b82f6',
    generic: '#64748b',
    branded: '#10b981',
    exact_match: '#ef4444',
    other: '#8b5cf6'
  };

  return (
    <div style={{ display: 'grid', gap: '1.2rem' }}>
      {/* Over-Optimization Warning Alert */}
      {isOverOptimized && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
          <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Algorithmic Over-Optimization Risk Warning!</strong>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#fca5a5' }}>
              Exact match anchor text ratio is <strong>{percentages.exact_match}%</strong>, which exceeds the conservative safety threshold of <strong>{threshold}%</strong>. Over-optimizing exact match anchors increases risk of Google Penguin penalties. Diversify your anchor profile with branded or generic anchors.
            </p>
          </div>
        </div>
      )}

      {/* Missing Keywords Notice */}
      {!hasTargetKeywords && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '0.8rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
          <Info size={18} /> {notice}
        </div>
      )}

      {/* 5-Category Breakdown Visualizer */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieChart size={20} color="var(--accent-cyan)" /> Anchor Text Profile Breakdown (5-Category Precedence)
        </h3>

        {/* Progress Bar Visual */}
        <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', marginBottom: '1.5rem' }}>
          {Object.keys(percentages).map(cat => {
            const pct = percentages[cat];
            if (pct <= 0) return null;
            return (
              <div
                key={cat}
                style={{
                  width: `${pct}%`,
                  background: categoryColors[cat],
                  title: `${cat}: ${pct}%`
                }}
              />
            );
          })}
        </div>

        {/* Category Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {Object.keys(percentages).map(cat => {
            const pct = percentages[cat];
            const count = counts[cat];
            const color = categoryColors[cat];

            return (
              <div key={cat} style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${color}40`, padding: '1rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, color, fontSize: '0.85rem' }}>
                    {cat.replace('_', ' ')}
                  </span>
                  <span className="badge-tag" style={{ background: `${color}20`, color, fontSize: '0.75rem' }}>
                    {count} links
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
