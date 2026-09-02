import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import {
  Link2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield,
  Edit3,
  Calendar,
  UserCheck,
  Globe,
  BarChart,
  Tag,
  ArrowRight
} from 'lucide-react';

export default function BacklinkSubmit() {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Auto-filled master profile state
  const [autofillData, setAutofillData] = useState(null);
  const [autofillLoading, setAutofillLoading] = useState(false);

  // Form Fields Matching Spreadsheet
  const [linkType, setLinkType] = useState('Profile');
  const [domainUrl, setDomainUrl] = useState('https://hashnode.com');
  const [publicLink, setPublicLink] = useState('https://hashnode.com/@devendra');
  const [followType, setFollowType] = useState('Do-Follow');
  const [status, setStatus] = useState('Approved');
  const [domainAuthority, setDomainAuthority] = useState('85');
  const [pageAuthority, setPageAuthority] = useState('42');
  const [traffic, setTraffic] = useState('50K');
  const [anchorText, setAnchorText] = useState('MediCompares Healthcare');

  // Manual Overwrite Toggle & State
  const [enableManualOverwrite, setEnableManualOverwrite] = useState(false);
  const [manualProfile, setManualProfile] = useState({
    businessName: '',
    address: '',
    phone: '',
    businessEmail: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [submittedList, setSubmittedList] = useState([]);

  // Fetch Projects List for Dropdown
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok && data.projects?.length > 0) {
        setProjects(data.projects);
        setSelectedProjectId(data.projects[0]._id || data.projects[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  // Fetch Auto-Fill Profile when selectedProjectId changes
  const fetchAutofillProfile = async (projId) => {
    if (!projId) return;
    setAutofillLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projId}/autofill`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setAutofillData(data);
        setManualProfile({
          businessName: data.businessName || '',
          address: data.address || '',
          phone: data.phone || '',
          businessEmail: data.businessEmail || ''
        });
      }
    } catch (err) {
      console.error('Error fetching autofill profile:', err);
    } finally {
      setAutofillLoading(false);
    }
  };

  // Fetch live submitted backlinks
  const fetchBacklinks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/backlinks`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setSubmittedList(data.backlinks || []);
      }
    } catch (err) {
      console.error('Error fetching backlinks:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchBacklinks();
  }, [token]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchAutofillProfile(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleSubmitBacklink = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !publicLink.trim()) return;

    setSubmitting(true);
    setMessage(null);

    const payload = {
      projectId: selectedProjectId,
      url: publicLink,
      domain: domainUrl,
      linkType,
      daSnapshot: domainAuthority,
      paSnapshot: pageAuthority,
      traffic,
      followType,
      status,
      anchorText,
      manualProfileOverwrites: enableManualOverwrite ? manualProfile : null
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/backlinks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Backlink submitted! Created by ${user?.username ? user.username.toUpperCase() : 'DEVENDRA'} at ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        });
        setPublicLink('');
        fetchBacklinks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit backlink' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error submitting backlink' });
    } finally {
      setSubmitting(false);
    }
  };

  const responsibleName = user?.username ? user.username.toUpperCase() : 'DEVENDRA';
  const currentDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {/* Backlink Submission Card matching Spreadsheet columns */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '14px', padding: '1.8rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link2 size={24} color="var(--accent-green)" /> Submit Backlink Record
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
          Fill in all backlink submission columns. Date Created is auto-captured via <code>Date.now</code> and Responsible Person is auto-linked to your logged-in user account.
        </p>

        {/* Auto-Captured Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-card)', padding: '0.9rem 1.2rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={18} color="var(--accent-cyan)" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Date Created (Auto-Set)</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>{currentDateStr} (Today)</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck size={18} color="var(--accent-green)" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Responsible Person (Auto-Linked)</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--accent-green)' }}>{responsibleName}</strong>
            </div>
          </div>
        </div>

        {message && (
          <div style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmitBacklink} style={{ display: 'grid', gap: '1.2rem' }}>
          {/* Target Master Project Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              Target Master Project:
            </label>
            <select
              className="search-input"
              style={{ width: '100%', padding: '0.7rem 0.9rem', cursor: 'pointer' }}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.length === 0 ? (
                <option value="">No projects available (Add one in Master Projects tab)</option>
              ) : (
                projects.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.businessName} — {p.projectUrl}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
            {/* Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Type (Submission Type) *</label>
              <select
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem', cursor: 'pointer' }}
                value={linkType}
                onChange={e => setLinkType(e.target.value)}
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

            {/* Target Domain */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Domain (Target Site Root) *</label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem' }}
                value={domainUrl}
                onChange={e => setDomainUrl(e.target.value)}
                placeholder="https://hashnode.com"
                required
              />
            </div>

            {/* Public Link */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Public Link (Live Backlink URL) *</label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem' }}
                value={publicLink}
                onChange={e => setPublicLink(e.target.value)}
                placeholder="https://hashnode.com/@devendra"
                required
              />
            </div>

            {/* DoFollow / NoFollow */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>DoFollow / NoFollow *</label>
              <select
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem', cursor: 'pointer' }}
                value={followType}
                onChange={e => setFollowType(e.target.value)}
              >
                <option value="Do-Follow">Do-Follow</option>
                <option value="No-Follow">No-Follow</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Status *</label>
              <select
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem', cursor: 'pointer' }}
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Live">Live</option>
                <option value="Removed">Removed</option>
                <option value="Broken">Broken</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Domain Authority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Domain Authority (DA)</label>
              <input
                type="number"
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem' }}
                value={domainAuthority}
                onChange={e => setDomainAuthority(e.target.value)}
                placeholder="85"
              />
            </div>

            {/* Page Authority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Page Authority (PA)</label>
              <input
                type="number"
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem' }}
                value={pageAuthority}
                onChange={e => setPageAuthority(e.target.value)}
                placeholder="42"
              />
            </div>

            {/* Traffic */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Traffic (Estimated)</label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem' }}
                value={traffic}
                onChange={e => setTraffic(e.target.value)}
                placeholder="50K"
              />
            </div>

            {/* Anchor Text */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Anchor Text Used</label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', padding: '0.65rem 0.8rem' }}
                value={anchorText}
                onChange={e => setAnchorText(e.target.value)}
                placeholder="e.g. MediCompares Healthcare"
              />
            </div>
          </div>

          <button
            type="submit"
            className="search-btn"
            style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', justifySelf: 'start', padding: '0.75rem 1.6rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
            disabled={submitting || !selectedProjectId}
          >
            {submitting ? 'Saving Backlink...' : 'Submit Backlink Record'}
          </button>
        </form>
      </div>

      {/* Live Spreadsheet View Table */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} color="var(--accent-cyan)" /> Live Backlink Submissions ({submittedList.length})
        </h3>

        {submittedList.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
            No backlinks submitted yet. Fill in the form above to record your first backlink.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
                </tr>
              </thead>
              <tbody>
                {submittedList.map(item => {
                  const dateStr = item.submissionDate || item.createdAt
                    ? new Date(item.submissionDate || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A';

                  const respPerson = item.responsiblePersonName || (item.submittedBy?.username ? item.submittedBy.username.toUpperCase() : 'DEVENDRA');

                  return (
                    <tr key={item._id || item.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
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
                        <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                          {item.url}
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
                        <span className="badge-tag" style={{
                          background: item.status === 'Approved' || item.status === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: item.status === 'Approved' || item.status === 'live' ? '#10b981' : '#f59e0b'
                        }}>
                          {item.status || 'Approved'}
                        </span>
                      </td>
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
