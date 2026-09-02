import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Target, Plus, Filter, ArrowUpDown, Sparkles, Send, CheckCircle2, AlertCircle, Trash2, Edit } from 'lucide-react';

export default function ProspectList() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [prospects, setProspects] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form State
  const [site, setSite] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState('da');
  const [sortOrder, setSortOrder] = useState('desc');

  // Promote Modal State
  const [promoteProspect, setPromoteProspect] = useState(null);
  const [contactEmail, setContactEmail] = useState('');
  const [promoting, setPromoting] = useState(false);

  const fetchProviderInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics/provider`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setProviderInfo(data);
      }
    } catch (err) {
      console.error('Error fetching provider info:', err);
    }
  };

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

  const fetchProspects = async () => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      if (selectedProjectId) queryParams.append('projectId', selectedProjectId);
      if (filterStatus) queryParams.append('contactStatus', filterStatus);
      if (filterPriority) queryParams.append('priority', filterPriority);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);

      const res = await fetch(`${API_BASE_URL}/api/prospects?${queryParams.toString()}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setProspects(data.prospects || []);
      }
    } catch (err) {
      console.error('Error fetching prospects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchProviderInfo();
  }, [token]);

  useEffect(() => {
    fetchProspects();
  }, [selectedProjectId, filterStatus, filterPriority, sortBy, sortOrder, token]);

  const handleAddProspect = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !site.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          site,
          priority,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Prospect '${data.prospect.site}' added! Metrics snapshot fetched via '${data.providerSource}' provider: AS ${data.prospect.daSnapshot} / PS ${data.prospect.paSnapshot} / SS ${data.prospect.ssSnapshot}`
        });
        setSite('');
        setNotes('');
        fetchProspects();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add prospect' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error adding prospect' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteToOutreach = async (e) => {
    e.preventDefault();
    if (!promoteProspect || !contactEmail.trim()) return;

    setPromoting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/prospects/${promoteProspect._id || promoteProspect.id}/promote-to-outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ contactEmail })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Successfully promoted '${promoteProspect.site}' to Outreach tracker with contact email '${contactEmail}'!`
        });
        setPromoteProspect(null);
        setContactEmail('');
        fetchProspects();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to promote prospect' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error promoting prospect' });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Add Prospect Card */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={22} color="var(--accent-cyan)" /> Add Prospect (Auto-checks DA/PA/SS via Active Provider)
          </h2>

          {providerInfo && (
            <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={14} color="var(--accent-yellow)" />
              <span>Provider: <strong style={{ color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>{providerInfo.activeProvider}</strong></span>
              {providerInfo.activeProvider !== 'internal' && (
                <span style={{ color: 'var(--text-muted)' }}>
                  (Paid Budget: <strong style={{ color: providerInfo.paidCallCount >= providerInfo.budgetCap ? '#ef4444' : '#10b981' }}>{providerInfo.paidCallCount}/{providerInfo.budgetCap}</strong>)
                </span>
              )}
            </div>
          )}
        </div>

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

        <form onSubmit={handleAddProspect} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
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
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Prospect Site / URL *</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={site}
              onChange={e => setSite(e.target.value)}
              placeholder="e.g. techcrunch.com/guest-articles"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Priority Level</label>
            <select
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--input-bg)', color: 'var(--input-color)' }}
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Prospecting Notes</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Accepts guest posts in AI & software categories"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              className="search-btn"
              style={{ background: 'var(--accent-cyan)', padding: '0.7rem 1.4rem' }}
              disabled={submitting || !selectedProjectId}
            >
              <Plus size={18} /> {submitting ? 'Analyzing & Snapshotting Metrics...' : 'Add Prospect Site'}
            </button>
          </div>
        </form>
      </div>

      {/* Filterable & Sortable Prospects List */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={20} color="var(--accent-green)" /> Prospect Sites ({prospects.length})
          </h3>

          {/* Filter & Sort Control Bar */}
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={14} color="var(--text-muted)" /> Status:
              <select
                className="search-input"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="negotiating">Negotiating</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Priority:
              <select
                className="search-input"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowUpDown size={14} color="var(--text-muted)" /> Sort By:
              <select
                className="search-input"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="da">Domain AS (Highest)</option>
                <option value="ss">Spam Score (Lowest)</option>
                <option value="priority">Priority Level</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading prospects...</p>
        ) : prospects.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No prospect sites added yet for this filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(125,125,125,0.05)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>Prospect Site / Domain</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Project</th>
                  <th style={{ padding: '0.8rem 1rem' }}>DA / PA / SS Metrics</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Priority</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Contact Status</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Promote to Outreach Action</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map(item => (
                  <tr key={item._id || item.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{item.site}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Root: <code>{item.rootDomain}</code>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: '#60a5fa', fontWeight: 600 }}>
                      {item.projectId?.businessName || 'Project'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>AS: {item.daSnapshot}</span>{' '}
                      <span className="badge-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>PS: {item.paSnapshot}</span>{' '}
                      <span className="badge-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>SS: {item.ssSnapshot}</span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span className="badge-tag" style={{
                        background: item.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : item.priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                        color: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#9ca3af',
                        textTransform: 'capitalize'
                      }}>
                        {item.priority} Priority
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span className="badge-tag" style={{ background: item.contactStatus === 'contacted' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: item.contactStatus === 'contacted' ? '#60a5fa' : '#10b981', textTransform: 'capitalize' }}>
                        {item.contactStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <button
                        className="search-btn"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => setPromoteProspect(item)}
                      >
                        <Send size={12} /> Promote to Outreach
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promote to Outreach Modal */}
      {promoteProspect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '480px', display: 'grid', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} color="var(--accent-cyan)" /> Promote Prospect to Outreach Tracker
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Promoting <strong>{promoteProspect.site}</strong> will create a new Outreach record with status <code>no_reply</code> and set prospect status to <code>contacted</code>.
            </p>

            <form onSubmit={handlePromoteToOutreach} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Contact Email *</label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="editor@prospectsite.com"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="search-btn"
                  style={{ background: 'rgba(125,125,125,0.2)', color: 'var(--text-main)' }}
                  onClick={() => setPromoteProspect(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="search-btn"
                  style={{ background: 'var(--accent-cyan)' }}
                  disabled={promoting}
                >
                  {promoting ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
