import React from 'react';

export default function MetricCards({ totalDIDs, totalNFTs, totalAudits, systemStatus }) {
  return (
    <div className="metrics-summary-bar">
      {/* Metric 1: Total Registered DIDs */}
      <div className="metric-card metric-did">
        <div className="metric-icon-box">👤</div>
        <div className="metric-details">
          <span className="metric-label">Registered DIDs</span>
          <h3 className="metric-value">{totalDIDs}</h3>
          <span className="metric-sub">On-Chain Identity State</span>
        </div>
        <div className="metric-glow"></div>
      </div>

      {/* Metric 2: Active Tokenized NFTs */}
      <div className="metric-card metric-nft">
        <div className="metric-icon-box">💎</div>
        <div className="metric-details">
          <span className="metric-label">Digital Assets (NFTs)</span>
          <h3 className="metric-value">{totalNFTs}</h3>
          <span className="metric-sub">Tokenized Provenance Assets</span>
        </div>
        <div className="metric-glow"></div>
      </div>

      {/* Metric 3: Ledger Audit Events */}
      <div className="metric-card metric-audit">
        <div className="metric-icon-box">📜</div>
        <div className="metric-details">
          <span className="metric-label">Audit Transactions</span>
          <h3 className="metric-value">{totalAudits}</h3>
          <span className="metric-sub">Immutable Transaction Logs</span>
        </div>
        <div className="metric-glow"></div>
      </div>

      {/* Metric 4: Platform Connection & Peer Latency */}
      <div className={`metric-card metric-status ${systemStatus.isOnline ? 'status-online' : 'status-offline'}`}>
        <div className="metric-icon-box">{systemStatus.isOnline ? '⚡' : '⚠️'}</div>
        <div className="metric-details">
          <span className="metric-label">Fabric Peer Status</span>
          <h3 className="metric-value">{systemStatus.isOnline ? 'ONLINE' : 'OFFLINE'}</h3>
          <span className="metric-sub">
            {systemStatus.isOnline ? `Latency: ${systemStatus.latency}ms` : 'Backend Unreachable'}
          </span>
        </div>
        <div className="metric-glow"></div>
      </div>
    </div>
  );
}
