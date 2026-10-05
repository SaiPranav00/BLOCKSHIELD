import React, { useState, useEffect } from 'react';
import blockshieldLogo from '../../../assets/blockshield-logo.svg';
import ForensicEvidenceModal from '../../../components/ForensicEvidenceModal';
import {
  getAuditLogs,
  getAuditLogsByResource,
  getAllDIDs,
  getAllNFTs,
  isAssetLog,
} from '../../../services/api';
import { parseList } from '../../../utils';

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
  const [assetSearch, setAssetSearch] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [deniedOnly, setDeniedOnly] = useState(false);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);

  const [verifyInput, setVerifyInput] = useState('');
  const [provTokenId, setProvTokenId] = useState('');

  // Forensic Evidence Modal state
  const [selectedEvidenceLog, setSelectedEvidenceLog] = useState(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  const refreshAuditData = async () => {
    setLoading(true);
    try {
      const [auditRes, didsRes, nftsRes] = await Promise.allSettled([
        getAuditLogs('AUDITOR'),
        getAllDIDs(),
        getAllNFTs(),
      ]);

      if (auditRes.status === 'fulfilled') {
        const rawLogs = parseList(auditRes.value);
        setAuditList(rawLogs.filter(isAssetLog));
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
    // Auto-poll audit records every 3.5 seconds
    const timer = setInterval(() => {
      refreshAuditData();
    }, 3500);

    // Immediate reactive update on any local database mutation event
    const handleDataChange = () => {
      refreshAuditData();
    };

    window.addEventListener('blockshield:data-change', handleDataChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('blockshield:data-change', handleDataChange);
    };
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

    const isIdentity = upper.startsWith('USER-') || upper.startsWith('ADMIN-') || upper.startsWith('MANAGER-') || cleanQuery.includes(':') || upper.startsWith('DID:');

    try {
      const res = await getAuditLogsByResource(cleanQuery, { role: 'AUDITOR', assetOnly: !isIdentity });
      const data = res?.data || res || [];
      const resultLogs = isIdentity
        ? (Array.isArray(data) ? data : [])
        : (Array.isArray(data) ? data : []).filter(isAssetLog);
      setFilteredLogs(resultLogs);
      setActiveTab('filter-resource');
      setResourceSearch(cleanQuery);
      notify(`Found ${resultLogs.length} audit entries for ${cleanQuery}`, 'success');
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

  const filteredAuditsList = auditList
    .filter(item => isAssetLog(item))
    .filter(item => {
      if (deniedOnly && item.result !== 'DENIED') return false;
      if (!auditFilter.trim()) return true;
      const q = auditFilter.toLowerCase().trim();
      const payloadStr = item.payload ? JSON.stringify(item.payload).toLowerCase() : '';
      return (
        (item.action || '').toLowerCase().includes(q) ||
        (item.resourceId || '').toLowerCase().includes(q) ||
        (item.actorDID || '').toLowerCase().includes(q) ||
        (item.actorName || '').toLowerCase().includes(q) ||
        (item.actorRole || '').toLowerCase().includes(q) ||
        (item.details || '').toLowerCase().includes(q) ||
        (item.eventId || '').toLowerCase().includes(q) ||
        (item.txId || '').toLowerCase().includes(q) ||
        (item.policyRule || '').toLowerCase().includes(q) ||
        String(item.blockNumber || '').includes(q) ||
        payloadStr.includes(q)
      );
    });

  const totalAuditPages = Math.ceil(filteredAuditsList.length / auditPageSize) || 1;
  const safeAuditPage = Math.min(Math.max(1, auditCurrentPage), totalAuditPages);
  const startAuditIdx = (safeAuditPage - 1) * auditPageSize;
  const paginatedAudits = filteredAuditsList.slice(startAuditIdx, startAuditIdx + auditPageSize);

  const filteredAssetsList = nftsList.filter(item => {
    if (!assetSearch.trim()) return true;
    const q = assetSearch.toLowerCase().trim();
    return (
      (item.tokenId || '').toLowerCase().includes(q) ||
      (item.assetName || item.name || '').toLowerCase().includes(q) ||
      (item.assetType || '').toLowerCase().includes(q) ||
      (item.custodian || item.ownerDID || '').toLowerCase().includes(q) ||
      (item.department || '').toLowerCase().includes(q) ||
      (item.legalOwner || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q) ||
      (item.metadata || '').toLowerCase().includes(q)
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

        {/* 3 Metric Cards Row (Recorded events, Identities, Assets) - Visible ONLY in Overview */}
        {activeTab === 'overview' && (
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
                {auditList.length.toLocaleString()}
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
                {didsList.length}
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
                {nftsList.length}
              </div>
              <div className="metric-title-text">Assets</div>
              <div className="metric-sub-text">Current provenance available</div>
            </div>
          </div>
        )}

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
                      const isTransfer = actionUpper.includes('TRANSFER');
                      const isCreate = !isTransfer && (actionUpper.includes('DID') || actionUpper.includes('CREATE') || actionUpper.includes('REGISTER'));
                      const isAlloc = !isTransfer && (actionUpper.includes('ALLOC') || actionUpper.includes('ASSIGN'));

                      let circleClass = 'circle-blue';
                      let icon = (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      );

                      if (isTransfer) {
                        circleClass = 'circle-blue';
                        icon = (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 1 21 5 17 9"/>
                            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                            <polyline points="7 23 3 19 7 15"/>
                            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                          </svg>
                        );
                      } else if (isCreate) {
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

                      const defaultTitle = isTransfer
                        ? (actionUpper.includes('APPROVE') ? 'Transfer approved' : actionUpper.includes('REJECT') ? 'Transfer rejected' : 'Transfer requested')
                        : isCreate ? 'Identity created'
                        : isAlloc ? 'Asset allocated'
                        : (item.action || 'Ledger event').replace(/_/g, ' ');
                      const resourceTarget = item.resourceId || item.entityId || 'Ledger';
                      const actor = item.actorDID ? item.actorDID.replace(/^did:trust:/, '').replace(/^did:sih26125:/, '') : (item.actor || 'System');
                      const timeAgo = item.timestamp
                        ? (Number(item.timestamp) > 10000000000 
                            ? new Date(Number(item.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(Number(item.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                        : 'Recent';

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
                    <div className="p-3 text-center text-sm text-muted">
                      No audit trail entries recorded yet.
                    </div>
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

              <div className="table-responsive-fit">
                <table className="data-table audit-table-fit">
                  <colgroup>
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '13%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Resource ID</th>
                      <th>Result</th>
                      <th>Actor DID</th>
                      <th style={{ textAlign: 'center' }}>Audit Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditsList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No audit events match your filter criteria.</td>
                      </tr>
                    ) : (
                      paginatedAudits.map((log, index) => {
                        const isDenied = log.result === 'DENIED';
                        const formattedTime = log.timestamp && !isNaN(log.timestamp)
                          ? new Date(Number(log.timestamp) * 1000).toLocaleString()
                          : log.timestamp || 'N/A';

                        return (
                          <tr key={log.eventId || index} className={isDenied ? 'row-denied' : ''}>
                            <td className="text-xs">
                              <div>{formattedTime}</div>
                              {log.blockNumber && <span className="type-pill" style={{ fontSize: '0.65rem', marginTop: '2px', display: 'inline-block' }}>Block #{log.blockNumber}</span>}
                            </td>
                            <td className="audit-action-td">
                              <span className="type-pill audit-action-pill">
                                {(log.action || '').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td><code className="audit-cell-truncate" title={log.resourceId}>{log.resourceId}</code></td>
                            <td>
                              <span className={`status-pill ${isDenied ? 'status-revoked' : 'status-active'}`}>
                                {log.result}
                              </span>
                            </td>
                            <td><code className="audit-cell-truncate" title={log.actorDID}>{log.actorDID}</code></td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  fontSize: '0.74rem',
                                  borderColor: '#2563eb',
                                  color: '#2563eb',
                                  background: '#eff6ff',
                                  cursor: 'pointer',
                                  width: '100%',
                                  maxWidth: '110px'
                                }}
                                onClick={() => {
                                  setSelectedEvidenceLog(log);
                                  setIsEvidenceModalOpen(true);
                                }}
                                title="View audit details"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                <span>View Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Audit Pagination Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '10px',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748b' }}>Show</span>
                    <select
                      className="input input-xs"
                      style={{ width: 'auto', padding: '3px 8px', fontSize: '0.78rem', height: '28px', borderRadius: '4px' }}
                      value={auditPageSize}
                      onChange={(e) => {
                        setAuditPageSize(Number(e.target.value));
                        setAuditCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span style={{ color: '#64748b' }}>entries per page</span>
                    <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span>
                    <span style={{ color: '#475569', fontWeight: 600 }}>
                      {filteredAuditsList.length === 0
                        ? '0 entries'
                        : `Showing ${startAuditIdx + 1} to ${Math.min(startAuditIdx + auditPageSize, filteredAuditsList.length)} of ${filteredAuditsList.length} entries`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      disabled={safeAuditPage <= 1}
                      onClick={() => setAuditCurrentPage(p => Math.max(1, p - 1))}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        cursor: safeAuditPage <= 1 ? 'not-allowed' : 'pointer',
                        opacity: safeAuditPage <= 1 ? 0.5 : 1
                      }}
                    >
                      &larr; Prev
                    </button>
                    <span style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 600, padding: '0 6px' }}>
                      Page {safeAuditPage} of {totalAuditPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      disabled={safeAuditPage >= totalAuditPages}
                      onClick={() => setAuditCurrentPage(p => Math.min(totalAuditPages, p + 1))}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        cursor: safeAuditPage >= totalAuditPages ? 'not-allowed' : 'pointer',
                        opacity: safeAuditPage >= totalAuditPages ? 0.5 : 1
                      }}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 2: RESOURCE / TX AUDIT LOOKUP
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'filter-resource' && (
            <div className="glass-card">
              <h3 className="card-title mb-2">Identity &amp; Resource History Lookup</h3>
              <p className="text-sm text-muted mb-4">
                Select an identity (DID) or asset Token ID from the available fields to inspect its cryptographic history on the Fabric ledger.
              </p>

              <form onSubmit={handleFilterResource} className="form-layout mb-4 max-w-xl">
                <div className="form-group mb-3">
                  <label className="label">Select Available Field (Identity / Asset):</label>
                  <select
                    className="select"
                    value={resourceSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setResourceSearch(val);
                      if (val) {
                        handleFilterResource(null, val);
                      }
                    }}
                  >
                    <option value="">-- Choose an Available Identity or Asset --</option>
                    <optgroup label="Registered Identities (DIDs)">
                      {didsList.map((usr) => (
                        <option key={usr.did} value={usr.did}>
                          {usr.did} — {usr.name || usr.username || 'User'} ({usr.role || 'USER'} - {usr.department || 'General'})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Tracked Sovereign Assets">
                      {nftsList.map((asset) => (
                        <option key={asset.tokenId} value={asset.tokenId}>
                          {asset.tokenId} — {asset.assetName || asset.name} ({asset.assetType || 'HARDWARE'})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label className="label">Or Query Custom DID, Token ID or TxID:</label>
                  <div className="flex-gap">
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. did:sih26125:ADMIN001 or NFT-1004"
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                      Inspect History
                    </button>
                  </div>
                </div>
              </form>

              {filteredLogs.length > 0 && (
                <div className="table-responsive mt-3">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Event ID</th>
                        <th>Timestamp</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Action</th>
                        <th>Result</th>
                        <th>Actor DID</th>
                        <th style={{ textAlign: 'center', width: '130px' }}>Audit Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, idx) => (
                        <tr key={log.eventId || idx} className={log.result === 'DENIED' ? 'row-denied' : ''}>
                          <td><code>{log.eventId}</code></td>
                          <td className="text-xs" style={{ whiteSpace: 'nowrap' }}>{log.timestamp && !isNaN(log.timestamp) ? new Date(Number(log.timestamp) * 1000).toLocaleString() : log.timestamp}</td>
                          <td className="audit-action-td">
                            <span className="type-pill audit-action-pill">
                              {(log.action || '').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td><span className={`status-pill ${log.result === 'DENIED' ? 'status-revoked' : 'status-active'}`}>{log.result}</span></td>
                          <td><code>{log.actorDID}</code></td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '0.78rem',
                                borderColor: '#2563eb',
                                color: '#2563eb',
                                background: '#eff6ff',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => {
                                setSelectedEvidenceLog(log);
                                setIsEvidenceModalOpen(true);
                              }}
                              title="View audit details"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                              </svg>
                              <span>View Details</span>
                            </button>
                          </td>
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
                <div>
                  <h3 className="card-title">Asset History &amp; Custody Roster</h3>
                  <p className="text-xs text-muted">Inspect verified assets and their current custodians across all departments.</p>
                </div>
                <div className="flex-gap align-center">
                  <input
                    type="text"
                    className="input input-sm"
                    style={{ minWidth: 260 }}
                    placeholder="Search asset, token, custodian, dept..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                  />
                  <button className="btn btn-xs btn-secondary" onClick={refreshAuditData}>Refresh</button>
                </div>
              </div>

              {filteredAssetsList.length === 0 ? (
                <div className="empty-state-box py-5 text-center text-muted">
                  No assets match your search criteria.
                </div>
              ) : (
                <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
                  {filteredAssetsList.map((asset) => (
                    <div key={asset.tokenId} className="asset-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.35rem', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
                      <div>
                        <div className="asset-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <span className="type-pill">{asset.assetType || 'HARDWARE'}</span>
                          <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{asset.status}</span>
                        </div>
                        <h4 className="asset-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#0f172a' }}>{asset.assetName || asset.name}</h4>
                        <p className="asset-id" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>Token ID: <code>{asset.tokenId}</code></p>
                        {asset.assetId && <p className="asset-id" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>Asset ID: <code>{asset.assetId}</code></p>}
                        <div className="asset-meta text-xs my-2" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Custodian:</strong> <code style={{ fontSize: '0.72rem' }}>{asset.custodian || asset.ownerDID}</code></p>
                          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Department:</strong> <span>{asset.department || 'R&D'}</span></p>
                        </div>
                      </div>
                      <button
                        className="btn btn-xs btn-secondary w-full mt-3"
                        onClick={() => onViewProvenance(asset.tokenId)}
                      >
                        View Visual History Timeline
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 4: PROVENANCE
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'provenance' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Asset Provenance Timeline Inspector</h3>
                  <p className="text-xs text-muted">Search or select any token to inspect its immutable block-by-block custody lineage.</p>
                </div>
                <div className="flex-gap align-center">
                  <input
                    type="text"
                    className="input input-sm"
                    style={{ minWidth: 220 }}
                    placeholder="Filter asset list..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                  />
                  <form onSubmit={handleViewProvenanceDirect} className="flex-gap">
                    <input
                      type="text"
                      className="input input-sm"
                      placeholder="Inspect Token ID (e.g. NFT-1001)..."
                      value={provTokenId}
                      onChange={(e) => setProvTokenId(e.target.value)}
                    />
                    <button type="submit" className="btn btn-xs btn-primary">Inspect</button>
                  </form>
                </div>
              </div>

              {filteredAssetsList.length === 0 ? (
                <div className="empty-state-box py-5 text-center text-muted">
                  No assets match your search criteria.
                </div>
              ) : (
                <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
                  {filteredAssetsList.map((asset) => (
                    <div key={asset.tokenId} className="asset-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.35rem', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
                      <div>
                        <div className="asset-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <span className="type-pill">{asset.assetType || 'HARDWARE'}</span>
                          <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{asset.status}</span>
                        </div>
                        <h4 className="asset-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#0f172a' }}>{asset.assetName || asset.name}</h4>
                        <p className="asset-id" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>Token ID: <code>{asset.tokenId}</code></p>
                        <div className="asset-meta text-xs my-2" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Custodian:</strong> <code style={{ fontSize: '0.72rem' }}>{asset.custodian || asset.ownerDID || 'UNASSIGNED'}</code></p>
                        </div>
                      </div>
                      <button
                        className="btn btn-xs btn-secondary w-full mt-3"
                        onClick={() => onViewProvenance(asset.tokenId)}
                      >
                        Inspect Provenance &amp; Audit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Audit Log Details Modal */}
      {isEvidenceModalOpen && selectedEvidenceLog && (
        <ForensicEvidenceModal
          isOpen={isEvidenceModalOpen}
          onClose={() => {
            setIsEvidenceModalOpen(false);
            setSelectedEvidenceLog(null);
          }}
          log={selectedEvidenceLog}
        />
      )}
    </div>
  );
}
