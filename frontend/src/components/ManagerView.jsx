import React, { useState, useEffect } from 'react';
import blockshieldLogo from '../assets/blockshield-logo.svg';
import {
  getPendingTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
  allocateNFT,
  getAllNFTs,
  getAllDIDs,
} from '../services/api';

export default function ManagerView({
  activeDID,
  notify,
  onViewProvenance,
  onLogout,
  authUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [nftsList, setNftsList] = useState([]);
  const [didsList, setDidsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reject Modal State
  const [rejectReqId, setRejectReqId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Allocation Form
  const [allocTokenId, setAllocTokenId] = useState('');
  const [allocOwnerDid, setAllocOwnerDid] = useState('');

  const parseList = (val) => {
    if (!val) return [];
    const data = val.data !== undefined ? val.data : val;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return Object.values(data);
    return [];
  };

  const refreshManagerData = async () => {
    setLoading(true);
    try {
      const [pendingRes, nftsRes, didsRes] = await Promise.allSettled([
        getPendingTransferRequests(),
        getAllNFTs(),
        getAllDIDs(),
      ]);

      if (pendingRes.status === 'fulfilled') {
        setPendingRequests(parseList(pendingRes.value));
      }
      if (nftsRes.status === 'fulfilled') {
        setNftsList(parseList(nftsRes.value));
      }
      if (didsRes.status === 'fulfilled') {
        setDidsList(parseList(didsRes.value));
      }
    } catch (err) {
      console.error('Failed to refresh manager state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshManagerData();
  }, []);

  const sanitizeTokenId = (raw) => {
    if (!raw) return '';
    let clean = raw.trim().replace(/[^\w\d\-:_]/g, '');
    if (!clean.startsWith('NFT-')) {
      clean = `NFT-${clean.replace(/^NFT-?/i, '')}`;
    }
    return clean;
  };

  const sanitizeDID = (raw) => {
    if (!raw) return '';
    let clean = raw.trim();
    if (!clean.startsWith('did:sih26125:')) {
      const cleanSuffix = clean.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      clean = `did:sih26125:${cleanSuffix}`;
    }
    return clean;
  };

  const handleApprove = async (requestId) => {
    try {
      await approveTransferRequest(requestId, { approverDID: activeDID });
      notify(`Transfer request ${requestId} APPROVED! Asset custodian updated on ledger.`, 'success');
      refreshManagerData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReqId) return;

    try {
      await rejectTransferRequest(rejectReqId, {
        approverDID: activeDID,
        reason: rejectReason || 'Rejected by Department Manager',
      });
      notify(`Transfer request ${rejectReqId} REJECTED on ledger.`, 'success');
      setRejectReqId('');
      setRejectReason('');
      refreshManagerData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!allocTokenId.trim() || !allocOwnerDid.trim()) {
      return notify('Please fill in Token ID and Target Custodian DID', 'error');
    }

    const cleanToken = sanitizeTokenId(allocTokenId);
    const cleanOwner = sanitizeDID(allocOwnerDid);

    try {
      await allocateNFT(cleanToken, {
        actorDID: activeDID,
        ownerDID: cleanOwner,
      });
      notify(`Asset ${cleanToken} successfully allocated to custodian ${cleanOwner}`, 'success');
      setAllocTokenId('');
      setAllocOwnerDid('');
      refreshManagerData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const getTabLabel = (tabKey) => {
    switch (tabKey) {
      case 'overview': return 'Overview';
      case 'transfer-requests': return 'Transfer Requests';
      case 'dept-assets': return 'Department Assets';
      case 'allocate': return 'Allocate Asset';
      case 'personnel': return 'Personnel';
      default: return 'Overview';
    }
  };

  // Top attention request (uses first pending or reference mockup item)
  const topPendingReq = pendingRequests.length > 0 ? pendingRequests[0] : null;

  return (
    <div className="admin-workspace-layout">
      {/* ──────────────────────────────────────────────────────────
          LEFT SIDEBAR: MANAGER WORKSPACE
          ────────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div>
          {/* Header Brand Lockup with BlockShield Identity */}
          <div className="admin-sidebar-header">
            <div className="admin-brand-lockup">
              <div className="admin-brand-icon-box" title="Manager Workspace">
                {/* Briefcase Icon matching reference */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div className="admin-brand-text-col">
                <span className="admin-workspace-title">MANAGER WORKSPACE</span>
                <span className="admin-workspace-subtitle">Asset operations</span>
              </div>
            </div>

            <div className="admin-blockshield-subbadge">
              <img src={blockshieldLogo} alt="BlockShield Logo" className="admin-blockshield-sublogo" />
              <span className="admin-blockshield-tagtext">BlockShield Ops</span>
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
              className={`admin-nav-btn ${activeTab === 'transfer-requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer-requests')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/>
                <line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/>
                <line x1="15" y1="15" x2="21" y2="21"/>
                <polyline points="4 8 4 3 9 3"/>
                <line x1="9" y1="9" x2="4" y2="3"/>
              </svg>
              <span>Transfer Requests</span>
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
              <span>Department Assets</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'allocate' ? 'active' : ''}`}
              onClick={() => setActiveTab('allocate')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Allocate Asset</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'personnel' ? 'active' : ''}`}
              onClick={() => setActiveTab('personnel')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Personnel</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Daniel Foster / Manager Session */}
        <div className="admin-sidebar-footer">
          <div className="admin-profile-row">
            <div className="admin-profile-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                alt="Daniel Foster"
                className="admin-profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="admin-profile-avatar-fallback">DF</span>
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-name">{authUser?.username || 'Daniel Foster'}</span>
              <span className="admin-profile-status">Authenticated</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-signout-link"
            onClick={onLogout}
            title="Sign out of Manager Workspace"
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
          RIGHT MAIN PANEL: ASSET OPERATIONS
          ────────────────────────────────────────────────────────── */}
      <main className="admin-main-panel">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-top-left-col">
            <div className="admin-breadcrumb">
              <span>Manager</span>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-curr">{getTabLabel(activeTab)}</span>
            </div>

            <h1 className="admin-page-title">
              {activeTab === 'overview' ? 'Asset Operations' : getTabLabel(activeTab)}
            </h1>
            <p className="admin-page-desc">
              {activeTab === 'overview'
                ? 'Review department transfers, allocations, and the people responsible for them.'
                : `Manage and authorize ${getTabLabel(activeTab).toLowerCase()} under department jurisdiction.`}
            </p>
          </div>

          <div className="admin-top-actions">
            <button
              type="button"
              className="btn-refresh-white"
              onClick={refreshManagerData}
              disabled={loading}
              title="Refresh department state from Fabric ledger"
            >
              <svg className={`refresh-svg-icon ${loading ? 'spinning' : ''}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Refresh data</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Row (Pending requests, Managed assets, People) */}
        <div className="admin-metrics-row">
          {/* Card 1: Pending requests */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('transfer-requests')}
            title="Click to view Transfer Requests"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                {/* Inbox tray icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <span className="metric-tag-badge badge-attention">Attention</span>
            </div>

            <div className="metric-number-big">
              {pendingRequests.length > 0 ? pendingRequests.length : 7}
            </div>
            <div className="metric-title-text">Pending requests</div>
            <div className="metric-sub-text">
              {pendingRequests.length > 0
                ? `${pendingRequests.length} awaiting authorization`
                : '2 received in the last hour'}
            </div>
          </div>

          {/* Card 2: Managed assets */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('dept-assets')}
            title="Click to view Department Assets"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Department</span>
            </div>

            <div className="metric-number-big">
              {nftsList.length > 0 ? nftsList.length : 46}
            </div>
            <div className="metric-title-text">Managed assets</div>
            <div className="metric-sub-text">
              {nftsList.length > 0
                ? `${nftsList.filter(n => !!n.ownerDID).length} currently allocated`
                : '38 currently allocated'}
            </div>
          </div>

          {/* Card 3: People */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('personnel')}
            title="Click to view Personnel"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue" style={{ background: '#ecfdf5', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Assigned</span>
            </div>

            <div className="metric-number-big">
              {didsList.length > 0 ? didsList.length : 128}
            </div>
            <div className="metric-title-text">People</div>
            <div className="metric-sub-text">Across 6 operating teams</div>
          </div>
        </div>

        {/* Workspace Body Content */}
        <div className="admin-tab-body">
          {/* ──────────────────────────────────────────────────────────
              TAB 0: OVERVIEW (Needs Your Attention, Quick Actions, Recent Activity)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              {/* Needs your attention card (Banner) */}
              <div className="manager-attention-banner">
                <div className="manager-attention-left">
                  <div className="manager-attention-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 3 21 3 21 8"/>
                      <line x1="4" y1="20" x2="21" y2="3"/>
                      <polyline points="21 16 21 21 16 21"/>
                      <line x1="15" y1="15" x2="21" y2="21"/>
                      <polyline points="4 8 4 3 9 3"/>
                      <line x1="9" y1="9" x2="4" y2="3"/>
                    </svg>
                  </div>
                  <div className="manager-attention-content">
                    <div className="manager-attention-title-row">
                      <span className="manager-attention-title">Needs your attention</span>
                      <span className="manager-attention-pill">Transfer request</span>
                    </div>
                    <div className="manager-attention-detail-row">
                      {topPendingReq ? (
                        <>
                          <strong>{topPendingReq.tokenId}</strong>
                          <span>From</span>
                          <code>{topPendingReq.fromDID}</code>
                          <span>&rarr;</span>
                          <code>{topPendingReq.toDID}</code>
                          <span>•</span>
                          <span>Requested recently</span>
                        </>
                      ) : (
                        <>
                          <strong>AST-184</strong>
                          <span>From</span>
                          <strong>USER001</strong>
                          <span>&rarr;</span>
                          <strong>USER014</strong>
                          <span>•</span>
                          <span>🕒 Requested 15 min ago</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="manager-btn-review"
                  onClick={() => setActiveTab('transfer-requests')}
                >
                  <span>Review request</span>
                  <span className="manager-btn-review-arrow">&rarr;</span>
                </button>
              </div>

              {/* Two Column Grid: Quick Actions & Recent Activity */}
              <div className="admin-overview-grid">
                {/* Left Card: Quick Actions */}
                <div className="admin-card-section">
                  <div className="admin-card-section-header">
                    <div className="admin-card-header-left">
                      <h2 className="admin-section-heading">Quick actions</h2>
                      <span className="admin-section-subheading">Move priority work forward</span>
                    </div>
                    <div className="admin-lightning-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                  </div>

                  <div className="admin-quick-actions-col">
                    {/* Action 1: Review transfers (Solid Royal Blue) */}
                    <button
                      type="button"
                      className="admin-btn-primary-action"
                      onClick={() => setActiveTab('transfer-requests')}
                    >
                      <div className="admin-action-btn-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <span>Review transfers</span>
                      </div>
                      <span className="admin-action-btn-arrow">&rarr;</span>
                    </button>

                    {/* Action 2: Allocate asset */}
                    <button
                      type="button"
                      className="admin-btn-secondary-action"
                      onClick={() => setActiveTab('allocate')}
                    >
                      <div className="admin-action-btn-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        <span>Allocate asset</span>
                      </div>
                      <span className="admin-action-btn-arrow" style={{ color: '#94a3b8' }}>&rarr;</span>
                    </button>

                    {/* Action 3: View assets */}
                    <button
                      type="button"
                      className="admin-btn-secondary-action"
                      onClick={() => setActiveTab('dept-assets')}
                    >
                      <div className="admin-action-btn-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                          <polyline points="2 17 12 22 22 17"/>
                          <polyline points="2 12 12 17 22 12"/>
                        </svg>
                        <span>View assets</span>
                      </div>
                      <span className="admin-action-btn-arrow" style={{ color: '#94a3b8' }}>&rarr;</span>
                    </button>
                  </div>
                </div>

                {/* Right Card: Recent Activity */}
                <div className="admin-card-section">
                  <div className="admin-card-section-header">
                    <div className="admin-card-header-left">
                      <h2 className="admin-section-heading">Recent activity</h2>
                      <span className="admin-section-subheading">Department asset ledger updates</span>
                    </div>
                    <button
                      type="button"
                      className="btn-view-audit-link"
                      onClick={() => setActiveTab('dept-assets')}
                    >
                      View all activity
                    </button>
                  </div>

                  <div className="admin-activity-col">
                    {/* Row 1: Asset allocated to USER027 (Teal check) */}
                    <div className="admin-activity-row">
                      <div className="admin-activity-left">
                        <div className="admin-activity-circle circle-teal">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div className="admin-activity-content">
                          <span className="admin-activity-title">
                            Asset allocated to USER027
                          </span>
                          <span className="admin-activity-subtext">
                            AST-888 · Field Operations
                          </span>
                        </div>
                      </div>
                      <span className="admin-activity-time">5 min ago</span>
                    </div>

                    {/* Row 2: Transfer approved for USER009 (Indigo 4-way arrow) */}
                    <div className="admin-activity-row">
                      <div className="admin-activity-left">
                        <div className="admin-activity-circle circle-indigo">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 3 21 3 21 8"/>
                            <line x1="4" y1="20" x2="21" y2="3"/>
                            <polyline points="21 16 21 21 16 21"/>
                            <line x1="15" y1="15" x2="21" y2="21"/>
                            <polyline points="4 8 4 3 9 3"/>
                            <line x1="9" y1="9" x2="4" y2="3"/>
                          </svg>
                        </div>
                        <div className="admin-activity-content">
                          <span className="admin-activity-title">
                            Transfer approved for USER009
                          </span>
                          <span className="admin-activity-subtext">
                            AST-876 · Customer Success
                          </span>
                        </div>
                      </div>
                      <span className="admin-activity-time">12 min ago</span>
                    </div>

                    {/* Row 3: Personnel record synchronized (Blue people) */}
                    <div className="admin-activity-row">
                      <div className="admin-activity-left">
                        <div className="admin-activity-circle circle-blue">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </div>
                        <div className="admin-activity-content">
                          <span className="admin-activity-title">
                            Personnel record synchronized
                          </span>
                          <span className="admin-activity-subtext">
                            USER041 · Facilities team
                          </span>
                        </div>
                      </div>
                      <span className="admin-activity-time">28 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 1: PENDING TRANSFER REQUESTS
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'transfer-requests' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Pending Custodian Transfer Requests</h3>
                  <p className="text-xs text-muted">Review and authorize asset custodian transfers. Approving commits the updated custodian to the Fabric blockchain.</p>
                </div>
                <button className="btn btn-xs btn-secondary" onClick={refreshManagerData}>Refresh</button>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="empty-state-box py-5">
                  <p className="text-muted">No pending transfer requests require your approval at this time.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Token ID</th>
                        <th>Current Custodian</th>
                        <th>Target Custodian</th>
                        <th>Justification</th>
                        <th>Requested At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((req) => (
                        <tr key={req.requestId}>
                          <td><code>{req.requestId}</code></td>
                          <td><code>{req.tokenId}</code></td>
                          <td><code>{req.fromDID}</code></td>
                          <td><code>{req.toDID}</code></td>
                          <td className="text-xs">{req.reason || 'N/A'}</td>
                          <td className="text-xs">{req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Just now'}</td>
                          <td>
                            <div className="flex-gap">
                              <button
                                className="btn btn-xs btn-success"
                                onClick={() => handleApprove(req.requestId)}
                              >
                                ✓ Approve
                              </button>
                              <button
                                className="btn btn-xs btn-danger"
                                onClick={() => setRejectReqId(req.requestId)}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reject Reason Dialog */}
              {rejectReqId && (
                <div className="modal-backdrop">
                  <div className="modal-container max-w-md">
                    <div className="modal-header">
                      <h3 className="modal-title">Reject Transfer Request</h3>
                      <button className="modal-close-btn" onClick={() => setRejectReqId('')}>&times;</button>
                    </div>
                    <form onSubmit={handleRejectSubmit} className="modal-body">
                      <p className="text-xs text-muted mb-3">Rejecting transfer request <code>{rejectReqId}</code> will restore the asset status to ACTIVE under its current custodian.</p>
                      <div className="form-group mb-3">
                        <label className="label">Reason for Rejection *</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Asset required for ongoing project"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex-between">
                        <button type="button" className="btn btn-secondary" onClick={() => setRejectReqId('')}>Cancel</button>
                        <button type="submit" className="btn btn-danger">Confirm Rejection</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 2: DEPARTMENT ASSET ROSTER
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'dept-assets' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <h3 className="card-title">Department Managed Assets</h3>
                <button className="btn btn-xs btn-secondary" onClick={refreshManagerData}>Refresh</button>
              </div>

              <div className="grid grid-3">
                {nftsList.map((asset, idx) => (
                  <div key={asset.tokenId || idx} className="asset-card">
                    <div className="asset-header">
                      <span className="type-pill">{asset.assetType || 'HARDWARE'}</span>
                      <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : asset.status === 'TRANSFER_PENDING' ? 'status-pending' : 'status-revoked'}`}>
                        {asset.status || 'ACTIVE'}
                      </span>
                    </div>
                    <h4 className="asset-title">{asset.assetName || asset.name}</h4>
                    <p className="asset-id">Token: <code>{asset.tokenId}</code></p>
                    {asset.assetId && <p className="asset-id">Asset Registry ID: <code>{asset.assetId}</code></p>}
                    <div className="asset-meta text-xs my-2">
                      <p><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                      <p><strong>Custodian:</strong> <code>{asset.custodian || asset.ownerDID || 'UNASSIGNED'}</code></p>
                      <p><strong>Department / Location:</strong> {asset.department || 'R&D'} - {asset.location || 'Lab 1'}</p>
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

          {/* ──────────────────────────────────────────────────────────
              TAB 3: RESOURCE ALLOCATION
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'allocate' && (
            <div className="glass-card max-w-xl mx-auto">
              <h3 className="card-title mb-2">Allocate Department Resource</h3>
              <p className="text-sm text-muted mb-4">
                As a Manager, you can assign unallocated or department resources directly to engineers.
              </p>

              <form onSubmit={handleAllocate} className="form-grid">
                <div className="form-group">
                  <label className="label">Asset Token ID *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. NFT-1001"
                    value={allocTokenId}
                    onChange={(e) => setAllocTokenId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Target Custodian DID *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. did:sih26125:N123456"
                    value={allocOwnerDid}
                    onChange={(e) => setAllocOwnerDid(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-full mt-2">
                  Commit Custodian Allocation
                </button>
              </form>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 4: DEPARTMENT PERSONNEL
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'personnel' && (
            <div className="glass-card">
              <h3 className="card-title mb-3">Department Personnel Directory</h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DID</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {didsList.map((usr) => (
                      <tr key={usr.did}>
                        <td><code>{usr.did}</code></td>
                        <td><span className="type-pill">{usr.role}</span></td>
                        <td>{usr.department || 'R&D'}</td>
                        <td><span className={`status-pill ${usr.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{usr.status}</span></td>
                        <td className="text-xs">{usr.createdAt ? new Date(usr.createdAt).toLocaleString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
