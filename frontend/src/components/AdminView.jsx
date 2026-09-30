import React, { useState, useEffect } from 'react';
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
} from '../services/api';

export default function AdminView({ activeDID, notify, onViewProvenance, onMetricsUpdate, onLogout }) {
  const [activeTab, setActiveTab] = useState('register-did');
  
  const [didsList, setDidsList] = useState([]);
  const [nftsList, setNftsList] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [didSearchQuery, setDidSearchQuery] = useState('');
  const [nftSearchQuery, setNftSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const [newDidInput, setNewDidInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('USER');
  const [generatedKey, setGeneratedKey] = useState('');

  const [assignDid, setAssignDid] = useState('');
  const [assignRoleInput, setAssignRoleInput] = useState('MANAGER');

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
        const data = didsRes.value?.data || didsRes.value || [];
        dids = Array.isArray(data) ? data : [];
        setDidsList(dids);
      }
      if (nftsRes.status === 'fulfilled') {
        const data = nftsRes.value?.data || nftsRes.value || [];
        nfts = Array.isArray(data) ? data : [];
        setNftsList(nfts);
      }
      if (auditRes.status === 'fulfilled') {
        const data = auditRes.value?.data || auditRes.value || [];
        audit = Array.isArray(data) ? data : [];
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
    if (!newDidInput.trim()) return notify('Please enter a DID identifier', 'error');

    let cleanDid = newDidInput.trim();
    if (!cleanDid.startsWith('did:sih26125:')) {
      const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      cleanDid = `did:sih26125:${cleanSuffix}`;
    }

    try {
      await createDID({
        did: cleanDid,
        publicKey: generatedKey || 'RSA-2048-PUBKEY-AUTO-GEN',
        role: newRoleInput,
      });
      notify(`Identity ${cleanDid} registered as ${newRoleInput}`, 'success');
      setNewDidInput('');
      setGeneratedKey('');
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

  return (
    <div className="dashboard-container admin-dashboard">
      <div className="sub-nav sub-nav-with-logout">
        <div className="sub-nav-tabs">
          <button
            className={`sub-tab ${activeTab === 'register-did' ? 'active' : ''}`}
            onClick={() => setActiveTab('register-did')}
          >
            1. Register DID
          </button>
          <button
            className={`sub-tab ${activeTab === 'revoke-did' ? 'active' : ''}`}
            onClick={() => setActiveTab('revoke-did')}
          >
            2. Revoke DID
          </button>
          <button
            className={`sub-tab ${activeTab === 'mint-nft' ? 'active' : ''}`}
            onClick={() => setActiveTab('mint-nft')}
          >
            3. Mint Asset
          </button>
          <button
            className={`sub-tab ${activeTab === 'allocate-nft' ? 'active' : ''}`}
            onClick={() => setActiveTab('allocate-nft')}
          >
            4. Allocate Asset
          </button>
          <button
            className={`sub-tab ${activeTab === 'transfer-nft' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer-nft')}
          >
            5. Transfer Asset
          </button>
          <button
            className={`sub-tab ${activeTab === 'revoke-nft' ? 'active' : ''}`}
            onClick={() => setActiveTab('revoke-nft')}
          >
            6. Revoke Asset
          </button>
          <button
            className={`sub-tab ${activeTab === 'audit-logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit-logs')}
          >
            7. Audit Logs ({auditList.length})
          </button>
        </div>

        {onLogout && (
          <button
            type="button"
            className="btn-admin-logout"
            onClick={onLogout}
            title="Log Out of Admin Console"
          >
            <span>🔒 Log Out</span>
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {/* TAB 1: Register DID */}
        {activeTab === 'register-did' && (
          <div className="card-grid">
            <div className="glass-card">
              <h3 className="card-title">Register Identity (DID)</h3>
              <p className="card-desc">Registers a DID string with an RSA public key & role on the Fabric ledger.</p>
              
              <form onSubmit={handleCreateDID} className="form-layout">
                <div className="form-group">
                  <label className="label">DID Identifier:</label>
                  <input
                    type="text"
                    className="input"
                    value={newDidInput}
                    onChange={(e) => setNewDidInput(e.target.value)}
                    placeholder="e.g. ORG_ISRO or did:sih26125:ORG_ISRO"
                    required
                  />
                  <p className="text-xs text-muted mt-1">Auto-prefixed with <code>did:sih26125:</code> if omitted.</p>
                </div>

                <div className="form-group">
                  <label className="label">Assigned Role:</label>
                  <select
                    className="input styled-select"
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                  >
                    <option value="USER">USER (Standard Citizen / Client)</option>
                    <option value="MANAGER">MANAGER (Asset Allocator / Verifier)</option>
                    <option value="AUDITOR">AUDITOR (Compliance Inspector)</option>
                  </select>
                  <p className="text-xs text-muted mt-1">Note: Primary System Administrator is pre-provisioned (<code>did:sih26125:ADMIN001</code>).</p>
                </div>

                <div className="form-group">
                  <label className="label">Public Key (Optional / Keypair):</label>
                  <div className="flex-gap">
                    <input
                      type="text"
                      className="input"
                      value={generatedKey}
                      onChange={(e) => setGeneratedKey(e.target.value)}
                      placeholder="Click 'Generate Keypair' or enter RSA Public Key..."
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
                  Register New Identity
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
                              <span className="text-muted text-xs font-mono font-bold text-muted" title="Admin role is protected and cannot be changed">
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

        {/* TAB 2: Revoke DID */}
        {activeTab === 'revoke-did' && (
          <div className="glass-card card-narrow card-danger-border">
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
        )}

        {/* TAB 3: Mint Asset */}
        {activeTab === 'mint-nft' && (
          <div className="card-grid">
            <div className="glass-card">
              <h3 className="card-title">Mint New Digital Asset (NFT)</h3>
              <p className="card-desc">Tokenize a new physical or digital certificate, patent, or license on-chain.</p>

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
                  <p className="text-xs text-muted mt-1">Select user to allocate instantly upon minting, or leave blank to mint into unassigned inventory pool.</p>
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

        {/* TAB 4: Allocate NFT */}
        {activeTab === 'allocate-nft' && (
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

        {/* TAB 5: Transfer Asset */}
        {activeTab === 'transfer-nft' && (
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

        {/* TAB 6: Revoke NFT */}
        {activeTab === 'revoke-nft' && (
          <div className="glass-card card-narrow card-danger-border">
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
        )}

        {/* TAB 7: Audit Logs */}
        {activeTab === 'audit-logs' && (
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
    </div>
  );
}
