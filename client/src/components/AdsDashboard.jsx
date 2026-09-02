import React, { useState } from 'react';
import { Megaphone, DollarSign, MousePointer, Eye, TrendingUp, CheckCircle2, PauseCircle, Play, Plus, BarChart2 } from 'lucide-react';

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: 'Google Search - SEO & Backlink Services', platform: 'Google Ads', budget: 150, spent: 3420, impressions: 84500, clicks: 3820, ctr: '4.52%', conversions: 194, status: 'Active' },
    { id: 2, name: 'Meta Retargeting - Domain Prospects', platform: 'Facebook Ads', budget: 80, spent: 1840, impressions: 142000, clicks: 2910, ctr: '2.05%', conversions: 88, status: 'Active' },
    { id: 3, name: 'LinkedIn B2B Enterprise SEO Outreach', platform: 'LinkedIn Ads', budget: 200, spent: 4100, impressions: 45000, clicks: 1240, ctr: '2.75%', conversions: 42, status: 'Active' },
    { id: 4, name: 'Google Display - Brand Awareness', platform: 'Google Ads', budget: 50, spent: 950, impressions: 210000, clicks: 1850, ctr: '0.88%', conversions: 18, status: 'Paused' },
  ]);

  const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0);

  const toggleStatus = (id) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'Active' ? 'Paused' : 'Active' };
      }
      return c;
    }));
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* KPI Overview Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1.2rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <DollarSign size={16} color="var(--accent-cyan)" /> Total Ad Spend
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            ${totalSpent.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>+12.4% vs last month</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1.2rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Eye size={16} color="var(--accent-blue)" /> Total Impressions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
            {totalImpressions.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>+8.9% reach growth</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1.2rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MousePointer size={16} color="#f59e0b" /> Total Clicks
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
            {totalClicks.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Avg. CTR: 2.78%</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1.2rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <TrendingUp size={16} color="#10b981" /> Conversions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
            {totalConversions}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Avg. CPA: ${(totalSpent / totalConversions).toFixed(2)}</span>
        </div>
      </div>

      {/* Campaigns Management Card */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '14px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={22} color="var(--accent-cyan)" /> Active PPC & Social Ad Campaigns
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time campaign performance tracking across Google Ads, Facebook Ads, and LinkedIn Ads.
            </p>
          </div>

          <button
            type="button"
            className="search-btn"
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
            onClick={() => alert('Add Campaign Modal / Integration')}
          >
            <Plus size={16} /> Connect New Campaign
          </button>
        </div>

        {/* Campaigns Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(125,125,125,0.05)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '0.8rem 1rem' }}>Campaign Name</th>
                <th style={{ padding: '0.8rem 1rem' }}>Platform</th>
                <th style={{ padding: '0.8rem 1rem' }}>Daily Budget</th>
                <th style={{ padding: '0.8rem 1rem' }}>Total Spent</th>
                <th style={{ padding: '0.8rem 1rem' }}>Impressions</th>
                <th style={{ padding: '0.8rem 1rem' }}>Clicks (CTR)</th>
                <th style={{ padding: '0.8rem 1rem' }}>Conversions</th>
                <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                <th style={{ padding: '0.8rem 1rem' }}>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <span className="badge-tag" style={{
                      background: c.platform.includes('Google') ? 'rgba(59, 130, 246, 0.15)' : c.platform.includes('Facebook') ? 'rgba(147, 51, 234, 0.15)' : 'rgba(2, 132, 199, 0.15)',
                      color: c.platform.includes('Google') ? '#60a5fa' : c.platform.includes('Facebook') ? '#c084fc' : '#38bdf8'
                    }}>
                      {c.platform}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    ${c.budget}/day
                  </td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    ${c.spent.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>
                    {c.impressions.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', color: '#f59e0b', fontWeight: 600 }}>
                    {c.clicks.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.ctr})</span>
                  </td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#10b981' }}>
                    {c.conversions}
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <span className="badge-tag" style={{
                      background: c.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: c.status === 'Active' ? '#10b981' : '#f59e0b'
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <button
                      type="button"
                      onClick={() => toggleStatus(c.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: c.status === 'Active' ? '#f59e0b' : '#10b981',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {c.status === 'Active' ? <PauseCircle size={16} /> : <Play size={16} />}
                      {c.status === 'Active' ? 'Pause' : 'Activate'}
                    </button>
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
