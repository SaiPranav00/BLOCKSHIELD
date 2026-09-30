import React from 'react';
import blockshieldLogo from '../assets/blockshield-logo.svg';

export default function Header({
  systemStatus,
  activeRole,
  currentView,
  onReturnHome,
  onOpenCommChannel,
  authUser,
  onLogout,
  unreadCount = 0,
}) {
  const roleBadges = {
    ADMIN: { label: 'Admin Workspace', color: 'badge-admin' },
    MANAGER: { label: 'Manager Workspace', color: 'badge-manager' },
    AUDITOR: { label: 'Auditor Workspace', color: 'badge-auditor' },
    USER: { label: 'User Workspace', color: 'badge-user' },
  };

  const currentBadge = roleBadges[activeRole] || roleBadges.USER;
  const isDedicatedPage = currentView !== 'PORTAL';

  const currentPort = typeof window !== 'undefined' ? (window.location.port || '80') : '5173';
  const getPortLabel = (port) => {
    if (port === '5174') return 'Port 5174 (Admin)';
    if (port === '5175') return 'Port 5175 (Manager)';
    if (port === '5176') return 'Port 5176 (Auditor)';
    return `Port ${port}`;
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo-lockup" onClick={onReturnHome} style={{ cursor: 'pointer' }} title="Return to Role Selection Portal">
          <img src={blockshieldLogo} alt="BlockShield Logo" className="brand-logo-img" />
          <div className="brand-text-wrapper">
            <h1 className="brand-title">BlockShield Platform</h1>
            <p className="brand-subtitle">Hyperledger Fabric Ledger &amp; DID System</p>
          </div>
        </div>
      </div>

      <div className="header-meta">
        {/* Server Port Indicator Badge */}
        <div className="port-badge-indicator" title={`Serving on network port ${currentPort}`}>
          <span className="port-dot"></span>
          <span className="port-text">{getPortLabel(currentPort)}</span>
        </div>

        {/* Network Status Indicator */}
        <div className={`status-indicator ${systemStatus.isOnline ? 'online' : 'offline'}`}>
          <span className="pulse-dot"></span>
          <span className="pulse-ring"></span>
          <span className="status-label">
            {systemStatus.isOnline
              ? `Fabric Online (${systemStatus.latency || 14}ms)`
              : 'Ledger Offline'}
          </span>
        </div>

        {/* Communication Channel Button */}
        {isDedicatedPage && (
          <button
            className="btn-comm-hub"
            onClick={onOpenCommChannel}
            title="Open Role Communication Channel"
          >
            <span>Messages &amp; Tasks</span>
            {unreadCount > 0 && (
              <span className="badge-unread-count">{unreadCount}</span>
            )}
          </button>
        )}

        {/* Auth User Session Pill */}
        {authUser ? (
          <div className="user-session-box">
            <span className="user-did-label">
              {authUser.username || authUser.did}
            </span>
            <span className={`role-pill role-${(authUser.role || 'USER').toLowerCase()}`}>
              {authUser.role}
            </span>
            <button className="btn-logout" onClick={onLogout} title="Sign Out">
              Sign Out
            </button>
          </div>
        ) : (
          isDedicatedPage && (
            <div className={`role-badge ${currentBadge.color}`}>
              {currentBadge.label}
            </div>
          )
        )}
      </div>
    </header>
  );
}
