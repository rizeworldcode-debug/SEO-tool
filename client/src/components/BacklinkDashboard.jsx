import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import GraphicalReports from './GraphicalReports';
import { Table, RefreshCw, CheckCircle2, ExternalLink, Filter, AlertTriangle, XCircle, AlertCircle, Info, Calendar, UserCheck, Trash2 } from 'lucide-react';

export default function BacklinkDashboard() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [backlinks, setBacklinks] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const [verifying, setVerifying] = useState(false);

  const fetchBacklinks = async () => {
    try {
      let url = `${API_BASE_URL}/api/backlinks`;
      if (selectedProjectId) {
        url += `?projectId=${selectedProjectId}`;
      }
      const res = await fetch(url, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setBacklinks(data.backlinks || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching backlinks:', err);
    }
  };

  const handleDeleteBacklink = async (id) => {
    if (!window.confirm('Are you sure you want to delete this backlink entry?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/backlinks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        fetchBacklinks();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete backlink');
      }
    } catch (err) {
      alert('Network error deleting backlink');
    }
  };

  const handleVerifyAll = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/backlinks/verify-all`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        await fetchBacklinks();
      }
    } catch (err) {
      console.error('Error re-verifying backlinks:', err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  useEffect(() => {
    fetchBacklinks();
  }, [selectedProjectId, token]);

  const duplicateCount = backlinks.filter(b => b.duplicateFlag).length;

  const getStatusBadgeStyle = (status, spamScore = 0) => {
    if (status === 'removed' || status === 'Removed' || status === 'Rejected') {
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: status || 'Removed' };
    }
    if (status === 'broken' || status === 'Broken' || status === '429' || status === 'Pending' || spamScore > 15) {
      const displayLabel = status === '429' ? 'Broken (429 Rate Limit)' : (status || 'Broken');
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: displayLabel };
    }
    return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: status || 'Approved' };
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Color-Coding Legend Banner */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-main)' }}>
        <strong style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={16} color="var(--accent-cyan)" /> Color-Coding Legend:
        </strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span style={{ fontWeight: 600 }}>Green = Live / Approved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
          <span style={{ fontWeight: 600 }}>Red = Removed / Rejected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
          <span style={{ fontWeight: 600 }}>Orange = Broken / Pending</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
          <span style={{ fontWeight: 600 }}>Yellow = Duplicate Row (Same Root Domain)</span>
        </div>
      </div>

      {/* Filter & Live Status Header Bar */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <Filter size={18} color="var(--accent-cyan)" /> Filter by Project:
          </div>
          <select
            className="search-input"
            style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', minWidth: '220px' }}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">All Master Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.businessName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchBacklinks}
            className="search-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', background: 'var(--input-bg)', border: '1px solid var(--border-card)', color: 'var(--text-main)' }}
          >
            <RefreshCw size={14} /> Refresh Feed
          </button>

          <button
            type="button"
            onClick={handleVerifyAll}
            disabled={verifying}
            className="search-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: verifying ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={14} className={verifying ? 'spin-icon' : ''} />
            {verifying ? 'Re-Verifying Live URLs...' : 'Re-Verify Live URLs (Soft 404)'}
          </button>
        </div>
      </div>

      {/* Creative Graphical Telemetry & Team Member Work Progress Reports */}
      <GraphicalReports backlinks={backlinks} />

      {/* Live Backlink Dashboard Spreadsheet Table */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Table size={20} color="var(--accent-blue)" /> Live Backlink Submissions Feed (Spreadsheet Layout)
        </h3>

        {backlinks.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No backlinks submitted for this project filter yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(125,125,125,0.05)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>Date Created</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Responsible Person</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Domain</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Domain Authority</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Page Authority</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Traffic</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Public Link</th>
                  <th style={{ padding: '0.8rem 1rem' }}>DoFollow / NoFollow</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                  {user?.role === 'admin' && <th style={{ padding: '0.8rem 1rem' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {backlinks.map(item => {
                  const dateStr = item.submissionDate || item.createdAt
                    ? new Date(item.submissionDate || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A';

                  const respPerson = item.responsiblePersonName || (item.submittedBy?.username ? item.submittedBy.username.toUpperCase() : 'DEVENDRA');
                  const statusStyle = getStatusBadgeStyle(item.status, item.ssSnapshot);

                  return (
                    <tr
                      key={item._id || item.id}
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        background: item.duplicateFlag ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                        borderLeft: item.duplicateFlag ? '4px solid #eab308' : '4px solid transparent'
                      }}
                    >
                      {/* Date Created */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {dateStr}
                      </td>

                      {/* Responsible Person */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent-green)' }}>
                        {respPerson}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                        <span className="badge-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                          {item.linkType || 'Profile'}
                        </span>
                      </td>

                      {/* Domain */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                        <a href={item.rootDomain?.startsWith('http') ? item.rootDomain : `https://${item.rootDomain}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                          {item.rootDomain}
                        </a>
                      </td>

                      {/* Domain Authority */}
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {item.daSnapshot || 0}
                      </td>

                      {/* Page Authority */}
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {item.paSnapshot || 0}
                      </td>

                      {/* Traffic */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {item.traffic || 'N/A'}
                      </td>

                      {/* Public Link */}
                      <td style={{ padding: '0.8rem 1rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {item.url} <ExternalLink size={12} />
                        </a>
                      </td>

                      {/* DoFollow / NoFollow */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                        <span className="badge-tag" style={{
                          background: item.followType === 'Do-Follow' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                          color: item.followType === 'Do-Follow' ? '#10b981' : '#94a3b8'
                        }}>
                          {item.followType || 'Do-Follow'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                        <span className="badge-tag" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}
                        </span>
                        {item.duplicateFlag && (
                          <div style={{ fontSize: '0.72rem', color: '#eab308', marginTop: '2px' }}>
                            ⚠ Duplicate Domain
                          </div>
                        )}
                      </td>

                      {/* Actions (Admin Only) */}
                      {user?.role === 'admin' && (
                        <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteBacklink(item._id || item.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Delete Backlink Entry (Admin Only)"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
