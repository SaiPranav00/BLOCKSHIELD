import React from 'react';

export default function CentralPortal({ systemStatus, onSelectRole }) {
  const roles = [
    {
      id: 'ADMIN',
      title: 'Admin Portal',
      subtitle: 'System Administration',
      desc: 'Register identities, assign roles, mint assets, and manage revocation state.',
      badge: 'Admin',
      accentClass: 'role-card-admin',
    },
    {
      id: 'MANAGER',
      title: 'Manager Portal',
      subtitle: 'Asset Operations',
      desc: 'Allocate unassigned assets, execute assisted transfers, and verify tokens.',
      badge: 'Manager',
      accentClass: 'role-card-manager',
    },
    {
      id: 'AUDITOR',
      title: 'Auditor Portal',
      subtitle: 'Compliance & Audit Logs',
      desc: 'Review immutable ledger audit logs, inspect identity registry, and provenance.',
      badge: 'Auditor',
      accentClass: 'role-card-auditor',
    },
    {
      id: 'USER',
      title: 'User Portal',
      subtitle: 'Self-Service Portfolio',
      desc: 'Manage personal asset portfolio, execute self-transfers, and verify certificates.',
      badge: 'User',
      accentClass: 'role-card-user',
    },
  ];

  return (
    <div className="central-landing-wrapper">
      <div className="roles-grid-centered">
        {roles.map((r) => (
          <div
            key={r.id}
            className={`minimal-role-card ${r.accentClass}`}
            onClick={() => onSelectRole(r.id)}
          >
            <div className="card-top">
              <span className="badge-pill">{r.badge}</span>
            </div>
            <h2 className="role-card-title">{r.title}</h2>
            <h3 className="role-card-subtitle">{r.subtitle}</h3>
            <p className="role-card-desc">{r.desc}</p>
            <button className="btn btn-primary btn-sm btn-block mt-auto">
              Enter {r.title} &rarr;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
