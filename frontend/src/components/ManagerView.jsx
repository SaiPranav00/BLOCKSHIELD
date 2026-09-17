import React, { useState, useEffect } from 'react';
import {
  allocateNFT,
  transferNFT,
  getAssetsByOwner,
  verifyNFT,
  getAllNFTs,
  getAllDIDs,
} from '../services/api';

export default function ManagerView({ activeDID, notify, onViewProvenance }) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [nftsList, setNftsList] = useState([]);
  const [didsList, setDidsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Allocation Form
  const [allocTokenId, setAllocTokenId] = useState('');
  const [allocOwnerDid, setAllocOwnerDid] = useState('');

  // Transfer Form
  const [transTokenId, setTransTokenId] = useState('');
  const [transNewOwnerDid, setTransNewOwnerDid] = useState('');

  // Search Form
  const [searchDid, setSearchDid] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Verify Form
  const [verifyTokenId, setVerifyTokenId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const refreshManagerData = async () => {
    setLoading(true);
    try {
      const [nftsRes, didsRes] = await Promise.allSettled([
        getAllNFTs(),
        getAllDIDs(),
      ]);

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

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!allocTokenId.trim() || !allocOwnerDid.trim()) {
      return notify('Please fill in Token ID and Target Owner DID', 'error');
    }

    const cleanToken = sanitizeTokenId(allocTokenId);
    const cleanOwner = sanitizeDID(allocOwnerDid);

    try {
      await allocateNFT(cleanToken, {
        actorDID: activeDID,
        ownerDID: cleanOwner,
      });
      notify(`Asset ${cleanToken} successfully allocated to ${cleanOwner}`, 'success');
      setAllocTokenId('');
      setAllocOwnerDid('');
      refreshManagerData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transTokenId.trim() || !transNewOwnerDid.trim()) {
      return notify('Please fill in Token ID and New Owner DID', 'error');
    }

    const cleanToken = sanitizeTokenId(transTokenId);
    const cleanNewOwner = sanitizeDID(transNewOwnerDid);

    try {
      await transferNFT(cleanToken, {
        actorDID: activeDID,
        newOwnerDID: cleanNewOwner,
      });
      notify(`Asset ${cleanToken} transferred to ${cleanNewOwner}`, 'success');
      setTransTokenId('');
      setTransNewOwnerDid('');
      refreshManagerData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleSearchByOwner = async (e) => {
    e.preventDefault();
    if (!searchDid.trim()) return notify('Enter Owner DID to search', 'error');

    const cleanOwner = sanitizeDID(searchDid);

    try {
      const res = await getAssetsByOwner(cleanOwner);
      const data = res?.data || res || [];
      setSearchResults(Array.isArray(data) ? data : []);
      notify(`Found ${data.length} assets owned by ${cleanOwner}`, 'success');
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
        notify(`NFT Verification Failed: ${result.reason || 'Invalid token'}`, 'error');
      }
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const selectForAllocation = (tokenId) => {
    setAllocTokenId(tokenId);
    setActiveTab('allocate');
  };

  const selectForTransfer = (tokenId) => {
    setTransTokenId(tokenId);
    setActiveTab('transfer');
  };

  return (
    <div className="dashboard-container manager-dashboard">
      <div className="sub-nav">
        <button
          className={`sub-tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => { setActiveTab('catalog'); refreshManagerData(); }}
        >
          1. Asset Catalog ({nftsList.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'allocate' ? 'active' : ''}`}
          onClick={() => { setActiveTab('allocate'); refreshManagerData(); }}
        >
          2. Allocate Asset
        </button>
        <button
          className={`sub-tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => { setActiveTab('transfer'); refreshManagerData(); }}
        >
          3. Transfer Asset
        </button>
        <button
          className={`sub-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          4. Search Owner Assets
        </button>
        <button
          className={`sub-tab ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          5. Verify Authenticity
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: Asset Catalog (Full Visibility) */}
        {activeTab === 'catalog' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <div>
                <h3 className="card-title">All On-Chain Digital Assets</h3>
                <p className="card-desc">Complete ledger asset registry available for manager allocation & transfer operations.</p>
              </div>
              <button className="btn btn-xs btn-secondary" onClick={refreshManagerData} disabled={loading}>
                {loading ? 'Syncing...' : 'Refresh Catalog'}
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Token ID</th>
                    <th>Asset Title</th>
                    <th>Type</th>
                    <th>Current Owner</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nftsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-cell">
                        <p className="text-muted">No tokenized assets found on ledger. Mint assets in Admin view to begin.</p>
                      </td>
                    </tr>
                  ) : (
                    nftsList.map((nft, idx) => (
                      <tr key={idx}>
                        <td><code>{nft.tokenId}</code></td>
                        <td>{nft.assetName}</td>
                        <td><span className="type-pill">{nft.assetType}</span></td>
                        <td>
                          {nft.ownerDID ? (
                            <code>{nft.ownerDID}</code>
                          ) : (
                            <span className="badge badge-warning">UNASSIGNED</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${nft.status === 'REVOKED' ? 'status-revoked' : 'status-active'}`}>
                            {nft.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              className="btn btn-xs btn-outline"
                              onClick={() => selectForAllocation(nft.tokenId)}
                              title="Allocate asset to identity"
                            >
                              Allocate
                            </button>
                            <button
                              className="btn btn-xs btn-outline"
                              onClick={() => selectForTransfer(nft.tokenId)}
                              title="Transfer asset to new owner"
                            >
                              Transfer
                            </button>
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => onViewProvenance(nft.tokenId)}
                              title="Inspect full provenance timeline"
                            >
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

        {/* TAB 2: Allocate Asset */}
        {activeTab === 'allocate' && (
          <div className="card-grid">
            <div className="glass-card">
              <h3 className="card-title">Allocate Asset to Owner</h3>
              <p className="card-desc">Assign an unallocated asset or re-assign asset ownership to a registered identity.</p>

              <form onSubmit={handleAllocate} className="form-layout">
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
                  <label className="label">Target Owner DID:</label>
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
                    placeholder="Or type target DID (e.g. did:sih26125:EMP_001)..."
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
                <h3 className="card-title">Ledger Asset Registry ({nftsList.length})</h3>
                <button className="btn btn-xs btn-secondary" onClick={refreshManagerData}>Refresh</button>
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
                          <td>
                            {nft.ownerDID ? <code>{nft.ownerDID}</code> : <span className="badge badge-warning">UNASSIGNED</span>}
                          </td>
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

        {/* TAB 3: Transfer Asset */}
        {activeTab === 'transfer' && (
          <div className="card-grid">
            <div className="glass-card">
              <h3 className="card-title">Manager-Assisted Asset Transfer</h3>
              <p className="card-desc">Transfer asset ownership from current owner to a new registered owner DID.</p>

              <form onSubmit={handleTransfer} className="form-layout">
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
                <button className="btn btn-xs btn-secondary" onClick={refreshManagerData}>Refresh</button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token ID</th>
                      <th>Title</th>
                      <th>Owner DID</th>
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

        {/* TAB 4: Search */}
        {activeTab === 'search' && (
          <div className="glass-card">
            <h3 className="card-title">Search Assets Owned by Specific DID</h3>
            <p className="card-desc">Query all tokenized digital assets registered to an identity on-chain.</p>

            <form onSubmit={handleSearchByOwner} className="form-inline-row">
              {didsList.length > 0 ? (
                <select
                  className="input flex-1"
                  value={searchDid}
                  onChange={(e) => setSearchDid(e.target.value)}
                >
                  <option value="">-- Select DID from Registry --</option>
                  {didsList.map((d, idx) => (
                    <option key={idx} value={d.did}>
                      {d.did} [{d.role}]
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                type="text"
                className="input flex-1"
                value={searchDid}
                onChange={(e) => setSearchDid(e.target.value)}
                placeholder="Or enter Owner DID (e.g. did:sih26125:EMP_DR_SHARMA)..."
                required
              />
              <button type="submit" className="btn btn-primary">Search Assets</button>
            </form>

            <div className="results-container">
              <h4 className="section-subtitle">Search Results ({searchResults.length})</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token ID</th>
                      <th>Asset Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table-cell">
                          <p className="text-muted">No assets found for this owner DID</p>
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((item, idx) => (
                        <tr key={idx}>
                          <td><code>{item.tokenId}</code></td>
                          <td>{item.assetName}</td>
                          <td><span className="type-pill">{item.assetType}</span></td>
                          <td><span className="status-pill status-active">{item.status || 'ACTIVE'}</span></td>
                          <td>
                            <button className="btn btn-xs btn-outline" onClick={() => onViewProvenance(item.tokenId)}>
                              Provenance
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

        {/* TAB 5: Verify */}
        {activeTab === 'verify' && (
          <div className="glass-card card-narrow">
            <h3 className="card-title">Verify Asset On-Chain Authenticity</h3>
            <p className="card-desc">Check on-chain validity, active state, and owner authenticity of any token.</p>

            <form onSubmit={handleVerify} className="form-layout">
              <div className="form-group">
                <label className="label">Select or Enter Token ID:</label>
                {nftsList.length > 0 ? (
                  <select
                    className="input"
                    value={verifyTokenId}
                    onChange={(e) => setVerifyTokenId(e.target.value)}
                  >
                    <option value="">-- Select Token ID to Verify --</option>
                    {nftsList.map((nft, idx) => (
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
                <h4>Verification Outcome: {verifyResult.valid ? 'VALID & AUTHENTIC' : 'INVALID / REVOKED'}</h4>
                <p><strong>Token ID:</strong> {verifyResult.tokenId}</p>
                <p><strong>Asset Name:</strong> {verifyResult.assetName || 'N/A'}</p>
                <p><strong>Owner DID:</strong> {verifyResult.ownerDID || 'UNASSIGNED'}</p>
                <p><strong>Owner Status:</strong> {verifyResult.ownerStatus || 'N/A'}</p>
                <p><strong>Token Status:</strong> {verifyResult.status || 'N/A'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

