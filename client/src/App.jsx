import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLogin from './components/AdminLogin';
import MemberLogin from './components/MemberLogin';
import UserManagement from './components/UserManagement';
import NexusDashboard from './components/NexusDashboard';
import AdsDashboard from './components/AdsDashboard';
import ProjectManager from './components/ProjectManager';
import BacklinkSubmit from './components/BacklinkSubmit';
import BacklinkDashboard from './components/BacklinkDashboard';
import DuplicateTracker from './components/DuplicateTracker';
import MetricsProviderSettings from './components/MetricsProviderSettings';
import ProspectList from './components/ProspectList';
import OutreachTracker from './components/OutreachTracker';
import AnchorDistributionReport from './components/AnchorDistributionReport';
import LinkVelocityTracker from './components/LinkVelocityTracker';
import {
  Search,
  ShieldCheck,
  Info,
  Activity,
  Building2,
  Link2,
  CheckCircle2,
  UserCheck,
  Table,
  Layers,
  Cpu,
  Target,
  Send,
  PieChart,
  Sun,
  Moon,
  Menu,
  X,
  Globe,
  Sparkles,
  Users,
  LogOut,
  Megaphone,
  LayoutDashboard
} from 'lucide-react';

function DashboardContent({ onNavigate }) {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('nexus');
  const [theme, setTheme] = useState('light');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backlinks, setBacklinks] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
      console.error('Error fetching projects in dashboard:', err);
    }
  };

  const fetchBacklinks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/backlinks`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setBacklinks(data.backlinks || []);
      }
    } catch (err) {
      console.error('Error fetching backlinks:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchBacklinks();
  }, [token]);

  // Independent SEO Metrics Engine State
  const [query, setQuery] = useState('google.com');
  const [loading, setLoading] = useState(false);
  const [domainData, setDomainData] = useState(null);
  const [pageData, setPageData] = useState(null);

  const handleSearch = async (targetQuery) => {
    const searchTarget = targetQuery || query;
    if (!searchTarget.trim()) return;

    setLoading(true);
    try {
      if (searchTarget.includes('/') && searchTarget.length > searchTarget.indexOf('/') + 1) {
        const pageRes = await fetch(`${API_BASE_URL}/api/page?url=${encodeURIComponent(searchTarget)}`);
        const pData = await pageRes.json();
        setPageData(pData);

        const domRes = await fetch(`${API_BASE_URL}/api/domain/${encodeURIComponent(pData.domain)}`);
        const dData = await domRes.json();
        setDomainData(dData);
      } else {
        setPageData(null);
        const domRes = await fetch(`${API_BASE_URL}/api/domain/${encodeURIComponent(searchTarget)}`);
        const dData = await domRes.json();
        setDomainData(dData);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'metrics') {
      handleSearch('google.com');
    }
  }, [activeTab]);

  const getGaugeColor = (val, isSpam = false) => {
    if (isSpam) {
      if (val > 50) return '#ef4444';
      if (val > 15) return '#f59e0b';
      return '#10b981';
    }
    if (val >= 80) return '#00f2fe';
    if (val >= 50) return '#10b981';
    if (val >= 25) return '#f59e0b';
    return '#ef4444';
  };

  // Nav item list configuration
  const settingsItems = [
    { id: 'nexus', label: 'Nexus Dashboard Overview', icon: LayoutDashboard, subtitle: 'Executive revenue & campaign telemetry' },
    { id: 'ads', label: 'Ads Dashboard', icon: Megaphone, subtitle: 'PPC & paid campaign performance analytics' },
    { id: 'submit', label: 'Submit Backlink', icon: Link2, subtitle: 'Add new link target with domain autofill' },
    { id: 'projects', label: 'Master Projects', icon: Building2, subtitle: 'Manage target projects & domains' }
  ];

  if (user?.role === 'admin') {
    settingsItems.splice(1, 0, {
      id: 'users',
      label: 'User Accounts',
      icon: Users,
      subtitle: 'Manage team member & leader accounts'
    });
  }

  const navSections = [
    {
      label: 'SETTINGS & MANAGEMENT',
      items: settingsItems
    },
    {
      label: 'MAIN DASHBOARDS',
      items: [
        { id: 'dashboard', label: 'Live Backlink Dashboard', icon: Table, subtitle: 'Real-time backlink telemetry & verification' },
        { id: 'duplicates', label: 'Duplicate Detection View', icon: Layers, subtitle: 'Root domain duplication & status flags' },
        { id: 'metrics', label: 'SEO Metrics Engine', icon: Activity, subtitle: 'Independent DA, PA & Spam Score Analyzer' },
      ]
    },
    {
      label: 'CAMPAIGNS & OUTREACH',
      items: [
        { id: 'prospects', label: 'Prospect List', icon: Target, subtitle: 'Domain prospect pipeline & metrics' },
        { id: 'outreach', label: 'Outreach Tracker', icon: Send, subtitle: 'Email sequences & outreach status' },
      ]
    }
  ];

  const getCurrentPage = () => {
    for (const sec of navSections) {
      const match = sec.items.find(i => i.id === activeTab);
      if (match) return match;
    }
    return navSections[0].items[0];
  };

  const currentPage = getCurrentPage();
  const IconComponent = currentPage.icon;

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Globe size={22} />
          </div>
          <div className="sidebar-brand">
            <h2>RizeWorld SEO</h2>
            <p>Metrics Engine v2.0</p>
          </div>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navSections.map((sec, idx) => (
            <React.Fragment key={idx}>
              <div className="nav-section-label">{sec.label}</div>
              {sec.items.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                  >
                    <ItemIcon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span>MongoDB Atlas Connected</span>
          </div>
          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>LIVE</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button className="mobile-nav-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu size={22} />
            </button>

            <div className="page-title-group">
              <h1>
                <IconComponent size={24} color="var(--accent-cyan)" />
                {currentPage.label}
              </h1>
              <p>{currentPage.subtitle}</p>
            </div>
          </div>

          <div className="top-actions">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-main)',
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? <Moon size={16} color="var(--accent-purple)" /> : <Sun size={16} color="var(--accent-amber)" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            {/* Authenticated User & Logout Bar */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem'
            }}>
              <div style={{ fontSize: '0.82rem', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{user?.username || user?.email}</div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: user?.role === 'admin' ? '#ef4444' : user?.role === 'team_leader' ? '#f59e0b' : '#10b981'
                }}>
                  {user?.role?.toUpperCase() || 'MEMBER'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  if (onNavigate) onNavigate('/admin-login');
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '0.45rem 0.8rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="Log out of account"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dedicated Page Views */}
        <main className="page-container">
          {/* Nexus Analytics Overview */}
          {activeTab === 'nexus' && <NexusDashboard backlinks={backlinks} projects={projects} user={user} />}

          {/* Ads Performance Dashboard */}
          {activeTab === 'ads' && <AdsDashboard />}

          {/* User Accounts Management (Admin only) */}
          {activeTab === 'users' && <UserManagement />}

          {/* Page 1: Live Backlink Dashboard */}
          {activeTab === 'dashboard' && <BacklinkDashboard />}

          {/* Page 2: Duplicate Detection View */}
          {activeTab === 'duplicates' && <DuplicateTracker />}

          {/* Page 3: Prospect List */}
          {activeTab === 'prospects' && <ProspectList />}

          {/* Page 4: Outreach Tracker */}
          {activeTab === 'outreach' && <OutreachTracker />}

          {/* Page 5: Anchor & Velocity Reports */}
          {activeTab === 'reports' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '0.8rem 1.2rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Target Project:</span>
                <select
                  className="search-input"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                >
                  {projects.map(p => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.businessName} ({p.projectUrl})
                    </option>
                  ))}
                </select>
              </div>

              <AnchorDistributionReport projectId={selectedProjectId} />
              <LinkVelocityTracker projectId={selectedProjectId} />
            </div>
          )}

          {/* Page 6: Metrics Provider Settings */}
          {activeTab === 'providers' && <MetricsProviderSettings />}

          {/* Page 7: Submit Backlink */}
          {activeTab === 'submit' && <BacklinkSubmit />}

          {/* Page 8: Master Projects */}
          {activeTab === 'projects' && <ProjectManager />}

          {/* Page 9: Verification Status */}
          {activeTab === 'verification' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="subsignals-card">
                <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={24} color="var(--accent-green)" /> System Specifications & Test Verification
                </h2>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '1rem', borderRadius: '10px' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={18} /> Anchor Distribution & Link Velocity Reports
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Calculates over-optimization anchor text risk and tracks 30-day link velocity acquisition trends. Export reports in PDF/CSV format.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '1rem', borderRadius: '10px' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={18} /> Cold Email Outreach Engine
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Automated multi-stage outreach email sequences with open/reply tracking, automated follow-up cadence, and status updates.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '1rem', borderRadius: '10px' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={18} /> Prospect List & Auto-Discovery
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Auto-find potential outreach targets, domain metrics scoring, and prospect status pipeline management.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '1rem', borderRadius: '10px' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={18} /> Pluggable Metrics Providers & Budget Safeguards
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Pluggable <code>MetricsProvider</code> interface supporting <code>InternalEngineProvider</code> and paid APIs (Moz/Ahrefs/SEMrush) with strict budget cap safeguards.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '1rem', borderRadius: '10px' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={18} /> Duplicate Detection & Color-Coding Legend
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Root domain duplicate detection flags duplicate root domains under a project. Green=Live, Red=Removed, Orange=Broken/Spam, Yellow=Duplicate.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page 10: SEO Metrics Engine */}
          {activeTab === 'metrics' && (
            <>
              <div className="search-box">
                <input
                  type="text"
                  className="search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter a domain or URL (e.g. google.com or wikipedia.org/wiki/Main_Page)"
                />
                <button className="search-btn" onClick={() => handleSearch()} disabled={loading}>
                  <Search size={18} />
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>

              <div className="disclaimer-banner">
                <Info size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Explicit Disclaimer & Transparency:</strong> These metrics (Authority Score, Page Score, Spam Score) are independently calculated by our self-hosted Common Crawl graph engine. They are <strong>NOT</strong> Moz's proprietary DA, PA, or Spam Score numbers.
                </div>
              </div>

              {domainData && (
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Authority Score (AS)</h3>
                    <div
                      className="gauge-circle"
                      style={{
                        '--gauge-color': getGaugeColor(domainData.authorityScore),
                        '--gauge-percent': `${(domainData.authorityScore / 100) * 360}deg`
                      }}
                    >
                      <div className="gauge-inner">
                        <span className="gauge-val" style={{ color: getGaugeColor(domainData.authorityScore) }}>
                          {domainData.authorityScore}
                        </span>
                        <span className="gauge-lbl">Domain AS</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                      {pageData ? 'Page Score (PS)' : 'Homepage Score (PS)'}
                    </h3>
                    <div
                      className="gauge-circle"
                      style={{
                        '--gauge-color': getGaugeColor(pageData ? pageData.pageScore : domainData.pageScore),
                        '--gauge-percent': `${((pageData ? pageData.pageScore : domainData.pageScore) / 100) * 360}deg`
                      }}
                    >
                      <div className="gauge-inner">
                        <span className="gauge-val" style={{ color: getGaugeColor(pageData ? pageData.pageScore : domainData.pageScore) }}>
                          {pageData ? pageData.pageScore : domainData.pageScore}
                        </span>
                        <span className="gauge-lbl">{pageData ? 'URL PS' : 'Homepage PS'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Spam Score (SS)</h3>
                    <div
                      className="gauge-circle"
                      style={{
                        '--gauge-color': getGaugeColor(domainData.spamScore, true),
                        '--gauge-percent': `${(domainData.spamScore / 100) * 360}deg`
                      }}
                    >
                      <div className="gauge-inner">
                        <span className="gauge-val" style={{ color: getGaugeColor(domainData.spamScore, true) }}>
                          {domainData.spamScore}
                        </span>
                        <span className="gauge-lbl">Toxicity Risk</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function MainApp() {
  const { user, token } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Route 1: Dedicated Admin Login Page (/admin-login)
  if (currentPath === '/admin-login') {
    return <AdminLogin onNavigate={navigate} />;
  }

  // Route 2: Dedicated Team Member Login Page (/member-login)
  if (currentPath === '/member-login') {
    return <MemberLogin onNavigate={navigate} />;
  }

  // Protected Routes: If NOT logged in, require login (render AdminLogin by default)
  if (!user || !token) {
    return <AdminLogin onNavigate={navigate} />;
  }

  // Authenticated Protected App Dashboard
  return <DashboardContent onNavigate={navigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
