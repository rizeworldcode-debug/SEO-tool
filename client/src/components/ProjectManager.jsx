import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Lock,
  Plus,
  ShieldAlert,
  Globe,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Share2,
  User,
  Clock,
  Award,
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ProjectManager() {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFormTab, setActiveFormTab] = useState('project');
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const [form, setForm] = useState({
    // Section 1: Website & Project Info
    businessName: 'MediCompares',
    projectUrl: 'https://medicompares.com/',
    targetLocation: 'India',
    goal: 'MediCompares – Compare Medicine & Healthcare Prices in Hyderabad',
    category: 'Healthcare & Medicine',
    username: 'medicompares',
    domainAuthority: '8',
    pageAuthority: '27',
    spamScore: '17',
    targetKeywords: 'compare medicine prices, healthcare hyderabad',

    // Section 2: Business Listing Details
    firstName: 'medicompares',
    lastName: '',
    designation: 'Director / CEO',
    address: '2nd Floor, H.No. 10-5-2/7/92, G-3, Banjara Hills Rd No. 1, Opp. Banjara Function Hall',
    city: 'Hyderabad',
    state: 'Telangana',
    postcode: '500004',
    country: 'India',
    website: 'https://www.medicompares.com/',
    phone: '91 9010 357 778 / 91 9010 347 778',
    businessEmail: 'info@medicompares.com',
    numberOfEmployees: '10-50',
    businessHours: '09:00 AM - 07:00 PM',
    yearOfEstablishment: '2021',

    // Section 3: Social Media Profiles
    facebook: 'https://www.facebook.com/people/MediCompares/61581546120426/',
    instagram: 'https://www.instagram.com/medicomparesindia/',
    youtube: '',
    linkedin: 'https://www.linkedin.com/company/medicompares.com/',
    twitter: '',

    // Section 4: Off-Page Shared Login
    offPageEmail: 'medicompares66@gmail.com',
    offPagePassword: 'asdfghjkl@123'
  });

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !expandedProjectId) {
          setExpandedProjectId(data.projects[0]._id || data.projects[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError('Network error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          businessName: form.businessName,
          projectUrl: form.projectUrl,
          targetLocation: form.targetLocation,
          goal: form.goal,
          category: form.category,
          username: form.username,
          domainAuthority: Number(form.domainAuthority) || 0,
          pageAuthority: Number(form.pageAuthority) || 0,
          spamScore: Number(form.spamScore) || 0,
          targetKeywords: form.targetKeywords,

          firstName: form.firstName,
          lastName: form.lastName,
          designation: form.designation,
          address: form.address,
          city: form.city,
          state: form.state,
          postcode: form.postcode,
          country: form.country,
          website: form.website,
          phone: form.phone,
          businessEmail: form.businessEmail,
          numberOfEmployees: form.numberOfEmployees,
          businessHours: form.businessHours,
          yearOfEstablishment: form.yearOfEstablishment,

          socialLinks: {
            facebook: form.facebook,
            instagram: form.instagram,
            youtube: form.youtube,
            linkedin: form.linkedin,
            twitter: form.twitter
          },

          offPageLogin: {
            email: form.offPageEmail,
            password: form.offPagePassword
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Project creation failed');
      } else {
        setSuccess(`Master Project Profile "${form.businessName}" created successfully!`);
        fetchProjects();
      }
    } catch (err) {
      setError('Network error creating project');
    }
  };

  const isRestrictedRole = user?.role === 'team_member';

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {/* Create Project Card */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '14px', padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 size={24} color="var(--accent-blue)" /> Create Master Project Profile
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Complete all project metadata, business listing details (NAP), social profiles & encrypted off-page credentials.
            </p>
          </div>
        </div>

        {isRestrictedRole && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} />
            <strong>RBAC Restriction Active:</strong> Your current role is <code>team_member</code>. Switch to <code>admin</code> or <code>team_leader</code> role to add or modify project master profiles.
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> {success}
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveFormTab('project')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: activeFormTab === 'project' ? 'none' : '1px solid var(--border-card)',
              background: activeFormTab === 'project' ? 'var(--accent-blue)' : 'var(--input-bg)',
              color: activeFormTab === 'project' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Globe size={16} /> 1. Website & Project Info
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab('listing')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: activeFormTab === 'listing' ? 'none' : '1px solid var(--border-card)',
              background: activeFormTab === 'listing' ? 'var(--accent-blue)' : 'var(--input-bg)',
              color: activeFormTab === 'listing' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Building2 size={16} /> 2. Business Listing Details (NAP)
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab('social')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: activeFormTab === 'social' ? 'none' : '1px solid var(--border-card)',
              background: activeFormTab === 'social' ? 'var(--accent-blue)' : 'var(--input-bg)',
              color: activeFormTab === 'social' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Share2 size={16} /> 3. Social Media Profiles
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab('offpage')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: activeFormTab === 'offpage' ? 'none' : '1px solid var(--border-card)',
              background: activeFormTab === 'offpage' ? 'var(--accent-blue)' : 'var(--input-bg)',
              color: activeFormTab === 'offpage' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Lock size={16} /> 4. Off-Page Shared Login
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* TAB 1: Website & Project Info */}
          {activeFormTab === 'project' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Business / Project Name *</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.businessName}
                  onChange={e => setForm({ ...form, businessName: e.target.value })}
                  placeholder="e.g. MediCompares"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Project URL *</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.projectUrl}
                  onChange={e => setForm({ ...form, projectUrl: e.target.value })}
                  placeholder="e.g. https://medicompares.com/"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Target Location</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.targetLocation}
                  onChange={e => setForm({ ...form, targetLocation: e.target.value })}
                  placeholder="e.g. India"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Website Category</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Healthcare & Medicine"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Username / Handle</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. medicompares"
                />
              </div>

              {/* Initial Metrics Snapshots */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Initial Domain Authority (DA)</label>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.domainAuthority}
                  onChange={e => setForm({ ...form, domainAuthority: e.target.value })}
                  placeholder="8"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Initial Page Authority (PA)</label>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.pageAuthority}
                  onChange={e => setForm({ ...form, pageAuthority: e.target.value })}
                  placeholder="27"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Initial Spam Score (SS)</label>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.spamScore}
                  onChange={e => setForm({ ...form, spamScore: e.target.value })}
                  placeholder="17"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Goal Of Client / Project Description</label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', minHeight: '65px' }}
                  value={form.goal}
                  onChange={e => setForm({ ...form, goal: e.target.value })}
                  placeholder="MediCompares - Compare Medicine & Healthcare Prices in Hyderabad"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Target SEO Keywords (Comma Separated)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.targetKeywords}
                  onChange={e => setForm({ ...form, targetKeywords: e.target.value })}
                  placeholder="compare medicine prices, healthcare hyderabad"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Business Listing Details */}
          {activeFormTab === 'listing' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>First Name</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  placeholder="medicompares"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Last Name</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  placeholder=""
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Designation / Title</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.designation}
                  onChange={e => setForm({ ...form, designation: e.target.value })}
                  placeholder="Director / CEO"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Phone Number</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="91 9010 357 778 / 91 9010 347 778"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Business Email</label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.businessEmail}
                  onChange={e => setForm({ ...form, businessEmail: e.target.value })}
                  placeholder="info@medicompares.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Website URL (Listing Website)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                  placeholder="https://www.medicompares.com/"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Company Address (Street)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="2nd Floor, H.No. 10-5-2/7/92, G-3, Banjara Hills Rd No. 1, Opp. Banjara Function Hall"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>City</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="Hyderabad"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>State / Region</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  placeholder="Telangana"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Postcode / ZIP</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.postcode}
                  onChange={e => setForm({ ...form, postcode: e.target.value })}
                  placeholder="500004"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Country</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.country}
                  onChange={e => setForm({ ...form, country: e.target.value })}
                  placeholder="India"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Number of Employees</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.numberOfEmployees}
                  onChange={e => setForm({ ...form, numberOfEmployees: e.target.value })}
                  placeholder="10-50"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Business Hours</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.businessHours}
                  onChange={e => setForm({ ...form, businessHours: e.target.value })}
                  placeholder="09:00 AM - 07:00 PM"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Year of Establishment</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.yearOfEstablishment}
                  onChange={e => setForm({ ...form, yearOfEstablishment: e.target.value })}
                  placeholder="2021"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Social Media Profiles */}
          {activeFormTab === 'social' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Facebook Profile URL</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.facebook}
                  onChange={e => setForm({ ...form, facebook: e.target.value })}
                  placeholder="https://www.facebook.com/people/MediCompares/..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Instagram Profile URL</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.instagram}
                  onChange={e => setForm({ ...form, instagram: e.target.value })}
                  placeholder="https://www.instagram.com/medicomparesindia/"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>LinkedIn Company URL</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.linkedin}
                  onChange={e => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://www.linkedin.com/company/medicompares.com/"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>YouTube Channel URL</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.youtube}
                  onChange={e => setForm({ ...form, youtube: e.target.value })}
                  placeholder="https://www.youtube.com/@medicompares"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Twitter / X Handle or URL</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={form.twitter}
                  onChange={e => setForm({ ...form, twitter: e.target.value })}
                  placeholder="https://x.com/medicompares"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Off-Page Shared Login Credentials */}
          {activeFormTab === 'offpage' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '10px', border: '1px dashed var(--border-card)' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-amber)' }}>
                <Lock size={18} /> Off-Page Info (Encrypted at Rest via AES-256-GCM — Admin & Team Leader Only)
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Shared email & password used for directory submissions, web 2.0 citations, and guest blogging.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Off-Page Email</label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                    value={form.offPageEmail}
                    onChange={e => setForm({ ...form, offPageEmail: e.target.value })}
                    placeholder="medicompares66@gmail.com"
                    disabled={isRestrictedRole}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Off-Page Password</label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                    value={form.offPagePassword}
                    onChange={e => setForm({ ...form, offPagePassword: e.target.value })}
                    placeholder="asdfghjkl@123"
                    disabled={isRestrictedRole}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Step {activeFormTab === 'project' ? '1/4' : activeFormTab === 'listing' ? '2/4' : activeFormTab === 'social' ? '3/4' : '4/4'}: Make sure to complete all required details.
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {activeFormTab !== 'project' && (
                <button
                  type="button"
                  className="search-input"
                  style={{ padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => {
                    if (activeFormTab === 'listing') setActiveFormTab('project');
                    if (activeFormTab === 'social') setActiveFormTab('listing');
                    if (activeFormTab === 'offpage') setActiveFormTab('social');
                  }}
                >
                  Previous Step
                </button>
              )}

              {activeFormTab !== 'offpage' ? (
                <button
                  type="button"
                  className="search-btn"
                  style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    if (activeFormTab === 'project') setActiveFormTab('listing');
                    else if (activeFormTab === 'listing') setActiveFormTab('social');
                    else if (activeFormTab === 'social') setActiveFormTab('offpage');
                  }}
                >
                  Next Step &rarr;
                </button>
              ) : (
                <button
                  type="submit"
                  className="search-btn"
                  style={{ background: isRestrictedRole ? '#6b7280' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', cursor: isRestrictedRole ? 'not-allowed' : 'pointer', padding: '0.6rem 1.6rem', fontSize: '0.85rem' }}
                  disabled={isRestrictedRole}
                >
                  <Plus size={18} /> Save Complete Master Project Profile
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Master Project Profiles List View */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={20} color="var(--accent-cyan)" /> Master Project Profiles ({projects.length})
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading master project profiles...</p>
        ) : projects.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
            No master projects created yet. Fill in the form above to add a project.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            {projects.map(proj => {
              const pid = proj._id || proj.id;
              const isExpanded = expandedProjectId === pid;

              return (
                <div key={pid} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.4rem', display: 'grid', gap: '1rem' }}>
                  {/* Card Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h4 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>{proj.businessName}</h4>
                        {proj.category && (
                          <span className="badge-tag" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                            {proj.category}
                          </span>
                        )}
                        {proj.targetLocation && (
                          <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                            📍 {proj.targetLocation}
                          </span>
                        )}
                      </div>

                      <a href={proj.projectUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block', marginTop: '0.3rem' }}>
                        {proj.projectUrl}
                      </a>
                    </div>

                    <button
                      onClick={() => setExpandedProjectId(isExpanded ? null : pid)}
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-main)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>{isExpanded ? 'Collapse Profile' : 'View Full Profile Spreadsheet'}</span>
                    </button>
                  </div>

                  {/* Summary Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Initial DA:</strong> <span style={{ color: 'var(--accent-cyan)' }}>{proj.domainAuthority || 0}</span></div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Initial PA:</strong> <span style={{ color: 'var(--accent-blue)' }}>{proj.pageAuthority || 0}</span></div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Initial SS:</strong> <span style={{ color: 'var(--accent-amber)' }}>{proj.spamScore || 0}%</span></div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Username:</strong> <span>{proj.username || 'N/A'}</span></div>
                  </div>

                  {/* Expanded Full Spreadsheet Details */}
                  {isExpanded && (
                    <div style={{ display: 'grid', gap: '1rem', borderTop: '1px solid var(--border-card)', paddingTop: '1rem', fontSize: '0.85rem' }}>
                      {/* Section 1: Website & Project Info */}
                      <div>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Globe size={16} /> Website & Project Info
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '8px' }}>
                          <div><strong>Goal Of Client:</strong> {proj.goal || 'N/A'}</div>
                          <div><strong>Category:</strong> {proj.category || 'N/A'}</div>
                          <div><strong>Target Location:</strong> {proj.targetLocation || 'N/A'}</div>
                          <div><strong>SEO Keywords:</strong> {Array.isArray(proj.targetKeywords) ? proj.targetKeywords.join(', ') : (proj.targetKeywords || 'N/A')}</div>
                        </div>
                      </div>

                      {/* Section 2: Business Listing Details (NAP) */}
                      <div>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Building2 size={16} /> Business Listing Details (NAP & Citations)
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '8px' }}>
                          <div><strong>Contact Name:</strong> {proj.firstName || ''} {proj.lastName || ''}</div>
                          <div><strong>Designation:</strong> {proj.designation || 'N/A'}</div>
                          <div><strong>Street Address:</strong> {proj.address || 'N/A'}</div>
                          <div><strong>City:</strong> {proj.city || 'N/A'}</div>
                          <div><strong>State / Postcode:</strong> {proj.state || 'N/A'} {proj.postcode ? `(${proj.postcode})` : ''}</div>
                          <div><strong>Country:</strong> {proj.country || 'N/A'}</div>
                          <div><strong>Phone No:</strong> {proj.phone || 'N/A'}</div>
                          <div><strong>Business Email:</strong> {proj.businessEmail || 'N/A'}</div>
                          <div><strong>Employees:</strong> {proj.numberOfEmployees || 'N/A'}</div>
                          <div><strong>Business Hours:</strong> {proj.businessHours || 'N/A'}</div>
                          <div><strong>Established:</strong> {proj.yearOfEstablishment || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Section 3: Social Media Profiles */}
                      <div>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Share2 size={16} /> Social Media Profiles
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '8px' }}>
                          <div><strong>Facebook:</strong> {proj.socialLinks?.facebook ? <a href={proj.socialLinks.facebook} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{proj.socialLinks.facebook}</a> : 'N/A'}</div>
                          <div><strong>Instagram:</strong> {proj.socialLinks?.instagram ? <a href={proj.socialLinks.instagram} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{proj.socialLinks.instagram}</a> : 'N/A'}</div>
                          <div><strong>LinkedIn:</strong> {proj.socialLinks?.linkedin ? <a href={proj.socialLinks.linkedin} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{proj.socialLinks.linkedin}</a> : 'N/A'}</div>
                          <div><strong>YouTube:</strong> {proj.socialLinks?.youtube ? <a href={proj.socialLinks.youtube} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{proj.socialLinks.youtube}</a> : 'N/A'}</div>
                        </div>
                      </div>

                      {/* Section 4: Off-Page Credentials */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', borderLeft: isRestrictedRole ? '3px solid #ef4444' : '3px solid #10b981' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Lock size={16} color={isRestrictedRole ? '#ef4444' : '#10b981'} />
                          {isRestrictedRole ? (
                            <span>Off-Page Credentials: <strong style={{ color: '#ef4444' }}>[REDACTED - Admin / TL Only]</strong></span>
                          ) : (
                            <span>
                              Off-Page Email: <strong style={{ color: 'var(--accent-cyan)' }}>{proj.offPageLogin?.email || 'None'}</strong> | Password: <strong style={{ color: 'var(--accent-amber)' }}>{proj.offPageLogin?.password || '••••••••'}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
