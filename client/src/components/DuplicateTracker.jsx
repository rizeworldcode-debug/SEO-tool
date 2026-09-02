import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Layers, AlertTriangle, ChevronDown, ChevronUp, UserCheck, Calendar, ExternalLink } from 'lucide-react';

export default function DuplicateTracker() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [duplicateClusters, setDuplicateClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState(null);

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

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/backlinks/duplicates`;
      if (selectedProjectId) {
        url += `?projectId=${selectedProjectId}`;
      }
      const res = await fetch(url, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setDuplicateClusters(data.duplicateClusters || []);
      }
    } catch (err) {
      console.error('Error fetching duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  useEffect(() => {
    fetchDuplicates();
  }, [selectedProjectId, token]);

  const toggleExpand = (domain) => {
    setExpandedDomain(expandedDomain === domain ? null : domain);
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header & Filter Bar */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={22} color="#f59e0b" /> Duplicate Root Domain Clusters View
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Clusters same root domain submissions under a project to prevent treating multi-page submissions as separate independent entries.
          </p>
        </div>

        <select
          className="search-input"
          style={{ padding: '0.5rem 0.8rem', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-card)', cursor: 'pointer', minWidth: '220px' }}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">All Projects ({projects.length})</option>
          {projects.map(p => (
            <option key={p._id || p.id} value={p._id || p.id}>
              {p.businessName}
            </option>
          ))}
        </select>
      </div>

      {/* Duplicate Clusters List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading duplicate clusters...</p>
      ) : duplicateClusters.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
          <h4 style={{ color: '#10b981', marginBottom: '0.4rem' }}>No Duplicate Root Domains Detected!</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            All submitted backlinks under this selection are from distinct root domains.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {duplicateClusters.map(cluster => {
            const isExpanded = expandedDomain === cluster.rootDomain;
            return (
              <div key={cluster.rootDomain} style={{ background: 'var(--bg-card)', border: '1px solid #f59e0b', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(cluster.rootDomain)}
                  style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(245, 158, 11, 0.05)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <AlertTriangle size={20} color="#f59e0b" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        Root Domain: <code style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{cluster.rootDomain}</code>
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Project: <strong style={{ color: '#60a5fa' }}>{cluster.project?.businessName || 'Project'}</strong> | Total Times Submitted:{' '}
                        <strong style={{ color: '#f59e0b' }}>{cluster.totalSubmissions}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="badge-tag" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                      {cluster.totalSubmissions} Submissions Flagged
                    </span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '1.2rem', borderTop: '1px solid var(--border-card)', background: 'rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <UserCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> First Submitted By:{' '}
                        <strong style={{ color: 'var(--text-main)' }}>{cluster.firstSubmittedBy?.username || 'Team Member'}</strong>
                      </div>
                      <div>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> First Submission Date:{' '}
                        <strong style={{ color: 'var(--text-main)' }}>{new Date(cluster.firstSubmittedAt).toLocaleDateString()}</strong>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>All Submitted URLs under {cluster.rootDomain}:</h5>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {cluster.allUrls.map((sub, idx) => (
                        <div
                          key={sub.id || idx}
                          style={{
                            padding: '0.6rem 0.8rem',
                            borderRadius: '6px',
                            background: sub.isOriginal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: `1px solid ${sub.isOriginal ? '#10b981' : '#f59e0b'}`,
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <a href={sub.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
                              {sub.url}
                            </a>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                              Anchor: "{sub.anchorText || 'N/A'}"
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              by {sub.submittedBy?.username || 'User'}
                            </span>
                            {sub.isOriginal ? (
                              <span className="badge-tag" style={{ background: '#10b981', color: '#fff' }}>Original Master Entry</span>
                            ) : (
                              <span className="badge-tag" style={{ background: '#f59e0b', color: '#fff' }}>Flagged Duplicate</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
