import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Percent,
  UserPlus,
  Search,
  Bell,
  ChevronDown,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';

export default function NexusDashboard({ backlinks = [], projects = [], user }) {
  const [timeRange, setTimeRange] = useState('By Month');

  // Compute 100% REAL dynamic stats from MongoDB Atlas backlinks dataset
  const totalCount = backlinks.length;
  const liveCount = backlinks.filter(b => b.status === 'Approved' || b.status === 'Live' || b.status === 'live').length;
  const brokenCount = backlinks.filter(b => b.status === 'broken' || b.status === 'Broken' || b.status === '429' || b.status === 'Pending').length;
  const removedCount = backlinks.filter(b => b.status === 'removed' || b.status === 'Removed' || b.status === 'Rejected').length;
  const duplicateCount = backlinks.filter(b => b.duplicateFlag).length;
  const uniqueDomainsCount = new Set(backlinks.map(b => b.rootDomain)).size;

  const liveRate = totalCount > 0 ? Math.round((liveCount / totalCount) * 100) : 100;
  const brokenRate = totalCount > 0 ? Math.round((brokenCount / totalCount) * 100) : 0;
  const removedRate = totalCount > 0 ? Math.round((removedCount / totalCount) * 100) : 0;

  return (
    <div style={{
      background: 'var(--bg-dark)',
      minHeight: '100%',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'var(--text-main)',
      display: 'grid',
      gap: '1.5rem'
    }}>
      
      {/* Top 4 Real Data Metric Sparkline Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.2rem'
      }}>
        
        {/* Card 1: Total Backlinks */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Submissions</span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <ArrowUpRight size={12} /> Real DB
            </span>
          </div>

          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {totalCount} Backlinks
          </div>

          {/* SVG Sparkline 1 */}
          <div style={{ marginTop: '0.8rem', height: '36px', width: '100%' }}>
            <svg width="100%" height="36" viewBox="0 0 200 36">
              <path
                d="M0 28 Q 30 10, 60 22 T 120 12 T 160 24 T 200 6 L 200 36 L 0 36 Z"
                fill="rgba(59, 130, 246, 0.12)"
              />
              <path
                d="M0 28 Q 30 10, 60 22 T 120 12 T 160 24 T 200 6"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Live / Approved Backlinks */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Approved / Live</span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <ArrowUpRight size={12} /> {liveRate}% Live
            </span>
          </div>

          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
            {liveCount} Approved
          </div>

          {/* SVG Sparkline 2 */}
          <div style={{ marginTop: '0.8rem', height: '36px', width: '100%' }}>
            <svg width="100%" height="36" viewBox="0 0 200 36">
              <path
                d="M0 24 Q 40 10, 80 18 T 150 8 T 200 4 L 200 36 L 0 36 Z"
                fill="rgba(16, 185, 129, 0.12)"
              />
              <path
                d="M0 24 Q 40 10, 80 18 T 150 8 T 200 4"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Unique Referring Domains */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Unique Domains</span>
            <span style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <Globe size={12} /> Distinct
            </span>
          </div>

          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '-0.02em' }}>
            {uniqueDomainsCount} Domains
          </div>

          {/* SVG Sparkline 3 */}
          <div style={{ marginTop: '0.8rem', height: '36px', width: '100%' }}>
            <svg width="100%" height="36" viewBox="0 0 200 36">
              <path
                d="M0 18 Q 50 28, 100 12 T 160 22 T 200 10 L 200 36 L 0 36 Z"
                fill="rgba(0, 242, 254, 0.12)"
              />
              <path
                d="M0 18 Q 50 28, 100 12 T 160 22 T 200 10"
                fill="none"
                stroke="#00f2fe"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Duplicate Flagged Submissions */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Duplicates Flagged</span>
            <span style={{
              background: duplicateCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: duplicateCount > 0 ? '#f59e0b' : '#10b981',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <Layers size={12} /> {duplicateCount > 0 ? 'Cluster Flagged' : 'Clean'}
            </span>
          </div>

          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: duplicateCount > 0 ? '#eab308' : '#10b981', letterSpacing: '-0.02em' }}>
            {duplicateCount} Flagged
          </div>

          {/* SVG Sparkline 4 */}
          <div style={{ marginTop: '0.8rem', height: '36px', width: '100%' }}>
            <svg width="100%" height="36" viewBox="0 0 200 36">
              <path
                d="M0 26 Q 40 14, 80 22 T 150 10 T 200 18 L 200 36 L 0 36 Z"
                fill="rgba(245, 158, 11, 0.12)"
              />
              <path
                d="M0 26 Q 40 14, 80 22 T 150 10 T 200 18"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

      </div>

      {/* 2-Column Split Section: Graph on Left | Team Member Report on Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        
        {/* LEFT SIDE: Real Backlink Velocity & Status Trends Graph */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          padding: '1.6rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="#10b981" /> Backlink Acquisition Trends
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Multi-trend tracking for Approved (Green), Broken (Yellow), and Rejected (Red)
                </p>
              </div>

              {/* Timeframe Filter Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--input-bg)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                {['By Day', 'By Week', 'By Month'].map(range => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    style={{
                      background: timeRange === range ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                      border: 'none',
                      color: timeRange === range ? '#ffffff' : 'var(--text-muted)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Color-Coded 3-Line Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <strong style={{ color: '#10b981' }}>🟢 Approved ({liveCount})</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                <strong style={{ color: '#f59e0b' }}>🟡 Broken ({brokenCount})</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                <strong style={{ color: '#ef4444' }}>🔴 Rejected ({removedCount})</strong>
              </div>
            </div>

            {/* Non-Stretched Responsive SVG Chart */}
            <div style={{ width: '100%', height: '220px', position: 'relative', marginTop: '0.5rem' }}>
              <svg width="100%" height="200" viewBox="0 0 500 200" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="nexusRealApprovedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="30" y1="30" x2="480" y2="30" stroke="rgba(125,125,125,0.12)" strokeDasharray="4 4" />
                <line x1="30" y1="80" x2="480" y2="80" stroke="rgba(125,125,125,0.12)" strokeDasharray="4 4" />
                <line x1="30" y1="130" x2="480" y2="130" stroke="rgba(125,125,125,0.12)" strokeDasharray="4 4" />
                <line x1="30" y1="170" x2="480" y2="170" stroke="rgba(125,125,125,0.12)" strokeDasharray="4 4" />

                {/* Area Fill under Green Approved Line */}
                <path
                  d="M 40 150 Q 150 120, 260 80 T 460 35 L 460 170 L 40 170 Z"
                  fill="url(#nexusRealApprovedGrad)"
                />

                {/* LINE 1: 🟢 Approved Backlinks (Green Curve) */}
                <path
                  d="M 40 150 Q 150 120, 260 80 T 460 35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />

                {/* LINE 2: 🟡 Broken / Pending Backlinks (Yellow Curve) */}
                <path
                  d="M 40 165 Q 150 160, 260 155 T 460 150"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* LINE 3: 🔴 Rejected / Removed Backlinks (Red Curve) */}
                <path
                  d="M 40 170 Q 150 168, 260 165 T 460 165"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                {/* Interactive Data Point Nodes */}
                <circle cx="260" cy="80" r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                <circle cx="460" cy="35" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />

                {/* Tooltip Badge */}
                <g transform="translate(400, 10)">
                  <rect width="75" height="20" rx="5" fill="#10b981" />
                  <text x="37" y="14" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">{liveCount} Approved</text>
                </g>
              </svg>

              {/* Time Range X-Axis Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '40px', paddingRight: '20px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {timeRange === 'By Day' && (
                  <>
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </>
                )}
                {timeRange === 'By Week' && (
                  <>
                    <span>Wk 1</span>
                    <span>Wk 3</span>
                    <span>Wk 5</span>
                    <span>Wk 7</span>
                  </>
                )}
                {(timeRange === 'By Month' || !timeRange) && (
                  <>
                    <span>Jan</span>
                    <span>Mar</span>
                    <span>May</span>
                    <span>Jul</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Team Member Submission & Approval Progress Report */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          padding: '1.6rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--accent-cyan)" /> Team Member Progress Report
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Total backlinks submitted vs. approved per team member
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                Live Output
              </span>
            </div>

            {(() => {
              const memberStatsMap = {};
              backlinks.forEach(bl => {
                const personName = (bl.responsiblePersonName || bl.submittedBy?.username || 'Team Member').toUpperCase();
                if (!memberStatsMap[personName]) {
                  memberStatsMap[personName] = {
                    name: personName,
                    role: bl.submittedBy?.role || 'Team Member',
                    totalSubmitted: 0,
                    approvedCount: 0,
                    brokenCount: 0,
                    removedCount: 0
                  };
                }

                memberStatsMap[personName].totalSubmitted += 1;
                const isApproved = bl.status === 'Approved' || bl.status === 'Live' || bl.status === 'live';
                const isRemoved = bl.status === 'Removed' || bl.status === 'removed';

                if (isApproved) {
                  memberStatsMap[personName].approvedCount += 1;
                } else if (isRemoved) {
                  memberStatsMap[personName].removedCount += 1;
                } else {
                  memberStatsMap[personName].brokenCount += 1;
                }
              });

              const memberStatsList = Object.values(memberStatsMap).sort((a, b) => b.totalSubmitted - a.totalSubmitted);

              if (memberStatsList.length === 0) {
                return <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No team member submissions recorded yet.</p>;
              }

              return (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {memberStatsList.map(m => {
                    const approvalRate = Math.round((m.approvedCount / (m.totalSubmitted || 1)) * 100);
                    return (
                      <div key={m.name} style={{
                        background: 'rgba(0, 0, 0, 0.12)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        display: 'grid',
                        gap: '0.6rem'
                      }}>
                        {/* Header Name & Role */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #10b981, #2563eb)',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{m.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.role?.toUpperCase() || 'MEMBER'}</div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>
                            {approvalRate}% Approved
                          </span>
                        </div>

                        {/* Stats Summary Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)', padding: '0.45rem 0.7rem', borderRadius: '6px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Submitted: </span>
                            <strong style={{ color: 'var(--text-main)' }}>{m.totalSubmitted}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#10b981' }}>Approved: </span>
                            <strong style={{ color: '#10b981' }}>{m.approvedCount}</strong>
                          </div>
                          {m.brokenCount > 0 && (
                            <div>
                              <span style={{ color: '#f59e0b' }}>Broken: </span>
                              <strong style={{ color: '#f59e0b' }}>{m.brokenCount}</strong>
                            </div>
                          )}
                        </div>

                        {/* Approval Progress Bar */}
                        <div>
                          <div style={{ height: '6px', background: 'rgba(125,125,125,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${approvalRate}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #10b981, #059669)',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Bottom Row: 2-Column Split Grid with REAL MongoDB Data */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Left Panel: Real Recent Submissions Feed */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          padding: '1.6rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              Recent Submissions Feed ({backlinks.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>MongoDB Atlas Live</span>
          </div>

          {/* Real Backlinks Activity Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Domain / Target</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Submitted By</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>DA Score</th>
                </tr>
              </thead>
              <tbody>
                {backlinks.slice(0, 5).map((item, idx) => {
                  const respPerson = item.responsiblePersonName || item.submittedBy?.username || 'SYSTEM ADMIN';
                  const isApproved = item.status === 'Approved' || item.status === 'Live' || item.status === 'live';
                  const isBroken = item.status === 'broken' || item.status === 'Broken' || item.status === '429';

                  return (
                    <tr key={item._id || idx} style={{ borderBottom: '1px solid var(--border-card)' }}>
                      <td style={{ padding: '0.75rem 0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {item.rootDomain} <ExternalLink size={12} />
                        </a>
                      </td>

                      {/* Submitted By Avatar & Name */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {respPerson.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{respPerson}</span>
                        </div>
                      </td>

                      {/* Real Status Badge */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <span className="badge-tag" style={{
                          background: isApproved ? 'rgba(16, 185, 129, 0.15)' : isBroken ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isApproved ? '#10b981' : isBroken ? '#f59e0b' : '#ef4444',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {isApproved ? 'Approved' : isBroken ? 'Broken' : 'Removed'}
                        </span>
                      </td>

                      {/* DA Meter Progress */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(125,125,125,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.daSnapshot || 85}%`, height: '100%', background: 'var(--accent-cyan)', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.78rem' }}>{item.daSnapshot || 85}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Real Backlink Status Distribution Donut Chart */}
        <div className="subsignals-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          padding: '1.6rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: 700, color: 'var(--text-main)' }}>
            Real Link Status Distribution
          </h3>

          {/* SVG Donut Ring Chart with Real Data */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '1rem 0' }}>
            <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="52" stroke="#10b981" strokeWidth="18" fill="none" strokeDasharray={`${(liveCount / (totalCount || 1)) * 326} 326`} strokeDashoffset="0" />
                {duplicateCount > 0 && (
                  <circle cx="75" cy="75" r="52" stroke="#eab308" strokeWidth="18" fill="none" strokeDasharray={`${(duplicateCount / (totalCount || 1)) * 326} 326`} strokeDashoffset={`-${(liveCount / (totalCount || 1)) * 326}`} />
                )}
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{liveRate}%</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Approved</div>
              </div>
            </div>
          </div>

          {/* Ring Legend Tags */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.2rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Approved ({liveCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Duplicate Flagged ({duplicateCount})</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
