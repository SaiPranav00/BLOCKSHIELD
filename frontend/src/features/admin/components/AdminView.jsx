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
  isAssetLog,
  getLogCategoryDetails,
  approveUserRegistration,
  denyUserRegistration,
} from '../../../services/api';
import { parseList } from '../../../utils';
import ForensicEvidenceModal from '../../../components/ForensicEvidenceModal';

export default function AdminView({
  activeDID,
  notify,
  onViewProvenance,
  onMetricsUpdate,
  onLogout,
  authUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  
  const [didsList, setDidsList] = useState([]);
  const [nftsList, setNftsList] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [didSearchQuery, setDidSearchQuery] = useState('');
  const [nftSearchQuery, setNftSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL'); // 'ALL' | 'ASSET' | 'IDENTITY_SECURITY'

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
  const [showAdminPassword, setShowAdminPassword] = useState(false);

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

  // Pending Account Approval State
  const [denyingDid, setDenyingDid] = useState(null);
  const [denialReasonInput, setDenialReasonInput] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [inspectingAccount, setInspectingAccount] = useState(null);

  // Sub-tab selection under Identities tab: 'directory' | 'pending' | 'create'
  const [identitySubTab, setIdentitySubTab] = useState('directory');

  const pendingAccounts = didsList.filter(d => d.status === 'PENDING_APPROVAL');

  const handleApproveAccount = async (did) => {
    setProcessingApproval(true);
    try {
      const res = await approveUserRegistration(did, { adminDID: activeDID });
      notify(res.message || `Account ${did} approved and activated on ledger!`, 'success');
      refreshData();
    } catch (err) {
      notify(err.message || 'Failed to approve account', 'error');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleDenyAccount = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!denyingDid) return;
    setProcessingApproval(true);
    try {
      const res = await denyUserRegistration(denyingDid, {
        adminDID: activeDID,
        reason: denialReasonInput.trim() || 'Verification credentials or department proofs not satisfied.'
      });
      notify(res.message || `Account registration for ${denyingDid} denied.`, 'info');
      setDenyingDid(null);
      setDenialReasonInput('');
      refreshData();
    } catch (err) {
      notify(err.message || 'Failed to deny account', 'error');
    } finally {
      setProcessingApproval(false);
    }
  };

  const [revokeDidInput, setRevokeDidInput] = useState('');

  const [mintTokenId, setMintTokenId] = useState('');
  const [mintAssetName, setMintAssetName] = useState('');
  const [mintAssetType, setMintAssetType] = useState('CERTIFICATE');
  const [mintMetadata, setMintMetadata] = useState('{"issuer":"IIT Madras","classification":"VERIFIED"}');
  const [mintTargetOwnerDid, setMintTargetOwnerDid] = useState('');
  const [mintTargetSearch, setMintTargetSearch] = useState('');
  const [isMintTargetDropdownOpen, setIsMintTargetDropdownOpen] = useState(false);

  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);

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
    // Auto-poll ledger state every 3.5 seconds
    const timer = setInterval(() => {
      refreshData();
    }, 3500);

    // Immediate update when data mutations occur
    const handleDataChange = () => {
      refreshData();
    };

    window.addEventListener('blockshield:data-change', handleDataChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('blockshield:data-change', handleDataChange);
    };
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
      setIdentitySubTab('directory');
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
    .filter(item => {
      const q = (didSearchQuery || '').toLowerCase();
      return (
        (item.did || '').toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.role || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q) ||
        (item.userCategory || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q) ||
        (item.idProofNumber || '').toLowerCase().includes(q)
      );
    });

  const filteredNFTs = nftsList.filter(item => {
    const q = (nftSearchQuery || '').toLowerCase();
    const metaStr = typeof item.metadata === 'string' ? item.metadata : JSON.stringify(item.metadata || {});
    return (
      (item.tokenId || '').toLowerCase().includes(q) ||
      (item.assetName || '').toLowerCase().includes(q) ||
      (item.assetId || '').toLowerCase().includes(q) ||
      (item.assetType || '').toLowerCase().includes(q) ||
      (item.ownerDID || '').toLowerCase().includes(q) ||
      (item.custodian || '').toLowerCase().includes(q) ||
      (item.department || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q) ||
      metaStr.toLowerCase().includes(q)
    );
  });

  const filteredAudits = auditList.filter(item => {
    // Activity separation filter (All vs Asset Operations vs Identity & Security)
    if (activityFilter === 'ASSET' && !isAssetLog(item)) return false;
    if (activityFilter === 'IDENTITY_SECURITY' && isAssetLog(item)) return false;

    if (!auditSearchQuery.trim()) return true;
    const q = auditSearchQuery.toLowerCase().trim();
    const cat = getLogCategoryDetails(item);
    return (
      (item.action || '').toLowerCase().includes(q) ||
      (item.resourceId || '').toLowerCase().includes(q) ||
      (item.actorDID || '').toLowerCase().includes(q) ||
      (item.actorName || '').toLowerCase().includes(q) ||
      (item.actorRole || '').toLowerCase().includes(q) ||
      (item.details || '').toLowerCase().includes(q) ||
      (item.eventId || '').toLowerCase().includes(q) ||
      (item.result || '').toLowerCase().includes(q) ||
      (item.txId || '').toLowerCase().includes(q) ||
      (item.policyRule || '').toLowerCase().includes(q) ||
      (item.blockNumber ? String(item.blockNumber) : '').toLowerCase().includes(q) ||
      (cat?.badge || '').toLowerCase().includes(q) ||
      (cat?.label || '').toLowerCase().includes(q)
    );
  });

  const filteredTargetDids = didsList
    .filter(d => d.status === 'ACTIVE')
    .filter(d => {
      if (!mintTargetSearch.trim()) return true;
      const q = mintTargetSearch.toLowerCase().trim();
      return (
        d.did.toLowerCase().includes(q) ||
        (d.name || '').toLowerCase().includes(q) ||
        (d.role || '').toLowerCase().includes(q) ||
        (d.department || '').toLowerCase().includes(q)
      );
    });

  const totalAuditPages = Math.ceil(filteredAudits.length / auditPageSize) || 1;
  const safeAuditPage = Math.min(Math.max(1, auditCurrentPage), totalAuditPages);
  const startAuditIdx = (safeAuditPage - 1) * auditPageSize;
  const paginatedAudits = filteredAudits.slice(startAuditIdx, startAuditIdx + auditPageSize);

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
              {pendingAccounts.length > 0 && (
                <span style={{
                  background: '#d97706',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: 'auto'
                }}>
                  {pendingAccounts.length}
                </span>
              )}
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
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
                alt="Rajesh Verma"
                className="admin-profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="admin-profile-avatar-fallback">RV</span>
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-name">{authUser?.username || 'Rajesh Verma'}</span>
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

        {/* Action alert banner if pending accounts await review - ONLY in Overview */}
        {activeTab === 'overview' && pendingAccounts.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            padding: '16px 20px',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #d97706',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <polyline points="16 11 18 13 22 9"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
                  {pendingAccounts.length} Account Registration Request{pendingAccounts.length > 1 ? 's' : ''} Awaiting Manual Admin Approval
                </div>
                <div style={{ fontSize: '0.78rem', color: '#78350f', marginTop: '2px' }}>
                  New user applications require Administrator verification before credentials can be issued and ledger access activated.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 700, whiteSpace: 'nowrap' }}
              onClick={() => {
                setActiveTab('identities');
                setIdentitySubTab('pending');
              }}
            >
              Review &amp; Approve Now →
            </button>
          </div>
        )}

        {/* 3 Metric Cards Row (Identities, Assets, Events) - Visible ONLY in Overview Tab */}
        {activeTab === 'overview' && (
          <div className="admin-metrics-row">
            {/* Card 1: Active identities */}
            <div
              className="admin-metric-card"
              onClick={() => {
                setActiveTab('identities');
                setIdentitySubTab('directory');
              }}
              title="Click to view Identities Directory"
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
                {didsList.length}
              </div>
              <div className="metric-title-text">Active identities</div>
              <div className="metric-sub-text">
                {didsList.filter(d => d.status === 'ACTIVE').length} verified on ledger
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
                {nftsList.length}
              </div>
              <div className="metric-title-text">Digital assets</div>
              <div className="metric-sub-text">
                {nftsList.filter(n => !!n.ownerDID).length} currently allocated
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
                <span className="metric-tag-badge">Fabric Ledger</span>
              </div>

              <div className="metric-number-big">
                {auditList.length.toLocaleString()}
              </div>
              <div className="metric-title-text">Audit events</div>
              <div className="metric-sub-text">All event records retained</div>
            </div>
          </div>
        )}

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
                    onClick={() => {
                      setActiveTab('identities');
                      setIdentitySubTab('create');
                    }}
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
                  {auditList && auditList.length > 0 ? (
                    auditList.slice(0, 4).map((item, idx) => {
                      const actionUpper = (item.action || '').toUpperCase();
                      const isRevoke = actionUpper.includes('REVOKE') || item.result === 'DENIED';
                      const isCreate = actionUpper.includes('DID') || actionUpper.includes('CREATE') || actionUpper.includes('REGISTER');
                      const isTransfer = actionUpper.includes('TRANSFER') || actionUpper.includes('ALLOC');

                      const circleClass = isRevoke ? 'circle-red' : isCreate ? 'circle-teal' : isTransfer ? 'circle-indigo' : 'circle-blue';
                      
                      let timeStr = 'Recent';
                      if (item.timestamp) {
                        const tsNum = Number(item.timestamp);
                        const dateObj = tsNum > 10000000000 ? new Date(tsNum) : new Date(tsNum * 1000);
                        timeStr = isNaN(dateObj.getTime()) ? 'Recent' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }

                      return (
                        <div key={item.eventId || item.txId || idx} className="admin-activity-row">
                          <div className="admin-activity-left">
                            <div className={`admin-activity-circle ${circleClass}`}>
                              {isRevoke ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                  <line x1="9.5" y1="9.5" x2="14.5" y2="14.5"/>
                                  <line x1="14.5" y1="9.5" x2="9.5" y2="14.5"/>
                                </svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                            <div className="admin-activity-content">
                              <span className="admin-activity-title">
                                {(item.action || 'LEDGER_TRANSACTION').replace(/_/g, ' ')}
                              </span>
                              <span className="admin-activity-subtext">
                                {item.resourceId ? `Resource: ${item.resourceId}` : ''} {item.actorDID ? `· ${item.actorDID}` : ''}
                              </span>
                            </div>
                          </div>
                          <span className="admin-activity-time">{timeStr}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-sm text-muted">
                      No events recorded on ledger yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 1: IDENTITIES
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'identities' && (
            <div className="admin-identities-container" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {/* Sub-tabs Navigation: Shows only one view at a time under Identities */}
              <div className="identities-subtabs-nav">
                <button
                  type="button"
                  className={`identities-subtab-btn ${identitySubTab === 'directory' ? 'active' : ''}`}
                  onClick={() => setIdentitySubTab('directory')}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>Identity Directory</span>
                  <span className="identities-subtab-badge">{didsList.length}</span>
                </button>

                <button
                  type="button"
                  className={`identities-subtab-btn ${identitySubTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setIdentitySubTab('pending')}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <polyline points="16 11 18 13 22 9"/>
                  </svg>
                  <span>Pending Account Registrations</span>
                  {pendingAccounts.length > 0 ? (
                    <span className="identities-subtab-badge badge-amber">{pendingAccounts.length} Pending</span>
                  ) : (
                    <span className="identities-subtab-badge">0</span>
                  )}
                </button>

                <button
                  type="button"
                  className={`identities-subtab-btn ${identitySubTab === 'create' ? 'active' : ''}`}
                  onClick={() => setIdentitySubTab('create')}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  <span>Create Account &amp; Provision Identity</span>
                  <span className="identities-subtab-badge badge-blue">Admin Authority</span>
                </button>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SUB-TAB 2: PENDING ACCOUNT REGISTRATIONS
                  ────────────────────────────────────────────────────────── */}
              {identitySubTab === 'pending' && (
                <div
                  className="glass-card"
                style={{
                  border: pendingAccounts.length > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  background: pendingAccounts.length > 0 ? '#fffdf5' : '#ffffff',
                  boxShadow: pendingAccounts.length > 0 ? '0 10px 25px -5px rgba(217, 119, 6, 0.1)' : undefined
                }}
              >
                <div className="flex-between card-header-row mb-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: pendingAccounts.length > 0 ? '#fef3c7' : '#ecfdf5',
                      color: pendingAccounts.length > 0 ? '#b45309' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <polyline points="16 11 18 13 22 9"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Pending Account Registrations</span>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: pendingAccounts.length > 0 ? '#fef3c7' : '#e2e8f0',
                          color: pendingAccounts.length > 0 ? '#92400e' : '#475569',
                          border: `1px solid ${pendingAccounts.length > 0 ? '#fde68a' : '#cbd5e1'}`
                        }}>
                          {pendingAccounts.length} Pending Approval
                        </span>
                      </h3>
                      <p className="card-desc" style={{ margin: '3px 0 0 0' }}>
                        Manual verification queue: The Administrator is the sole authority who approves or denies new account creations.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-accent">Admin Manual Approval</span>
                </div>

                {pendingAccounts.length > 0 ? (
                  <div style={{ marginTop: '14px' }}>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Applicant</th>
                            <th>DID Identifier</th>
                            <th>Role Requested</th>
                            <th>Category &amp; Proof</th>
                            <th>Department</th>
                            <th style={{ textAlign: 'center', width: '270px' }}>Admin Decision &amp; Verification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingAccounts.map((account) => {
                            const proofStr = account.idProofNumber ? `${account.idProofType || 'Gov ID'}: ${account.idProofNumber}` : 'ID Document Attached';
                            const orgStr = account.orgProof?.serviceId ? `Service ID: ${account.orgProof.serviceId}`
                              : account.orgProof?.employeeId ? `Emp ID: ${account.orgProof.employeeId}`
                              : account.orgProof?.orgName ? account.orgProof.orgName
                              : account.department || 'General';

                            return (
                              <tr key={account.did} style={{ background: '#ffffff' }}>
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{account.name || account.username}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>@{account.username}</div>
                                </td>
                                <td>
                                  <code style={{ fontSize: '0.74rem' }}>{account.did}</code>
                                </td>
                                <td>
                                  <span className={`role-pill role-${(account.role || 'USER').toLowerCase()}`}>
                                    {account.role}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                                    {account.userCategory || 'DEFENCE'}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                    {proofStr}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.75rem', color: '#334155' }}>{account.department || 'Avionics Division'}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#0284c7' }}>{orgStr}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline"
                                      style={{
                                        color: '#0284c7',
                                        borderColor: '#38bdf8',
                                        background: '#f0f9ff',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 700,
                                        padding: '5px 9px'
                                      }}
                                      onClick={() => setInspectingAccount(account)}
                                      title="View full registration details, applicant proofs and metadata"
                                    >
                                      <span>📄 Details</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-primary"
                                      style={{
                                        background: '#16a34a',
                                        borderColor: '#16a34a',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 700,
                                        padding: '5px 10px'
                                      }}
                                      onClick={() => handleApproveAccount(account.did)}
                                      disabled={processingApproval}
                                      title="Approve applicant and issue active DID on ledger"
                                    >
                                      <span>✓ Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline"
                                      style={{
                                        color: '#dc2626',
                                        borderColor: '#dc2626',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 700,
                                        padding: '5px 8px'
                                      }}
                                      onClick={() => setDenyingDid(account.did)}
                                      disabled={processingApproval}
                                      title="Deny registration request"
                                    >
                                      <span>✕ Deny</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '10px'
                  }}>
                    <span>✓</span>
                    <span>All account registration requests have been reviewed. Zero pending approvals.</span>
                  </div>
                )}
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SUB-TAB 3: CREATE ACCOUNT & PROVISION IDENTITY
                ────────────────────────────────────────────────────────── */}
            {identitySubTab === 'create' && (
              <div className="glass-card">
                <div className="flex-between card-header-row mb-2">
                  <div>
                    <h3 className="card-title">Create Account &amp; Provision Identity</h3>
                    <p className="card-desc">Sole Administrative authority to create verified accounts for Users, Managers, and Auditors.</p>
                  </div>
                  <span className="badge badge-accent">Admin Authority Only</span>
                </div>

                {/* Exclusive Policy Notice */}
                <div className="admin-governance-notice">
                  <span className="notice-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </span>
                  <div>
                    <strong>Enterprise Security Policy:</strong> In BlockShield, the System Administrator is the <u>sole authority</u> authorized to create accounts and issue DIDs on Hyperledger Fabric for every <strong>User</strong>, <strong>Manager</strong>, and <strong>Auditor</strong>.
                  </div>
                </div>

                <form onSubmit={handleCreateDID} className="form-layout">
                  {/* Target Account Role */}
                  <div className="form-group">
                    <label className="label">Target Account Role:</label>
                    <div className="role-chips-grid">
                      <button
                        type="button"
                        className={`role-chip-btn ${newRoleInput === 'USER' ? 'active' : ''}`}
                        onClick={() => setNewRoleInput('USER')}
                      >
                        <span>USER</span>
                        <span className="role-chip-desc">Standard Client / Personnel</span>
                      </button>
                      <button
                        type="button"
                        className={`role-chip-btn ${newRoleInput === 'MANAGER' ? 'active' : ''}`}
                        onClick={() => setNewRoleInput('MANAGER')}
                      >
                        <span>MANAGER</span>
                        <span className="role-chip-desc">Asset Allocator &amp; Verifier</span>
                      </button>
                      <button
                        type="button"
                        className={`role-chip-btn ${newRoleInput === 'AUDITOR' ? 'active' : ''}`}
                        onClick={() => setNewRoleInput('AUDITOR')}
                      >
                        <span>AUDITOR</span>
                        <span className="role-chip-desc">Forensic &amp; Compliance Inspector</span>
                      </button>
                    </div>
                  </div>

                  {/* User Category & Clearance Profile */}
                  <div className="form-group">
                    <label className="label">User Category &amp; Clearance Profile:</label>
                    <div className="category-tabs-row">
                      <button
                        type="button"
                        className={`category-tab-btn ${adminUserCategory === 'DEFENCE' ? 'active' : ''}`}
                        onClick={() => handleAdminCategoryChange('DEFENCE')}
                      >
                        Defence / Government
                      </button>
                      <button
                        type="button"
                        className={`category-tab-btn ${adminUserCategory === 'SOFTWARE' ? 'active' : ''}`}
                        onClick={() => handleAdminCategoryChange('SOFTWARE')}
                      >
                        Software / Technology
                      </button>
                      <button
                        type="button"
                        className={`category-tab-btn ${adminUserCategory === 'NON_DEFENCE' ? 'active' : ''}`}
                        onClick={() => handleAdminCategoryChange('NON_DEFENCE')}
                      >
                        Non-Defence
                      </button>
                    </div>

                    {/* Proof Requirements Guide Box */}
                    <div className="proof-rules-box">
                      <div className="proof-rules-header">
                        Required Verification Proofs for {adminUserCategory.replace('_', ' ')}:
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
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          className="input"
                          value={adminUserPassword}
                          onChange={(e) => setAdminUserPassword(e.target.value)}
                          style={{ paddingRight: '42px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={showAdminPassword ? 'Hide password' : 'View password'}
                          aria-label={showAdminPassword ? 'Hide password' : 'View password'}
                        >
                          {showAdminPassword ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted mt-1">Default temporary password: <code>password123</code></p>
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
                        Generate Keypair
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Create &amp; Issue {newRoleInput} Account on Ledger
                  </button>
                </form>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SUB-TAB 1: IDENTITY DIRECTORY
                ────────────────────────────────────────────────────────── */}
            {identitySubTab === 'directory' && (
              <div className="glass-card">
                {/* Notice banner if pending requests await approval */}
                {pendingAccounts.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: '#fffdf5',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#92400e', fontWeight: 600 }}>
                      <span>⚠️</span>
                      <span>{pendingAccounts.length} new account registration request{pendingAccounts.length > 1 ? 's' : ''} awaiting manual Administrator review.</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      style={{ background: '#d97706', borderColor: '#d97706', fontSize: '0.74rem', padding: '4px 12px', fontWeight: 700 }}
                      onClick={() => setIdentitySubTab('pending')}
                    >
                      Review Pending Registrations ({pendingAccounts.length}) →
                    </button>
                  </div>
                )}

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
                        <th>Actions</th>
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
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: item.status === 'REVOKED' || item.status === 'DENIED' ? '#fee2e2' : item.status === 'PENDING_APPROVAL' ? '#fef3c7' : '#dcfce7',
                                color: item.status === 'REVOKED' || item.status === 'DENIED' ? '#dc2626' : item.status === 'PENDING_APPROVAL' ? '#92400e' : '#16a34a',
                                border: `1px solid ${item.status === 'REVOKED' || item.status === 'DENIED' ? '#fecaca' : item.status === 'PENDING_APPROVAL' ? '#fde68a' : '#bbf7d0'}`
                              }}>
                                {item.status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : (item.status || 'ACTIVE')}
                              </span>
                            </td>
                            <td>
                              {item.status === 'PENDING_APPROVAL' ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-primary"
                                    style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: '0.72rem', padding: '3px 8px' }}
                                    onClick={() => handleApproveAccount(item.did)}
                                    disabled={processingApproval}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    style={{ color: '#dc2626', borderColor: '#dc2626', fontSize: '0.72rem', padding: '3px 8px' }}
                                    onClick={() => setDenyingDid(item.did)}
                                    disabled={processingApproval}
                                  >
                                    Deny
                                  </button>
                                </div>
                              ) : item.status === 'DENIED' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="text-muted text-xs">DENIED</span>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                                    onClick={() => handleApproveAccount(item.did)}
                                    title="Re-evaluate and approve"
                                  >
                                    Re-approve
                                  </button>
                                </div>
                              ) : item.status === 'REVOKED' ? (
                                <span className="text-muted text-xs">REVOKED</span>
                              ) : (
                                <span className="text-muted text-xs font-mono" style={{ color: '#64748b' }}>
                                  Immutable
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                        {didsList.filter(d => d.status === 'ACTIVE').map((d, idx) => (
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
                      {didsList.filter(d => d.status === 'ACTIVE').map((d, idx) => (
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

                  <div className="form-group" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="label" style={{ margin: 0 }}>Target Owner DID (Optional Instant Allocation):</label>
                      {mintTargetOwnerDid && (
                        <button
                          type="button"
                          onClick={() => {
                            setMintTargetOwnerDid('');
                            setMintTargetSearch('');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0 4px'
                          }}
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {mintTargetOwnerDid ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Target Selected:</span>
                          <code style={{ color: '#15803d', fontWeight: 700 }}>{mintTargetOwnerDid}</code>
                          {(() => {
                            const found = didsList.find(d => d.did === mintTargetOwnerDid);
                            return found ? (
                              <span className="type-pill" style={{ fontSize: '0.68rem' }}>{found.role}</span>
                            ) : null;
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMintTargetOwnerDid('');
                            setMintTargetSearch('');
                          }}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#991b1b',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="input"
                            placeholder="Type to search DID, name, role (e.g. USER001, Priya, MANAGER)..."
                            value={mintTargetSearch}
                            onChange={(e) => {
                              setMintTargetSearch(e.target.value);
                              setIsMintTargetDropdownOpen(true);
                            }}
                            onFocus={() => setIsMintTargetDropdownOpen(true)}
                          />
                          {mintTargetSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setMintTargetSearch('');
                              }}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {isMintTargetDropdownOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 50,
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                              maxHeight: '220px',
                              overflowY: 'auto',
                              marginTop: '4px'
                            }}
                          >
                            <div
                              onClick={() => {
                                setMintTargetOwnerDid('');
                                setMintTargetSearch('');
                                setIsMintTargetDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                color: '#64748b',
                                fontStyle: 'italic',
                                background: '#f8fafc'
                              }}
                            >
                              -- Mint as Unassigned Pool Asset --
                            </div>
                            {filteredTargetDids.length === 0 ? (
                              <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
                                No matching registered DIDs found
                              </div>
                            ) : (
                              filteredTargetDids.map((d, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setMintTargetOwnerDid(d.did);
                                    setMintTargetSearch('');
                                    setIsMintTargetDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #f8fafc',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                >
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                                      {d.did}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      {d.name || d.did.split(':').pop()} {d.department ? `· ${d.department}` : ''}
                                    </div>
                                  </div>
                                  <span className="type-pill" style={{ fontSize: '0.68rem' }}>{d.role}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted mt-1">Search user by DID, name or role to allocate instantly, or leave unassigned.</p>
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
                        {didsList.filter(d => d.status === 'ACTIVE').map((d, idx) => (
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
                        {didsList.filter(d => d.status === 'ACTIVE').map((d, idx) => (
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
                <div>
                  <h3 className="card-title">Immutable Ledger Audit Trail</h3>
                  <p className="text-xs text-muted">Complete cryptographic activity trail across assets, identities, and governance.</p>
                </div>
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

              {/* Activity Separation Options (All Activities vs Asset Operations vs Identity & Security) */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActivityFilter('ALL')}
                  className={`btn btn-xs ${activityFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: activityFilter === 'ALL' ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>All Activities</span>
                  <span style={{
                    fontSize: '0.72rem',
                    background: activityFilter === 'ALL' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: activityFilter === 'ALL' ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    {auditList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityFilter('ASSET')}
                  className={`btn btn-xs ${activityFilter === 'ASSET' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: activityFilter === 'ASSET' ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Asset Operations</span>
                  <span style={{
                    fontSize: '0.72rem',
                    background: activityFilter === 'ASSET' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: activityFilter === 'ASSET' ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    {auditList.filter(isAssetLog).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityFilter('IDENTITY_SECURITY')}
                  className={`btn btn-xs ${activityFilter === 'IDENTITY_SECURITY' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: activityFilter === 'IDENTITY_SECURITY' ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Identity &amp; Security</span>
                  <span style={{
                    fontSize: '0.72rem',
                    background: activityFilter === 'IDENTITY_SECURITY' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: activityFilter === 'IDENTITY_SECURITY' ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    {auditList.filter(l => !isAssetLog(l)).length}
                  </span>
                </button>
              </div>

              <div className="table-responsive-fit">
                <table className="data-table audit-table-fit">
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Category</th>
                      <th>Action</th>
                      <th>Resource ID</th>
                      <th>Result</th>
                      <th>Actor DID</th>
                      <th style={{ textAlign: 'center' }}>Audit Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudits.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-table-cell">
                          <p className="text-muted">No audit transactions recorded yet</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedAudits.map((log, idx) => {
                        const cat = getLogCategoryDetails(log);
                        return (
                          <tr key={log.eventId || idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedAuditLog(log)}>
                            <td className="text-sm">
                              <div>{log.timestamp ? (Number(log.timestamp) > 10000000000 ? new Date(Number(log.timestamp)).toLocaleString() : new Date(Number(log.timestamp) * 1000).toLocaleString()) : 'N/A'}</div>
                              {log.blockNumber && <span className="type-pill" style={{ fontSize: '0.65rem', marginTop: '2px', display: 'inline-block' }}>Block #{log.blockNumber}</span>}
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: cat.bg,
                                color: cat.color,
                                border: `1px solid ${cat.border}`,
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.03em'
                              }}>
                                {cat.badge}
                              </span>
                            </td>
                            <td className="audit-action-td">
                              <span className="action-pill audit-action-pill">
                                {(log.action || '').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td><code className="audit-cell-truncate" title={log.resourceId}>{log.resourceId}</code></td>
                            <td><span className={`result-pill ${log.result === 'ALLOWED' ? 'res-allowed' : 'res-denied'}`}>{log.result}</span></td>
                            <td>
                              <code className="audit-cell-truncate" title={log.actorDID}>{log.actorDID}</code>
                              {log.actorName && <div className="audit-cell-truncate" style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.actorName} ({log.actorRole})</div>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAuditLog(log);
                                }}
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
                      {filteredAudits.length === 0
                        ? '0 entries'
                        : `Showing ${startAuditIdx + 1} to ${Math.min(startAuditIdx + auditPageSize, filteredAudits.length)} of ${filteredAudits.length} entries`}
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
        </div>
      </main>

      {/* Audit Log Details Modal */}
      {selectedAuditLog && (
        <ForensicEvidenceModal
          isOpen={!!selectedAuditLog}
          log={selectedAuditLog}
          onClose={() => setSelectedAuditLog(null)}
        />
      )}

      {/* Account Denial Reason Modal */}
      {denyingDid && (
        <div className="modal-backdrop" onClick={() => setDenyingDid(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px', background: '#ffffff', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#dc2626', fontWeight: 800 }}>
                Deny Account Registration
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setDenyingDid(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
              You are about to deny the account registration for: <br />
              <code style={{ fontSize: '0.8rem', color: '#0f172a', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                {denyingDid}
              </code>
              <br />
              Please provide the official reason for denial. This will be recorded on the blockchain audit ledger and displayed to the applicant if they attempt to sign in.
            </p>
            <form onSubmit={handleDenyAccount}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="label">Official Reason for Denial:</label>
                <input
                  type="text"
                  className="input"
                  value={denialReasonInput}
                  onChange={(e) => setDenialReasonInput(e.target.value)}
                  placeholder="e.g. Invalid Service ID, Department clearance code mismatch, or unverified documents"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDenyingDid(null)}
                  disabled={processingApproval}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  disabled={processingApproval}
                >
                  {processingApproval ? 'Recording Denial...' : 'Confirm Denial & Block Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Account Registration Details Dossier Modal */}
      {inspectingAccount && (
        <div className="modal-backdrop" onClick={() => setInspectingAccount(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%', padding: '24px', background: '#ffffff', borderRadius: '14px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-amber" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Pending Review</span>
                  <span className={`role-pill role-${(inspectingAccount.role || 'USER').toLowerCase()}`} style={{ fontWeight: 800 }}>
                    {inspectingAccount.role}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  Applicant Registration Dossier
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Verification proofs submitted to Administrator for ledger account provisioning.
                </p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setInspectingAccount(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Applicant Core Identity Section */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Full Name</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{inspectingAccount.name || inspectingAccount.username}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Username</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0284c7' }}>@{inspectingAccount.username}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Requested DID</div>
                  <code style={{ fontSize: '0.74rem', color: '#0f172a' }}>{inspectingAccount.did}</code>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Submitted Timestamp</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                    {inspectingAccount.createdAt ? new Date(inspectingAccount.createdAt).toLocaleString() : 'Recent Request'}
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Proof Verification Section */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                1. Identity Verification &amp; Credentials
              </h4>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>User Category</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}>
                    {inspectingAccount.userCategory || 'DEFENCE / GOVERNMENT'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Document Type</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    {inspectingAccount.idProofType || 'Government ID Card'}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Document / Proof Number</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#047857', fontFamily: 'var(--mono)' }}>
                    {inspectingAccount.idProofNumber || 'VERIFIED-ID-PROVIDED'}
                  </div>
                </div>
              </div>
            </div>

            {/* Organization & Affiliation Proof Section */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                2. Organization &amp; Department Affiliation
              </h4>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Department / Unit</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    {inspectingAccount.department || inspectingAccount.orgProof?.department || 'Avionics / Radar Systems'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Official Service ID</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    {inspectingAccount.orgProof?.serviceId || inspectingAccount.orgProof?.employeeId || 'BEL-SVC-2026'}
                  </div>
                </div>
                {inspectingAccount.orgProof?.companyEmail && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Official Email</div>
                    <div style={{ fontSize: '0.85rem', color: '#0284c7' }}>{inspectingAccount.orgProof.companyEmail}</div>
                  </div>
                )}
                {inspectingAccount.orgProof?.orgName && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Organization / Agency</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>{inspectingAccount.orgProof.orgName}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Security Authorization Code</div>
                  <code style={{ fontSize: '0.78rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                    {inspectingAccount.orgProof?.authCode || 'BEL-SEC-2026'}
                  </code>
                </div>
              </div>
            </div>

            {/* Public Key Cryptographic Material */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                3. Sovereign Cryptographic Key Material
              </h4>
              <pre
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--mono)',
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  maxHeight: '90px',
                  margin: 0
                }}
              >
                {inspectingAccount.publicKey || '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'}
              </pre>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingAccount(null)}
              >
                Close Dossier
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}
                  onClick={() => {
                    setDenyingDid(inspectingAccount.did);
                    setInspectingAccount(null);
                  }}
                  disabled={processingApproval}
                >
                  ✕ Deny Request
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
                  onClick={() => {
                    handleApproveAccount(inspectingAccount.did);
                    setInspectingAccount(null);
                  }}
                  disabled={processingApproval}
                >
                  ✓ Approve &amp; Issue DID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
