import React, { useState, useEffect } from 'react';
import blockshieldLogo from '../../../assets/blockshield-logo.svg';
import {
  getAssetsByOwner,
  createTransferRequest,
  getTransferRequestsByDID,
  verifyNFT,
  getAllNFTs,
  getAllDIDs,
} from '../../../services/api';
import { parseList } from '../../../utils';

export default function UserView({
  activeDID = 'did:sih26125:USER001',
  notify,
  onViewProvenance,
  onLogout,
  authUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [myAssets, setMyAssets] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [allNfts, setAllNfts] = useState([]);
  const [allDids, setAllDids] = useState([]);
  const [loading, setLoading] = useState(false);

  // Transfer Request Form
  const [transTokenId, setTransTokenId] = useState('');
  const [transRecipientDid, setTransRecipientDid] = useState('');
  const [transReason, setTransReason] = useState('');

  // Verify Form
  const [verifyTokenId, setVerifyTokenId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const currentDID = activeDID || 'did:sih26125:USER001';

  const refreshUserData = async () => {
    setLoading(true);
    try {
      const [myRes, requestsRes, allNftsRes, didsRes] = await Promise.allSettled([
        getAssetsByOwner(currentDID),
        getTransferRequestsByDID(currentDID),
        getAllNFTs(),
        getAllDIDs(),
      ]);

      if (myRes.status === 'fulfilled') {
        setMyAssets(parseList(myRes.value));
      }
      if (requestsRes.status === 'fulfilled') {
        setMyRequests(parseList(requestsRes.value));
      }
      if (allNftsRes.status === 'fulfilled') {
        setAllNfts(parseList(allNftsRes.value));
      }
      if (didsRes.status === 'fulfilled') {
        setAllDids(parseList(didsRes.value));
      }
    } catch (err) {
      console.error('Failed to load user state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [currentDID]);

  const sanitizeTokenId = (raw) => {
    if (!raw) return '';
    let clean = raw.trim().replace(/[^\w\d\-:_]/g, '');
    const upper = clean.toUpperCase();
    if (!upper.startsWith('NFT-') && !upper.startsWith('AST-')) {
      clean = `NFT-${clean.replace(/^NFT-?/i, '')}`;
    }
    return clean;
  };

  const sanitizeDID = (raw) => {
    if (!raw) return '';
    let clean = raw.trim();
    if (!clean.startsWith('did:sih26125:') && !clean.startsWith('did:')) {
      const cleanSuffix = clean.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      clean = `did:sih26125:${cleanSuffix}`;
    }
    return clean;
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!transTokenId.trim() || !transRecipientDid.trim()) {
      return notify('Please select/enter Token ID and Target Custodian DID', 'error');
    }

    const cleanToken = sanitizeTokenId(transTokenId);
    const cleanRecipient = sanitizeDID(transRecipientDid);

    try {
      await createTransferRequest({
        requestedByDID: currentDID,
        tokenId: cleanToken,
        toDID: cleanRecipient,
        reason: transReason || 'Custodial transfer request for project deployment'
      });
      notify(`Submitted custodian transfer request for asset ${cleanToken} to Manager approval`, 'success');
      setTransTokenId('');
      setTransRecipientDid('');
      setTransReason('');
      refreshUserData();
      setActiveTab('transfer-requests');
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyTokenId.trim()) return notify('Enter Token ID to verify', 'error');

    const cleanToken = sanitizeTokenId(verifyTokenId);

    try {
      const res = await verifyNFT(cleanToken);
      const result = res?.data || res;
      setVerifyResult(result);
      if (result.valid) {
        notify(`Asset ${cleanToken} is authentic and active on Fabric ledger`, 'success');
      } else {
        notify(`Asset verification alert: ${result.reason || 'Invalid asset state'}`, 'error');
      }
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const pendingRequestsCount = myRequests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="admin-workspace-layout">
      {/* ──────────────────────────────────────────────────────────
          LEFT SIDEBAR: MY WORKSPACE
          ────────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div>
          {/* Header Brand Lockup with BlockShield Identity */}
          <div className="admin-sidebar-header">
            <div className="admin-brand-lockup">
              <div className="admin-brand-icon-box" title="My Workspace">
                {/* Shield Check Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <div className="admin-brand-text-col">
                <span className="admin-workspace-title">MY WORKSPACE</span>
                <span className="admin-workspace-subtitle">Personal account</span>
              </div>
            </div>

            <div className="admin-blockshield-subbadge">
              <img src={blockshieldLogo} alt="BlockShield Logo" className="admin-blockshield-sublogo" />
              <span className="admin-blockshield-tagtext">BlockShield ID</span>
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
              className={`admin-nav-btn ${activeTab === 'my-identity' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-identity')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <span>My Identity</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'my-assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-assets')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>My Assets</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'transfer-requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer-requests')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <span>Transfer Requests</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span>Activity</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Jordan Lee / User Session */}
        <div className="admin-sidebar-footer">
          <div className="admin-profile-row">
            <div className="admin-profile-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces"
                alt="Jordan Lee"
                className="admin-profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="admin-profile-avatar-fallback">JL</span>
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-name">{authUser?.username || 'Jordan Lee'}</span>
              <span className="admin-profile-status">Authenticated</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-signout-link"
            onClick={onLogout}
            title="Sign out of My Workspace"
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
          RIGHT MAIN PANEL: IDENTITY & DIGITAL ASSETS
          ────────────────────────────────────────────────────────── */}
      <main className="admin-main-panel">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-top-left-col">
            <span className="user-top-overline">WELCOME BACK, USER</span>
            <h1 className="admin-page-title">Your identity &amp; digital assets</h1>
            <p className="admin-page-desc">
              A secure overview of your verified credentials, assets, and requests.
            </p>
          </div>

          <div className="admin-top-actions">
            <div className="user-account-badge" title="Identity verified on Hyperledger Fabric">
              <span className="user-account-dot"></span>
              <span>Account active</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards Row (Identity, Assets, Pending request) */}
        <div className="admin-metrics-row">
          {/* Card 1: Identity */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('my-identity')}
            title="Click to view Identity"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Verified</span>
            </div>

            <div className="metric-number-big">1</div>
            <div className="metric-title-text">Identity</div>
            <div className="metric-sub-text">Active verified DID</div>
          </div>

          {/* Card 2: Assets */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('my-assets')}
            title="Click to view Assets"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Owned</span>
            </div>

            <div className="metric-number-big">
              {myAssets.length}
            </div>
            <div className="metric-title-text">Assets</div>
            <div className="metric-sub-text">Assigned to your identity</div>
          </div>

          {/* Card 3: Pending request */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('transfer-requests')}
            title="Click to view Transfer Requests"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue" style={{ background: '#ecfdf5', color: '#0d9488' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Action needed</span>
            </div>

            <div className="metric-number-big">
              {myRequests.filter(r => r.status === 'PENDING').length}
            </div>
            <div className="metric-title-text">Pending request</div>
            <div className="metric-sub-text">Awaiting your response</div>
          </div>
        </div>

        {/* Workspace Body Content */}
        <div className="admin-tab-body">
          {/* ──────────────────────────────────────────────────────────
              TAB 0: OVERVIEW (Hero Identity Card + My Assets + Recent Activity)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              {/* Hero Section: My Digital Identity Card */}
              <div className="user-identity-hero-card">
                <div className="user-identity-hero-top">
                  <div className="user-identity-hero-left">
                    <div className="metric-icon-square square-blue" style={{ background: '#ecfdf5', color: '#059669', width: 42, height: 42, borderRadius: 10 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <polyline points="9 12 11 14 15 10"/>
                      </svg>
                    </div>
                    <div>
                      <div className="user-identity-title-row">
                        <h2 className="user-identity-title">My Digital Identity</h2>
                        <span className="user-identity-badge-verified">Verified</span>
                      </div>
                      <p className="user-identity-desc">
                        Your decentralized identifier is active and ready to use.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-user-view-identity"
                    onClick={() => setActiveTab('my-identity')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>View identity</span>
                    <span>&rarr;</span>
                  </button>
                </div>

                {/* Inner Box with DID */}
                <div className="user-did-container-box">
                  <span className="user-did-label">DID</span>
                  <div className="user-did-value">
                    {currentDID || 'did:sih26125:USER001'}
                  </div>
                </div>

                {/* Bottom Metadata: Role & Status */}
                <div className="user-identity-meta-row">
                  <div className="user-meta-item">
                    <span className="user-meta-label">Role</span>
                    <span className="user-meta-value">User</span>
                  </div>
                  <div className="user-meta-item">
                    <span className="user-meta-label">Status</span>
                    <span className="user-meta-value">
                      <span className="user-account-dot"></span>
                      <span>Active</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Lower 2-Column Grid: My Assets & Recent Activity */}
              <div className="user-overview-grid">
                {/* Left Column: My Assets */}
                <div className="admin-card-section">
                  <div className="admin-card-section-header">
                    <div className="admin-card-header-left">
                      <h2 className="admin-section-heading">My Assets</h2>
                      <span className="admin-section-subheading">Digital assets currently assigned to you.</span>
                    </div>
                    <button
                      type="button"
                      className="btn-view-audit-link"
                      onClick={() => setActiveTab('my-assets')}
                    >
                      View all assets
                    </button>
                  </div>

                  {myAssets && myAssets.length > 0 ? (
                    myAssets.slice(0, 2).map((asset, idx) => (
                      <div key={asset.tokenId || idx} className="user-asset-item-box">
                        <div className="user-asset-item-left">
                          <div className="user-asset-card-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="20" height="14" rx="2"/>
                              <line x1="2" y1="10" x2="22" y2="10"/>
                            </svg>
                          </div>
                          <div className="user-asset-info">
                            <div className="user-asset-top-row">
                              <span className="user-asset-code">{asset.tokenId}</span>
                              <span className="user-asset-badge-active">{asset.status || 'Active'}</span>
                            </div>
                            <span className="user-asset-name">{asset.assetName || asset.name || asset.tokenType || 'Tokenized Asset'}</span>
                            <span className="user-asset-subtext">
                              Allocated to {currentDID.split(':').pop()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-user-view-asset"
                          onClick={() => onViewProvenance(asset.tokenId)}
                        >
                          <span>View asset</span>
                          <span>&rarr;</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 8px', opacity: 0.5 }}>
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                      <div style={{ fontWeight: 600, color: '#334155' }}>No Assets Currently Allocated</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Assets allocated to your DID ({currentDID}) will appear here in real time.</div>
                    </div>
                  )}
                </div>

                {/* Right Column: Recent Activity */}
                <div className="admin-card-section">
                  <div className="admin-card-section-header">
                    <div className="admin-card-header-left">
                      <h2 className="admin-section-heading">Recent Activity</h2>
                      <span className="admin-section-subheading">Your latest record updates.</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>

                  <div className="admin-activity-col">
                    {myRequests.length > 0 || myAssets.length > 0 ? (
                      <>
                        {myRequests.slice(0, 4).map((req, idx) => (
                          <div className="admin-activity-row" key={req.requestId || idx}>
                            <div className="admin-activity-left">
                              <div className={`admin-activity-circle ${req.status === 'APPROVED' ? 'circle-teal' : req.status === 'REJECTED' ? 'circle-red' : 'circle-blue'}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="22" y1="2" x2="11" y2="13"/>
                                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                              </div>
                              <div className="admin-activity-content">
                                <span className="admin-activity-title">
                                  {req.status === 'APPROVED' ? 'Transfer approved' : req.status === 'REJECTED' ? 'Transfer rejected' : 'Transfer requested'}
                                </span>
                                <span className="auditor-activity-id">{req.tokenId} &rarr; {(req.targetCustodian || req.toCustodian || '').split(':').pop() || 'Transfer'}</span>
                                <span className="admin-activity-subtext">{req.status} &bull; {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Just now'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {myAssets.slice(0, 3).map((ast, idx) => (
                          <div className="admin-activity-row" key={ast.tokenId || idx}>
                            <div className="admin-activity-left">
                              <div className="admin-activity-circle circle-teal">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </div>
                              <div className="admin-activity-content">
                                <span className="admin-activity-title">Active Custody</span>
                                <span className="auditor-activity-id">{ast.tokenId}</span>
                                <span className="admin-activity-subtext">{ast.name || ast.tokenType || 'Allocated Asset'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        <span style={{ fontSize: '0.85rem' }}>No recent activity records found for this account.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 1: MY IDENTITY (Detailed DID Registry Inspector)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'my-identity' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Decentralized Identifier (DID) Registry Document</h3>
                  <p className="text-xs text-muted">W3C Compliant Cryptographic Identity anchored on Hyperledger Fabric.</p>
                </div>
                <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
              </div>

              <div className="form-grid max-w-xl">
                <div className="form-group">
                  <label className="label">Your DID Identifier</label>
                  <input type="text" className="input" value={currentDID} readOnly />
                </div>
                <div className="form-group">
                  <label className="label">Assigned Role</label>
                  <input type="text" className="input" value="User (Authenticated Holder)" readOnly />
                </div>
                <div className="form-group">
                  <label className="label">Trust Anchoring</label>
                  <input type="text" className="input" value="Channel: mychannel · Chaincode: identity" readOnly />
                </div>
                <div className="form-group">
                  <label className="label">Verification Status</label>
                  <div className="badge badge-success mt-1" style={{ display: 'inline-flex', padding: '0.4rem 0.8rem' }}>
                    ✓ Active &amp; Verified on Fabric Ledger
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 2: MY ASSETS (All Assigned Custodial Assets)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'my-assets' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Assets Assigned to Your Custody</h3>
                  <p className="text-xs text-muted">All hardware, tokens, and resources allocated to your DID.</p>
                </div>
                <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
              </div>

              {myAssets.length === 0 ? (
                <div className="empty-state-box py-5">
                  <p className="text-muted">No digital or physical assets currently assigned to DID <code>{currentDID}</code>.</p>
                </div>
              ) : (
                <div className="grid grid-3">
                  {myAssets.map((asset, index) => {
                    const isPending = asset.status === 'TRANSFER_PENDING';
                    return (
                      <div key={asset.tokenId || index} className="asset-card">
                        <div className="asset-header">
                          <span className="type-pill">{asset.assetType || 'EQUIPMENT'}</span>
                          <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : isPending ? 'status-pending' : 'status-revoked'}`}>
                            {asset.status || 'ACTIVE'}
                          </span>
                        </div>
                        <h4 className="asset-title">{asset.assetName || asset.name}</h4>
                        <p className="asset-id">Token: <code>{asset.tokenId}</code></p>
                        {asset.assetId && <p className="asset-id">Asset Registry ID: <code>{asset.assetId}</code></p>}
                        <div className="asset-meta text-xs my-2">
                          <p><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                          <p><strong>Custodian:</strong> <code>{asset.custodian || asset.ownerDID}</code></p>
                          <p><strong>Department:</strong> {asset.department || 'R&D'}</p>
                        </div>
                        <div className="flex-between mt-3">
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => onViewProvenance(asset.tokenId)}
                          >
                            View Provenance
                          </button>
                          <button
                            className="btn btn-xs btn-outline"
                            disabled={isPending}
                            onClick={() => {
                              setTransTokenId(asset.tokenId);
                              setActiveTab('transfer-requests');
                            }}
                          >
                            {isPending ? 'Transfer Pending' : 'Request Transfer'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 3: TRANSFER REQUESTS (Initiate & Status Roster)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'transfer-requests' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Custodian Transfer Request Workflow</h3>
                  <p className="text-xs text-muted">
                    Request transfer of custodial ownership to another verified DID. Requires Manager approval.
                  </p>
                </div>
                <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
              </div>

              {/* Form Section */}
              <div className="max-w-xl mb-4">
                <form onSubmit={handleCreateRequest} className="form-grid">
                  <div className="form-group">
                    <label className="label">Select/Enter Asset Token ID *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. NFT-1001 or AST-104"
                      value={transTokenId}
                      onChange={(e) => setTransTokenId(e.target.value)}
                      required
                    />
                    {myAssets.length > 0 && (
                      <div className="mt-1 flex-gap flex-wrap">
                        <span className="text-xs text-muted">Quick select:</span>
                        {myAssets.map(a => (
                          <button
                            key={a.tokenId}
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => setTransTokenId(a.tokenId)}
                          >
                            {a.tokenId} ({a.assetName})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="label">Target Custodian DID *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. did:sih26125:ENG002"
                      value={transRecipientDid}
                      onChange={(e) => setTransRecipientDid(e.target.value)}
                      required
                    />
                    {allDids.length > 0 && (
                      <div className="mt-1 flex-gap flex-wrap">
                        <span className="text-xs text-muted">Registered DIDs:</span>
                        {allDids.filter(d => d.did !== currentDID).map(d => (
                          <button
                            key={d.did}
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => setTransRecipientDid(d.did)}
                          >
                            {d.did.split(':').pop()} ({d.role})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="label">Transfer Justification *</label>
                    <textarea
                      className="input input-textarea"
                      rows={2}
                      placeholder="Explain reason for custody transfer..."
                      value={transReason}
                      onChange={(e) => setTransReason(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full">
                    Submit Transfer Request for Manager Approval
                  </button>
                </form>
              </div>

              {/* Status Roster */}
              <div className="table-responsive mt-3">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Token ID</th>
                      <th>From Custodian</th>
                      <th>To Custodian</th>
                      <th>Justification</th>
                      <th>Status</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">No transfer requests submitted yet.</td>
                      </tr>
                    ) : (
                      myRequests.map((req, idx) => (
                        <tr key={req.requestId || idx}>
                          <td><code>{req.requestId}</code></td>
                          <td><code>{req.tokenId}</code></td>
                          <td><code>{req.fromDID}</code></td>
                          <td><code>{req.toDID}</code></td>
                          <td className="text-xs">{req.reason || 'N/A'}</td>
                          <td>
                            <span className={`status-pill ${req.status === 'APPROVED' ? 'status-active' : req.status === 'PENDING' ? 'status-pending' : 'status-revoked'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>{req.approvedBy ? <code>{req.approvedBy}</code> : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 4: ACTIVITY (Full Record Audit Stream)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'activity' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Personal Ledger Activity Stream</h3>
                  <p className="text-xs text-muted">Verifiable ledger interactions associated with your identity.</p>
                </div>
                <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
              </div>

              <div className="admin-activity-col">
                {myRequests.map((req) => (
                  <div className="admin-activity-row" key={req.requestId || req.id}>
                    <div className="admin-activity-left">
                      <div className={`admin-activity-circle ${req.status === 'APPROVED' ? 'circle-teal' : req.status === 'REJECTED' ? 'circle-red' : 'circle-blue'}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </div>
                      <div className="admin-activity-content">
                        <span className="admin-activity-title">Transfer Request &bull; {req.status}</span>
                        <span className="auditor-activity-id">{req.tokenId} &rarr; {(req.targetCustodian || req.toCustodian || '').split(':').pop() || 'Target'}</span>
                        <span className="admin-activity-subtext">{req.reason || 'Custodian delegation'} &bull; {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Active'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-inspect-link"
                      onClick={() => setActiveTab('transfer-requests')}
                    >
                      View Status
                    </button>
                  </div>
                ))}

                {myAssets.map((asset) => (
                  <div className="admin-activity-row" key={asset.tokenId}>
                    <div className="admin-activity-left">
                      <div className="admin-activity-circle circle-teal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div className="admin-activity-content">
                        <span className="admin-activity-title">Asset allocated to custody</span>
                        <span className="auditor-activity-id">{asset.tokenId} ({asset.name || asset.tokenType || 'Secure Asset'})</span>
                        <span className="admin-activity-subtext">Status: {asset.status || 'ACTIVE'} &bull; Channel: mychannel</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-inspect-link"
                      onClick={() => onViewProvenance(asset.tokenId)}
                    >
                      View History
                    </button>
                  </div>
                ))}

                <div className="admin-activity-row">
                  <div className="admin-activity-left">
                    <div className="admin-activity-circle circle-teal">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className="admin-activity-content">
                      <span className="admin-activity-title">DID Identity registered</span>
                      <span className="auditor-activity-id">{currentDID}</span>
                      <span className="admin-activity-subtext">Cryptographic credential verified on Fabric Ledger &amp; MongoDB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-inspect-link"
                    onClick={() => setActiveTab('my-identity')}
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
