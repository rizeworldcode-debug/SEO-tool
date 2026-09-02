import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Lock, Mail, ArrowRight, AlertCircle, Users } from 'lucide-react';

export default function MemberLogin({ onNavigate }) {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('leader@rizeworld.com');
  const [password, setPassword] = useState('LeaderPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithCredentials(email, password, 'member');
      if (onNavigate) onNavigate('/');
    } catch (err) {
      setError(err.message || 'Member login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFillLeader = () => {
    setEmail('leader@rizeworld.com');
    setPassword('LeaderPass123!');
  };

  const handleFillMember = () => {
    setEmail('member@rizeworld.com');
    setPassword('MemberPass123!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 50%, #0f172a 100%)',
      padding: '1.5rem',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      color: '#f8fafc'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            padding: '6px'
          }}>
            <img src="/logo.png" alt="RizeWorld Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
            Team Member Portal
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Login for Team Leaders & Outreach Specialists
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Member Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="leader@rizeworld.com"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.8rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.8rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 10px 20px -5px rgba(2, 132, 199, 0.4)'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Team Portal'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Quick Demo Helpers */}
        <div style={{
          marginTop: '1.8rem',
          padding: '0.9rem 1rem',
          background: 'rgba(2, 132, 199, 0.08)',
          border: '1px solid rgba(2, 132, 199, 0.2)',
          borderRadius: '12px',
          fontSize: '0.8rem',
          color: '#cbd5e1'
        }}>
          <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '0.4rem' }}>Quick Fill Demo Accounts:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleFillLeader}
              style={{
                background: 'rgba(2, 132, 199, 0.2)',
                border: '1px solid #0284c7',
                color: '#ffffff',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Fill Team Leader
            </button>
            <button
              type="button"
              onClick={handleFillMember}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#ffffff',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Fill Team Member
            </button>
          </div>
        </div>

        {/* Navigation Link to Admin Login */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          System Administrator?{' '}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/admin-login')}
            style={{ background: 'none', border: 'none', color: '#fca5a5', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            Go to Admin Login &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
