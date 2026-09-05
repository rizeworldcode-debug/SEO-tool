import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, ShieldAlert, CheckCircle2, Shield, User, Mail, Key, Pencil, Trash2, X } from 'lucide-react';

export default function UserManagement() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'team_member'
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'team_member'
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error fetching users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create team member');
      } else {
        setSuccess(`User "${form.username}" created successfully as ${form.role}!`);
        setForm({ username: '', email: '', password: '', role: 'team_member' });
        fetchUsers();
      }
    } catch (err) {
      setError('Network error creating user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      username: u.username || '',
      email: u.email || '',
      password: '',
      role: u.role || 'team_member'
    });
    setEditError('');
    setEditSuccess('');
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError('');
    setEditSuccess('');

    const uid = editingUser._id || editingUser.id;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        setEditSuccess(`User account "${editForm.username}" updated successfully!`);
        setTimeout(() => {
          setEditingUser(null);
          fetchUsers();
        }, 1000);
      } else {
        setEditError(data.error || 'Failed to update user account');
      }
    } catch (err) {
      setEditError('Network error updating user account');
    }
  };

  const handleDeleteUser = async (u) => {
    const uid = u._id || u.id;
    if (user?.id === uid) {
      alert('You cannot delete your own active logged-in admin account!');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user account "${u.username}" (${u.email})?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user account');
      }
    } catch (err) {
      alert('Network error deleting user account');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <ShieldAlert size={24} />
        <div>
          <h4 style={{ margin: '0 0 0.2rem 0' }}>Access Restricted (Admin Only)</h4>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Only System Administrators can manage team member accounts and assign roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1.8rem' }}>
      {/* Create User Card */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '14px', padding: '1.8rem' }}>
        <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <UserPlus size={24} color="var(--accent-cyan)" /> Add New Team Member or Leader
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
          Create user accounts saved directly to MongoDB Atlas with assigned roles (Admin, Team Leader, Team Member).
        </p>

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

        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Full Name / Username *</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.66rem 0.8rem' }}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. Vikas Jangid"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Email Address *</label>
            <input
              type="email"
              className="search-input"
              style={{ width: '100%', padding: '0.66rem 0.8rem' }}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. vikas@rizeworld.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Password *</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.66rem 0.8rem' }}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="SecurePass123!"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Assign Role *</label>
            <select
              className="search-input"
              style={{ width: '100%', padding: '0.66rem 0.8rem', cursor: 'pointer' }}
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
            >
              <option value="team_member">Team Member (Submit & View)</option>
              <option value="team_leader">Team Leader (Manage Projects & Links)</option>
              <option value="admin">Admin (Full Control)</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="search-btn"
              style={{ padding: '0.7rem 1.8rem', fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserPlus size={18} /> Create & Save User Account
            </button>
          </div>
        </form>
      </div>

      {/* Users List Table */}
      <div className="subsignals-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '14px', padding: '1.8rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} color="var(--accent-blue)" /> Registered Accounts in MongoDB Atlas ({users.length})
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(125,125,125,0.05)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>User Name</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Email Address</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Assigned Role</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Role Update</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id || u.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--accent-cyan)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span className="badge-tag" style={{
                        background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'team_leader' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: u.role === 'admin' ? '#ef4444' : u.role === 'team_leader' ? '#f59e0b' : '#10b981',
                        fontWeight: 700
                      }}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <select
                        className="search-input"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
                        value={u.role}
                        onChange={e => handleRoleChange(u._id || u.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="team_leader">Team Leader</option>
                        <option value="team_member">Team Member</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid #3b82f6',
                            color: '#60a5fa',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Pencil size={13} /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
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
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
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
            maxWidth: '500px',
            padding: '1.8rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <button
              onClick={() => setEditingUser(null)}
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
              <Pencil size={20} /> Edit User Account
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              Update username, email, role, or change password for user <strong>{editingUser.username}</strong>.
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

            <form onSubmit={handleEditUserSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Full Name / Username</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Email Address</label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>New Password (Leave blank to keep unchanged)</label>
                <input
                  type="password"
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Role</label>
                <select
                  className="search-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', cursor: 'pointer' }}
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="team_member">Team Member (Submit & View)</option>
                  <option value="team_leader">Team Leader (Manage Projects & Links)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
