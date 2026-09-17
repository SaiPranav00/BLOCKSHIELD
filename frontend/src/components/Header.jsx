import React, { useState } from 'react';

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
    ADMIN: { label: 'Admin Portal', color: 'badge-admin' },
    MANAGER: { label: 'Manager Portal', color: 'badge-manager' },
    AUDITOR: { label: 'Auditor Portal', color: 'badge-auditor' },
    USER: { label: 'User Portal', color: 'badge-user' },
  };

  const currentBadge = roleBadges[activeRole] || roleBadges.USER;
  const isDedicatedPage = currentView !== 'PORTAL';

  return (
    <header className="app-header">
      <div className="header-brand">
        {isDedicatedPage && (
          <button className="btn btn-secondary btn-sm mr-3" onClick={onReturnHome} title="Return to Role Selection">
            &larr; Back to Roles
          </button>
        )}

        <div>
          <h1 className="brand-title">SIH 2026 Platform</h1>
          <p className="brand-subtitle">Hyperledger Fabric Ledger & DID System</p>
        </div>
      </div>

      <div className="header-meta">
        <div className={`status-indicator ${systemStatus.isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot-static"></span>
          <span className="status-label">
            {systemStatus.isOnline ? `Fabric Online (${systemStatus.latency || 12}ms)` : 'Offline'}
          </span>
        </div>

        {/* Communication Hub Button */}
        {isDedicatedPage && (
          <button
            className="btn btn-sm btn-outline btn-comm-hub"
            onClick={onOpenCommChannel}
            title="Open Role Communication Channel"
          >
            <span>Messages & Tasks</span>
            {unreadCount > 0 && (
              <span className="badge-unread-count">{unreadCount}</span>
            )}
          </button>
        )}

        {authUser && (
          <div className="flex-gap align-center ml-2">
            <span className="text-xs text-muted font-mono">
              {authUser.username || authUser.did} <span className={`role-pill role-${(authUser.role || 'USER').toLowerCase()}`}>{authUser.role}</span>
            </span>
            <button className="btn btn-xs btn-outline" onClick={onLogout} title="Log Out">
              Log Out
            </button>
          </div>
        )}

        {isDedicatedPage && !authUser && (
          <div className={`role-badge ${currentBadge.color}`}>
            {currentBadge.label}
          </div>
        )}
      </div>
    </header>
  );
}


