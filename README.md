# BLOCKSHIELD: Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management

> **Problem Statement ID**: SIH26125  
> **Technology Stack**: Hyperledger Fabric 2.5, Fabric CA, CouchDB, Go Chaincode (`fabric-contract-api-go`), Node.js, Express.js, `@hyperledger/fabric-gateway` SDK, React 19, Vite.

---

## 1. Executive Summary & Problem Overview

In high-security enterprise and defense engineering environments (such as Bharat Electronics Limited / BEL domain models), managing identity, authorization, and high-value digital and physical assets across departmental boundaries presents critical security challenges:

1. **WHO ARE YOU?** (Identity): Traditional centralized credential repositories are vulnerable to single-point compromise.
2. **WHAT ARE YOU ALLOWED TO DO?** (Authorization): Access control enforced solely in web applications can be bypassed or manipulated.
3. **WHAT ASSETS ARE YOU AUTHORIZED TO CONTROL?** (Asset Governance): Physical equipment (e.g. RF Signal Analyzers, Workstations, Oscilloscopes) and digital engineering assets require immutable custody tracking without confusing legal ownership with current custody.

**BLOCKSHIELD** establishes a permissioned, cryptographically verifiable enterprise security platform using **Hyperledger Fabric 2.5**. It decouples legal asset ownership (e.g. `BEL`) from temporary custodian assignment (e.g. `did:sih26125:N123456`), enforces Role-Based Access Control (RBAC) natively inside smart contracts, and logs every security-sensitive event to an immutable audit trail.

---

## 2. Core Architectural Pillars

### 1) Cryptographically Verifiable Decentralized Identity (DID)
- **Format**: `did:sih26125:<identifier>` (e.g., `did:sih26125:ADMIN001`, `did:sih26125:N123456`).
- **Public Key Infrastructure**: Public keys are registered on the Fabric ledger.
- **Client-Side Key Privacy**: Private keys are NEVER stored on the blockchain, in chaincode, in CouchDB, in the backend database, or in source code. Signatures are generated client-side and verified by backend crypto middleware.

### 2) Centralized Chaincode RBAC Security Boundary
Access permissions are enforced centrally inside Go smart contracts (`identity.go`, `rbac.go`, `nft.go`, `transfer.go`, `audit.go`):
- **`ADMIN`**: Identity registration, role assignment, identity revocation, tokenized asset minting, asset revocation, system audit inspection.
- **`MANAGER`**: Department user and asset visibility, approval/rejection of custodian transfer requests, department resource allocation.
- **`AUDITOR`**: Read-only inspection of audit streams, identity records, custody timelines, and security alert investigations.
- **`USER`**: Authenticated profile access, custody inspection of assigned assets, initiation of custodian transfer requests.

### 3) Tokenized Asset Model (Legal Owner vs Custodian)
Each asset is represented on-ledger as a unique tokenized asset record:
```json
{
  "docType": "nft",
  "tokenId": "NFT-1001",
  "assetId": "BEL-RF-00421",
  "assetName": "RF Signal Analyzer",
  "assetType": "TESTING_EQUIPMENT",
  "legalOwner": "BEL",
  "custodian": "did:sih26125:N123456",
  "department": "R&D",
  "location": "R&D Lab 1",
  "metadataHash": "a7b8c9d0e1f2",
  "status": "ACTIVE",
  "createdBy": "did:sih26125:ADMIN001"
}
```
*Note: Representative defense electronics and hardware assets (RF Analyzers, Workstations, Transceivers) serve as prototype demonstration data.*

### 4) Custodian Transfer Request & Approval Workflow
Users CANNOT directly change asset custody. Transfers follow a multi-step governed workflow:
```
Engineer A (Custodian) ──> Create Transfer Request (Status: PENDING)
                                    │
                                    ▼
Manager / Admin ─────────────> Approve Request (or Reject)
                                    │
                                    ▼
Smart Contract Validation ───> Update Custodian on Ledger (Status: ACTIVE)
                                    │
                                    ▼
Immutable Audit Log ─────────> TRANSFER_APPROVED & ASSET_TRANSFERRED Logged
```

### 5) Immutable Ledger Audit Trail
Security-sensitive events (`IDENTITY_CREATED`, `IDENTITY_REVOKED`, `ROLE_ASSIGNED`, `ASSET_MINTED`, `ASSET_ALLOCATED`, `TRANSFER_REQUESTED`, `TRANSFER_APPROVED`, `TRANSFER_REJECTED`, `ASSET_TRANSFERRED`, `ASSET_REVOKED`, `ACCESS_DENIED`) generate tamper-evident audit records on the blockchain ledger. Normal read queries bypass blockchain state writes for maximum efficiency.

---

## 3. System Architecture & Repository Layout

Detailed architectural designs, data flows, and module boundaries are documented in **[ARCHITECTURE.md](file:///home/varun/Projects/BLOCKSHIELD/ARCHITECTURE.md)**. Team contribution guidelines, Git workflows, and AI coding agent rules are in **[CONTRIBUTING.md](file:///home/varun/Projects/BLOCKSHIELD/CONTRIBUTING.md)**.

```text
BLOCKSHIELD/
├── frontend/               # React 19 + Vite Feature-Based UI
│   ├── src/
│   │   ├── app/            # App bootstrap & routing
│   │   ├── features/       # Feature domains (admin, manager, auditor, user, communication)
│   │   ├── components/     # Shared reusable UI primitives (ui/ modal, button, table)
│   │   ├── services/       # Network API clients & Fabric endpoints
│   │   ├── utils/          # Pure helper utilities & list parsers
│   │   └── styles/         # Global design tokens, resets, and layout CSS
├── backend/                # Node.js + Express REST API Gateway
│   ├── src/
│   │   ├── routes/         # Express endpoint definitions
│   │   ├── controllers/    # Request handling & HTTP validation
│   │   ├── middleware/     # Auth, RBAC, and error handlers
│   │   └── fabric/         # Hyperledger Fabric Gateway & Mock fallback
├── blockchain/             # Hyperledger Fabric Go Smart Contracts & Artifacts
│   └── chaincode/          # identity.go, rbac.go, nft.go, transfer.go, audit.go
├── scripts/                # Startup, teardown, bootstrap, and testing scripts
├── ARCHITECTURE.md         # System design, data flow diagrams, collaboration hotspots
├── CONTRIBUTING.md         # Git branch rules, AI agent rules, PR checklist
└── README.md               # Quickstart and overview (this file)
```

```text
React 19 Dashboard Frontend (Port 5173 / 5174 / 5175 / 5176)
       │
       ▼ REST API (HTTP / JSON)
Node.js Express Backend API (Port 5000)
  ├── Signature Verification & Input Validation
  └── `@hyperledger/fabric-gateway` SDK Connection
       │
       ▼ gRPC TLS (Ports 7051 / 9051)
Hyperledger Fabric 2.5 Permissioned Network
  ├── Channel: `mychannel`
  ├── Orderer: Raft Consensus (Port 7050)
  ├── Peers: `peer0.org1` (7051), `peer0.org2` (9051)
  └── State DB: CouchDB `couchdb0` (5984), `couchdb1` (7984)
       │
       ▼
Go Smart Contract / Chaincode (`sih26125`)
  ├── DID & Identity Management (`identity.go`)
  ├── Chaincode-Level RBAC (`rbac.go`)
  ├── Tokenized Asset Lifecycle (`nft.go`)
  ├── Transfer Request Workflow (`transfer.go`)
  └── Immutable Audit Event Generator (`audit.go`)
```

---

## 4. Quick Start & Execution Guide

### One-Command Smart Master Startup (Recommended)
Run this single command from project root (`/home/lucky/Documents/blocksheild/BLOCKSHIELD`) on **any laptop/machine**:

```bash
./start.sh
```

**What `./start.sh` automatically does for you:**
1. Checks system prerequisites (Docker, Node.js, Go, npm).
2. Auto-downloads missing Hyperledger Fabric 2.5 binaries and `fabric-samples` if running on a fresh machine.
3. Auto-installs missing `npm` dependencies for both `backend` and `frontend`.
4. Starts the Hyperledger Fabric blockchain network, CouchDB, and deploys the Go smart contract (`sih26125`).
5. Seeds initial bootstrap DIDs, BEL defense electronics assets, allocations, and transfer requests.
6. Starts the Node.js Express REST API server in the background.
7. Launches the React Frontend UI dashboard on `http://localhost:5173`.

---

### Manual Step-by-Step Execution (Alternative)

#### Step 1: Start Network & Deploy Chaincode
```bash
./scripts/network-up.sh
```

#### Step 2: Seed Initial Bootstrap Demo Data
```bash
./scripts/bootstrap.sh
```

#### Step 3: Start Node.js REST API Backend
```bash
cd backend && npm install && npm start
```

#### Step 4: Start React Frontend UI
```bash
cd frontend && npm install && npm run dev
```

---

## 5. Demo Credentials & Portals

| Role | Default DID | Default Password | Dedicated Portal Command |
|---|---|---|---|
| **ADMIN** | `did:sih26125:ADMIN001` | `password123` | `npm run dev:admin` (Port 5174) |
| **MANAGER** | `did:sih26125:MGR001` | `password123` | `npm run dev:manager` (Port 5175) |
| **AUDITOR** | `did:sih26125:AUDIT001` | `password123` | `npm run dev:auditor` (Port 5176) |
| **USER (Eng A)** | `did:sih26125:N123456` | `password123` | `npm run dev:users` (Port 5173) |
| **USER (Eng B)** | `did:sih26125:ENG002` | `password123` | `npm run dev:users` (Port 5173) |

---

## 6. End-to-End Demo Workflow Story

1. **Step 1 (DID Registration)**: Admin registers Engineer A (`did:sih26125:N123456`) with `USER` role in `R&D` department.
2. **Step 2 (Asset Minting)**: Admin mints asset `NFT-1001` (`RF Signal Analyzer`, `BEL-RF-00421`, Legal Owner: `BEL`).
3. **Step 3 (Asset Allocation)**: Admin allocates `NFT-1001` custodian to Engineer A (`did:sih26125:N123456`).
4. **Step 4 (User Inspection & Transfer Request)**: Engineer A logs in, views `RF Signal Analyzer`, and requests custody transfer to Engineer B (`did:sih26125:ENG002`). Asset status moves to `TRANSFER_PENDING`.
5. **Step 5 (Manager Review & Approval)**: Manager (`did:sih26125:MGR001`) views pending transfer request and clicks **Approve**.
6. **Step 6 (Ledger Execution)**: Go Chaincode validates authorization, updates asset custodian to Engineer B, sets status to `ACTIVE`, and writes `TRANSFER_APPROVED` & `ASSET_TRANSFERRED` audit events.
7. **Step 7 (Auditor Inspection)**: Auditor (`did:sih26125:AUDIT001`) opens the Asset Custody Inspector and views the visual provenance timeline (Minted → Allocated → Transfer Requested → Approved → Custodian Transferred).
8. **Step 8 (Security Demonstration)**: A USER attempts an Admin action (e.g. minting an asset). The transaction is rejected inside Go chaincode and logged as `result: "DENIED"` in the Auditor security stream.

---

## 7. Security Model & Best Practices

- **Zero Private Key Exposure**: Server and chaincode verify signatures using stored public keys without ever holding user private keys.
- **Chaincode Security Boundary**: RBAC rules are enforced at the smart contract level, preventing frontend or API bypass.
- **Input Sanitization**: All DIDs and Token IDs are sanitized to prevent injection attacks.
- **Off-Ledger Filtering**: Unsensitive read requests do not create dummy blockchain transactions, preserving ledger performance.

---

## 8. Implementation Status

| Feature | Status | Implementation Details |
|---|---|---|
| DID Cryptographic Identity | **IMPLEMENTED** | Format `did:sih26125:<id>`, public key registry, signature verification |
| Chaincode RBAC Boundary | **IMPLEMENTED** | `ADMIN`, `MANAGER`, `AUDITOR`, `USER` enforced in Go chaincode |
| Asset Model (Legal vs Custodian)| **IMPLEMENTED** | Tokenized asset records with `legalOwner`, `custodian`, `department`, `location` |
| Custody Transfer Workflow | **IMPLEMENTED** | Request → Manager Approval → Ledger Custodian Commit |
| Immutable Audit Stream | **IMPLEMENTED** | State-changing and security denial event logging |
| Auditor Provenance Inspector | **IMPLEMENTED** | Visual timeline tracking asset lifecycle & custody changes |
| Multi-Role Dashboards | **IMPLEMENTED** | React 19 dashboards tailored for Admin, Manager, Auditor, User |

---

## 9. Cleanup

To shut down the Hyperledger Fabric containers and clear volumes:
```bash
./scripts/network-down.sh
```
