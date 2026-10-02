import React, { useState, useEffect } from 'react';
import {
  getAssetsByOwner,
  createTransferRequest,
  getTransferRequestsByDID,
  verifyNFT,
  getAllNFTs,
  getAllDIDs,
} from '../services/api';

export default function UserView({ activeDID, notify, onViewProvenance }) {
  const [activeTab, setActiveTab] = useState('my-assets');
  const [myAssets, setMyAssets] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [allNfts, setAllNfts] = useState([]);
  const [allDids, setAllDids] = useState([]);

  // Transfer Request Form
  const [transTokenId, setTransTokenId] = useState('');
  const [transRecipientDid, setTransRecipientDid] = useState('');
  const [transReason, setTransReason] = useState('');

  // Verify Form
  const [verifyTokenId, setVerifyTokenId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const refreshUserData = async () => {
    try {
      const [myRes, requestsRes, allNftsRes, didsRes] = await Promise.allSettled([
        getAssetsByOwner(activeDID),
        getTransferRequestsByDID(activeDID),
        getAllNFTs(),
        getAllDIDs(),
      ]);

      if (myRes.status === 'fulfilled') {
        const data = myRes.value?.data || myRes.value || [];
        setMyAssets(Array.isArray(data) ? data : []);
      }
      if (requestsRes.status === 'fulfilled') {
        const data = requestsRes.value?.data || requestsRes.value || [];
        setMyRequests(Array.isArray(data) ? data : []);
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

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!transTokenId.trim() || !transRecipientDid.trim()) {
      return notify('Please select/enter Token ID and Target Custodian DID', 'error');
    }

    const cleanToken = sanitizeTokenId(transTokenId);
    const cleanRecipient = sanitizeDID(transRecipientDid);

    try {
      await createTransferRequest({
        requestedByDID: activeDID,
        tokenId: cleanToken,
        toDID: cleanRecipient,
        reason: transReason || 'Custodial transfer request for project deployment'
      });
      notify(`Submitted custodian transfer request for asset ${cleanToken} to Manager approval`, 'success');
      setTransTokenId('');
      setTransRecipientDid('');
      setTransReason('');
      refreshUserData();
      setActiveTab('my-requests');
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

  return (
    <div className="dashboard-container user-dashboard">
      <div className="sub-nav">
        <button
          className={`sub-tab ${activeTab === 'my-assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-assets')}
        >
          1. Assigned Assets ({myAssets.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'request-transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('request-transfer')}
        >
          2. Request Custody Transfer
        </button>
        <button
          className={`sub-tab ${activeTab === 'my-requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-requests')}
        >
          3. My Transfer Workflow ({myRequests.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'verify-token' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify-token')}
        >
          4. Verify Asset Authenticity
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: Assigned Assets */}
        {activeTab === 'my-assets' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <h3 className="card-title">Assets Assigned to Your Custody</h3>
              <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
            </div>

            {myAssets.length === 0 ? (
              <div className="empty-state-box py-5">
                <p className="text-muted">No digital or physical assets are currently assigned to DID <code>{activeDID}</code>.</p>
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
                        <p><strong>Department / Location:</strong> {asset.department || 'R&D'} - {asset.location || 'Lab 1'}</p>
                      </div>
                      <div className="flex-between mt-3">
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => onViewProvenance(asset.tokenId)}
                        >
                          View History
                        </button>
                        <button
                          className="btn btn-xs btn-outline"
                          disabled={isPending}
                          onClick={() => {
                            setTransTokenId(asset.tokenId);
                            setActiveTab('request-transfer');
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

        {/* TAB 2: Request Custody Transfer */}
        {activeTab === 'request-transfer' && (
          <div className="glass-card max-w-xl mx-auto">
            <h3 className="card-title mb-2">Initiate Custodian Transfer Request</h3>
            <p className="text-sm text-muted mb-4">
              As per enterprise security policy, custody transfers require Manager approval. Submitting this request creates an immutable <code>TRANSFER_REQUESTED</code> event on the ledger.
            </p>

            <form onSubmit={handleCreateRequest} className="form-grid">
              <div className="form-group">
                <label className="label">Select/Enter Asset Token ID *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. NFT-1001"
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
                    {allDids.filter(d => d.did !== activeDID).map(d => (
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
                <label className="label">Transfer Justification / Reason *</label>
                <textarea
                  className="input input-textarea"
                  rows={3}
                  placeholder="Explain why asset custody is being transferred..."
                  value={transReason}
                  onChange={(e) => setTransReason(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Submit Request for Manager Approval
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: My Transfer Workflow */}
        {activeTab === 'my-requests' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <h3 className="card-title">Transfer Request Workflow History</h3>
              <button className="btn btn-xs btn-secondary" onClick={refreshUserData}>Refresh</button>
            </div>

            {myRequests.length === 0 ? (
              <div className="empty-state-box py-5">
                <p className="text-muted">No custodian transfer requests recorded for your DID.</p>
              </div>
            ) : (
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
                    {myRequests.map((req, idx) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Verify Asset Authenticity */}
        {activeTab === 'verify-token' && (
          <div className="glass-card max-w-xl mx-auto">
            <h3 className="card-title mb-2">Cryptographic Asset Verification</h3>
            <p className="text-sm text-muted mb-4">
              Query the Hyperledger Fabric ledger to verify whether an asset token is genuine, active, and legally owned.
            </p>

            <form onSubmit={handleVerify} className="form-grid">
              <div className="form-group">
                <label className="label">Asset Token ID *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. NFT-1001"
                  value={verifyTokenId}
                  onChange={(e) => setVerifyTokenId(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Verify Ledger Record
              </button>
            </form>

            {verifyResult && (
              <div className="verification-card mt-4">
                <h4 className="card-subtitle mb-2 flex-between">
                  <span>Verification Output:</span>
                  <span className={`badge ${verifyResult.valid ? 'badge-success' : 'badge-danger'}`}>
                    {verifyResult.valid ? '✓ VALID & AUTHENTIC' : '✕ INVALID / REVOKED'}
                  </span>
                </h4>
                <pre className="code-block">{JSON.stringify(verifyResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
