# SIH 2026: Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management

> **Problem Statement ID**: SIH26125  
> **Blockchain Technology**: Hyperledger Fabric 2.5, Fabric CA, CouchDB, Go Chaincode (`fabric-contract-api-go`), Node.js, Express.js, `@hyperledger/fabric-gateway` SDK.

---

## 1. Project Overview

This repository provides the complete **Backend and Blockchain Layer** for the SIH 2026 Problem Statement SIH26125. The platform establishes an enterprise-grade, decentralised identity and digital asset governance network.

### Five Core Connected Components
1. **Decentralized Identity (DID)**: W3C-inspired DIDs (`did:sih26125:<id>`) managing registered public keys, identity status, and roles without storing private keys on-chain.
2. **Role-Based Access Control (RBAC)**: Configurable permission model (`ADMIN`, `MANAGER`, `AUDITOR`, `USER`) enforced directly inside Go chaincode.
3. **NFT Digital Asset Model**: Unique tokenized records (`tokenId`, `assetName`, `assetType`, `metadata`, `creatorDID`, `ownerDID`, `status`).
4. **NFT Lifecycle Management**: Minting (Admin-only), Allocation, Transfer, Revocation, Verification, and Ownership Search by Owner DID.
5. **Immutable Audit Trail**: On-ledger event logging recording all state changes and access attempts (`ALLOWED` and `DENIED`).

---

## 2. System Architecture

```text
React Dashboard (Separate Frontend)
       │
       ▼ (REST API / HTTP JSON)
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Express Backend                  │
│  - Endpoint Controllers & Input Validation                  │
│  - Node.js `crypto` Signature Verification                  │
│  - `@hyperledger/fabric-gateway` SDK Connection             │
└──────────────────────────────┬──────────────────────────────┘
                               │ gRPC TLS (Port 7051)
┌──────────────────────────────▼──────────────────────────────┐
│             Hyperledger Fabric Test Network                 │
│  - Channel: mychannel                                       │
│  - Orderer: Raft Consensus (Port 7050)                      │
│  - Peers: peer0.org1 (7051), peer0.org2 (9051)              │
│  - State DB: CouchDB (5984, 7984)                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Go Chaincode (sih26125)                  │
│  - DID Registry & Verification                              │
│  - Chaincode-Level RBAC Authorization                       │
│  - NFT Minting, Allocation, Transfer & Revocation           │
│  - On-Ledger Audit Event Generation                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

```text
.
├── blockchain/
│   ├── chaincode/
│   │   ├── main.go               # Contract initialization & Ping
│   │   ├── identity.go           # DID management & verification
│   │   ├── rbac.go               # RBAC permission check & role assignment
│   │   ├── nft.go                # NFT lifecycle, history & search
│   │   ├── audit.go              # On-ledger audit logging
│   │   ├── identity_test.go      # Chaincode unit tests
│   │   └── go.mod
│   └── network/                  # Fabric test-network & binaries
├── backend/
│   ├── src/
│   │   ├── app.js                # Express app & route mounting
│   │   ├── server.js             # HTTP server entry point
│   │   ├── fabric/gateway.js     # @hyperledger/fabric-gateway connection
│   │   ├── crypto/didCrypto.js   # Cryptographic signature verification
│   │   ├── controllers/          # Identity, Role, NFT, Audit controllers
│   │   └── routes/               # API routes
│   ├── package.json
│   └── .env
├── scripts/
│   ├── network-up.sh            # Starts Fabric network & CouchDB
│   ├── deploy-chaincode.sh      # Packages & deploys Go chaincode
│   ├── bootstrap.sh             # Seeds ADMIN, MANAGER, AUDITOR, USER DIDs
│   ├── test-all.sh              # 17-Step E2E Automated Test Suite
│   └── network-down.sh          # Stops network & cleans up containers
├── docs/
│   ├── api.md                   # Complete REST API specification
│   ├── architecture.md          # Architecture overview
│   ├── did.md                   # DID specification
│   ├── rbac.md                  # RBAC permission matrix
│   ├── nft.md                   # NFT lifecycle & data model
│   └── transaction-flow.md      # Fabric submit vs evaluate flow
└── README.md
```

---

## 4. Quick Start & Execution Commands

### Prerequisites
- Docker & Docker Compose v2+
- Go 1.22+
- Node.js v18+ & npm

### Step 1: Start Fabric Network
```bash
./scripts/network-up.sh
```

### Step 2: Deploy Go Chaincode
```bash
./scripts/deploy-chaincode.sh
```

### Step 3: Start Node.js REST API Server
```bash
cd backend
npm install
npm start
```
The REST API will start on `http://localhost:5000`.

### Step 4: Seed Bootstrap Demo Data
```bash
./scripts/bootstrap.sh
```

### Step 5: Run Complete End-to-End Test Suite
```bash
./scripts/test-all.sh
```

Expected Output:
```text
=======================================================
=== TEST SUMMARY ASSERTION CHECK ===
=======================================================
DID Creation         ✓
Role Assignment      ✓
NFT Minting          ✓
NFT Allocation       ✓
NFT Search           ✓
NFT Verification     ✓
NFT Transfer         ✓
Unauthorized Test    ✓
Audit Trail          ✓
NFT Revocation       ✓
End-to-End Test      ✓
=======================================================
```

---

## 5. REST API Overview

| Endpoint | Method | Role | Description |
|---|:---:|:---:|---|
| `/api/dids` | POST | ADMIN | Register a new DID |
| `/api/dids/:did` | GET | ALL | Fetch DID record |
| `/api/dids/verify` | POST | ALL | Verify cryptographic signature |
| `/api/roles/assign` | POST | ADMIN | Assign/update DID role |
| `/api/nfts/mint` | POST | ADMIN | Mint new NFT asset |
| `/api/nfts/:tokenId/allocate` | POST | ADMIN/MANAGER | Allocate NFT to DID |
| `/api/nfts/:tokenId/transfer` | POST | OWNER/ADMIN | Transfer active NFT |
| `/api/nfts/:tokenId/revoke` | POST | ADMIN | Revoke NFT asset |
| `/api/nfts/:tokenId/verify` | POST | ALL | Verify NFT validity |
| `/api/nfts/owner/:did` | GET | ALL | Get all NFTs owned by DID |
| `/api/nfts/:tokenId/history` | GET | ALL | Retrieve ownership history |
| `/api/audit` | GET | ADMIN/AUDITOR | Query full audit trail |

---

## 6. Cryptographic Security & Chaincode RBAC

1. **Private Key Privacy**: Private keys are NEVER accepted, stored, or logged by the backend or blockchain. Signature verification takes place in Node.js using registered public keys from the ledger.
2. **Chaincode Authorization**: Unauthorized operations (e.g., a USER attempting to call `MintNFT`) are blocked inside Go chaincode and generate an audit event with `result: "DENIED"`.

---

## 7. Stop Network
To tear down the containers and clean up the environment:
```bash
./scripts/network-down.sh
```
