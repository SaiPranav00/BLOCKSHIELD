import React, { useState, useEffect } from 'react';
import {
  getAuditLogs,
  getAuditLogsByResource,
  getAllDIDs,
} from '../services/api';

export default function AuditorView({ notify, onViewProvenance }) {
  const [activeTab, setActiveTab] = useState('all-logs');
  
  const [auditList, setAuditList] = useState([]);
  const [didsList, setDidsList] = useState([]);

  const [auditFilter, setAuditFilter] = useState('');
  const [didSearch, setDidSearch] = useState('');

  const [resourceSearch, setResourceSearch] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);

  const [provTokenId, setProvTokenId] = useState('');

  const refreshAuditData = async () => {
    try {
      const [auditRes, didsRes] = await Promise.allSettled([
        getAuditLogs(),
        getAllDIDs(),
      ]);

      if (auditRes.status === 'fulfilled') {
        const data = auditRes.value?.data || auditRes.value || [];
        setAuditList(Array.isArray(data) ? data : []);
      }
      if (didsRes.status === 'fulfilled') {
        const data = didsRes.value?.data || didsRes.value || [];
        setDidsList(Array.isArray(data) ? data : []);
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
    if (!resourceSearch.trim()) return notify('Enter Token ID or DID to filter', 'error');

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

  const filteredAuditsList = auditList.filter(item =>
    (item.action || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
    (item.resourceId || '').toLowerCase().includes(auditFilter.toLowerCase()) ||
    (item.actorDID || '').toLowerCase().includes(auditFilter.toLowerCase())
  );

  const filteredDIDsList = didsList.filter(item =>
    (item.did || '').toLowerCase().includes(didSearch.toLowerCase()) ||
    (item.role || '').toLowerCase().includes(didSearch.toLowerCase())
  );

  return (
    <div className="dashboard-container auditor-dashboard">
      <div className="sub-nav">
        <button
          className={`sub-tab ${activeTab === 'all-logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-logs')}
        >
          1. All Audit Logs ({auditList.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'filter-resource' ? 'active' : ''}`}
          onClick={() => setActiveTab('filter-resource')}
        >
          2. Resource Audit Search
        </button>
        <button
          className={`sub-tab ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          3. Identity Registry ({didsList.length})
        </button>
        <button
          className={`sub-tab ${activeTab === 'provenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('provenance')}
        >
          4. Asset Provenance Inspector
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: All Audit Logs */}
        {activeTab === 'all-logs' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <h3 className="card-title">Immutable Ledger Audit Trail</h3>
              <div className="flex-gap">
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Search Audit Logs..."
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
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditsList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        <p className="text-muted">No audit transactions recorded on ledger</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditsList.map((log, idx) => (
                      <tr key={idx}>
                        <td className="text-sm">{log.timestamp ? new Date(Number(log.timestamp) * 1000).toLocaleString() : 'N/A'}</td>
                        <td><span className="action-pill">{log.action}</span></td>
                        <td><code>{log.resourceId}</code></td>
                        <td><span className={`result-pill ${log.result === 'ALLOWED' ? 'res-allowed' : 'res-denied'}`}>{log.result}</span></td>
                        <td><code>{log.actorDID && log.actorDID.startsWith('eDUw') ? 'did:sih26125:ADMIN001 (Fabric CA Admin)' : (log.actorDID || 'SYSTEM')}</code></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Filter by Resource */}
        {activeTab === 'filter-resource' && (
          <div className="glass-card">
            <h3 className="card-title">Search Audit Logs by Resource ID</h3>
            <p className="card-desc">Filter all transaction attempts for a specific DID or Token ID.</p>

            <form onSubmit={handleFilterResource} className="form-inline-row">
              <input
                type="text"
                className="input"
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                placeholder="Enter Token ID or DID (e.g. NFT-2026-PATENT-001 or did:sih26125:ORG_ISRO)..."
                required
              />
              <button type="submit" className="btn btn-primary">Search Audit Trail</button>
            </form>

            <div className="results-container">
              <h4 className="section-subtitle">Audit Entries Found ({filteredLogs.length})</h4>
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
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table-cell">
                          <p className="text-muted">No audit transactions found for this resource ID</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td className="text-sm">{log.timestamp ? new Date(Number(log.timestamp) * 1000).toLocaleString() : 'N/A'}</td>
                          <td><span className="action-pill">{log.action}</span></td>
                          <td><code>{log.resourceId}</code></td>
                          <td><span className={`result-pill ${log.result === 'ALLOWED' ? 'res-allowed' : 'res-denied'}`}>{log.result}</span></td>
                          <td><code>{log.actorDID && log.actorDID.startsWith('eDUw') ? 'did:sih26125:ADMIN001 (Fabric CA Admin)' : (log.actorDID || 'SYSTEM')}</code></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Registry */}
        {activeTab === 'registry' && (
          <div className="glass-card">
            <div className="flex-between card-header-row mb-3">
              <h3 className="card-title">Identity Compliance Registry ({didsList.length})</h3>
              <div className="flex-gap">
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Filter DIDs..."
                  value={didSearch}
                  onChange={(e) => setDidSearch(e.target.value)}
                />
                <button className="btn btn-xs btn-secondary" onClick={refreshAuditData}>Refresh</button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>DID Identifier</th>
                    <th>Assigned Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDIDsList.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty-table-cell">
                        <p className="text-muted">No registered identities found on ledger</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDIDsList.map((item, idx) => (
                      <tr key={idx}>
                        <td><code>{item.did}</code></td>
                        <td><span className={`role-pill role-${(item.role || 'USER').toLowerCase()}`}>{item.role}</span></td>
                        <td><span className={`status-pill ${item.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{item.status || 'ACTIVE'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Provenance Timeline Inspector */}
        {activeTab === 'provenance' && (
          <div className="glass-card card-narrow">
            <h3 className="card-title">Inspect Token Ownership Provenance</h3>
            <p className="card-desc">Inspect complete immutable transfer trail for any token ID.</p>

            <form onSubmit={handleViewProvenanceDirect} className="form-layout">
              <div className="form-group">
                <label className="label">Token ID:</label>
                <input
                  type="text"
                  className="input"
                  value={provTokenId}
                  onChange={(e) => setProvTokenId(e.target.value)}
                  placeholder="e.g. NFT-2026-PATENT-001"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Open Provenance Timeline
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
