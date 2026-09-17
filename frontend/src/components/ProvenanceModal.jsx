import React from 'react';

export default function ProvenanceModal({ tokenId, historyData, onClose }) {
  if (!tokenId) return null;

  const history = Array.isArray(historyData) ? historyData : (historyData?.data || []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Provenance & Ownership History</h3>
            <p className="modal-subtitle">Token ID: <code>{tokenId}</code></p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-state-box py-4">
              <p>No transaction history recorded for this token.</p>
            </div>
          ) : (
            <div className="timeline">
              {history.map((record, index) => {
                const nft = record.nft || record.value || {};
                const timestamp = record.timestamp
                  ? new Date(Number(record.timestamp) * 1000).toLocaleString()
                  : record.createdAt || 'Genesis Token Minting';

                return (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="tx-id-badge">Tx: {record.txId ? record.txId.slice(0, 20) + '...' : `TX_GENESIS_0${index + 1}`}</span>
                        <span className="timestamp">{timestamp}</span>
                      </div>
                      <div className="timeline-details">
                        <p><strong>Asset Title:</strong> {nft.assetName || nft.name || 'N/A'}</p>
                        <p><strong>Asset Type:</strong> <span className="type-pill">{nft.assetType || 'CERTIFICATE'}</span></p>
                        <p><strong>Owner DID:</strong> <code>{nft.ownerDID || nft.creatorDID || 'UNASSIGNED'}</code></p>
                        <p><strong>Token State:</strong> <span className={`status-pill ${nft.status === 'ACTIVE' ? 'status-active' : 'status-revoked'}`}>{nft.status || 'ACTIVE'}</span></p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer mt-3 flex-between">
          <span className="text-sm text-muted">Hyperledger Ledger Records</span>
          <button className="btn btn-secondary" onClick={onClose}>Close Timeline</button>
        </div>
      </div>
    </div>
  );
}

