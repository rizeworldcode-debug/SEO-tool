import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('seo_tracker_token') || '');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('seo_tracker_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('seo_tracker_token', token);
    } else {
      localStorage.removeItem('seo_tracker_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('seo_tracker_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('seo_tracker_user');
    }
  }, [user]);

  const loginWithCredentials = async (email, password, requiredRole = null) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }

    if (requiredRole === 'admin' && data.user.role !== 'admin') {
      throw new Error('Access Denied: Only Admin accounts can log in through the Admin Portal.');
    }

    if (requiredRole === 'member' && data.user.role === 'admin') {
      // Admins can log in anywhere or stay as Admin
    }

    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('seo_tracker_token');
    localStorage.removeItem('seo_tracker_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

