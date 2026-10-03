import React from 'react';
import blockshieldLogo from '../assets/blockshield-logo.svg';

export default function Header({
  activeRole,
  activeDID,
  currentView,
  onReturnHome,
  onOpenCommChannel,
  authUser,
  onLogout,
  unreadCount = 0,
}) {
  const displayRole = authUser?.role || activeRole || 'USER';
  const rawIdentifier = authUser?.username || authUser?.did || (activeDID ? activeDID.split(':').pop() : `${displayRole}001`);
  const displayUsername = rawIdentifier.replace(/^did:[^:]+:/, '');

  return (
    <header className="app-header">
      {/* Left: Brand Lockup with BlockShield Identity */}
      <div className="header-brand">
        <div
          className="brand-logo-lockup"
          onClick={onReturnHome}
          style={{ cursor: 'pointer' }}
          title="Return to Central Portals Landing"
        >
          <img src={blockshieldLogo} alt="BlockShield Logo" className="brand-logo-img" />
          <div className="brand-text-wrapper">
            <h1 className="brand-title">BlockShield</h1>
            <p className="brand-subtitle">Hyperledger Fabric Ledger</p>
          </div>
        </div>
      </div>

      {/* Right: Clean Utility Bar (Chat & Tasks, User DID + Role Chip, Sign Out) */}
      <div className="header-meta">
        {/* Communication Hub: Chat & Tasks */}
        <button
          type="button"
          className="btn-comm-hub"
          onClick={onOpenCommChannel}
          title="Open Chat &amp; Tasks"
        >
          <span className="comm-icon">💬</span>
          <span>Chat &amp; Tasks</span>
          {unreadCount > 0 && (
            <span className="badge-unread-count">{unreadCount}</span>
          )}
        </button>

        {/* Clean User Session Chip: Identity + Role Badge */}
        <div className="header-user-chip" title={`Authenticated as ${displayUsername} (${displayRole})`}>
          <span className="header-user-name">
            {displayUsername}
          </span>
          <span className={`header-role-badge role-badge-${displayRole.toLowerCase()}`}>
            {displayRole}
          </span>
        </div>

        {/* Clean Sign Out Button */}
        <button
          type="button"
          className="btn-header-signout"
          onClick={onLogout}
          title="Sign out of current workspace"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
