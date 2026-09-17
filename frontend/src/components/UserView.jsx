import React, { useState, useEffect } from 'react';
import {
  getAssetsByOwner,
  transferNFT,
  verifyNFT,
  getAllNFTs,
  getAllDIDs,
} from '../services/api';

export default function UserView({ activeDID, notify, onViewProvenance }) {
  const [activeTab, setActiveTab] = useState('my-assets');
  const [myAssets, setMyAssets] = useState([]);
  const [allNfts, setAllNfts] = useState([]);
  const [allDids, setAllDids] = useState([]);

  // Transfer Form
  const [transTokenId, setTransTokenId] = useState('');
  const [transRecipientDid, setTransRecipientDid] = useState('');

  // Verify Form
  const [verifyTokenId, setVerifyTokenId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const refreshUserData = async () => {
    try {
      const [myRes, allNftsRes, didsRes] = await Promise.allSettled([
        getAssetsByOwner(activeDID),
        getAllNFTs(),
        getAllDIDs(),
      ]);

      if (myRes.status === 'fulfilled') {
        const data = myRes.value?.data || myRes.value || [];
        setMyAssets(Array.isArray(data) ? data : []);
      }
      if (allNftsRes.status === 'fulfilled') {
        const data = allNftsRes.value?.data || allNftsRes.value || [];
        setAllNfts(Array.isArray(data) ? data : []);
      }
      if (didsRes.status === 'fulfilled') {
        const data = didsRes.value?.data || didsRes.value || [];
        setAllDids(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load user state:', err);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [activeDID]);

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

  const handleSelfTransfer = async (e) => {
    e.preventDefault();
    if (!transTokenId.trim() || !transRecipientDid.trim()) {
      return notify('Please enter Token ID and Recipient DID', 'error');
    }

    const cleanToken = sanitizeTokenId(transTokenId);
    const cleanRecipient = sanitizeDID(transRecipientDid);

    try {
      await transferNFT(cleanToken, {
        actorDID: activeDID,
        newOwnerDID: cleanRecipient,
      });
      notify(`Successfully transferred asset ${cleanToken} to ${cleanRecipient}`, 'success');
      setTransTokenId('');
      setTransRecipientDid('');
      refreshUserData();
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
        notify(`NFT ${cleanToken} is authentic and active`, 'success');
      } else {
        notify(`NFT verification failed: ${result.reason || 'Invalid token'}`, 'error');
      }
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  return (
    <div className="dashboard-container user-dashboard">
      <div className="sub-nav">
        <button
          className={`sub-tab ${activeTab === 'my-assets' ? 'active' : ''}`}
          onClick={() => { setActiveTab('my-assets'); refreshUserData(); }}
        >
          My Assets ({myAssets.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => { setActiveTab('transfer'); refreshUserData(); }}
        >
          Transfer Asset
        </button>
        <button
          className={`sub-tab ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          Verify Authenticity
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: My Owned Assets */}
        {activeTab === 'my-assets' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <div>
                <h3 className="card-title">Digital Assets Portfolio</h3>
                <p className="card-desc">Active Account Identity: <code>{activeDID}</code></p>
              </div>
              <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh Portfolio</button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Token ID</th>
                    <th>Asset Title</th>
                    <th>Asset Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssets.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        <div className="empty-state-box">
                          <p>No digital assets allocated to {activeDID} yet.</p>
                          <p className="text-xs text-muted mt-1">Assets allocated by Managers will appear here automatically.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    myAssets.map((item, idx) => (
                      <tr key={idx}>
                        <td><code>{item.tokenId}</code></td>
                        <td>{item.assetName}</td>
                        <td><span className="type-pill">{item.assetType}</span></td>
                        <td><span className="status-pill status-active">{item.status || 'ACTIVE'}</span></td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              className="btn btn-xs btn-outline"
                              onClick={() => {
                                setTransTokenId(item.tokenId);
                                setActiveTab('transfer');
                              }}
                            >
                              Transfer
                            </button>
                            <button className="btn btn-xs btn-secondary" onClick={() => onViewProvenance(item.tokenId)}>
                              Provenance
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Transfer My Asset */}
        {activeTab === 'transfer' && (
          <div className="glass-card card-narrow">
            <div className="card-header-styled">
              <div>
                <h3 className="card-title">Transfer Asset Ownership</h3>
                <p className="card-desc">Transfer ownership of your tokenized asset to a recipient DID.</p>
              </div>
            </div>

            <form onSubmit={handleSelfTransfer} className="form-layout">
              <div className="form-group">
                <label className="label">Select or Enter Token ID:</label>
                {myAssets.length > 0 ? (
                  <select
                    className="input"
                    value={transTokenId}
                    onChange={(e) => setTransTokenId(e.target.value)}
                  >
                    <option value="">-- Select Owned Asset --</option>
                    {myAssets.map((item, idx) => (
                      <option key={idx} value={item.tokenId}>
                        {item.tokenId} - {item.assetName}
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
                <label className="label">Recipient DID:</label>
                {allDids.length > 0 ? (
                  <select
                    className="input"
                    value={transRecipientDid}
                    onChange={(e) => setTransRecipientDid(e.target.value)}
                  >
                    <option value="">-- Select Recipient from Directory --</option>
                    {allDids.filter(d => d.did !== activeDID && d.status !== 'REVOKED').map((d, idx) => (
                      <option key={idx} value={d.did}>
                        {d.did} [{d.role}]
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  className="input mt-2"
                  value={transRecipientDid}
                  onChange={(e) => setTransRecipientDid(e.target.value)}
                  placeholder="Or type recipient DID (e.g. did:sih26125:ORG_INSPACE)..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Confirm Ownership Transfer
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: Verify */}
        {activeTab === 'verify' && (
          <div className="glass-card card-narrow">
            <div className="card-header-styled">
              <div>
                <h3 className="card-title">Verify On-Chain Authenticity</h3>
                <p className="card-desc">Validate state and ownership details of any token.</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="form-layout">
              <div className="form-group">
                <label className="label">Select or Enter Token ID:</label>
                {allNfts.length > 0 ? (
                  <select
                    className="input"
                    value={verifyTokenId}
                    onChange={(e) => setVerifyTokenId(e.target.value)}
                  >
                    <option value="">-- Select Token ID to Verify --</option>
                    {allNfts.map((nft, idx) => (
                      <option key={idx} value={nft.tokenId}>
                        {nft.tokenId} - {nft.assetName}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  className="input mt-2"
                  value={verifyTokenId}
                  onChange={(e) => setVerifyTokenId(e.target.value)}
                  placeholder="Or type Token ID (e.g. NFT-2026-PATENT-001)..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Verify On-Chain Status
              </button>
            </form>

            {verifyResult && (
              <div className={`verification-box ${verifyResult.valid ? 'box-valid' : 'box-invalid'}`}>
                <h4>Result: {verifyResult.valid ? 'VALID & AUTHENTIC' : 'INVALID / REVOKED'}</h4>
                <p><strong>Token ID:</strong> {verifyResult.tokenId}</p>
                <p><strong>Asset Title:</strong> {verifyResult.assetName || 'N/A'}</p>
                <p><strong>Owner DID:</strong> {verifyResult.ownerDID || 'UNASSIGNED'}</p>
                <p><strong>Token Status:</strong> {verifyResult.status || 'N/A'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


