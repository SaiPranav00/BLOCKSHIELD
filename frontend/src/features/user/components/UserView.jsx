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

  // Search filter states
  const [assetSearch, setAssetSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');

  // Transfer Request Form
  const [transTokenId, setTransTokenId] = useState('');
  const [transRecipientDid, setTransRecipientDid] = useState('');
  const [transReason, setTransReason] = useState('');

  // Request Asset from Manager Form States
  const [reqAssetName, setReqAssetName] = useState('');
  const [reqManagerDid, setReqManagerDid] = useState('did:sih26125:MANAGER001');
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqDuration, setReqDuration] = useState('14 Days');
  const [reqPriority, setReqPriority] = useState('Normal');
  const [reqDepartment, setReqDepartment] = useState('Avionics Division');
  const [submittingAssetRequest, setSubmittingAssetRequest] = useState(false);

  // Available Bharat Electronics Limited Hardware Assets (No quantity or availability count shown)
  const PROVIDED_BEL_ASSETS = [
    {
      name: 'Digital Oscilloscope',
      tag: 'BEL-DSO-2000',
      desc: 'Electronic signal measurement',
      icon: '📊',
    },
    {
      name: 'Spectrum Analyzer',
      tag: 'BEL-SPA-440',
      desc: 'Frequency-domain signal analysis',
      icon: '📡',
    },
    {
      name: 'Secure Communication Device',
      tag: 'BEL-SCD-0106',
      desc: 'Secure voice/data communication equipment',
      icon: '📻',
    },
    {
      name: 'Network Security Appliance',
      tag: 'BEL-NSA-0107',
      desc: 'Controlled network/security infrastructure',
      icon: '🛡️',
    },
    {
      name: 'Embedded Development Kit',
      tag: 'BEL-EDK-0108',
      desc: 'Hardware used for firmware/prototype development',
      icon: '💻',
    },
    {
      name: 'Thermal Imaging Camera',
      tag: 'BEL-TIC-0109',
      desc: 'Inspection and thermal analysis',
      icon: '📷',
    },
    {
      name: 'Radar Signal Processor (RSP-3000)',
      tag: 'BEL-RSP-3000',
      desc: 'Tactical radar target tracking & RF processing',
      icon: '🛰️',
    },
    {
      name: 'IFF Transponder Cryptochip',
      tag: 'BEL-IFF-9921',
      desc: 'Identification Friend or Foe secure cryptochip',
      icon: '🔒',
    },
  ];

  // Verify Form
  const [verifyTokenId, setVerifyTokenId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const currentDID = activeDID || 'did:sih26125:USER001';

  const filteredMyAssets = myAssets.filter(asset => {
    if (!assetSearch.trim()) return true;
    const q = assetSearch.toLowerCase().trim();
    return (
      (asset.tokenId || '').toLowerCase().includes(q) ||
      (asset.assetName || asset.name || '').toLowerCase().includes(q) ||
      (asset.assetType || '').toLowerCase().includes(q) ||
      (asset.legalOwner || '').toLowerCase().includes(q) ||
      (asset.custodian || asset.ownerDID || '').toLowerCase().includes(q) ||
      (asset.department || '').toLowerCase().includes(q) ||
      (asset.status || '').toLowerCase().includes(q) ||
      (asset.assetId || '').toLowerCase().includes(q)
    );
  });

  const filteredMyRequests = myRequests.filter(req => {
    if (!requestSearch.trim()) return true;
    const q = requestSearch.toLowerCase().trim();
    return (
      (req.requestId || '').toLowerCase().includes(q) ||
      (req.tokenId || '').toLowerCase().includes(q) ||
      (req.toDID || '').toLowerCase().includes(q) ||
      (req.fromDID || '').toLowerCase().includes(q) ||
      (req.status || '').toLowerCase().includes(q) ||
      (req.reason || '').toLowerCase().includes(q)
    );
  });

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
    // Auto-poll user assets and requests every 3.5 seconds
    const timer = setInterval(() => {
      refreshUserData();
    }, 3500);

    // Immediate reactive update on any local database mutation event
    const handleDataChange = () => {
      refreshUserData();
    };

    window.addEventListener('blockshield:data-change', handleDataChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('blockshield:data-change', handleDataChange);
    };
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

  const handleAssetRequestSubmit = async (e) => {
    e.preventDefault();
    if (!reqAssetName) {
      return notify('Please select a hardware equipment to request.', 'error');
    }
    if (!reqPurpose.trim()) {
      return notify('Please state the operational justification or project purpose.', 'error');
    }

    setSubmittingAssetRequest(true);
    try {
      const matched = allNfts.find(
        a => (a.assetName || a.name || '').toLowerCase() === reqAssetName.toLowerCase()
      );
      const targetTokenId = matched ? matched.tokenId : `NFT-REQ-${Date.now().toString().slice(-4)}`;
      const sourceOwner = matched ? (matched.custodian || matched.ownerDID || reqManagerDid) : reqManagerDid;

      await createTransferRequest({
        requestedByDID: currentDID,
        fromDID: sourceOwner,
        toDID: currentDID,
        tokenId: targetTokenId,
        reason: `[Asset Request: ${reqAssetName}] ${reqPurpose.trim()} (Duration: ${reqDuration}, Priority: ${reqPriority}, Dept: ${reqDepartment})`,
      });

      notify(`Asset request for "${reqAssetName}" successfully submitted to Operations Manager!`, 'success');
      setReqPurpose('');
      refreshUserData();
      setActiveTab('request-asset');
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    } finally {
      setSubmittingAssetRequest(false);
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
              className={`admin-nav-btn ${activeTab === 'request-asset' ? 'active' : ''}`}
              onClick={() => setActiveTab('request-asset')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span>Request Asset</span>
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

        {/* 3 Metric Cards Row (Identity, Assets, Pending request) - Visible ONLY in Overview */}
        {activeTab === 'overview' && (
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
        )}

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
                <div className="flex-gap align-center">
                  <input
                    type="text"
                    className="input input-sm"
                    style={{ minWidth: 240 }}
                    placeholder="Search my assets..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                  />
                  <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
                </div>
              </div>

              {filteredMyAssets.length === 0 ? (
                <div className="empty-state-box py-5">
                  <p className="text-muted">
                    {assetSearch ? `No assigned assets match '${assetSearch}'.` : `No digital or physical assets currently assigned to DID ${currentDID}.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
                  {filteredMyAssets.map((asset, index) => {
                    const isPending = asset.status === 'TRANSFER_PENDING';
                    return (
                      <div key={asset.tokenId || index} className="asset-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.35rem', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
                        <div>
                          <div className="asset-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                            <span className="type-pill">{asset.assetType || 'EQUIPMENT'}</span>
                            <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : isPending ? 'status-pending' : 'status-revoked'}`}>
                              {asset.status || 'ACTIVE'}
                            </span>
                          </div>
                          <h4 className="asset-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#0f172a' }}>{asset.assetName || asset.name}</h4>
                          <p className="asset-id" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>Token: <code>{asset.tokenId}</code></p>
                          {asset.assetId && <p className="asset-id" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>Asset Registry ID: <code>{asset.assetId}</code></p>}
                          <div className="asset-meta text-xs my-2" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                            <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Custodian:</strong> <code style={{ fontSize: '0.72rem' }}>{asset.custodian || asset.ownerDID}</code></p>
                            <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><strong>Department:</strong> <span>{asset.department || 'R&D'}</span></p>
                          </div>
                        </div>
                        <div className="flex-between mt-3" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                          <button
                            className="btn btn-xs btn-secondary"
                            style={{ flex: 1 }}
                            onClick={() => onViewProvenance(asset.tokenId)}
                          >
                            View Provenance
                          </button>
                          <button
                            className="btn btn-xs btn-outline"
                            style={{ flex: 1 }}
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
              TAB: REQUEST ASSET FROM OPERATIONS MANAGER
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'request-asset' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <div>
                  <h3 className="card-title">Request Hardware Asset from Operations Manager</h3>
                  <p className="text-xs text-muted">
                    Select from Bharat Electronics Limited defence hardware assets to request custodial allocation from the Operations Manager.
                  </p>
                </div>
                <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
              </div>

              {/* Selectable Provided Assets Grid (Without quantities or stock details) */}
              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ marginBottom: '10px', display: 'block' }}>
                  Available Bharat Electronics Limited Equipment Catalogue (Click to Select):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {PROVIDED_BEL_ASSETS.map((item) => {
                    const isSelected = reqAssetName === item.name;
                    return (
                      <div
                        key={item.name}
                        onClick={() => setReqAssetName(item.name)}
                        style={{
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontFamily: 'var(--mono)',
                              background: isSelected ? '#dbeafe' : '#f1f5f9',
                              color: isSelected ? '#1d4ed8' : '#64748b',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              {item.tag}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#1d4ed8' : '#0f172a', marginBottom: '4px' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                            {item.desc}
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: isSelected ? '#2563eb' : '#94a3b8'
                          }}>
                            {isSelected ? '✓ Selected' : 'Select →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Request Form */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Submit Formal Custody Allocation Request
                </h4>
                <form onSubmit={handleAssetRequestSubmit}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label className="label">Selected Asset *</label>
                      <select
                        className="input"
                        value={reqAssetName}
                        onChange={(e) => setReqAssetName(e.target.value)}
                        required
                      >
                        <option value="">-- Choose an equipment from the catalogue --</option>
                        {PROVIDED_BEL_ASSETS.map((a) => (
                          <option key={a.name} value={a.name}>{a.name} — {a.desc}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Target Operations Manager *</label>
                      <select
                        className="input"
                        value={reqManagerDid}
                        onChange={(e) => setReqManagerDid(e.target.value)}
                        required
                      >
                        {allDids.filter(d => d.role === 'MANAGER').length > 0 ? (
                          allDids.filter(d => d.role === 'MANAGER').map(m => (
                            <option key={m.did} value={m.did}>{m.name || m.username} ({m.did})</option>
                          ))
                        ) : (
                          <option value="did:sih26125:MANAGER001">Operations Manager (did:sih26125:MANAGER001)</option>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Required Duration</label>
                      <select
                        className="input"
                        value={reqDuration}
                        onChange={(e) => setReqDuration(e.target.value)}
                      >
                        <option value="7 Days">7 Days (Short-term testing)</option>
                        <option value="14 Days">14 Days (Standard sprint)</option>
                        <option value="30 Days">30 Days (Project phase)</option>
                        <option value="60 Days">60 Days (Extended field deployment)</option>
                        <option value="Permanent Allocation">Permanent / Long-term Custody</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Priority Level</label>
                      <select
                        className="input"
                        value={reqPriority}
                        onChange={(e) => setReqPriority(e.target.value)}
                      >
                        <option value="Normal">Normal Operations</option>
                        <option value="High">High Priority Project</option>
                        <option value="Urgent">Mission Critical / Urgent Deployment</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="label">Deployment Department / Laboratory</label>
                      <input
                        type="text"
                        className="input"
                        value={reqDepartment}
                        onChange={(e) => setReqDepartment(e.target.value)}
                        placeholder="e.g. Avionics Division, Radar Systems Unit, Signal Processing Lab"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="label">Operational Purpose / Justification *</label>
                      <textarea
                        className="input"
                        value={reqPurpose}
                        onChange={(e) => setReqPurpose(e.target.value)}
                        placeholder="Describe the operational use case, field deployment, firmware testbench, or laboratory task requiring this hardware..."
                        rows={3}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingAssetRequest || !reqAssetName}
                      style={{
                        background: '#2563eb',
                        borderColor: '#2563eb',
                        padding: '8px 18px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{submittingAssetRequest ? 'Submitting to Ledger...' : 'Submit Request to Operations Manager'}</span>
                      <span>→</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* User's Submitted Asset Requests History */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  My Asset Allocation Requests History
                </h4>
                {myRequests.filter(r => r.toDID === currentDID).length === 0 ? (
                  <div className="text-xs text-muted" style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    No asset allocation requests submitted yet. Select an equipment above to submit a request.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Asset / Token</th>
                          <th>Current Custodian / Manager</th>
                          <th>Justification</th>
                          <th>Date Submitted</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.filter(r => r.toDID === currentDID).map((req) => (
                          <tr key={req.requestId}>
                            <td><code>{req.requestId}</code></td>
                            <td>
                              <strong style={{ color: '#0f172a' }}>
                                {allNfts.find(n => n.tokenId === req.tokenId)?.assetName || req.tokenId}
                              </strong>
                            </td>
                            <td><code>{req.fromDID}</code></td>
                            <td className="text-xs" style={{ maxWidth: '280px' }}>{req.reason}</td>
                            <td className="text-xs">{req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recent'}</td>
                            <td>
                              <span className={`status-pill status-${(req.status || 'PENDING').toLowerCase()}`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
                    {allDids.filter(d => d.did !== currentDID && d.status === 'ACTIVE').length > 0 && (
                      <div className="mt-1 flex-gap flex-wrap">
                        <span className="text-xs text-muted">Registered DIDs:</span>
                        {allDids.filter(d => d.did !== currentDID && d.status === 'ACTIVE').map(d => (
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
              <div className="flex-between align-center mb-2 mt-4">
                <h4 className="text-sm font-semibold">Submitted Request Status</h4>
                <input
                  type="text"
                  className="input input-sm"
                  style={{ maxWidth: 240 }}
                  placeholder="Filter requests..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                />
              </div>

              <div className="table-responsive">
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
                    {filteredMyRequests.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          {requestSearch ? `No requests match '${requestSearch}'.` : 'No transfer requests submitted yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredMyRequests.map((req, idx) => (
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
