import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import GraphicalReports from './GraphicalReports';
import { exportFinalBacklinksExcel } from '../utils/exportExcel';
import {
  Table,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Filter,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  Calendar,
  UserCheck,
  Trash2,
  Pencil,
  Download,
  X
} from 'lucide-react';

export default function BacklinkDashboard() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [backlinks, setBacklinks] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Edit Modal State
  const [editingBacklink, setEditingBacklink] = useState(null);
  const [editForm, setEditForm] = useState({
    url: '',
    domain: '',
    linkType: 'Profile',
    daSnapshot: '',
    paSnapshot: '',
    traffic: '',
    followType: 'Do-Follow',
    status: 'Approved',
    anchorText: ''
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

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

  const openEditModal = (item) => {
    setEditingBacklink(item);
    setEditForm({
      url: item.url || '',
      domain: item.rootDomain || '',
      linkType: item.linkType || 'Profile',
      daSnapshot: item.daSnapshot !== undefined ? String(item.daSnapshot) : '',
      paSnapshot: item.paSnapshot !== undefined ? String(item.paSnapshot) : '',
      traffic: item.traffic || '',
      followType: item.followType || 'Do-Follow',
      status: item.status || 'Approved',
      anchorText: item.anchorText || ''
    });
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBacklink) return;

    setEditError('');
    setEditSuccess('');

    const bid = editingBacklink._id || editingBacklink.id;
    try {
      const res = await fetch(`${API_BASE_URL}/api/backlinks/${bid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        setEditSuccess('Backlink updated successfully!');
        setTimeout(() => {
          setEditingBacklink(null);
          fetchBacklinks();
        }, 800);
      } else {
        setEditError(data.error || 'Failed to update backlink');
      }
    } catch (err) {
      setEditError('Network error updating backlink');
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

        {/* Final Excel Export Action Button */}
        <button
          type="button"
          onClick={() => exportFinalBacklinksExcel(backlinks)}
          className="search-btn"
          style={{ background: 'linear-gradient(135deg, var(--accent-green), #059669)', padding: '0.55rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={16} /> Export Final Main Domains (Excel)
        </button>
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
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Actions</th>
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

                      {/* Actions (Edit and Delete) */}
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid #3b82f6',
                              color: '#60a5fa',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Edit Backlink Record"
                          >
                            <Pencil size={12} /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBacklink(item._id || item.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Delete Backlink Entry"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Backlink Modal */}
      {editingBacklink && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '550px',
            padding: '1.8rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <button
              onClick={() => setEditingBacklink(null)}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
              <Pencil size={20} /> Edit Backlink Submission
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              Modify backlink parameters for target domain: <strong>{editForm.domain || editingBacklink.url}</strong>
            </p>

            {editError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.7rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            {editSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '0.7rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} /> {editSuccess}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Public Link (Backlink URL)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.url}
                  onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Type</label>
                <select
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', cursor: 'pointer' }}
                  value={editForm.linkType}
                  onChange={e => setEditForm({ ...editForm, linkType: e.target.value })}
                >
                  <option value="Profile">Profile</option>
                  <option value="Directory">Directory</option>
                  <option value="Guest Post">Guest Post</option>
                  <option value="Forum">Forum</option>
                  <option value="Web 2.0">Web 2.0</option>
                  <option value="Social Bookmark">Social Bookmark</option>
                  <option value="Article">Article</option>
                  <option value="Comment">Comment</option>
                  <option value="PDF Submission">PDF Submission</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Follow Type</label>
                <select
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', cursor: 'pointer' }}
                  value={editForm.followType}
                  onChange={e => setEditForm({ ...editForm, followType: e.target.value })}
                >
                  <option value="Do-Follow">Do-Follow</option>
                  <option value="No-Follow">No-Follow</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Domain Authority (DA)</label>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.daSnapshot}
                  onChange={e => setEditForm({ ...editForm, daSnapshot: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Page Authority (PA)</label>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.paSnapshot}
                  onChange={e => setEditForm({ ...editForm, paSnapshot: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Traffic</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.traffic}
                  onChange={e => setEditForm({ ...editForm, traffic: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Status</label>
                <select
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', cursor: 'pointer' }}
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Live">Live</option>
                  <option value="Removed">Removed</option>
                  <option value="Broken">Broken</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Anchor Text</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.anchorText}
                  onChange={e => setEditForm({ ...editForm, anchorText: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingBacklink(null)}
                  className="search-input"
                  style={{ padding: '0.55rem 1.2rem', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="search-btn"
                  style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
