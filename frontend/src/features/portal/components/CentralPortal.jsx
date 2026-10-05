import React from 'react';
import blockshieldLogo from '../../../assets/blockshield-logo.svg';

export default function CentralPortal({
  systemStatus = { isOnline: true, latency: 14 },
  onSelectRole,
  authUser,
  onLogout,
}) {
  const roles = [
    {
      id: 'ADMIN',
      title: 'Admin',
      desc: 'Platform control and security administration.',
      isPrimaryBtn: true,
      iconBgClass: 'icon-bg-admin',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'MANAGER',
      title: 'Manager',
      desc: 'Asset stewardship, requests, and approvals.',
      isPrimaryBtn: false,
      iconBgClass: 'icon-bg-manager',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      id: 'AUDITOR',
      title: 'Auditor',
      desc: 'Audit records, evidence, and compliance review.',
      isPrimaryBtn: false,
      iconBgClass: 'icon-bg-auditor',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
        </svg>
      ),
    },
    {
      id: 'USER',
      title: 'User',
      desc: 'Your verified identity, access, and assets.',
      isPrimaryBtn: false,
      iconBgClass: 'icon-bg-user',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const isOnline = systemStatus?.isOnline !== false;

  return (
    <div className="portal-page">
      {/* ─── Top Navigation Bar ─── */}
      <header className="portal-navbar">
        <div className="portal-navbar-inner">
          <div className="portal-brand" onClick={() => {}}>
            <img
              src={blockshieldLogo}
              alt="BlockShield"
              className="portal-brand-logo"
            />
            <div className="portal-brand-meta">
              <span className="portal-brand-name">BLOCKSHIELD</span>
              <span className="portal-brand-sub">Secure Identity &amp; Asset Management</span>
            </div>
          </div>

          <div className="portal-navbar-right">
            {authUser && (
              <div className="portal-session-chip">
                <span className="session-avatar">
                  {(authUser.username || authUser.did || '?')[0].toUpperCase()}
                </span>
                <span className="session-label">
                  {authUser.username || authUser.did}
                </span>
                <button type="button" className="session-logout-btn" onClick={onLogout}>
                  Sign Out
                </button>
              </div>
            )}
            <div className={`portal-status-badge ${isOnline ? 'is-online' : 'is-offline'}`}>
              <span className="status-dot-ring">
                <span className="status-dot-core"></span>
              </span>
              <span>{isOnline ? 'System secure' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <main className="portal-hero-section">
        <div className="portal-hero-inner">
          {/* Pill badge */}
          <div className="portal-shield-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>BLOCKCHAIN-BACKED PROTECTION</span>
          </div>

          {/* Headline */}
          <h1 className="portal-headline">
            <span className="headline-word">SOVEREIGN.</span>{' '}
            <span className="headline-word">TAMPER-PROOF.</span>{' '}
            <span className="headline-word">VERIFIABLE.</span>
          </h1>

          {/* Subtitles */}
          <p className="portal-lead">
            Enterprise Blockchain Trust Infrastructure for Defence, Technology &amp; Sovereign Operations
          </p>
          <p className="portal-sublead">
            One unified platform for decentralized identity (DID), zero-trust access governance, and tokenized asset custody on Hyperledger Fabric.
          </p>

          {/* Section divider */}
          <div className="portal-section-rule">
            <span className="rule-line"></span>
            <h2 className="rule-label">Choose your workspace</h2>
            <span className="rule-line"></span>
          </div>

          {/* ─── Workspace Cards ─── */}
          <div className="portal-cards-grid">
            {roles.map((r) => (
              <article
                key={r.id}
                className={`portal-card card-${r.id.toLowerCase()}`}
                onClick={() => onSelectRole?.(r.id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRole?.(r.id);
                  }
                }}
                aria-label={`${r.title} workspace — ${r.desc}`}
              >
                <div className={`portal-card-icon ${r.iconBgClass}`}>
                  {r.icon}
                </div>
                <h3 className="portal-card-title">{r.title}</h3>
                <p className="portal-card-desc">{r.desc}</p>
                <button
                  type="button"
                  className={`portal-card-btn ${r.isPrimaryBtn ? 'btn-filled' : 'btn-ghost'}`}
                  onClick={(e) => { e.stopPropagation(); onSelectRole?.(r.id); }}
                >
                  Continue <span className="btn-arrow">→</span>
                </button>
              </article>
            ))}
          </div>

          {/* Footer tokens */}
          <footer className="portal-token-footer">
            <span>IDENTITY</span>
            <span className="token-dot">•</span>
            <span>ACCESS</span>
            <span className="token-dot">•</span>
            <span>ASSETS</span>
            <span className="token-dot">•</span>
            <span>AUDIT</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
