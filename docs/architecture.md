# System Architecture & Topology

## Overview
The SIH 2026 Platform (`SIH26125`) implements an enterprise blockchain backend using **Hyperledger Fabric 2.5** to manage Decentralized Identity, Role-Based Access Control, Digital Asset NFTs, and an Immutable Audit Trail.

```text
┌─────────────────────────────────────────────────────────────┐
│                 React Frontend / Dashboard                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST APIs
┌──────────────────────────────▼──────────────────────────────┐
│                    Node.js Express Backend                  │
│  - REST Routing & Input Validation                          │
│  - Public-Key Cryptographic Signature Verification           │
│  - @hyperledger/fabric-gateway Client SDK                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ gRPC / TLS
┌──────────────────────────────▼──────────────────────────────┐
│             Hyperledger Fabric Test Network                 │
│  - Channel: mychannel                                       │
│  - Orderer: Raft Consensus (Port 7050)                      │
│  - Org1 Peer: peer0.org1.example.com (Port 7051)            │
│  - Org2 Peer: peer0.org2.example.com (Port 9051)            │
│  - Fabric CA: ca_org1 (Port 7054), ca_org2 (Port 8054)      │
│  - State Database: CouchDB (Ports 5984, 7984)               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Go Chaincode (sih26125)                  │
│  - DID Management (Create, Update, Revoke, Verify)          │
│  - RBAC Permission Check (ADMIN, MANAGER, AUDITOR, USER)    │
│  - NFT Asset Lifecycle (Mint, Allocate, Transfer, Revoke)   │
│  - Immutable Audit Log Generation (ALLOWED / DENIED)        │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

1. **Hyperledger Fabric 2.5 Ledger**:
   - Stores world state in CouchDB JSON documents.
   - Enforces transaction endorsement policies across Org1MSP and Org2MSP.

2. **Go Chaincode (`sih26125`)**:
   - Compiled using Fabric Contract API v1.2.
   - Enforces permission checks directly inside chaincode functions before modifying ledger state.

3. **Node.js REST Gateway**:
   - Uses `@hyperledger/fabric-gateway` v1 SDK with gRPC TLS connections.
   - Converts HTTP requests into Fabric `submitTransaction` (edits ledger) or `evaluateTransaction` (queries ledger).
