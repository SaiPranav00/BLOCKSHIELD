import React from 'react';

export default function CentralPortal({ metrics, systemStatus, onSelectRole }) {
  // All 4 organization roles are accessible directly from the central portal landing
  const roles = [
    {
      id: 'ADMIN',
      title: 'Admin Security Portal',
      subtitle: 'DID & System Governance',
      desc: 'Create verifiable DIDs, manage organizational roles, approve pending user registrations, and oversee chaincode operations.',
      badge: 'Admin',
      port: '5174',
      symbol: '🛡️',
      accentClass: 'role-card-admin',
      symbolClass: 'symbol-admin',
    },
    {
      id: 'MANAGER',
      title: 'Manager Portal',
      subtitle: 'Asset & Work Operations',
      desc: 'Allocate unassigned assets, execute assisted transfers, and verify tokens across organization users.',
      badge: 'Manager',
      port: '5175',
      symbol: '💼',
      accentClass: 'role-card-manager',
      symbolClass: 'symbol-manager',
    },
    {
      id: 'AUDITOR',
      title: 'Auditor Portal',
      subtitle: 'Compliance & Audit Logs',
      desc: 'Review immutable ledger audit logs, inspect identity compliance registry, and trace asset provenance.',
      badge: 'Auditor',
      port: '5176',
      symbol: '🔍',
      accentClass: 'role-card-auditor',
      symbolClass: 'symbol-auditor',
    },
    {
      id: 'USER',
      title: 'User Portal',
      subtitle: 'Self-Service Portfolio',
      desc: 'Manage personal digital asset portfolio, execute self-transfers, and verify certificate authenticity on-chain.',
      badge: 'User',
      port: '5173',
      symbol: '👤',
      accentClass: 'role-card-user',
      symbolClass: 'symbol-user',
    },
  ];

  return (
    <div className="central-landing-wrapper">
      {/* Landing Header */}
      <div className="central-landing-hero">
        <div className="network-status-tag">
          <span className={`status-dot ${systemStatus.isOnline ? 'online' : 'offline'}`}></span>
          <span>{systemStatus.isOnline ? 'HYPERLEDGER FABRIC CONNECTED' : 'LEDGER OFFLINE'}</span>
        </div>
        <h2 className="landing-title">BlockShield Organization Portals</h2>
        <p className="landing-subtitle">
          Select your assigned organization role to access dedicated ledger operations, assets, and communication channels.
        </p>

        {/* Live Metrics Summary Bar */}
        <div className="metrics-summary-bar mt-3">
          <div className="metric-card">
            <div className="metric-icon-box">🪪</div>
            <div className="metric-details">
              <span className="metric-label">Identities (DIDs)</span>
              <span className="metric-value">{metrics?.didsCount || 0}</span>
              <span className="metric-sub">Registered on Ledger</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon-box">💎</div>
            <div className="metric-details">
              <span className="metric-label">Digital Assets (NFTs)</span>
              <span className="metric-value">{metrics?.nftsCount || 0}</span>
              <span className="metric-sub">Minted Tokens</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon-box">📋</div>
            <div className="metric-details">
              <span className="metric-label">Audit Logs</span>
              <span className="metric-value">{metrics?.auditsCount || 0}</span>
              <span className="metric-sub">Immutable Records</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon-box">📡</div>
            <div className="metric-details">
              <span className="metric-label">Network Latency</span>
              <span className="metric-value">{systemStatus.latency || 14}<small style={{ fontSize: '11px', fontWeight: 500 }}>ms</small></span>
              <span className="metric-sub">Fabric Consensus</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Role Portal Cards Grid (Admin, Manager, Auditor, User) */}
      <div className="roles-grid-4">
        {roles.map((r) => (
          <div
            key={r.id}
            className={`portal-role-card ${r.accentClass}`}
            onClick={() => onSelectRole(r.id)}
          >
            <div className="card-top-row">
              <span className={`role-symbol-circle ${r.symbolClass}`}>{r.symbol}</span>
              <span className="badge-pill">{r.badge}</span>
            </div>

            <h3 className="role-card-title">{r.title}</h3>
            <h4 className="role-card-subtitle">{r.subtitle}</h4>
            <p className="role-card-desc">{r.desc}</p>

            <button className="btn-enter-portal">
              <span>Enter {r.title}</span>
              <span className="arrow-icon">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
