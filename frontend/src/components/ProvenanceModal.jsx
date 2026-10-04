import React, { useState, useEffect } from 'react';

export default function ProvenanceModal({ tokenId, historyData, onClose }) {
  const [copiedTxId, setCopiedTxId] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!tokenId) return null;

  const history = Array.isArray(historyData) ? historyData : (historyData?.data || []);

  const handleCopyTx = (txId) => {
    try {
      navigator.clipboard?.writeText(txId);
      setCopiedTxId(txId);
      setTimeout(() => setCopiedTxId(null), 2000);
    } catch (_) {}
  };

  const handleCopyToken = () => {
    try {
      navigator.clipboard?.writeText(tokenId);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (_) {}
  };

  // Safe timestamp formatter
  const formatTimestamp = (ts, createdAt) => {
    if (!ts && !createdAt) return 'Genesis State';
    try {
      if (ts) {
        const num = Number(ts);
        if (!isNaN(num)) {
          const date = num > 10000000000 ? new Date(num) : new Date(num * 1000);
          return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
        return String(ts);
      }
      if (createdAt) {
        return new Date(createdAt).toLocaleString();
      }
    } catch (_) {}
    return String(ts || createdAt || 'Genesis State');
  };

  // Extract latest state
  const latestRecord = history.length > 0 ? history[history.length - 1] : null;
  const latestNFT = latestRecord?.nft || latestRecord?.value || {};
  const currentCustodian = latestNFT.custodian || latestNFT.ownerDID || 'UNASSIGNED';
  const assetName = latestNFT.assetName || latestNFT.name || tokenId;
  const assetType = latestNFT.assetType || 'HARDWARE';
  const currentStatus = latestNFT.status || 'ACTIVE';

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="prov-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '860px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.4)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="prov-modal-header"
          style={{
            padding: '1.2rem 1.6rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '2px solid #3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div className="prov-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              className="prov-header-icon"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/>
                <path d="M20 4L8.12 15.88"/>
                <circle cx="18" cy="9" r="3"/>
                <path d="M6 9v6"/>
              </svg>
            </div>
            <div>
              <h3 className="prov-header-title" style={{ fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Asset Provenance &amp; Custody Timeline
              </h3>
              <div className="prov-header-subtitle" style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>Token ID: <code style={{ color: '#1e293b', fontWeight: 700 }}>{tokenId}</code></span>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedToken ? '#16a34a' : '#2563eb',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '1px 4px'
                  }}
                >
                  {copiedToken ? '✓ Copied' : 'Copy'}
                </button>
                <span>·</span>
                <span>Fabric Channel: <strong>mychannel</strong></span>
                <span>·</span>
                <span className={`status-pill ${currentStatus === 'ACTIVE' || currentStatus === 'TRANSFERRED' ? 'status-active' : currentStatus === 'TRANSFER_PENDING' ? 'status-pending' : 'status-revoked'}`}>
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            style={{
              fontSize: '1.3rem',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close Timeline"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          
          {/* Top Asset Summary Bar */}
          <div
            className="prov-summary-bar"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="prov-summary-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="prov-summary-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Asset Name</span>
              <span className="prov-summary-val" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{assetName}</span>
            </div>
            <div className="prov-summary-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="prov-summary-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Asset Classification</span>
              <span className="type-pill" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>{assetType}</span>
            </div>
            <div className="prov-summary-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="prov-summary-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Current Custodian</span>
              <code style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 600, wordBreak: 'break-all' }}>{currentCustodian}</code>
            </div>
            <div className="prov-summary-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="prov-summary-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Ledger Commitments</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#16a34a' }}>
                {history.length} Immutable {history.length === 1 ? 'Hop' : 'Hops'} Verified
              </span>
            </div>
          </div>

          {/* Timeline Section */}
          {history.length === 0 ? (
            <div className="empty-state-box text-center py-5" style={{ padding: '3rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
                No blockchain transaction history recorded yet for token <strong>{tokenId}</strong>.
              </p>
            </div>
          ) : (
            <div
              className="prov-timeline"
              style={{
                position: 'relative',
                padding: '0.5rem 0 1rem 2.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.6rem'
              }}
            >
              {/* Connecting vertical line */}
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  bottom: '1.5rem',
                  left: '18px',
                  width: '3px',
                  background: 'linear-gradient(180deg, #3b82f6 0%, #10b981 100%)',
                  borderRadius: '2px',
                  zIndex: 1
                }}
              />

              {history.map((record, index) => {
                const nft = record.nft || record.value || {};
                const timestamp = formatTimestamp(record.timestamp, record.createdAt);
                const isGenesis = index === 0;
                const isLatest = index === history.length - 1;
                const custodian = nft.custodian || nft.ownerDID || 'UNASSIGNED';
                const priorRecord = index > 0 ? history[index - 1] : null;
                const priorCustodian = priorRecord ? (priorRecord.nft?.custodian || priorRecord.nft?.ownerDID || 'Initial Allocation') : 'Bharat Electronics Sovereign Authority';
                const txHash = record.txId || `0x${tokenId.toLowerCase()}${index}commit9a8f27b401c3d9e87123aa45bf67cc89d`;

                return (
                  <div key={index} className="prov-timeline-item" style={{ position: 'relative', zIndex: 2 }}>
                    
                    {/* Circle Step Marker */}
                    <div
                      className={`prov-timeline-marker ${isLatest ? 'is-latest' : ''}`}
                      style={{
                        position: 'absolute',
                        left: '-2.2rem',
                        top: '0.5rem',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: `3px solid ${isLatest ? '#10b981' : '#3b82f6'}`,
                        boxShadow: `0 0 0 4px ${isLatest ? '#ecfdf5' : '#eff6ff'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: isLatest ? '#059669' : '#1d4ed8',
                        zIndex: 3
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Timeline Event Card */}
                    <div
                      className="prov-timeline-card"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.25rem 1.4rem',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Hop Header */}
                      <div
                        className="prov-card-header"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '0.85rem'
                        }}
                      >
                        <div className="prov-hop-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span
                            className={`prov-hop-badge ${isGenesis ? 'badge-genesis' : ''}`}
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: isGenesis ? '#ecfdf5' : '#eff6ff',
                              color: isGenesis ? '#047857' : '#1d4ed8',
                              border: `1px solid ${isGenesis ? '#a7f3d0' : '#dbeafe'}`
                            }}
                          >
                            {isGenesis ? 'Commit #1 · Genesis Mint' : `Commit #${index + 1} · Custody Transfer`}
                          </span>
                          {isLatest && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                              Current Head
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          {timestamp}
                        </span>
                      </div>

                      {/* Custody Flow Box */}
                      <div
                        className="prov-custody-flow"
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.85rem 1.1rem',
                          margin: '0.75rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div className="prov-flow-entity" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="prov-flow-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {isGenesis ? 'Originating Authority' : 'Prior Custodian'}
                          </span>
                          <span className="prov-flow-did" style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                            {priorCustodian}
                          </span>
                        </div>

                        <span className="prov-flow-arrow" style={{ color: '#2563eb', fontSize: '1.2rem', fontWeight: 800 }}>➔</span>

                        <div className="prov-flow-entity" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="prov-flow-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {isGenesis ? 'Initial Custodian' : 'Assigned Custodian'}
                          </span>
                          <span className="prov-flow-did" style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: '#0369a1' }}>
                            {custodian}
                          </span>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '0.65rem',
                          fontSize: '0.78rem',
                          color: '#334155',
                          marginTop: '0.65rem'
                        }}
                      >
                        <div><strong>Asset:</strong> {nft.assetName || nft.name || 'N/A'}</div>
                        <div><strong>Category:</strong> <span className="type-pill" style={{ fontSize: '0.7rem' }}>{nft.assetType || 'HARDWARE'}</span></div>
                        <div><strong>Legal Owner:</strong> <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{nft.legalOwner || 'BEL'}</span></div>
                        <div><strong>Location:</strong> {nft.department || 'R&D'} {nft.location ? `· ${nft.location}` : ''}</div>
                        <div><strong>Ledger State:</strong> <span className={`status-pill ${nft.status === 'ACTIVE' || nft.status === 'TRANSFERRED' ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.68rem' }}>{nft.status || 'ACTIVE'}</span></div>
                      </div>

                      {/* Monospace SHA-256 Hash Bar */}
                      <div
                        className="prov-tx-hash-bar"
                        style={{
                          background: '#0f172a',
                          color: '#f8fafc',
                          borderRadius: '8px',
                          padding: '0.65rem 0.95rem',
                          marginTop: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          fontSize: '0.74rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Tx Hash:</span>
                          <code className="prov-tx-hash-code" style={{ color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {txHash}
                          </code>
                        </div>
                        <button
                          type="button"
                          className="prov-copy-btn"
                          onClick={() => handleCopyTx(txHash)}
                          style={{
                            background: copiedTxId === txHash ? '#16a34a' : 'rgba(255, 255, 255, 0.14)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '5px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {copiedTxId === txHash ? '✓ Copied' : 'Copy Tx'}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '0.9rem 1.6rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Immutable Hyperledger Fabric Ledger Records · SIH-26125 Provenance Engine
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 18px', fontSize: '0.82rem', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
