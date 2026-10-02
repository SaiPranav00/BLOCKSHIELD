import React, { useState, useEffect } from 'react';
import {
  getPendingTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
  allocateNFT,
  getAllNFTs,
  getAllDIDs,
} from '../services/api';

export default function ManagerView({ activeDID, notify, onViewProvenance }) {
  const [activeTab, setActiveTab] = useState('pending-approvals');
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

  const refreshManagerData = async () => {
    setLoading(true);
    try {
      const [pendingRes, nftsRes, didsRes] = await Promise.allSettled([
        getPendingTransferRequests(),
        getAllNFTs(),
        getAllDIDs(),
      ]);

      if (pendingRes.status === 'fulfilled') {
        const data = pendingRes.value?.data || pendingRes.value || [];
        setPendingRequests(Array.isArray(data) ? data : []);
      }
      if (nftsRes.status === 'fulfilled') {
        const data = nftsRes.value?.data || nftsRes.value || [];
        setNftsList(Array.isArray(data) ? data : []);
      }
      if (didsRes.status === 'fulfilled') {
        const data = didsRes.value?.data || didsRes.value || [];
        setDidsList(Array.isArray(data) ? data : []);
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
        reason: rejectReason || 'Rejected by Department Manager'
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

  return (
    <div className="dashboard-container manager-dashboard">
      <div className="sub-nav">
        <button
          className={`sub-tab ${activeTab === 'pending-approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending-approvals')}
        >
          1. Pending Transfer Approvals ({pendingRequests.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'dept-assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('dept-assets')}
        >
          2. Department Asset Roster ({nftsList.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'allocate' ? 'active' : ''}`}
          onClick={() => setActiveTab('allocate')}
        >
          3. Resource Allocation
        </button>
        <button
          className={`sub-tab ${activeTab === 'dept-users' ? 'active' : ''}`}
          onClick={() => setActiveTab('dept-users')}
        >
          4. Department Personnel ({didsList.length})
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: Pending Transfer Approvals */}
        {activeTab === 'pending-approvals' && (
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

        {/* TAB 2: Department Asset Roster */}
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
                    Inspect Provenance & Audit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Resource Allocation */}
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

        {/* TAB 4: Department Personnel */}
        {activeTab === 'dept-users' && (
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
    </div>
  );
}
