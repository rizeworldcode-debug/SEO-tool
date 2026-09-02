import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Cpu, DollarSign, RefreshCw, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function MetricsProviderSettings() {
  const { token, user } = useAuth();
  const [providerInfo, setProviderInfo] = useState(null);
  const [estimateInfo, setEstimateInfo] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('internal');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchProviderInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics/provider`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setProviderInfo(data);
        setSelectedProvider(data.activeProvider || 'internal');
      }
    } catch (err) {
      console.error('Error fetching provider info:', err);
    }
  };

  const fetchEstimateInfo = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics/paid-estimate`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setEstimateInfo(data);
      }
    } catch (err) {
      console.error('Error fetching estimate:', err);
    }
  };

  useEffect(() => {
    fetchProviderInfo();
    fetchEstimateInfo();
  }, [token, user]);

  const handleProviderSwitch = async (newProvider) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics/provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ providerName: newProvider })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Active metrics provider switched to '${newProvider.toUpperCase()}'.` });
        setSelectedProvider(newProvider);
        fetchProviderInfo();
        fetchEstimateInfo();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to switch provider' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating provider' });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerWeeklyCron = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics/refresh-weekly`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Weekly metrics refresh complete! Processed ${data.result?.updatedCount || 0} backlinks using provider '${data.result?.provider || selectedProvider}'.`
        });
        fetchProviderInfo();
        fetchEstimateInfo();
      } else {
        setMessage({ type: 'error', text: data.error || 'Refresh job failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error triggering refresh' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header Card */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={22} color="var(--accent-cyan)" /> Pluggable Metrics Provider Settings
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Switch between self-hosted internal engine and paid third-party APIs (Moz, Ahrefs, SEMrush) without code changes. Standardizes metrics to a normalized shape.
        </p>

        {message && (
          <div style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* Active Provider Selector Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.2rem' }}>
          {['internal', 'moz', 'ahrefs', 'semrush'].map(prov => {
            const isActive = selectedProvider === prov;
            return (
              <div
                key={prov}
                onClick={() => handleProviderSwitch(prov)}
                style={{
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                  border: `2px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-card)'}`,
                  borderRadius: '10px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ textTransform: 'uppercase', color: isActive ? 'var(--accent-cyan)' : '#fff' }}>{prov} Provider</strong>
                  {isActive && <CheckCircle2 size={16} color="var(--accent-cyan)" />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {prov === 'internal' ? 'Self-hosted Common Crawl Graph' : `Paid Third-Party API (${prov.toUpperCase()})`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Cost Estimator & Subscription Tier Breakdown */}
      {user?.role === 'admin' && estimateInfo && (
        <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem', display: 'grid', gap: '1.2rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-yellow)' }}>
            <DollarSign size={20} /> Subscription Tier Cost Estimator & Quota Safeguards ({selectedProvider.toUpperCase()})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pricing Model</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>{estimateInfo.pricingModel}</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Min. Tier Monthly Fee</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>${estimateInfo.minMonthlySubscriptionUsd}/mo</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Backlinks to Refresh</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{estimateInfo.totalActiveBacklinks}</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Paid Counter / Budget Cap</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                {estimateInfo.currentPaidCallCount} / {estimateInfo.budgetCap}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={16} /> Subscription Plan Notes:
            </div>
            <p style={{ margin: 0, color: '#e2e8f0' }}>{estimateInfo.notes}</p>
          </div>

          {/* Prominent Pricing Disclaimer Banner */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={16} /> Official Provider Pricing Disclaimer:
            </div>
            <p style={{ margin: 0, color: '#94a3b8' }}>{estimateInfo.disclaimer}</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button
              className="search-btn"
              onClick={handleTriggerWeeklyCron}
              disabled={refreshing}
              style={{ background: 'var(--accent-blue)', padding: '0.7rem 1.2rem' }}
            >
              <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Refreshing Metrics...' : 'Run Weekly Metrics Refresh Now'}
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Executes weekly refresh using active provider ('{selectedProvider.toUpperCase()}').
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
