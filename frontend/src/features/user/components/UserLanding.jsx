import React, { useState } from 'react';
import blockshieldLogo from '../../../assets/blockshield-logo.svg';
import AuthModal from '../../../components/AuthModal';

export default function UserLanding({
  systemStatus = { isOnline: true },
  authUser,
  onLoginSuccess,
  onLogout,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isOnline = systemStatus?.isOnline !== false;

  const userBullets = [
    'Decentralized identity (DID) & clearance verification',
    'Personal assigned hardware inventory tracking',
    'Cryptographic custody transfer requests & handovers',
    'Encrypted sovereign messaging & task delegation',
  ];

  return (
    <div className="portal-page">
      {/* ─── Top Navigation Bar ─── */}
      <header className="portal-navbar">
        <div className="portal-navbar-inner">
          <div className="portal-brand" title="Bharat Electronics Limited • BlockShield Ledger">
            <img
              src={blockshieldLogo}
              alt="BlockShield"
              className="portal-brand-logo"
            />
            <div className="portal-brand-meta">
              <span className="portal-brand-name">BLOCKSHIELD</span>
              <span className="portal-brand-sub">Bharat Electronics Limited • User Access Portal</span>
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
              <span>{isOnline ? 'Sovereign Fabric Ledger • Active' : 'Offline'}</span>
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
            <span>USER ACCESS &amp; SOVEREIGN IDENTITY</span>
          </div>

          {/* Main Headline */}
          <h1 className="portal-headline">
            Bharat Electronics Limited
          </h1>

          {/* Subtitle / Motto */}
          <p className="portal-lead">
            PROTECT THE IDENTITY AND PROVE THE AUTHORITY
          </p>

          <p className="portal-sublead">
            Sovereign personnel terminal for decentralized identity verification, assigned hardware tracking, and cryptographic custody transfers.
          </p>

          {/* Section divider */}
          <div className="portal-section-rule">
            <span className="rule-line"></span>
            <h2 className="rule-label">Personnel &amp; Client Access Terminal</h2>
            <span className="rule-line"></span>
          </div>

          {/* ─── Workspace Card (User Workspace) ─── */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '3.5rem' }}>
            <article
              className="portal-card card-user"
              onClick={() => {
                if (authUser) {
                  onLoginSuccess?.(authUser);
                } else {
                  setShowAuthModal(true);
                }
              }}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (authUser) {
                    onLoginSuccess?.(authUser);
                  } else {
                    setShowAuthModal(true);
                  }
                }
              }}
              aria-label="User Workspace — Personnel and Client Access"
              style={{
                maxWidth: '480px',
                width: '100%',
                border: '1px solid #bfdbfe',
                boxShadow: '0 8px 30px rgba(37, 99, 235, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div className="portal-card-icon icon-bg-user" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', margin: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span className="portal-role-tag" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                  Personnel Access
                </span>
              </div>
              <h3 className="portal-card-title">User Workspace</h3>
              <p className="portal-card-desc">
                Sovereign terminal for verified defence personnel, engineers, and authorized partners.
              </p>

              <ul className="portal-card-bullets">
                {userBullets.map((b, i) => (
                  <li key={i} className="portal-card-bullet">
                    <span className="portal-bullet-dot"></span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="portal-card-btn btn-filled"
                onClick={(e) => {
                  e.stopPropagation();
                  if (authUser) {
                    onLoginSuccess?.(authUser);
                  } else {
                    setShowAuthModal(true);
                  }
                }}
              >
                Enter User Workspace <span className="btn-arrow">→</span>
              </button>
            </article>
          </div>

          {/* Footer tokens */}
          <footer className="portal-token-footer">
            <span>BHARAT ELECTRONICS LIMITED</span>
            <span className="token-dot">•</span>
            <span>SOVEREIGN IDENTITY</span>
            <span className="token-dot">•</span>
            <span>HYPERLEDGER FABRIC</span>
            <span className="token-dot">•</span>
            <span>ZERO-TRUST RBAC</span>
          </footer>
        </div>
      </main>

      {/* ─── Auth Modal Dialog ─── */}
      {showAuthModal && (
        <AuthModal
          role="USER"
          isPage={false}
          onLoginSuccess={(user) => {
            setShowAuthModal(false);
            onLoginSuccess?.(user);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
