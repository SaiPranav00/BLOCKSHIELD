import React, { useState, useEffect } from 'react';
import blockshieldLogo from '../../../assets/blockshield-logo.svg';
import {
  createDID,
  assignRole,
  revokeDID,
  mintNFT,
  allocateNFT,
  transferNFT,
  revokeNFT,
  getAllDIDs,
  getAllNFTs,
  getAuditLogs,
  generateKeyPair,
} from '../../../services/api';
import { parseList } from '../../../utils';

export default function AdminView({
  activeDID,
  notify,
  onViewProvenance,
  onMetricsUpdate,
  onLogout,
  authUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const [didsList, setDidsList] = useState([]);
  const [nftsList, setNftsList] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [didSearchQuery, setDidSearchQuery] = useState('');
  const [nftSearchQuery, setNftSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const [newDidInput, setNewDidInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('USER');
  const [newDeptInput, setNewDeptInput] = useState('BEL Radar Systems');
  const [generatedKey, setGeneratedKey] = useState('');
  const [adminUserCategory, setAdminUserCategory] = useState('DEFENCE');
  const [adminIdProofType, setAdminIdProofType] = useState('GOVERNMENT_ID');
  const [adminIdProofNumber, setAdminIdProofNumber] = useState('');
  const [adminServiceId, setAdminServiceId] = useState('');
  const [adminEmployeeId, setAdminEmployeeId] = useState('');
  const [adminCompanyEmail, setAdminCompanyEmail] = useState('');
  const [adminOrgAuthCode, setAdminOrgAuthCode] = useState('BEL-SEC-2026');
  const [adminOrgName, setAdminOrgName] = useState('');
  const [adminUserPassword, setAdminUserPassword] = useState('password123');

  const handleAdminCategoryChange = (cat) => {
    setAdminUserCategory(cat);
    if (cat === 'DEFENCE') {
      setAdminIdProofType('GOVERNMENT_ID');
      setNewDeptInput('BEL Radar Systems');
      setAdminOrgAuthCode('BEL-SEC-2026');
    } else if (cat === 'SOFTWARE') {
      setAdminIdProofType('AADHAAR');
      setNewDeptInput('Software Systems Division');
      setAdminOrgAuthCode('TECH-AUTH-2026');
    } else {
      setAdminIdProofType('AADHAAR');
      setNewDeptInput('Civilian Services');
      setAdminOrgAuthCode('');
    }
  };

  const [revokeDidInput, setRevokeDidInput] = useState('');

  const [mintTokenId, setMintTokenId] = useState('');
  const [mintAssetName, setMintAssetName] = useState('');
  const [mintAssetType, setMintAssetType] = useState('CERTIFICATE');
  const [mintMetadata, setMintMetadata] = useState('{"issuer":"IIT Madras","classification":"VERIFIED"}');
  const [mintTargetOwnerDid, setMintTargetOwnerDid] = useState('');

  const [allocTokenId, setAllocTokenId] = useState('');
  const [allocOwnerDid, setAllocOwnerDid] = useState('');

  const [transTokenId, setTransTokenId] = useState('');
  const [transNewOwnerDid, setTransNewOwnerDid] = useState('');

  const [revokeTokenId, setRevokeTokenId] = useState('');

  const refreshData = async () => {
    setLoading(true);
    try {
      const [didsRes, nftsRes, auditRes] = await Promise.allSettled([
        getAllDIDs(),
        getAllNFTs(),
        getAuditLogs(),
      ]);

      let dids = [];
      let nfts = [];
      let audit = [];

      if (didsRes.status === 'fulfilled') {
        dids = parseList(didsRes.value);
        setDidsList(dids);
      }
      if (nftsRes.status === 'fulfilled') {
        nfts = parseList(nftsRes.value);
        setNftsList(nfts);
      }
      if (auditRes.status === 'fulfilled') {
        audit = parseList(auditRes.value);
        setAuditList(audit);
      }

      if (onMetricsUpdate) {
        onMetricsUpdate({ didsCount: dids.length, nftsCount: nfts.length, auditsCount: audit.length });
      }
    } catch (err) {
      console.error('Failed to load ledger state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleGenKeyPair = async () => {
    try {
      const res = await generateKeyPair();
      const pub = res?.publicKey || res?.data?.publicKey || 'RSA_PUBLIC_KEY_GENERATED';
      setGeneratedKey(pub);
      notify('Cryptographic RSA Keypair generated successfully!', 'success');
    } catch (err) {
      notify(err.message || 'Keypair generation failed', 'error');
    }
  };

  const handleCreateDID = async (e) => {
    e.preventDefault();
    if (!newDidInput.trim()) return notify('Please enter a username or DID identifier', 'error');

    let cleanDid = newDidInput.trim();
    if (!cleanDid.startsWith('did:sih26125:')) {
      const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      cleanDid = `did:sih26125:${cleanSuffix}`;
    }

    try {
      const orgProof = {
        department: newDeptInput || (adminUserCategory === 'DEFENCE' ? 'BEL Radar Systems' : 'Technology Unit'),
        verifiedBy: 'did:sih26125:ADMIN001',
      };
      if (adminUserCategory === 'DEFENCE') {
        orgProof.serviceId = adminServiceId || 'BEL-SRV-AUTO';
        orgProof.authCode = adminOrgAuthCode || 'BEL-SEC-2026';
      } else if (adminUserCategory === 'SOFTWARE') {
        orgProof.employeeId = adminEmployeeId || 'TECH-EMP-AUTO';
        orgProof.companyEmail = adminCompanyEmail || 'engineer@tech.bel.in';
        orgProof.authCode = adminOrgAuthCode || 'TECH-AUTH-2026';
      } else {
        orgProof.orgName = adminOrgName || 'Civilian / General';
      }

      await createDID({
        did: cleanDid,
        publicKey: generatedKey || 'RSA-2048-PUBKEY-AUTO-GEN',
        role: newRoleInput,
        department: newDeptInput || orgProof.department,
        userCategory: adminUserCategory,
        idProofType: adminIdProofType,
        idProofNumber: adminIdProofNumber || 'ADMIN_VERIFIED_DOC',
        password: adminUserPassword || 'password123',
        orgProof,
      });

      notify(`Account ${cleanDid} successfully created on Fabric as ${newRoleInput} [${adminUserCategory}]! Password: ${adminUserPassword || 'password123'}`, 'success');
      setNewDidInput('');
      setGeneratedKey('');
      setAdminIdProofNumber('');
      setAdminServiceId('');
      setAdminEmployeeId('');
      setAdminCompanyEmail('');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleInlineRoleChange = async (targetDid, newRole) => {
    try {
      await assignRole({
        did: targetDid,
        role: newRole,
      });
      notify(`Role for ${targetDid} updated to ${newRole}`, 'success');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleRevokeDID = async (e) => {
    e.preventDefault();
    if (!revokeDidInput.trim()) return notify('Enter DID to revoke', 'error');

    let targetDid = revokeDidInput.trim();
    if (!targetDid.startsWith('did:sih26125:')) {
      const cleanSuffix = targetDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      targetDid = `did:sih26125:${cleanSuffix}`;
    }

    try {
      await revokeDID(targetDid);
      notify(`DID ${targetDid} has been REVOKED on ledger`, 'success');
      setRevokeDidInput('');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleMintNFT = async (e) => {
    e.preventDefault();
    if (!mintTokenId.trim() || !mintAssetName.trim()) {
      return notify('Please fill in Token ID and Asset Name', 'error');
    }

    let rawTokenId = mintTokenId.trim();
    let cleanTokenId = rawTokenId.replace(/[^\w\d\-:_]/g, '');
    if (!cleanTokenId.startsWith('NFT-')) {
      cleanTokenId = `NFT-${cleanTokenId.replace(/^NFT-?/i, '')}`;
    }

    let parsedMeta = {};
    try {
      parsedMeta = JSON.parse(mintMetadata);
    } catch {
      parsedMeta = { description: mintMetadata };
    }

    try {
      await mintNFT({
        adminDID: activeDID,
        tokenId: cleanTokenId,
        assetName: mintAssetName.trim(),
        assetType: mintAssetType,
        metadata: parsedMeta,
        ownerDID: mintTargetOwnerDid,
      });
      const successMsg = mintTargetOwnerDid
        ? `Digital Asset ${cleanTokenId} minted & instantly allocated to ${mintTargetOwnerDid}!`
        : `Digital Asset ${cleanTokenId} minted as unassigned pool asset on Fabric!`;
      notify(successMsg, 'success');
      setMintTokenId('');
      setMintAssetName('');
      setMintTargetOwnerDid('');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleAllocateNFT = async (e) => {
    e.preventDefault();
    if (!allocTokenId.trim() || !allocOwnerDid.trim()) {
      return notify('Please fill in Token ID and Target Owner DID', 'error');
    }

    let rawTokenId = allocTokenId.trim();
    let cleanTokenId = rawTokenId.replace(/[^\w\d\-:_]/g, '');
    if (!cleanTokenId.startsWith('NFT-')) {
      cleanTokenId = `NFT-${cleanTokenId.replace(/^NFT-?/i, '')}`;
    }

    let targetOwner = allocOwnerDid.trim();
    if (!targetOwner.startsWith('did:sih26125:')) {
      const cleanSuffix = targetOwner.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      targetOwner = `did:sih26125:${cleanSuffix}`;
    }

    try {
      await allocateNFT(cleanTokenId, {
        actorDID: activeDID,
        ownerDID: targetOwner,
      });
      notify(`Asset ${cleanTokenId} allocated to ${targetOwner}`, 'success');
      setAllocTokenId('');
      setAllocOwnerDid('');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleTransferNFT = async (e) => {
    e.preventDefault();
    if (!transTokenId.trim() || !transNewOwnerDid.trim()) {
      return notify('Please fill in Token ID and New Owner DID', 'error');
    }

    let rawTokenId = transTokenId.trim();
    let cleanTokenId = rawTokenId.replace(/[^\w\d\-:_]/g, '');
    if (!cleanTokenId.startsWith('NFT-')) {
      cleanTokenId = `NFT-${cleanTokenId.replace(/^NFT-?/i, '')}`;
    }

    let newOwner = transNewOwnerDid.trim();
    if (!newOwner.startsWith('did:sih26125:')) {
      const cleanSuffix = newOwner.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      newOwner = `did:sih26125:${cleanSuffix}`;
    }

    try {
      await transferNFT(cleanTokenId, {
        actorDID: activeDID,
        newOwnerDID: newOwner,
      });
      notify(`Asset ${cleanTokenId} transferred to ${newOwner}`, 'success');
      setTransTokenId('');
      setTransNewOwnerDid('');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleRevokeNFT = async (e) => {
    e.preventDefault();
    if (!revokeTokenId.trim()) return notify('Enter Token ID to revoke', 'error');

    let rawTokenId = revokeTokenId.trim();
    let cleanTokenId = rawTokenId.replace(/[^\w\d\-:_]/g, '');
    if (!cleanTokenId.startsWith('NFT-')) {
      cleanTokenId = `NFT-${cleanTokenId.replace(/^NFT-?/i, '')}`;
    }

    try {
      await revokeNFT(cleanTokenId, { adminDID: activeDID });
      notify(`NFT Asset ${cleanTokenId} has been REVOKED on ledger`, 'success');
      setRevokeTokenId('');
      refreshData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const filteredDIDs = didsList
    .filter(item => !(item.role === 'ADMIN' && item.did !== 'did:sih26125:ADMIN001'))
    .filter(item =>
      (item.did || '').toLowerCase().includes(didSearchQuery.toLowerCase()) ||
      (item.role || '').toLowerCase().includes(didSearchQuery.toLowerCase())
    );

  const filteredNFTs = nftsList.filter(item =>
    (item.tokenId || '').toLowerCase().includes(nftSearchQuery.toLowerCase()) ||
    (item.assetName || '').toLowerCase().includes(nftSearchQuery.toLowerCase()) ||
    (item.ownerDID || '').toLowerCase().includes(nftSearchQuery.toLowerCase())
  );

  const filteredAudits = auditList.filter(item =>
    (item.action || '').toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
    (item.resourceId || '').toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
    (item.actorDID || '').toLowerCase().includes(auditSearchQuery.toLowerCase())
  );

  // Tab Breadcrumb text mapping
  const getTabLabel = (tabKey) => {
    switch (tabKey) {
      case 'overview': return 'Overview';
      case 'identities': return 'Identities';
      case 'revoke-identity': return 'Revoke Identity';
      case 'digital-assets': return 'Digital Assets';
      case 'allocate-asset': return 'Allocate Asset';
      case 'transfer-asset': return 'Transfer Asset';
      case 'revoke-asset': return 'Revoke Asset';
      case 'audit-trail': return 'Audit Trail';
      default: return 'Overview';
    }
  };

  return (
    <div className="admin-workspace-layout">
      {/* ──────────────────────────────────────────────────────────
          LEFT SIDEBAR: ADMIN WORKSPACE
          ────────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div>
          {/* Header Brand Lockup with BlockShield Identity */}
          <div className="admin-sidebar-header">
            <div className="admin-brand-lockup">
              <div className="admin-brand-icon-box" title="BlockShield Platform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <div className="admin-brand-text-col">
                <span className="admin-workspace-title">ADMIN WORKSPACE</span>
                <span className="admin-workspace-subtitle">Trust operations</span>
              </div>
            </div>

            <div className="admin-blockshield-subbadge">
              <img src={blockshieldLogo} alt="BlockShield Logo" className="admin-blockshield-sublogo" />
              <span className="admin-blockshield-tagtext">BlockShield Core</span>
            </div>
          </div>

          {/* Navigation Menu Links */}
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
              className={`admin-nav-btn ${activeTab === 'identities' ? 'active' : ''}`}
              onClick={() => setActiveTab('identities')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                <path d="M2 12a10 10 0 0 1 18-6"/>
                <path d="M2 16h.01"/>
                <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
                <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
              </svg>
              <span>Identities</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'revoke-identity' ? 'active' : ''}`}
              onClick={() => setActiveTab('revoke-identity')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <line x1="9.5" y1="9.5" x2="14.5" y2="14.5"/>
                <line x1="14.5" y1="9.5" x2="9.5" y2="14.5"/>
              </svg>
              <span>Revoke Identity</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'digital-assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('digital-assets')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>Digital Assets</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'allocate-asset' ? 'active' : ''}`}
              onClick={() => setActiveTab('allocate-asset')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Allocate Asset</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'transfer-asset' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer-asset')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/>
                <line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/>
                <line x1="15" y1="15" x2="21" y2="21"/>
                <polyline points="4 8 4 3 9 3"/>
                <line x1="9" y1="9" x2="4" y2="3"/>
              </svg>
              <span>Transfer Asset</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'revoke-asset' ? 'active' : ''}`}
              onClick={() => setActiveTab('revoke-asset')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>Revoke Asset</span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${activeTab === 'audit-trail' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit-trail')}
            >
              <svg className="admin-nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>Audit Trail</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: User Profile & Sign Out */}
        <div className="admin-sidebar-footer">
          <div className="admin-profile-row">
            <div className="admin-profile-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces"
                alt="Priya Nandakumar"
                className="admin-profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="admin-profile-avatar-fallback">PN</span>
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-name">{authUser?.username || 'Priya Nandakumar'}</span>
              <span className="admin-profile-status">Authenticated</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-signout-link"
            onClick={onLogout}
            title="Sign out of Administrator Workspace"
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
          RIGHT MAIN PANEL: PLATFORM CONTROL
          ────────────────────────────────────────────────────────── */}
      <main className="admin-main-panel">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-top-left-col">
            <div className="admin-breadcrumb">
              <span>Administrator</span>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-curr">{getTabLabel(activeTab)}</span>
            </div>

            <h1 className="admin-page-title">
              {activeTab === 'overview' ? 'Platform Control' : getTabLabel(activeTab)}
            </h1>
            <p className="admin-page-desc">
              {activeTab === 'overview'
                ? 'Monitor trust activity and act on identity or asset operations.'
                : `Manage and govern ${getTabLabel(activeTab).toLowerCase()} on the BlockShield Hyperledger Fabric ledger.`}
            </p>
          </div>

          <div className="admin-top-actions">
            <div className="admin-fabric-pill" title="Fabric Network Peer 1 Online">
              <span className="admin-fabric-dot"></span>
              <span>Fabric Peer 1 (Org1)</span>
            </div>

            <button
              type="button"
              className="btn-refresh-white"
              onClick={refreshData}
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

        {/* 3 Metric Cards Row (Identities, Assets, Events) */}
        <div className="admin-metrics-row">
          {/* Card 1: Active identities */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('identities')}
            title="Click to view Identities"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                  <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                  <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                  <path d="M2 12a10 10 0 0 1 18-6"/>
                  <path d="M2 16h.01"/>
                  <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                  <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
                  <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
                  <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Live registry</span>
            </div>

            <div className="metric-number-big">
              {didsList.length > 0 ? didsList.length : 128}
            </div>
            <div className="metric-title-text">Active identities</div>
            <div className="metric-sub-text">
              {didsList.length > 0
                ? `${didsList.filter(d => d.status !== 'REVOKED').length} verified on ledger`
                : '8 verified in the last 7 days'}
            </div>
          </div>

          {/* Card 2: Digital assets */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('digital-assets')}
            title="Click to view Digital Assets"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
              </div>
              <span className="metric-tag-badge">Catalog</span>
            </div>

            <div className="metric-number-big">
              {nftsList.length > 0 ? nftsList.length : 46}
            </div>
            <div className="metric-title-text">Digital assets</div>
            <div className="metric-sub-text">
              {nftsList.length > 0
                ? `${nftsList.filter(n => !!n.ownerDID).length} currently allocated`
                : '12 currently allocated'}
            </div>
          </div>

          {/* Card 3: Audit events */}
          <div
            className="admin-metric-card"
            onClick={() => setActiveTab('audit-trail')}
            title="Click to view Audit Trail"
          >
            <div className="metric-card-top">
              <div className="metric-icon-square square-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <span className="metric-tag-badge">30 days</span>
            </div>

            <div className="metric-number-big">
              {auditList.length > 0 ? auditList.length.toLocaleString() : '1,284'}
            </div>
            <div className="metric-title-text">Audit events</div>
            <div className="metric-sub-text">All event records retained</div>
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="admin-tab-body">
          {/* ──────────────────────────────────────────────────────────
              TAB 0: OVERVIEW (Quick Actions & Recent Activity)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="admin-overview-grid">
              {/* Left Card: Quick Actions */}
              <div className="admin-card-section">
                <div className="admin-card-section-header">
                  <div className="admin-card-header-left">
                    <h2 className="admin-section-heading">Quick actions</h2>
                    <span className="admin-section-subheading">Common control tasks</span>
                  </div>
                  <div className="admin-lightning-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                </div>

                <div className="admin-quick-actions-col">
                  {/* Action 1: Register DID (Primary Royal Blue) */}
                  <button
                    type="button"
                    className="admin-btn-primary-action"
                    onClick={() => setActiveTab('identities')}
                  >
                    <div className="admin-action-btn-left">
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                      <span>Register DID</span>
                    </div>
                    <span className="admin-action-btn-arrow">&rarr;</span>
                  </button>

                  {/* Action 2: Create asset */}
                  <button
                    type="button"
                    className="admin-btn-secondary-action"
                    onClick={() => setActiveTab('digital-assets')}
                  >
                    <div className="admin-action-btn-left">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                      </svg>
                      <span>Create asset</span>
                    </div>
                    <span className="admin-action-btn-arrow" style={{ color: '#94a3b8' }}>&rarr;</span>
                  </button>

                  {/* Action 3: Allocate asset */}
                  <button
                    type="button"
                    className="admin-btn-secondary-action"
                    onClick={() => setActiveTab('allocate-asset')}
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

                  {/* Action 4: Transfer asset */}
                  <button
                    type="button"
                    className="admin-btn-secondary-action"
                    onClick={() => setActiveTab('transfer-asset')}
                  >
                    <div className="admin-action-btn-left">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8"/>
                        <line x1="4" y1="20" x2="21" y2="3"/>
                        <polyline points="21 16 21 21 16 21"/>
                        <line x1="15" y1="15" x2="21" y2="21"/>
                        <polyline points="4 8 4 3 9 3"/>
                        <line x1="9" y1="9" x2="4" y2="3"/>
                      </svg>
                      <span>Transfer asset</span>
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
                    <span className="admin-section-subheading">Latest events from the trust ledger</span>
                  </div>
                  <button
                    type="button"
                    className="btn-view-audit-link"
                    onClick={() => setActiveTab('audit-trail')}
                  >
                    View audit trail
                  </button>
                </div>

                <div className="admin-activity-col">
                  {/* Row 1: DID Registered (Teal checkmark) */}
                  <div className="admin-activity-row">
                    <div className="admin-activity-left">
                      <div className="admin-activity-circle circle-teal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div className="admin-activity-content">
                        <span className="admin-activity-title">
                          {auditList.find(a => (a.action || '').includes('DID'))
                            ? `DID registered: ${auditList.find(a => (a.action || '').includes('DID')).resourceId}`
                            : 'DID registered for Aurora Logistics'}
                        </span>
                        <span className="admin-activity-subtext">
                          did:trust:aurora-ops-0148 · Registry service
                        </span>
                      </div>
                    </div>
                    <span className="admin-activity-time">09:42</span>
                  </div>

                  {/* Row 2: Asset Allocated (Blue layers) */}
                  <div className="admin-activity-row">
                    <div className="admin-activity-left">
                      <div className="admin-activity-circle circle-blue">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                          <polyline points="2 17 12 22 22 17"/>
                          <polyline points="2 12 12 17 22 12"/>
                        </svg>
                      </div>
                      <div className="admin-activity-content">
                        <span className="admin-activity-title">
                          {auditList.find(a => (a.action || '').includes('ALLOC'))
                            ? `Asset credential allocated: ${auditList.find(a => (a.action || '').includes('ALLOC')).resourceId}`
                            : 'Asset credential allocated to Northstar Health'}
                        </span>
                        <span className="admin-activity-subtext">
                          Asset AC-2025-041 · Allocation service
                        </span>
                      </div>
                    </div>
                    <span className="admin-activity-time">09:17</span>
                  </div>

                  {/* Row 3: Ownership transfer approved (Indigo 4-way arrows) */}
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
                          Ownership transfer approved
                        </span>
                        <span className="admin-activity-subtext">
                          Asset AC-2025-018 · Meridian Works &rarr; Kestrel Labs
                        </span>
                      </div>
                    </div>
                    <span className="admin-activity-time">08:51</span>
                  </div>

                  {/* Row 4: Compromised credential revoked (Red shield) */}
                  <div className="admin-activity-row">
                    <div className="admin-activity-left">
                      <div className="admin-activity-circle circle-red">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <line x1="9.5" y1="9.5" x2="14.5" y2="14.5"/>
                          <line x1="14.5" y1="9.5" x2="9.5" y2="14.5"/>
                        </svg>
                      </div>
                      <div className="admin-activity-content">
                        <span className="admin-activity-title">
                          Compromised credential revoked
                        </span>
                        <span className="admin-activity-subtext">
                          did:trust:halo-partners-003 · Security policy
                        </span>
                      </div>
                    </div>
                    <span className="admin-activity-time">08:34</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 1: IDENTITIES
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'identities' && (
            <div className="card-grid">
              <div className="glass-card">
                <div className="flex-between card-header-row mb-2">
                  <div>
                    <h3 className="card-title">Create Account &amp; Provision Identity</h3>
                    <p className="card-desc">Sole Administrative authority to create verified accounts for Users, Managers, and Auditors.</p>
                  </div>
                  <span className="badge badge-accent">🛡️ Admin Authority Only</span>
                </div>

                {/* Exclusive Policy Notice */}
                <div className="admin-governance-notice">
                  <span className="notice-icon">🛡️</span>
                  <div>
                    <strong>Enterprise Security Policy:</strong> In BlockShield, the System Administrator is the <u>sole authority</u> authorized to create accounts and issue DIDs on Hyperledger Fabric for every <strong>User</strong>, <strong>Manager</strong>, and <strong>Auditor</strong>.
                  </div>
                </div>

                <form onSubmit={handleCreateDID} className="form-layout">
                  {/* Step 1: Select Target Role */}
                  <div className="form-group">
                    <label className="label">1. Target Account Role:</label>
                    <div className="role-chips-grid">
                      <button
                        type="button"
                        className={`role-chip-btn ${newRoleInput === 'USER' ? 'active' : ''}`}
                        onClick={() => setNewRoleInput('USER')}
                      >
                        <span>👤 USER</span>
                        <span className="role-chip-desc">Standard Client / Personnel</span>
                      </button>
                      <button
                        type="button"
                        className={`role-chip-btn ${newRoleInput === 'MANAGER' ? 'active' : ''}`}
                        onClick={() => setNewRoleInput('MANAGER')}
                      >
                        <span>💼 MANAGER</span>
                        <span className="role-chip-desc">Asset Allocator &amp; Verifier</span>
                      </button>
                      <button
                        type="button"
                        className={`role-chip-btn ${newRoleInput === 'AUDITOR' ? 'active' : ''}`}
                        onClick={() => setNewRoleInput('AUDITOR')}
                      >
                        <span>🔍 AUDITOR</span>
                        <span className="role-chip-desc">Forensic &amp; Compliance Inspector</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Select User Category */}
                  <div className="form-group">
                    <label className="label">2. User Category / Clearance Profile:</label>
                    <div className="category-tabs-row">
                      <button
                        type="button"
                        className={`category-tab-btn ${adminUserCategory === 'DEFENCE' ? 'active' : ''}`}
                        onClick={() => handleAdminCategoryChange('DEFENCE')}
                      >
                        🛡️ Defence / Government
                      </button>
                      <button
                        type="button"
                        className={`category-tab-btn ${adminUserCategory === 'SOFTWARE' ? 'active' : ''}`}
                        onClick={() => handleAdminCategoryChange('SOFTWARE')}
                      >
                        💻 Software / Technology
                      </button>
                      <button
                        type="button"
                        className={`category-tab-btn ${adminUserCategory === 'NON_DEFENCE' ? 'active' : ''}`}
                        onClick={() => handleAdminCategoryChange('NON_DEFENCE')}
                      >
                        🌐 Non-Defence
                      </button>
                    </div>

                    {/* Proof Requirements Guide Box */}
                    <div className="proof-rules-box">
                      <div className="proof-rules-header">
                        <span>📋</span> Required Verification Proofs for {adminUserCategory.replace('_', ' ')}:
                      </div>
                      {adminUserCategory === 'DEFENCE' && (
                        <div className="proof-rules-item">
                          • <strong>Identity Proof:</strong> Government ID or Passport<br />
                          • <strong>Organization Proof:</strong> Official Service/Employee ID + Organization Verification Code (e.g. BEL, MoD, DRDO)
                        </div>
                      )}
                      {adminUserCategory === 'SOFTWARE' && (
                        <div className="proof-rules-item">
                          • <strong>Identity Proof:</strong> Aadhaar / Passport / Driving Licence<br />
                          • <strong>Organization Proof:</strong> Employee ID + Official Company Email + Org Authorization Code
                        </div>
                      )}
                      {adminUserCategory === 'NON_DEFENCE' && (
                        <div className="proof-rules-item">
                          • <strong>Identity Proof:</strong> Aadhaar / Passport / Driving Licence / Voter ID<br />
                          • <strong>Organization Proof:</strong> Optional Affiliation (Public Citizen / Vendor)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Account Identifier, Password & Department */}
                  <div className="form-two-cols">
                    <div className="form-group">
                      <label className="label">Account Username / DID:</label>
                      <input
                        type="text"
                        className="input"
                        value={newDidInput}
                        onChange={(e) => setNewDidInput(e.target.value)}
                        placeholder="e.g. BEL_RADAR_01 or USER-042"
                        required
                      />
                      <p className="text-xs text-muted mt-1">
                        Will be issued as: <code>{newDidInput ? (newDidInput.startsWith('did:sih26125:') ? newDidInput : `did:sih26125:${newDidInput}`) : 'did:sih26125:<username>'}</code>
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="label">Initial Account Password:</label>
                      <input
                        type="text"
                        className="input"
                        value={adminUserPassword}
                        onChange={(e) => setAdminUserPassword(e.target.value)}
                        placeholder="Default: password123"
                        required
                      />
                      <p className="text-xs text-muted mt-1">Temporary password provisioned for initial login.</p>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Department / Unit / Org Division:</label>
                    <input
                      type="text"
                      className="input"
                      value={newDeptInput}
                      onChange={(e) => setNewDeptInput(e.target.value)}
                      placeholder="e.g. BEL Radar Systems, Avionics, Audit Division"
                    />
                  </div>

                  {/* Step 4: Category-Specific Proofs */}
                  <div className="form-two-cols">
                    <div className="form-group">
                      <label className="label">Identity Proof Document Type:</label>
                      <select
                        className="input styled-select"
                        value={adminIdProofType}
                        onChange={(e) => setAdminIdProofType(e.target.value)}
                      >
                        {adminUserCategory === 'DEFENCE' && (
                          <>
                            <option value="GOVERNMENT_ID">Government ID / Defence Card</option>
                            <option value="PASSPORT">Official Passport</option>
                          </>
                        )}
                        {adminUserCategory === 'SOFTWARE' && (
                          <>
                            <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="DRIVING_LICENCE">Driving Licence</option>
                          </>
                        )}
                        {adminUserCategory === 'NON_DEFENCE' && (
                          <>
                            <option value="AADHAAR">Aadhaar Card</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="DRIVING_LICENCE">Driving Licence</option>
                            <option value="VOTER_ID">Voter ID</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Identity Document Number:</label>
                      <input
                        type="text"
                        className="input"
                        value={adminIdProofNumber}
                        onChange={(e) => setAdminIdProofNumber(e.target.value)}
                        placeholder={adminUserCategory === 'DEFENCE' ? 'e.g. GOV-IND-49201' : adminUserCategory === 'SOFTWARE' ? 'e.g. AADHAAR-9921-3810' : 'e.g. DL-KA-2024-9981'}
                      />
                    </div>
                  </div>

                  {/* Category-Specific Organization Fields */}
                  {adminUserCategory === 'DEFENCE' && (
                    <div className="form-two-cols">
                      <div className="form-group">
                        <label className="label">Official Service / Employee ID:</label>
                        <input
                          type="text"
                          className="input"
                          value={adminServiceId}
                          onChange={(e) => setAdminServiceId(e.target.value)}
                          placeholder="e.g. BEL-SRV-2026 or MOD-OFF-882"
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Organization Clearance Code:</label>
                        <input
                          type="text"
                          className="input"
                          value={adminOrgAuthCode}
                          onChange={(e) => setAdminOrgAuthCode(e.target.value)}
                          placeholder="e.g. BEL-SEC-2026"
                        />
                      </div>
                    </div>
                  )}

                  {adminUserCategory === 'SOFTWARE' && (
                    <div className="form-two-cols">
                      <div className="form-group">
                        <label className="label">Corporate Employee ID:</label>
                        <input
                          type="text"
                          className="input"
                          value={adminEmployeeId}
                          onChange={(e) => setAdminEmployeeId(e.target.value)}
                          placeholder="e.g. TECH-EMP-7712"
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Official Company Email:</label>
                        <input
                          type="email"
                          className="input"
                          value={adminCompanyEmail}
                          onChange={(e) => setAdminCompanyEmail(e.target.value)}
                          placeholder="e.g. engineer@techpartner.bel.in"
                        />
                      </div>
                    </div>
                  )}

                  {adminUserCategory === 'NON_DEFENCE' && (
                    <div className="form-group">
                      <label className="label">Organization Affiliation (Optional):</label>
                      <input
                        type="text"
                        className="input"
                        value={adminOrgName}
                        onChange={(e) => setAdminOrgName(e.target.value)}
                        placeholder="e.g. General Citizen, Independent Vendor, Academic Partner"
                      />
                    </div>
                  )}

                  {/* Cryptographic Public Key */}
                  <div className="form-group">
                    <label className="label">RSA Cryptographic Public Key:</label>
                    <div className="flex-gap">
                      <input
                        type="text"
                        className="input"
                        value={generatedKey}
                        onChange={(e) => setGeneratedKey(e.target.value)}
                        placeholder="Auto-generated or click 'Generate Keypair'..."
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-nowrap"
                        onClick={handleGenKeyPair}
                      >
                        🔑 Generate Keypair
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    🛡️ Create &amp; Issue {newRoleInput} Account on Ledger
                  </button>
                </form>
              </div>

              {/* DIDs Directory */}
              <div className="glass-card">
                <div className="flex-between card-header-row mb-3">
                  <h3 className="card-title">Identity Directory ({didsList.length})</h3>
                  <div className="flex-gap">
                    <input
                      type="text"
                      className="input input-sm"
                      placeholder="Search DIDs..."
                      value={didSearchQuery}
                      onChange={(e) => setDidSearchQuery(e.target.value)}
                    />
                    <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>DID</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Change Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDIDs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-table-cell">
                            <p className="text-muted">No registered identities found on ledger</p>
                          </td>
                        </tr>
                      ) : (
                        filteredDIDs.map((item, idx) => (
                          <tr key={idx}>
                            <td><code>{item.did}</code></td>
                            <td><span className={`role-pill role-${(item.role || '').toLowerCase()}`}>{item.role}</span></td>
                            <td>
                              <span className={`status-pill ${item.status === 'REVOKED' ? 'status-revoked' : 'status-active'}`}>
                                {item.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td>
                              {item.status === 'REVOKED' ? (
                                <span className="text-muted text-xs">REVOKED</span>
                              ) : item.role === 'ADMIN' ? (
                                <span className="text-muted text-xs font-mono font-bold" title="Admin role is protected and cannot be changed">
                                  🔒 ADMIN (Protected)
                                </span>
                              ) : (
                                <select
                                  className="select select-xs"
                                  value={item.role}
                                  onChange={(e) => handleInlineRoleChange(item.did, e.target.value)}
                                >
                                  <option value="USER">USER</option>
                                  <option value="MANAGER">MANAGER</option>
                                  <option value="AUDITOR">AUDITOR</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 2: REVOKE IDENTITY
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'revoke-identity' && (
            <div className="card-grid">
              <div className="glass-card card-danger-border">
                <h3 className="card-title text-danger">Revoke Identity (DID)</h3>
                <p className="card-desc">Permanently revokes an identity status on the Fabric ledger. Revoked DIDs lose access to execute transactions.</p>

                <form onSubmit={handleRevokeDID} className="form-layout">
                  <div className="form-group">
                    <label className="label">Select or Enter DID to Revoke:</label>
                    {didsList.length > 0 ? (
                      <select
                        className="input"
                        value={revokeDidInput}
                        onChange={(e) => setRevokeDidInput(e.target.value)}
                      >
                        <option value="">-- Select Active DID from Directory --</option>
                        {didsList.filter(d => d.status !== 'REVOKED').map((d, idx) => (
                          <option key={idx} value={d.did}>
                            {d.did} [{d.role}]
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="input mt-2"
                      value={revokeDidInput}
                      onChange={(e) => setRevokeDidInput(e.target.value)}
                      placeholder="Or type DID (e.g. did:sih26125:EMP_001)..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-danger btn-block">
                    Revoke Identity Status
                  </button>
                </form>
              </div>

              <div className="glass-card">
                <div className="flex-between card-header-row mb-3">
                  <h3 className="card-title">Active Ledger Identities</h3>
                  <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>DID</th>
                        <th>Role</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {didsList.filter(d => d.status !== 'REVOKED').map((d, idx) => (
                        <tr key={idx}>
                          <td><code>{d.did}</code></td>
                          <td><span className={`role-pill role-${(d.role || '').toLowerCase()}`}>{d.role}</span></td>
                          <td>
                            {d.role !== 'ADMIN' ? (
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-danger"
                                onClick={() => setRevokeDidInput(d.did)}
                              >
                                Select for Revocation
                              </button>
                            ) : (
                              <span className="text-muted text-xs">Protected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 3: DIGITAL ASSETS
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'digital-assets' && (
            <div className="card-grid">
              <div className="glass-card">
                <h3 className="card-title">Mint New Digital Asset (NFT)</h3>
                <p className="card-desc">Tokenize a physical or digital certificate, patent, or license on-chain.</p>

                <form onSubmit={handleMintNFT} className="form-layout">
                  <div className="form-group">
                    <label className="label">Token ID:</label>
                    <input
                      type="text"
                      className="input"
                      value={mintTokenId}
                      onChange={(e) => setMintTokenId(e.target.value)}
                      placeholder="e.g. PATENT-2026-001 or NFT-2026-PATENT-001"
                      required
                    />
                    <p className="text-xs text-muted mt-1">Auto-prefixed with <code>NFT-</code> if omitted.</p>
                  </div>

                  <div className="form-group">
                    <label className="label">Asset Title / Name:</label>
                    <input
                      type="text"
                      className="input"
                      value={mintAssetName}
                      onChange={(e) => setMintAssetName(e.target.value)}
                      placeholder="e.g. Quantum Computing Patent"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Asset Type:</label>
                    <select
                      className="input"
                      value={mintAssetType}
                      onChange={(e) => setMintAssetType(e.target.value)}
                    >
                      <option value="CERTIFICATE">CERTIFICATE</option>
                      <option value="PROPERTY">PROPERTY TITLE</option>
                      <option value="PATENT">PATENT / INTELLECTUAL PROPERTY</option>
                      <option value="LICENSE">OFFICIAL LICENSE</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Target Owner DID (Optional Instant Allocation):</label>
                    <select
                      className="input"
                      value={mintTargetOwnerDid}
                      onChange={(e) => setMintTargetOwnerDid(e.target.value)}
                    >
                      <option value="">-- Mint as Unassigned Pool Asset --</option>
                      {didsList.filter(d => d.status !== 'REVOKED').map((d, idx) => (
                        <option key={idx} value={d.did}>
                          {d.did} [{d.role}]
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted mt-1">Select user to allocate instantly, or leave blank to mint into unassigned pool.</p>
                  </div>

                  <div className="form-group">
                    <label className="label">Custom JSON Metadata:</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      value={mintMetadata}
                      onChange={(e) => setMintMetadata(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Mint Digital Asset on Ledger
                  </button>
                </form>
              </div>

              {/* NFTs Catalog */}
              <div className="glass-card">
                <div className="flex-between card-header-row mb-3">
                  <h3 className="card-title">Asset Catalog ({nftsList.length})</h3>
                  <div className="flex-gap">
                    <input
                      type="text"
                      className="input input-sm"
                      placeholder="Search NFTs..."
                      value={nftSearchQuery}
                      onChange={(e) => setNftSearchQuery(e.target.value)}
                    />
                    <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Token ID</th>
                        <th>Title</th>
                        <th>Owner DID</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNFTs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-table-cell">
                            <p className="text-muted">No tokenized assets found on ledger</p>
                          </td>
                        </tr>
                      ) : (
                        filteredNFTs.map((item, idx) => (
                          <tr key={idx}>
                            <td><code>{item.tokenId}</code></td>
                            <td>{item.assetName}</td>
                            <td><code>{item.ownerDID || 'UNASSIGNED'}</code></td>
                            <td>
                              <button className="btn btn-xs btn-outline" onClick={() => onViewProvenance(item.tokenId)}>
                                History
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 4: ALLOCATE ASSET
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'allocate-asset' && (
            <div className="card-grid">
              <div className="glass-card">
                <h3 className="card-title">Allocate Unassigned Asset</h3>
                <p className="card-desc">Assign a minted digital asset to its designated owner DID on ledger.</p>

                <form onSubmit={handleAllocateNFT} className="form-layout">
                  <div className="form-group">
                    <label className="label">Select or Enter Token ID:</label>
                    {nftsList.length > 0 ? (
                      <select
                        className="input"
                        value={allocTokenId}
                        onChange={(e) => setAllocTokenId(e.target.value)}
                      >
                        <option value="">-- Select Token ID from Ledger --</option>
                        {nftsList.map((nft, idx) => (
                          <option key={idx} value={nft.tokenId}>
                            {nft.tokenId} - {nft.assetName} ({nft.ownerDID ? `Owner: ${nft.ownerDID}` : 'UNASSIGNED'})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="input mt-2"
                      value={allocTokenId}
                      onChange={(e) => setAllocTokenId(e.target.value)}
                      placeholder="Or type Token ID (e.g. NFT-2026-PATENT-001)..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Assign Target Owner DID:</label>
                    {didsList.length > 0 ? (
                      <select
                        className="input"
                        value={allocOwnerDid}
                        onChange={(e) => setAllocOwnerDid(e.target.value)}
                      >
                        <option value="">-- Select Target DID from Registry --</option>
                        {didsList.filter(d => d.status !== 'REVOKED').map((d, idx) => (
                          <option key={idx} value={d.did}>
                            {d.did} [{d.role}]
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="input mt-2"
                      value={allocOwnerDid}
                      onChange={(e) => setAllocOwnerDid(e.target.value)}
                      placeholder="Or type Target DID (e.g. did:sih26125:EMP_DR_SHARMA)..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Submit Asset Allocation
                  </button>
                </form>
              </div>

              <div className="glass-card">
                <div className="flex-between card-header-row mb-3">
                  <h3 className="card-title">Available Tokens ({nftsList.length})</h3>
                  <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Token ID</th>
                        <th>Title</th>
                        <th>Current Owner</th>
                        <th>Quick Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nftsList.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-table-cell">
                            <p className="text-muted">No tokenized assets found on ledger</p>
                          </td>
                        </tr>
                      ) : (
                        nftsList.map((nft, idx) => (
                          <tr key={idx}>
                            <td><code>{nft.tokenId}</code></td>
                            <td>{nft.assetName}</td>
                            <td>{nft.ownerDID ? <code>{nft.ownerDID}</code> : <span className="badge badge-warning">UNASSIGNED</span>}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                onClick={() => setAllocTokenId(nft.tokenId)}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 5: TRANSFER ASSET
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'transfer-asset' && (
            <div className="card-grid">
              <div className="glass-card">
                <h3 className="card-title">Transfer Asset Ownership</h3>
                <p className="card-desc">Transfer an asset from its current owner to a new active owner DID on ledger.</p>

                <form onSubmit={handleTransferNFT} className="form-layout">
                  <div className="form-group">
                    <label className="label">Select or Enter Token ID:</label>
                    {nftsList.length > 0 ? (
                      <select
                        className="input"
                        value={transTokenId}
                        onChange={(e) => setTransTokenId(e.target.value)}
                      >
                        <option value="">-- Select Token ID to Transfer --</option>
                        {nftsList.filter(n => n.status !== 'REVOKED').map((nft, idx) => (
                          <option key={idx} value={nft.tokenId}>
                            {nft.tokenId} - {nft.assetName} ({nft.ownerDID || 'UNASSIGNED'})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="input mt-2"
                      value={transTokenId}
                      onChange={(e) => setTransTokenId(e.target.value)}
                      placeholder="Or type Token ID (e.g. NFT-2026-PATENT-001)..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Recipient New Owner DID:</label>
                    {didsList.length > 0 ? (
                      <select
                        className="input"
                        value={transNewOwnerDid}
                        onChange={(e) => setTransNewOwnerDid(e.target.value)}
                      >
                        <option value="">-- Select Recipient DID from Registry --</option>
                        {didsList.filter(d => d.status !== 'REVOKED').map((d, idx) => (
                          <option key={idx} value={d.did}>
                            {d.did} [{d.role}]
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="input mt-2"
                      value={transNewOwnerDid}
                      onChange={(e) => setTransNewOwnerDid(e.target.value)}
                      placeholder="Or type recipient DID (e.g. did:sih26125:ORG_INSPACE)..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Execute Asset Transfer
                  </button>
                </form>
              </div>

              <div className="glass-card">
                <div className="flex-between card-header-row mb-3">
                  <h3 className="card-title">Allocated Assets ({nftsList.filter(n => !!n.ownerDID).length})</h3>
                  <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Token ID</th>
                        <th>Title</th>
                        <th>Current Owner</th>
                        <th>Quick Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nftsList.filter(n => !!n.ownerDID).length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-table-cell">
                            <p className="text-muted">No allocated assets currently found</p>
                          </td>
                        </tr>
                      ) : (
                        nftsList.filter(n => !!n.ownerDID).map((nft, idx) => (
                          <tr key={idx}>
                            <td><code>{nft.tokenId}</code></td>
                            <td>{nft.assetName}</td>
                            <td><code>{nft.ownerDID}</code></td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                onClick={() => setTransTokenId(nft.tokenId)}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 6: REVOKE ASSET
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'revoke-asset' && (
            <div className="card-grid">
              <div className="glass-card card-danger-border">
                <h3 className="card-title text-danger">Revoke Digital Asset (NFT)</h3>
                <p className="card-desc">Marks a tokenized digital asset status as REVOKED on ledger.</p>

                <form onSubmit={handleRevokeNFT} className="form-layout">
                  <div className="form-group">
                    <label className="label">Select or Enter Token ID to Revoke:</label>
                    {nftsList.length > 0 ? (
                      <select
                        className="input"
                        value={revokeTokenId}
                        onChange={(e) => setRevokeTokenId(e.target.value)}
                      >
                        <option value="">-- Select Active Token ID --</option>
                        {nftsList.filter(n => n.status !== 'REVOKED').map((nft, idx) => (
                          <option key={idx} value={nft.tokenId}>
                            {nft.tokenId} - {nft.assetName}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="input mt-2"
                      value={revokeTokenId}
                      onChange={(e) => setRevokeTokenId(e.target.value)}
                      placeholder="Or type Token ID (e.g. NFT-2026-PATENT-001)..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-danger btn-block">
                    Revoke Asset Token
                  </button>
                </form>
              </div>

              <div className="glass-card">
                <div className="flex-between card-header-row mb-3">
                  <h3 className="card-title">Active Assets on Ledger</h3>
                  <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Token ID</th>
                        <th>Title</th>
                        <th>Owner</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nftsList.filter(n => n.status !== 'REVOKED').map((nft, idx) => (
                        <tr key={idx}>
                          <td><code>{nft.tokenId}</code></td>
                          <td>{nft.assetName}</td>
                          <td><code>{nft.ownerDID || 'UNASSIGNED'}</code></td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-danger"
                              onClick={() => setRevokeTokenId(nft.tokenId)}
                            >
                              Select for Revocation
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 7: AUDIT TRAIL
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'audit-trail' && (
            <div className="glass-card">
              <div className="flex-between card-header-row mb-3">
                <h3 className="card-title">Immutable Ledger Audit Trail</h3>
                <div className="flex-gap">
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="Filter Audit Logs..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                  />
                  <button className="btn btn-xs btn-secondary" onClick={refreshData}>Refresh</button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudits.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table-cell">
                          <p className="text-muted">No audit transactions recorded yet</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAudits.map((log, idx) => (
                        <tr key={idx}>
                          <td className="text-sm">{log.timestamp ? new Date(Number(log.timestamp) * 1000).toLocaleString() : 'N/A'}</td>
                          <td><span className="action-pill">{log.action}</span></td>
                          <td><code>{log.resourceId}</code></td>
                          <td><span className={`result-pill ${log.result === 'ALLOWED' ? 'res-allowed' : 'res-denied'}`}>{log.result}</span></td>
                          <td><code>{log.actorDID}</code></td>
                        </tr>
                      ))
                    )}
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
