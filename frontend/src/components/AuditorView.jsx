import React, { useState, useEffect } from 'react';
import {
  getAuditLogs,
  getAuditLogsByResource,
  getAllDIDs,
  getAllNFTs,
} from '../services/api';

export default function AuditorView({ notify, onViewProvenance }) {
  const [activeTab, setActiveTab] = useState('all-logs');
  
  const [auditList, setAuditList] = useState([]);
  const [didsList, setDidsList] = useState([]);
  const [nftsList, setNftsList] = useState([]);

  const [auditFilter, setAuditFilter] = useState('');
  const [didSearch, setDidSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [deniedOnly, setDeniedOnly] = useState(false);

  const [provTokenId, setProvTokenId] = useState('');

  const refreshAuditData = async () => {
    try {
      const [auditRes, didsRes, nftsRes] = await Promise.allSettled([
        getAuditLogs(),
        getAllDIDs(),
        getAllNFTs(),
      ]);

      if (auditRes.status === 'fulfilled') {
        const data = auditRes.value?.data || auditRes.value || [];
        setAuditList(Array.isArray(data) ? data : []);
      }
      if (didsRes.status === 'fulfilled') {
        const data = didsRes.value?.data || didsRes.value || [];
        setDidsList(Array.isArray(data) ? data : []);
      }
      if (nftsRes.status === 'fulfilled') {
        const data = nftsRes.value?.data || nftsRes.value || [];
        setNftsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshAuditData();
  }, []);

  const sanitizeTokenId = (raw) => {
    if (!raw) return '';
    let clean = raw.trim().replace(/[^\w\d\-:_]/g, '');
    if (!clean.startsWith('NFT-')) {
      clean = `NFT-${clean.replace(/^NFT-?/i, '')}`;
    }
    return clean;
  };

  const handleFilterResource = async (e) => {
    e.preventDefault();
    if (!resourceSearch.trim()) return notify('Enter Token ID, DID, or TxID to filter', 'error');

    let cleanQuery = resourceSearch.trim();
    if (cleanQuery.toUpperCase().startsWith('NFT') || !cleanQuery.includes(':')) {
      cleanQuery = sanitizeTokenId(cleanQuery);
    }

    try {
      const res = await getAuditLogsByResource(cleanQuery);
      const data = res?.data || res || [];
      setFilteredLogs(Array.isArray(data) ? data : []);
      notify(`Found ${data.length} audit entries for ${cleanQuery}`, 'success');
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleViewProvenanceDirect = (e) => {
    e.preventDefault();
    if (!provTokenId.trim()) return notify('Enter Token ID', 'error');
    const cleanToken = sanitizeTokenId(provTokenId);
    onViewProvenance(cleanToken);
  };

  const filteredAuditsList = auditList.filter(item => {
    if (deniedOnly && item.result !== 'DENIED') return false;
    return (
      (item.action || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
      (item.resourceId || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
      (item.actorDID || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
      (item.details || '').toLowerCase().includes(auditFilter.toLowerCase())
    );
  });

  const filteredDIDsList = didsList.filter(item =>
    (item.did || '').toLowerCase().includes(didSearch.toLowerCase()) ||
    (item.role || '').toLowerCase().includes(didSearch.toLowerCase()) ||
    (item.department || '').toLowerCase().includes(didSearch.toLowerCase())
  );

  return (
    <div className="dashboard-container auditor-dashboard">
      <div className="sub-nav">
        <button
          className={`sub-tab ${activeTab === 'all-logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-logs')}
        >
          1. Immutable Audit Stream ({auditList.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'filter-resource' ? 'active' : ''}`}
          onClick={() => setActiveTab('filter-resource')}
        >
          2. Resource / Tx Audit Lookup
        </button>
        <button
          className={`sub-tab ${activeTab === 'provenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('provenance')}
        >
          3. Asset Custody Inspector ({nftsList.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          4. Identity Directory ({didsList.length})
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: All Audit Logs */}
        {activeTab === 'all-logs' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <div>
                <h3 className="card-title">Immutable Hyperledger Audit Trail</h3>
                <p className="text-xs text-muted">Read-only tamper-evident event stream generated natively by Fabric chaincode.</p>
              </div>
              <div className="flex-gap align-center">
                <label className="checkbox-label flex-gap align-center text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deniedOnly}
                    onChange={(e) => setDeniedOnly(e.target.checked)}
                  />
                  <span>Security Alerts Only (DENIED)</span>
                </label>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Search Event, Actor, Resource..."
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                />
                <button className="btn btn-xs btn-secondary" onClick={refreshAuditData}>Refresh</button>
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
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">No audit events match your filter criteria.</td>
                    </tr>
                  ) : (
                    filteredAuditsList.map((log, index) => {
                      const isDenied = log.result === 'DENIED';
                      const formattedTime = log.timestamp && !isNaN(log.timestamp)
                        ? new Date(Number(log.timestamp) * 1000).toLocaleString()
                        : log.timestamp || 'N/A';

                      return (
                        <tr key={log.eventId || index} className={isDenied ? 'row-denied' : ''}>
                          <td className="text-xs">{formattedTime}</td>
                          <td><span className="type-pill">{log.action}</span></td>
                          <td><code>{log.resourceId}</code></td>
                          <td>
                            <span className={`status-pill ${isDenied ? 'status-revoked' : 'status-active'}`}>
                              {log.result}
                            </span>
                          </td>
                          <td><code>{log.actorDID}</code></td>
                          <td className="text-xs text-muted">{log.details || 'N/A'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Resource / Tx Audit Lookup */}
        {activeTab === 'filter-resource' && (
          <div className="glass-card">
            <h3 className="card-title mb-2">Resource & Transaction Audit Lookup</h3>
            <p className="text-sm text-muted mb-4">
              Query specific audit events tied to an asset Token ID (e.g. <code>NFT-1001</code>) or DID.
            </p>

            <form onSubmit={handleFilterResource} className="flex-gap mb-4 max-w-lg">
              <input
                type="text"
                className="input"
                placeholder="Enter Token ID or DID (e.g. NFT-1001)..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">Search Audit Trail</button>
            </form>

            {filteredLogs.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Result</th>
                      <th>Actor DID</th>
                      <th>Audit Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.eventId || idx} className={log.result === 'DENIED' ? 'row-denied' : ''}>
                        <td><code>{log.eventId}</code></td>
                        <td className="text-xs">{log.timestamp && !isNaN(log.timestamp) ? new Date(Number(log.timestamp) * 1000).toLocaleString() : log.timestamp}</td>
                        <td><span className="type-pill">{log.action}</span></td>
                        <td><span className={`status-pill ${log.result === 'DENIED' ? 'status-revoked' : 'status-active'}`}>{log.result}</span></td>
                        <td><code>{log.actorDID}</code></td>
                        <td className="text-xs">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Asset Custody Inspector */}
        {activeTab === 'provenance' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <h3 className="card-title">Asset Provenance & Custody Roster</h3>
              <form onSubmit={handleViewProvenanceDirect} className="flex-gap">
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Enter Token ID..."
                  value={provTokenId}
                  onChange={(e) => setProvTokenId(e.target.value)}
                />
                <button type="submit" className="btn btn-xs btn-primary">Inspect Timeline</button>
              </form>
            </div>

            <div className="grid grid-3">
              {nftsList.map((asset) => (
                <div key={asset.tokenId} className="asset-card">
                  <div className="asset-header">
                    <span className="type-pill">{asset.assetType || 'HARDWARE'}</span>
                    <span className={`status-pill ${asset.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{asset.status}</span>
                  </div>
                  <h4 className="asset-title">{asset.assetName || asset.name}</h4>
                  <p className="asset-id">Token ID: <code>{asset.tokenId}</code></p>
                  {asset.assetId && <p className="asset-id">Asset ID: <code>{asset.assetId}</code></p>}
                  <div className="asset-meta text-xs my-2">
                    <p><strong>Legal Owner:</strong> <span className="badge badge-primary">{asset.legalOwner || 'BEL'}</span></p>
                    <p><strong>Custodian:</strong> <code>{asset.custodian || asset.ownerDID}</code></p>
                    <p><strong>Department:</strong> {asset.department || 'R&D'}</p>
                  </div>
                  <button
                    className="btn btn-xs btn-secondary w-full mt-2"
                    onClick={() => onViewProvenance(asset.tokenId)}
                  >
                    View Visual History Timeline
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Identity Directory */}
        {activeTab === 'registry' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <h3 className="card-title">Identity & Public Key Registry</h3>
              <input
                type="text"
                className="input input-sm"
                placeholder="Search DID or Role..."
                value={didSearch}
                onChange={(e) => setDidSearch(e.target.value)}
              />
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>DID</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Public Key Preview</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDIDsList.map((didItem) => (
                    <tr key={didItem.did}>
                      <td><code>{didItem.did}</code></td>
                      <td><span className="type-pill">{didItem.role}</span></td>
                      <td>{didItem.department || 'R&D'}</td>
                      <td className="text-xs text-muted"><code>{(didItem.publicKey || 'RSA-2048').slice(0, 30)}...</code></td>
                      <td><span className={`status-pill ${didItem.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{didItem.status}</span></td>
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
