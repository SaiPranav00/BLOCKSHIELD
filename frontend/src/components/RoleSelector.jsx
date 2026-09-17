import React from 'react';

export default function RoleSelector({ activeRole, onSelectRole }) {
  const roles = [
    { id: 'ADMIN', label: '👑 ADMIN PORTAL', desc: 'Identity Registration, Role Assignment & Asset Minting' },
    { id: 'MANAGER', label: '👔 MANAGER PORTAL', desc: 'Asset Operations, Allocations & Assisted Transfers' },
    { id: 'AUDITOR', label: '🔍 AUDITOR PORTAL', desc: 'Immutable Audit Trail & Compliance Inspection' },
    { id: 'USER', label: '👤 USER PORTAL', desc: 'Personal Digital Asset Portfolio & Self-Transfers' },
  ];

  return (
    <nav className="role-selector-nav">
      <div className="role-tabs">
        {roles.map((r) => {
          const isActive = activeRole === r.id;
          return (
            <button
              key={r.id}
              className={`role-tab tab-${r.id.toLowerCase()} ${isActive ? 'active' : ''}`}
              onClick={() => onSelectRole(r.id)}
            >
              <div className="tab-header">
                <span className="tab-title">{r.label}</span>
                {isActive && <span className="active-dot"></span>}
              </div>
              <span className="tab-desc">{r.desc}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
