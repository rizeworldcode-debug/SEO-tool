import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Send, Plus, Filter, Calendar, Mail, CheckCircle2, AlertCircle, ExternalLink, Sparkles, Link2 } from 'lucide-react';

export default function OutreachTracker() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [outreachRecords, setOutreachRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form State
  const [site, setSite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [pitchDate, setPitchDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState('');

  // Status Change Modal / Published State
  const [activePublishingRecord, setActivePublishingRecord] = useState(null);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok && data.projects?.length > 0) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchOutreach = async () => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      if (selectedProjectId) queryParams.append('projectId', selectedProjectId);
      if (filterStatus) queryParams.append('status', filterStatus);

      const res = await fetch(`${API_BASE_URL}/api/outreach?${queryParams.toString()}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setOutreachRecords(data.outreachRecords || []);
      }
    } catch (err) {
      console.error('Error fetching outreach records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  useEffect(() => {
    fetchOutreach();
  }, [selectedProjectId, filterStatus, token]);

  const handleRecordPitch = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !site.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          site,
          contactEmail,
          pitchDate,
          followUpDate: followUpDate || null,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Outreach pitch for '${data.outreach.site}' recorded!`
        });
        setSite('');
        setContactEmail('');
        setNotes('');
        setFollowUpDate('');
        fetchOutreach();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record pitch' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error recording pitch' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (record, newStatus) => {
    if (newStatus === 'published') {
      setActivePublishingRecord(record);
      setPublishedUrl(record.site.includes('://') ? record.site : `https://${record.site}`);
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach/${record._id || record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Outreach status updated to '${newStatus}'` });
        fetchOutreach();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update status' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating status' });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPublish = async (e) => {
    e.preventDefault();
    if (!activePublishingRecord) return;

    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach/${activePublishingRecord._id || activePublishingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          status: 'published',
          publishedUrl: publishedUrl.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `🎉 Outreach Status Updated to 'PUBLISHED'! Auto-created live Backlink entry #${data.autoCreatedBacklink?._id || ''} in main dashboard!`
        });
        setActivePublishingRecord(null);
        setPublishedUrl('');
        fetchOutreach();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to publish outreach' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating status to published' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Record Pitch Form */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={22} color="var(--accent-cyan)" /> Record Outreach / Guest Post Pitch
        </h2>

        {message && (
          <div style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleRecordPitch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Target Project *</label>
            <select
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--input-bg)', color: 'var(--input-color)' }}
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              required
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.businessName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Publisher Site / Target URL *</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={site}
              onChange={e => setSite(e.target.value)}
              placeholder="e.g. techcrunch.com or editor@blog.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Contact Email</label>
            <input
              type="email"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="editor@publisher.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Pitch Date</label>
            <input
              type="date"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem', color: 'var(--input-color)' }}
              value={pitchDate}
              onChange={e => setPitchDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Scheduled Follow-Up Date</label>
            <input
              type="date"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem', color: 'var(--input-color)' }}
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Pitch Notes / Topic</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Pitched guest post on AI SEO tools and backlink monitoring"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              className="search-btn"
              style={{ background: 'var(--accent-cyan)', padding: '0.7rem 1.4rem' }}
              disabled={submitting || !selectedProjectId}
            >
              <Plus size={18} /> {submitting ? 'Recording Pitch...' : 'Record Pitch Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Outreach List & Interactive Status Editor */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} color="var(--accent-green)" /> Active Outreach Pitches ({outreachRecords.length})
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <Filter size={14} color="var(--text-muted)" /> Status Filter:
            <select
              className="search-input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="no_reply">No Reply</option>
              <option value="in_discussion">In Discussion</option>
              <option value="interested">Interested</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="published">Published (Live Backlink)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading outreach records...</p>
        ) : outreachRecords.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No outreach pitches recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(125,125,125,0.05)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>Target Site / Publisher</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Contact Email</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Pitch & Follow-Up Dates</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Status (Triggers Auto-Backlink)</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Linked Backlink Entry</th>
                </tr>
              </thead>
              <tbody>
                {outreachRecords.map(item => (
                  <tr key={item._id || item.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{item.site}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Project: <span style={{ color: '#60a5fa' }}>{item.projectId?.businessName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      {item.contactEmail ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#93c5fd' }}>
                          <Mail size={14} /> {item.contactEmail}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No Email Listed</span>
                      )}
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div>Pitched: {new Date(item.pitchDate).toLocaleDateString()}</div>
                      {item.followUpDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginTop: '2px' }}>
                          Follow-up: {new Date(item.followUpDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <select
                        className="search-input"
                        style={{
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.8rem',
                          background: item.status === 'published' ? 'rgba(16, 185, 129, 0.2)' : 'var(--input-bg)',
                          color: item.status === 'published' ? '#10b981' : 'var(--text-main)',
                          borderColor: item.status === 'published' ? '#10b981' : 'var(--border-card)',
                          fontWeight: item.status === 'published' ? 700 : 400
                        }}
                        value={item.status}
                        onChange={e => handleStatusChange(item, e.target.value)}
                      >
                        <option value="no_reply">No Reply</option>
                        <option value="in_discussion">In Discussion</option>
                        <option value="interested">Interested</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="published">🚀 Published (Auto-Create Backlink)</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      {item.backlinkId ? (
                        <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Link2 size={12} /> Live Backlink #{item.backlinkId._id ? item.backlinkId._id.slice(-6) : item.backlinkId.slice(-6)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not Published Yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Published & Auto-Backlink Modal */}
      {activePublishingRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '480px', display: 'grid', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#10b981" /> Confirm Guest Post Published!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Updating <strong>{activePublishingRecord.site}</strong> status to <code>published</code> will automatically trigger duplicate domain checks, fetch DA/PA/SS metrics, and add a live Backlink entry to your main dashboard.
            </p>

            <form onSubmit={handleConfirmPublish} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Published Backlink URL *</label>
                <input
                  type="url"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={publishedUrl}
                  onChange={e => setPublishedUrl(e.target.value)}
                  placeholder="https://publisher.com/blog/guest-article"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="search-btn"
                  style={{ background: 'rgba(125,125,125,0.2)', color: 'var(--text-main)' }}
                  onClick={() => setActivePublishingRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="search-btn"
                  style={{ background: '#10b981', color: '#fff' }}
                  disabled={updating}
                >
                  {updating ? 'Publishing & Auto-Creating Backlink...' : 'Confirm & Create Backlink'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
