# Fabric Transaction Flow

## Submit vs. Evaluate Transactions

### State-Changing Transactions (`submitTransaction`)
- **Functions**: `CreateDID`, `UpdateDID`, `RevokeDID`, `AssignRole`, `MintNFT`, `AllocateNFT`, `TransferNFT`, `RevokeNFT`.
- **Workflow**:
  1. Proposal built by Gateway SDK.
  2. Endorsement by peer nodes (peer0.org1 and peer0.org2).
  3. Endorsements submitted to Raft Orderer.
  4. Block generated and broadcast to channel.
  5. Ledger state committed across all peers.
  6. Audit log entry written to world state.

### Read-Only Queries (`evaluateTransaction`)
- **Functions**: `GetDID`, `GetAllDIDs`, `GetRole`, `GetNFT`, `GetAllNFTs`, `GetAssetsByOwnerDID`, `GetNFTHistory`, `VerifyNFT`, `GetAuditLogs`, `GetAuditLogsByResource`.
- **Workflow**:
  1. Query sent directly to target peer node.
  2. Peer evaluates chaincode against current CouchDB world state.
  3. Result returned immediately without orderer interaction or block generation.
