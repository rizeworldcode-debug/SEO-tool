import React, { useState } from 'react';
import { Award, BarChart3, PieChart, TrendingUp, ShieldCheck, Activity, Users, Globe, Flame, Layers, ArrowUpRight } from 'lucide-react';

export default function GraphicalReports({ backlinks = [] }) {
  const [activeView, setActiveView] = useState('all');

  const total = backlinks.length || 1;
  const liveCount = backlinks.filter(b => b.status === 'Approved' || b.status === 'Live' || b.status === 'live').length;
  const brokenCount = backlinks.filter(b => b.status === 'broken' || b.status === 'Broken' || b.status === '429' || b.status === 'Pending').length;
  const removedCount = backlinks.filter(b => b.status === 'removed' || b.status === 'Removed' || b.status === 'Rejected').length;

  const livePct = Math.round((liveCount / total) * 100);
  const brokenPct = Math.round((brokenCount / total) * 100);
  const removedPct = Math.round((removedCount / total) * 100);

  // Group by team member
  const memberMap = {};
  backlinks.forEach(bl => {
    const person = (bl.responsiblePersonName || bl.submittedBy?.username || 'Team Member').toUpperCase();
    if (!memberMap[person]) {
      memberMap[person] = { name: person, total: 0, live: 0, broken: 0, removed: 0 };
    }
    memberMap[person].total += 1;
    if (bl.status === 'Approved' || bl.status === 'Live' || bl.status === 'live') memberMap[person].live += 1;
    else if (bl.status === 'Removed' || bl.status === 'removed') memberMap[person].removed += 1;
    else memberMap[person].broken += 1;
  });

  const memberList = Object.values(memberMap).sort((a, b) => b.total - a.total);

  // DA Range Distribution (0-20, 21-40, 41-60, 61-80, 81-100)
  const daBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  backlinks.forEach(bl => {
    const da = bl.daSnapshot || 0;
    if (da <= 20) daBuckets['0-20']++;
    else if (da <= 40) daBuckets['21-40']++;
    else if (da <= 60) daBuckets['41-60']++;
    else if (da <= 80) daBuckets['61-80']++;
    else daBuckets['81-100']++;
  });

  // Donut SVG circumference math
  const radius = 65;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const liveStroke = (liveCount / total) * circumference;
  const brokenStroke = (brokenCount / total) * circumference;
  const removedStroke = (removedCount / total) * circumference;

  return (
    <div style={{ display: 'grid', gap: '1.8rem', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.5rem 1.8rem',
        display: 'flex',
        justifySpace: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 20px 30px -10px rgba(0,0,0,0.3)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff', fontWeight: 700 }}>
            <Activity size={24} color="#00f2fe" /> Graphical Telemetry & Team Performance Reports
          </h2>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Visual distribution graphs, health ratios, domain authority buckets, and team contribution rankings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '0.3rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {['all', 'health', 'team'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              style={{
                background: activeView === tab ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                border: 'none',
                color: activeView === tab ? '#fff' : '#94a3b8',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab === 'all' ? '📊 All Charts' : tab === 'health' ? '🟢 Health Ratios' : '🏆 Team Ranks'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.5rem' }}>
        
        {/* Chart 1: Donut Health Distribution Chart */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.6rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <PieChart size={20} color="#10b981" /> Link Status Health Ratio
            </h3>
            <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
              {livePct}% Healthy
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '1rem 0', flexWrap: 'wrap' }}>
            {/* SVG Donut Chart */}
            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="transparent" />
                {/* Live Circle (Green) */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${liveStroke} ${circumference - liveStroke}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                {/* Broken Circle (Orange) */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#f59e0b"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${brokenStroke} ${circumference - brokenStroke}`}
                  strokeDashoffset={`-${liveStroke}`}
                  strokeLinecap="round"
                />
                {/* Removed Circle (Red) */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${removedStroke} ${circumference - removedStroke}`}
                  strokeDashoffset={`-${liveStroke + brokenStroke}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center Counter */}
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{backlinks.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Links Checked</div>
              </div>
            </div>

            {/* Legend Stats */}
            <div style={{ display: 'grid', gap: '0.8rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Live / Approved:</span>
                <strong style={{ color: '#10b981', marginLeft: 'auto' }}>{liveCount} ({livePct}%)</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Broken / Rate Limit:</span>
                <strong style={{ color: '#f59e0b', marginLeft: 'auto' }}>{brokenCount} ({brokenPct}%)</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Removed / 404:</span>
                <strong style={{ color: '#ef4444', marginLeft: 'auto' }}>{removedCount} ({removedPct}%)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Domain Authority (DA) Distribution Graph */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.6rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <BarChart3 size={20} color="var(--accent-cyan)" /> Domain Authority (DA) Spectrum
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Quality</span>
          </div>

          <div style={{ display: 'grid', gap: '0.9rem', marginTop: '0.5rem' }}>
            {Object.entries(daBuckets).map(([bucket, count]) => {
              const maxCount = Math.max(...Object.values(daBuckets), 1);
              const barPct = Math.round((count / maxCount) * 100);
              const isHigh = bucket === '81-100' || bucket === '61-80';

              return (
                <div key={bucket}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>DA {bucket}</span>
                    <strong style={{ color: isHigh ? 'var(--accent-cyan)' : 'var(--text-main)' }}>{count} Domains ({Math.round((count/total)*100)}%)</strong>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${barPct}%`,
                      height: '100%',
                      background: isHigh
                        ? 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)'
                        : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Chart 3: Team Member Contribution Leaderboard & Graphical Visual Progress */}
      <div className="subsignals-card" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '16px',
        padding: '1.8rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)', fontWeight: 700 }}>
              <Award size={24} color="#f59e0b" /> Team Member Backlink Work Progress & Leaderboard
            </h3>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Breakdown of total link submissions, approved live links, and individual output share.
            </p>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '0.4rem 0.9rem', borderRadius: '10px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Flame size={16} /> Top Contributor: {memberList[0]?.name || 'N/A'}
          </div>
        </div>

        {memberList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No team work progress recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {memberList.map((member, idx) => {
              const contributionPct = Math.round((member.total / total) * 100);
              const isTop = idx === 0;

              return (
                <div key={member.name} style={{
                  background: isTop ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${isTop ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-card)'}`,
                  borderRadius: '14px',
                  padding: '1.2rem',
                  display: 'grid',
                  gap: '0.8rem'
                }}>
                  {/* Top Bar Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isTop ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isTop ? '#fff' : 'var(--text-muted)',
                        fontWeight: 800,
                        fontSize: '0.9rem'
                      }}>
                        #{idx + 1}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {member.name}
                          {isTop && <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: '#000', padding: '0.1rem 0.5rem', borderRadius: '6px', fontWeight: 800 }}>🥇 #1 MVP</span>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Submissions: <strong style={{ color: 'var(--text-main)' }}>{member.total} Links</strong> ({contributionPct}% of total team workload)
                        </div>
                      </div>
                    </div>

                    {/* Stats Pill Counters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                        🟢 {member.live} Live Approved
                      </span>
                      {member.broken > 0 && (
                        <span className="badge-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700 }}>
                          🟠 {member.broken} Broken/Pending
                        </span>
                      )}
                      {member.removed > 0 && (
                        <span className="badge-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700 }}>
                          🔴 {member.removed} Removed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-Colored Visual Segment Bar */}
                  <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                    <div
                      style={{
                        width: `${(member.live / total) * 100}%`,
                        height: '100%',
                        background: '#10b981',
                        transition: 'width 0.4s ease'
                      }}
                      title={`Live: ${member.live}`}
                    />
                    <div
                      style={{
                        width: `${(member.broken / total) * 100}%`,
                        height: '100%',
                        background: '#f59e0b',
                        transition: 'width 0.4s ease'
                      }}
                      title={`Broken: ${member.broken}`}
                    />
                    <div
                      style={{
                        width: `${(member.removed / total) * 100}%`,
                        height: '100%',
                        background: '#ef4444',
                        transition: 'width 0.4s ease'
                      }}
                      title={`Removed: ${member.removed}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
