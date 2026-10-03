import React, { useState, useEffect } from 'react';
import blockshieldLogo from '../assets/blockshield-logo.svg';
import {
  getAuditLogs,
  getAuditLogsByResource,
  getAllDIDs,
  getAllNFTs,
} from '../services/api';

export default function AuditorView({
  notify,
  onViewProvenance,
  onLogout,
  authUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const [auditList, setAuditList] = useState([]);
  const [didsList, setDidsList] = useState([]);
  const [nftsList, setNftsList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [auditFilter, setAuditFilter] = useState('');
  const [didSearch, setDidSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [deniedOnly, setDeniedOnly] = useState(false);

  const [verifyInput, setVerifyInput] = useState('');
  const [provTokenId, setProvTokenId] = useState('');

  const parseList = (val) => {
    if (!val) return [];
    const data = val.data !== undefined ? val.data : val;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return Object.values(data);
    return [];
  };

  const refreshAuditData = async () => {
    setLoading(true);
    try {
      const [auditRes, didsRes, nftsRes] = await Promise.allSettled([
        getAuditLogs(),
        getAllDIDs(),
        getAllNFTs(),
      ]);

      if (auditRes.status === 'fulfilled') {
        setAuditList(parseList(auditRes.value));
      }
      if (didsRes.status === 'fulfilled') {
        setDidsList(parseList(didsRes.value));
      }
      if (nftsRes.status === 'fulfilled') {
        setNftsList(parseList(nftsRes.value));
      }
    } catch (err) {
      console.error('Failed to load audit records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuditData();
  }, []);

  const sanitizeTokenId = (raw) => {
    if (!raw) return '';
    let clean = raw.trim().replace(/[^\w\d\-:_]/g, '');
    const upper = clean.toUpperCase();
    if (upper.startsWith('USER-') || upper.startsWith('ADMIN-') || upper.startsWith('MANAGER-') || upper.startsWith('DID:')) {
      return clean;
    }
    if (!upper.startsWith('NFT-') && !upper.startsWith('AST-')) {
      clean = `NFT-${clean.replace(/^NFT-?/i, '')}`;
    }
    return clean;
  };

  const handleFilterResource = async (e, targetQuery) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = (targetQuery || resourceSearch || '').trim();
    if (!query) return notify('Enter Token ID, DID, or TxID to filter', 'error');

    let cleanQuery = query.replace(/[^\w\d\-:_]/g, '');
    const upper = cleanQuery.toUpperCase();
    if (upper.startsWith('USER-') || upper.startsWith('ADMIN-') || upper.startsWith('MANAGER-') || cleanQuery.includes(':')) {
      // User ID or DID identity record
    } else if (upper.startsWith('NFT-') || upper.startsWith('AST-')) {
      // Asset token ID
    } else if (/^\d+$/.test(cleanQuery)) {
      cleanQuery = `NFT-${cleanQuery}`;
    }

    try {
      const res = await getAuditLogsByResource(cleanQuery);
      const data = res?.data || res || [];
      setFilteredLogs(Array.isArray(data) ? data : []);
      setActiveTab('filter-resource');
      setResourceSearch(cleanQuery);
      notify(`Found ${data.length} audit entries for ${cleanQuery}`, 'success');
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (!verifyInput.trim()) return notify('Enter an Asset ID (e.g. AST-104) or DID (e.g. USER-014)', 'error');
    handleFilterResource(null, verifyInput.trim());
  };

  const handleViewProvenanceDirect = (e) => {
    e.preventDefault();
    const token = provTokenId.trim() || verifyInput.trim() || 'NFT-1001';
    const cleanToken = sanitizeTokenId(token);
    onViewProvenance(cleanToken);
  };

  const filteredAuditsList = auditList.filter(item => {
    if (deniedOnly && item.result !== 'DENIED') return false;
    return (
      (item.action || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
      (item.resourceId || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
      (item.actorDID || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
      (item.details || '').toLowerCase().includes(auditFilter.toLowerCase())
    );
  });

  const filteredDIDsList = didsList.filter(item =>
    (item.did || '').toLowerCase().includes(didSearch.toLowerCase()) ||
    (item.role || '').toLowerCase().includes(didSearch.toLowerCase()) ||
    (item.department || '').toLowerCase().includes(didSearch.toLowerCase())
  );

  const getTabLabel = (tabKey) => {
    switch (tabKey) {
      case 'overview': return 'Overview';
      case 'all-logs': return 'Audit Trail';
      case 'filter-resource': return 'Identity History';
      case 'dept-assets': return 'Asset History';
      case 'provenance': return 'Provenance';
      default: return 'Overview';
    }
  };

  return (
    <div className="admin-workspace-layout">
      {/* ──────────────────────────────────────────────────────────
          LEFT SIDEBAR: AUDITOR WORKSPACE
          ────────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div>
          {/* Header Brand Lockup with BlockShield Identity */}
          <div className="admin-sidebar-header">
            <div className="admin-brand-lockup">
              <div className="admin-brand-icon-box" title="Auditor Workspace">
                {/* Shield Check Icon matching reference */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <div className="admin-brand-text-col">
                <span className="admin-workspace-title">AUDITOR WORKSPACE</span>
                <span className="admin-workspace-subtitle">Evidence review</span>
              </div>
            </div>

            <div className="admin-blockshield-subbadge">
              <img src={blockshieldLogo} alt="BlockShield Logo" className="admin-blockshield-sublogo" />
              <span className="admin-blockshield-tagtext">BlockShield Audit</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="admin-nav">
            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'all-logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('all-logs')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span>Audit Trail</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'filter-resource' ? 'active' : ''}`}
              onClick={() => setActiveTab('filter-resource')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <polyline points="12 7 12 12 15 15"/>
              </svg>
              <span>Identity History</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'dept-assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('dept-assets')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>Asset History</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'provenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('provenance')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <span>Provenance</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Priya Nair / Auditor Session */}
        <div className="admin-sidebar-footer">
          <div className="admin-profile-row">
            <div className="admin-profile-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces"
                alt="Priya Nair"
                className="admin-profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="admin-profile-avatar-fallback">PN</span>
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-name">{authUser?.username || 'Priya Nair'}</span>
              <span className="admin-profile-status">Authenticated</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-signout-link"
            onClick={onLogout}
            title="Sign out of Auditor Workspace"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          RIGHT MAIN PANEL: AUDIT & COMPLIANCE
          ────────────────────────────────────────────────────────── */}
      <main className="admin-main-panel">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-top-left-col">
            <div className="admin-breadcrumb">
              <span>Auditor</span>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-curr">{getTabLabel(activeTab)}</span>
            </div>

            <h1 className="admin-page-title">
              {activeTab === 'overview' ? 'Audit & Compliance' : getTabLabel(activeTab)}
            </h1>
            <p className="admin-page-desc">
              {activeTab === 'overview'
                ? 'Review verifiable identity, asset, and transfer history across the platform.'
                : `Inspect and verify ${getTabLabel(activeTab).toLowerCase()} records stored on the immutable Hyperledger Fabric ledger.`}
            </p>
          </div>

          <div className="admin-top-actions">
            <button
              type="button"
              className="btn-refresh-white"
              onClick={refreshAuditData}
              disabled={loading}
              title="Refresh ledger state"
            >
              <svg className={`refresh-svg-icon ${loading ? 'spinning' : ''}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Refresh data</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Row (Recorded events, Identities, Assets) */}
        <div className="admin-metrics-row">
          {/* Card 1: Recorded events */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('all-logs')}
            title="Click to view Audit Trail"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Immutable</span>
            </div>

            <div className="metric-number-big">
              {auditList.length > 0 ? auditList.length.toLocaleString() : '1,284'}
            </div>
            <div className="metric-title-text">Recorded events</div>
            <div className="metric-sub-text">All activity retained for review</div>
          </div>

          {/* Card 2: Identities */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('filter-resource')}
            title="Click to view Identity History"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Verified</span>
            </div>

            <div className="metric-number-big">
              {didsList.length > 0 ? didsList.length : 128}
            </div>
            <div className="metric-title-text">Identities</div>
            <div className="metric-sub-text">DID records in the registry</div>
          </div>

          {/* Card 3: Assets */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('dept-assets')}
            title="Click to view Asset History"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue" style={{ background: '#ecfdf5', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Tracked</span>
            </div>

            <div className="metric-number-big">
              {nftsList.length > 0 ? nftsList.length : 46}
            </div>
            <div className="metric-title-text">Assets</div>
            <div className="metric-sub-text">Current provenance available</div>
          </div>
        </div>

        {/* Workspace Body Content */}
        <div className="admin-tab-body">
          {/* ──────────────────────────────────────────────────────────
              TAB 0: OVERVIEW (Recent Activity & Verification Card)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="auditor-overview-grid">
              {/* Left Card: Recent Activity */}
              <div className="admin-card-section">
                <div className="admin-card-section-header">
                  <div className="admin-card-header-left">
                    <h2 className="admin-section-heading">Recent activity</h2>
                    <span className="admin-section-subheading">Latest compliance-relevant ledger entries</span>
                  </div>
                  <button
                    type="button"
                    className="btn-view-audit-link"
                    onClick={() => setActiveTab('all-logs')}
                  >
                    View audit trail
                  </button>
                </div>

                <div className="admin-activity-col">
                  {auditList && auditList.length > 0 ? (
                    auditList.slice(0, 3).map((item, idx) => {
                      const actionUpper = (item.action || '').toUpperCase();
                      const isCreate = actionUpper.includes('DID') || actionUpper.includes('CREATE') || actionUpper.includes('REGISTER');
                      const isAlloc = actionUpper.includes('ALLOC') || actionUpper.includes('ASSIGN');

                      let circleClass = 'circle-blue';
                      let icon = (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      );

                      if (isCreate) {
                        circleClass = 'circle-teal';
                        icon = (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        );
                      } else if (isAlloc) {
                        circleClass = 'circle-blue';
                        icon = (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        );
                      }

                      const defaultTitle = isCreate ? 'Identity created' : isAlloc ? 'Asset allocated' : 'Transfer approved';
                      const resourceTarget = item.resourceId || 'AST-104';
                      const actor = item.actorDID ? item.actorDID.replace(/^did:trust:/, '') : 'ADMIN-001';
                      const timeAgo = item.timestamp && !isNaN(item.timestamp)
                        ? `${Math.max(1, Math.floor((Date.now() / 1000 - Number(item.timestamp)) / 60))} min ago`
                        : `${(idx + 1) * 5} min ago`;

                      return (
                        <div key={item.eventId || idx} className="admin-activity-row">
                          <div className="admin-activity-left">
                            <div className={`admin-activity-circle ${circleClass}`}>
                              {icon}
                            </div>
                            <div className="admin-activity-content">
                              <span className="admin-activity-title">{defaultTitle}</span>
                              <span className="auditor-activity-id">{resourceTarget}</span>
                              <span className="admin-activity-subtext">By {actor} · {timeAgo}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-inspect-link"
                            onClick={() => handleFilterResource(null, resourceTarget)}
                          >
                            Inspect
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      {/* Row 1: Identity created */}
                      <div className="admin-activity-row">
                        <div className="admin-activity-left">
                          <div className="admin-activity-circle circle-teal">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                          <div className="admin-activity-content">
                            <span className="admin-activity-title">Identity created</span>
                            <span className="auditor-activity-id">USER-014</span>
                            <span className="admin-activity-subtext">By ADMIN-001 · 5 min ago</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-inspect-link"
                          onClick={() => handleFilterResource(null, 'USER-014')}
                        >
                          Inspect
                        </button>
                      </div>

                      {/* Row 2: Asset allocated */}
                      <div className="admin-activity-row">
                        <div className="admin-activity-left">
                          <div className="admin-activity-circle circle-blue">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                          </div>
                          <div className="admin-activity-content">
                            <span className="admin-activity-title">Asset allocated</span>
                            <span className="auditor-activity-id">AST-104 &rarr; USER-014</span>
                            <span className="admin-activity-subtext">By MANAGER-002 · 12 min ago</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-inspect-link"
                          onClick={() => handleFilterResource(null, 'AST-104')}
                        >
                          Inspect
                        </button>
                      </div>

                      {/* Row 3: Transfer approved */}
                      <div className="admin-activity-row">
                        <div className="admin-activity-left">
                          <div className="admin-activity-circle circle-blue">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                          <div className="admin-activity-content">
                            <span className="admin-activity-title">Transfer approved</span>
                            <span className="auditor-activity-id">AST-087</span>
                            <span className="admin-activity-subtext">By MANAGER-002 · 18 min ago</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-inspect-link"
                          onClick={() => handleFilterResource(null, 'AST-087')}
                        >
                          Inspect
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Card: Verification Card */}
              <div className="admin-card-section">
                <div className="admin-card-section-header">
                  <div className="admin-card-header-left">
                    <h2 className="admin-section-heading">Verification</h2>
                    <span className="admin-section-subheading">Validate an asset or DID against its recorded history.</span>
                  </div>
                  <div className="metric-icon-square square-blue" style={{ width: 36, height: 36, borderRadius: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                </div>

                <form onSubmit={handleVerifySubmit} style={{ marginTop: '0.25rem' }}>
                  <label className="auditor-field-label">Asset or DID</label>
                  <div className="auditor-verify-input-group">
                    <input
                      type="text"
                      className="auditor-verify-input"
                      placeholder="Search AST-104 or USER-014"
                      value={verifyInput}
                      onChange={(e) => setVerifyInput(e.target.value)}
                    />
                    <button type="submit" className="auditor-btn-verify">
                      Verify
                    </button>
                  </div>
                </form>

                <div className="auditor-info-note">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>Verification checks the identity or asset record, event sequence, and current provenance.</span>
                </div>

                <button
                  type="button"
                  className="auditor-btn-open-provenance"
                  onClick={handleViewProvenanceDirect}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                  <span>Open provenance review</span>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 1: AUDIT TRAIL
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'all-logs' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Immutable Hyperledger Audit Trail</h3>
                  <p className="text-xs text-muted">Read-only tamper-evident event stream generated natively by Fabric chaincode.</p>
                </div>
                <div className="flex-gap align-center">
                  <label className="checkbox-label flex-gap align-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deniedOnly}
                      onChange={(e) => setDeniedOnly(e.target.checked)}
                    />
                    <span>Security Alerts Only (DENIED)</span>
                  </label>
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="Search Event, Actor, Resource..."
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                  />
                  <button className="btn btn-xs btn-secondary" onClick={refreshAuditData}>Refresh</button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Resource ID</th>
                      <th>Result</th>
                      <th>Actor DID</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditsList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No audit events match your filter criteria.</td>
                      </tr>
                    ) : (
                      filteredAuditsList.map((log, index) => {
                        const isDenied = log.result === 'DENIED';
                        const formattedTime = log.timestamp && !isNaN(log.timestamp)
                          ? new Date(Number(log.timestamp) * 1000).toLocaleString()
                          : log.timestamp || 'N/A';

                        return (
                          <tr key={log.eventId || index} className={isDenied ? 'row-denied' : ''}>
                            <td className="text-xs">{formattedTime}</td>
                            <td><span className="type-pill">{log.action}</span></td>
                            <td><code>{log.resourceId}</code></td>
                            <td>
                              <span className={`status-pill ${isDenied ? 'status-revoked' : 'status-active'}`}>
                                {log.result}
                              </span>
                            </td>
                            <td><code>{log.actorDID}</code></td>
                            <td className="text-xs text-muted">{log.details || 'N/A'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 2: RESOURCE / TX AUDIT LOOKUP
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'filter-resource' && (
            <div className="glass-card">
              <h3 className="card-title mb-2">Resource &amp; Transaction Audit Lookup</h3>
              <p className="text-sm text-muted mb-4">
                Query specific audit events tied to an asset Token ID (e.g. <code>NFT-1001</code>) or DID.
              </p>

              <form onSubmit={handleFilterResource} className="flex-gap mb-4 max-w-lg">
                <input
                  type="text"
                  className="input"
                  placeholder="Enter Token ID or DID (e.g. NFT-1001)..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">Search Audit Trail</button>
              </form>

              {filteredLogs.length > 0 && (
                <div className="table-responsive mt-3">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Event ID</th>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Result</th>
                        <th>Actor DID</th>
                        <th>Audit Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, idx) => (
                        <tr key={log.eventId || idx} className={log.result === 'DENIED' ? 'row-denied' : ''}>
                          <td><code>{log.eventId}</code></td>
                          <td className="text-xs">{log.timestamp && !isNaN(log.timestamp) ? new Date(Number(log.timestamp) * 1000).toLocaleString() : log.timestamp}</td>
                          <td><span className="type-pill">{log.action}</span></td>
                          <td><span className={`status-pill ${log.result === 'DENIED' ? 'status-revoked' : 'status-active'}`}>{log.result}</span></td>
                          <td><code>{log.actorDID}</code></td>
                          <td className="text-xs">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 3: ASSET CUSTODY INSPECTOR
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'dept-assets' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <h3 className="card-title">Asset History &amp; Custody Roster</h3>
                <button className="btn btn-xs btn-secondary" onClick={refreshAuditData}>Refresh</button>
              </div>

              <div className="grid grid-3">
                {nftsList.map((asset) => (
                  <div key={asset.tokenId} className="asset-card">
                    <div className="asset-header">
                      <span className="type-pill">{asset.assetType || 'HARDWARE'}</span>
                      <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{asset.status}</span>
                    </div>
                    <h4 className="asset-title">{asset.assetName || asset.name}</h4>
                    <p className="asset-id">Token ID: <code>{asset.tokenId}</code></p>
                    {asset.assetId && <p className="asset-id">Asset ID: <code>{asset.assetId}</code></p>}
                    <div className="asset-meta text-xs my-2">
                      <p><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                      <p><strong>Custodian:</strong> <code>{asset.custodian || asset.ownerDID}</code></p>
                      <p><strong>Department:</strong> {asset.department || 'R&D'}</p>
                    </div>
                    <button
                      className="btn btn-xs btn-secondary w-full mt-2"
                      onClick={() => onViewProvenance(asset.tokenId)}
                    >
                      View Visual History Timeline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 4: PROVENANCE
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'provenance' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <h3 className="card-title">Asset Provenance Timeline Inspector</h3>
                <form onSubmit={handleViewProvenanceDirect} className="flex-gap">
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="Enter Token ID (e.g. NFT-1001)..."
                    value={provTokenId}
                    onChange={(e) => setProvTokenId(e.target.value)}
                  />
                  <button type="submit" className="btn btn-xs btn-primary">Inspect Timeline</button>
                </form>
              </div>

              <div className="grid grid-3">
                {nftsList.map((asset) => (
                  <div key={asset.tokenId} className="asset-card">
                    <div className="asset-header">
                      <span className="type-pill">{asset.assetType || 'HARDWARE'}</span>
                      <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{asset.status}</span>
                    </div>
                    <h4 className="asset-title">{asset.assetName || asset.name}</h4>
                    <p className="asset-id">Token ID: <code>{asset.tokenId}</code></p>
                    <div className="asset-meta text-xs my-2">
                      <p><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                      <p><strong>Custodian:</strong> <code>{asset.custodian || asset.ownerDID || 'UNASSIGNED'}</code></p>
                    </div>
                    <button
                      className="btn btn-xs btn-secondary w-full mt-2"
                      onClick={() => onViewProvenance(asset.tokenId)}
                    >
                      Inspect Provenance &amp; Audit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
