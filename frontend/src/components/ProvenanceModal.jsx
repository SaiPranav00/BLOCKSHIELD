import React from 'react';

export default function ProvenanceModal({ tokenId, historyData, onClose }) {
  if (!tokenId) return null;

  const history = Array.isArray(historyData) ? historyData : (historyData?.data || []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Asset Provenance & Custody Timeline</h3>
            <p className="modal-subtitle">Token ID: <code>{tokenId}</code></p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-state-box py-4">
              <p>No ledger transaction history recorded for this asset token.</p>
            </div>
          ) : (
            <div className="timeline">
              {history.map((record, index) => {
                const nft = record.nft || record.value || {};
                const timestamp = record.timestamp
                  ? new Date(Number(record.timestamp) * 1000).toLocaleString()
                  : record.createdAt || 'Ledger Genesis State';

                const custodian = nft.custodian || nft.ownerDID || 'UNASSIGNED';

                return (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="tx-id-badge">Tx: {record.txId ? record.txId.slice(0, 20) + '...' : `TX_GENESIS_0${index + 1}`}</span>
                        <span className="timestamp">{timestamp}</span>
                      </div>
                      <div className="timeline-details">
                        <p><strong>Asset Name:</strong> {nft.assetName || nft.name || 'N/A'} ({nft.assetId || 'N/A'})</p>
                        <p><strong>Asset Category:</strong> <span className="type-pill">{nft.assetType || 'HARDWARE'}</span></p>
                        <p><strong>Legal Owner:</strong> <span className="badge badge-primary">{nft.legalOwner || 'BEL'}</span></p>
                        <p><strong>Current Custodian:</strong> <code>{custodian}</code></p>
                        {nft.department && <p><strong>Department / Location:</strong> {nft.department} - {nft.location || 'N/A'}</p>}
                        <p><strong>Ledger Status:</strong> <span className={`status-pill ${nft.status === 'ACTIVE' || nft.status === 'TRANSFERRED' ? 'status-active' : nft.status === 'TRANSFER_PENDING' ? 'status-pending' : 'status-revoked'}`}>{nft.status || 'ACTIVE'}</span></p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer mt-3 flex-between">
          <span className="text-sm text-muted">Immutable Hyperledger Fabric Ledger Records</span>
          <button className="btn btn-secondary" onClick={onClose}>Close Timeline</button>
        </div>
      </div>
    </div>
  );
}
