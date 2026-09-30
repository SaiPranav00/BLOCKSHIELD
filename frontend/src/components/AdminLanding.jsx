import React, { useState, useEffect } from 'react';
import { loginUser } from '../services/api';

export default function AdminLanding({ metrics, systemStatus, authUser, onEnterDashboard, onLoginSuccess, onOpenAuth }) {
  const [greeting, setGreeting] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  
  // Inline auth state
  const [identityInput, setIdentityInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour < 12) {
        setGreeting('Good Morning');
      } else if (hour < 17) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }

      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInlineLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identityInput.trim() || !passwordInput.trim()) {
      return setErrorMsg('Please enter both identity and password');
    }

    setLoading(true);
    try {
      const res = await loginUser({
        identity: identityInput.trim(),
        password: passwordInput.trim(),
        role: 'ADMIN',
      });

      if (res.authenticated) {
        if (onLoginSuccess) {
          onLoginSuccess({
            did: res.did,
            role: res.role || 'ADMIN',
            username: res.username || res.did,
          });
        }
        if (onEnterDashboard) {
          onEnterDashboard();
        }
      } else {
        setErrorMsg('Authentication failed. Invalid Admin credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-simple-landing-wrapper">
      <div className="admin-respect-card">
        {/* Top Status & Time Tag */}
        <div className="admin-card-header">
          <div className="admin-status-pill">
            <span className={`status-dot ${systemStatus?.isOnline ? 'online' : 'offline'}`}></span>
            <span>{systemStatus?.isOnline ? 'Ledger Online' : 'Ledger Offline'}</span>
          </div>
          <div className="admin-time-badge">
            <span>🕒 {currentTimeStr}</span>
          </div>
        </div>

        {/* Greeting Title without 'Respected Administrator' */}
        <div className="admin-card-body">
          <h1 className="admin-greeting-title">
            {greeting}, Admin
          </h1>
          <p className="admin-greeting-message">
            Welcome to the BlockShield Governance Portal.
          </p>

          {/* Essential Quick Ledger Stats */}
          <div className="admin-quick-stats">
            <div className="quick-stat-item">
              <span className="quick-stat-val">{metrics?.didsCount || 0}</span>
              <span className="quick-stat-lbl">Active DIDs</span>
            </div>
            <div className="quick-stat-divider"></div>
            <div className="quick-stat-item">
              <span className="quick-stat-val">{metrics?.nftsCount || 0}</span>
              <span className="quick-stat-lbl">Minted Assets</span>
            </div>
            <div className="quick-stat-divider"></div>
            <div className="quick-stat-item">
              <span className="quick-stat-val">{metrics?.auditsCount || 0}</span>
              <span className="quick-stat-lbl">Audit Logs</span>
            </div>
          </div>

          {/* Inline Admin Authentication Form (ADMIN001 / password123) */}
          {!authUser ? (
            <form onSubmit={handleInlineLogin} className="admin-auth-inline-form">
              <h4 className="auth-form-title">🔐 Administrator Authentication</h4>
              
              {errorMsg && (
                <div className="admin-error-box">
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="admin-input-row">
                <div className="admin-field">
                  <label className="admin-label">Admin DID / ID:</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={identityInput}
                    onChange={(e) => setIdentityInput(e.target.value)}
                    placeholder="Enter Admin DID or ID..."
                    required
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Password:</label>
                  <input
                    type="password"
                    className="admin-input"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter Password..."
                    required
                  />
                </div>
              </div>

              <button type="submit" className="admin-proceed-btn" disabled={loading}>
                <span>{loading ? 'Authenticating...' : 'Log In & Enter Admin Console'}</span>
                <span className="btn-arrow">&rarr;</span>
              </button>
            </form>
          ) : (
            <div className="admin-logged-in-box">
              <p className="logged-in-tag">
                Logged in as <code>{authUser.did || authUser.username || 'ADMIN001'}</code>
              </p>
              <button className="admin-proceed-btn" onClick={onEnterDashboard}>
                <span>Enter Admin Dashboard</span>
                <span className="btn-arrow">&rarr;</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
