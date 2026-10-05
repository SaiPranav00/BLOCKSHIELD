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
      title: 'Administrator',
      desc: 'Platform control, sovereign DID governance, policy enforcement, and ledger provisioning authority.',
      isPrimaryBtn: true,
      iconBgClass: 'icon-bg-admin',
      badge: 'Platform Control',
      bullets: [
        'Sovereign DID provisioning & revocation',
        'Zero-trust role & clearance enforcement',
        'Hyperledger Fabric ledger control',
      ],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'MANAGER',
      title: 'Operations Manager',
      desc: 'Department asset stewardship, custody allocation, and transfer approval workflows.',
      isPrimaryBtn: false,
      iconBgClass: 'icon-bg-manager',
      badge: 'Asset Stewardship',
      bullets: [
        'Department hardware custody allocations',
        'Custody transfer review & approvals',
        'Equipment provenance & lifecycle tracking',
      ],
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
      desc: 'Forensic evidence review, cryptographic audit verification, and regulatory compliance inspection.',
      isPrimaryBtn: false,
      iconBgClass: 'icon-bg-auditor',
      badge: 'Forensic Audit',
      bullets: [
        'Cryptographic forensic evidence inspection',
        'Chaincode transaction proof verification',
        'Five-Ws immutable audit trail review',
      ],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
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
          <div className="portal-brand" title="Bharat Electronics Limited • BlockShield Ledger">
            <img
              src={blockshieldLogo}
              alt="BlockShield"
              className="portal-brand-logo"
            />
            <div className="portal-brand-meta">
              <span className="portal-brand-name">BLOCKSHIELD</span>
              <span className="portal-brand-sub">Bharat Electronics Limited • Sovereign Defence Ledger</span>
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
            <span>ENTERPRISE GOVERNANCE &amp; SOVEREIGN OPERATIONS</span>
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
            Decentralized identity governance, zero-trust RBAC access control, and tokenized hardware asset custody on Hyperledger Fabric.
          </p>

          {/* Section divider */}
          <div className="portal-section-rule">
            <span className="rule-line"></span>
            <h2 className="rule-label">Enterprise Governance Workspaces</h2>
            <span className="rule-line"></span>
          </div>

          {/* ─── Workspace Cards Grid (Admin, Manager, Auditor) ─── */}
          <div className="portal-cards-grid portal-cards-grid-three">
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
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1rem' }}>
                  <div className={`portal-card-icon ${r.iconBgClass}`} style={{ margin: 0 }}>
                    {r.icon}
                  </div>
                  <span className={`portal-role-tag tag-${r.id.toLowerCase()}`}>
                    {r.badge}
                  </span>
                </div>
                <h3 className="portal-card-title">{r.title}</h3>
                <p className="portal-card-desc">{r.desc}</p>

                <ul className="portal-card-bullets">
                  {r.bullets.map((b, i) => (
                    <li key={i} className="portal-card-bullet">
                      <span className="portal-bullet-dot"></span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="portal-card-btn btn-filled"
                  onClick={(e) => { e.stopPropagation(); onSelectRole?.(r.id); }}
                >
                  Enter Workspace <span className="btn-arrow">→</span>
                </button>
              </article>
            ))}
          </div>

          {/* Footer compliance notice */}
          <footer className="portal-token-footer">
            <div className="token-footer-row">
              <span>Restricted Access</span>
              <span className="token-dot">•</span>
              <span>Bharat Electronics Limited</span>
              <span className="token-dot">•</span>
              <span>Authorized Personnel Only</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
