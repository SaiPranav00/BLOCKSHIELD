# 🛡️ BLOCKSHIELD: Comprehensive Execution & Walkthrough Guide
**Smart Blockchain Platform for Decentralized Identity (DID), Sovereign Asset Management & Zero-Trust Governance**  
*(SIH 2026 - Problem Statement: SIH26125)*

---

## ⚡ Quickstart: Instant Standalone Execution (Recommended)

BLOCKSHIELD includes a built-in **Sovereign Local Database & Ledger Engine**. Anyone who clones this repository can run and interact with the **entire platform with 100% of all real functionalities** out of the box — with **zero setup of Docker, Go, CouchDB, or MongoDB**!

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 🚀 1-Minute Launch
```bash
# 1. Clone the repository and checkout the branch
git clone <YOUR_GIT_REPO_URL>
cd BLOCKSHIELD
git checkout varun

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Start the application
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

*(Alternatively, from the project root you can run `npm run dev` after installing frontend dependencies).*

---

## 🏗️ How the Project Architecture & Local Database Works

### 1. Dual-Routing API Gateway (`frontend/src/services/api.js`)
All frontend UI components communicate exclusively through a unified service gateway (`api.js`). 
* By default, it operates in **`LOCAL_DB` mode**.
* In this mode, requests are serviced by the client-side ledger engine (`localDatabase.js`) with zero network latency, zero connection drops, and zero server configuration.
* If configured to connect to a live backend and the backend is offline, it automatically and gracefully routes through the local database so the application never crashes.

### 2. Sovereign Local Database Engine (`frontend/src/services/localDatabase.js`)
* **Browser Persistence**: All data is stored in the browser's persistent `localStorage` under `blockshield_local_db_v1_*`. Data persists across page reloads and browser sessions.
* **Full Collection Schemas**:
  1. `users`: Stores decentralized identities, public keys, departments, roles, user categories (`DEFENCE`, `SOFTWARE`, `NON_DEFENCE`), and verification statuses.
  2. `nfts`: Stores tokenized digital assets, metadata, custodians, owner DIDs, departments, and operational locations.
  3. `nft_history`: Stores the chronological, immutable provenance timeline for every asset, including cryptographic transaction hashes and timestamps.
  4. `transfer_requests`: Stores asset custody transfer requests, manager approvals/rejections, and reason logs.
  5. `audit_logs`: Stores real-time audit trail events for every authentication, mint, transfer, allocation, and revocation.
  6. `message_threads`: Stores group channels, task delegations from Admin to Manager, and actionable request workflows.
* **Client-Side Cryptography**: Generates realistic RSA-2048 public/private keypairs, creates SHA-256 provenance transaction hashes, and verifies digital signatures.

---

## 👥 Demo User Credentials & Role Directory

All foundational accounts are pre-seeded in the database and support **1-Click Login** directly in the modal:

| Role | Username | DID | Default Password | Department | Category |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🛡️ ADMIN** | `ADMIN001` | `did:sih26125:ADMIN001` | `password123` | Executive Governance | DEFENCE |
| **💼 MANAGER** | `MANAGER001` | `did:sih26125:MANAGER001` | `password123` | R&D Operations | DEFENCE |
| **🔍 AUDITOR** | `AUDITOR001` | `did:sih26125:AUDITOR001` | `password123` | Compliance & Audit | SOFTWARE |
| **👤 USER** | `USER001` | `did:sih26125:USER001` | `password123` | R&D Engineering | DEFENCE |
| **👤 USER** | `N123456` | `did:sih26125:N123456` | `password123` | Radar Systems | DEFENCE |

---

## 🎯 Step-by-Step Feature Walkthrough

### 1. Central Portal (`http://localhost:5173`)
* **Role Selection**: Click on any of the four portal cards (**Admin**, **Manager**, **Auditor**, or **User**) to open the authentication modal.
* **1-Click Login**: Click the pre-filled demo account chip to log in immediately.
* **Multi-Category Registration**: Click "Sign Up", select category (**Defence & Strategic Operations**, **Software & Technology Vendors**, or **Non-Defence Civil Personnel**), upload an ID proof and organization credentials to register.

### 2. 🛡️ Admin Security Portal
* **Identity Management**: View all registered DIDs, issue new decentralized identities, generate RSA-2048 keypairs, and revoke compromised identities.
* **Role-Based Access Control (RBAC)**: Reassign user permissions and workspace roles on the fly.
* **Asset Minting**: Tokenize new digital equipment (e.g. `NFT-9901` - Quantum Radar Subsystem) with JSON metadata attributes and assign custody.
* **Provenance Timeline**: Click **"History"** on any asset to view its complete ledger provenance timeline with transaction IDs and previous owners.

### 3. 💼 Manager Review Portal
* **Pending Transfer Reviews**: Inspect asset transfer requests submitted by engineers and custodians.
* **Approval / Rejection Workflow**: Approve transfers to automatically reassign custodian ownership on the ledger, or reject requests with audit feedback.
* **Direct Asset Allocation**: Reallocate equipment custody between verified DIDs across departments.

### 4. 🔍 Auditor Stream Portal
* **Tamper-Proof Audit Trail**: Real-time view of every transaction, login, mint, and transfer across the entire platform.
* **Resource & Actor Filtering**: Search logs by specific DID, token ID, or event category.
* **Asset Integrity Verification**: Check cryptographic verification status to ensure no metadata has been tampered with.

### 5. 👤 User / Custodian Portal
* **My Custody Inventory**: View digital assets currently assigned to your DID.
* **Initiate Custody Transfer**: Request transfer of an asset to another user (e.g. transfer `NFT-1001` to `did:sih26125:USER001`) with an operational justification.
* **Track Request Status**: Monitor whether your handover requests are pending, approved, or rejected by operations managers.

### 6. 💬 Global Communication Hub & Task Delegation
* Open the **"Chat & Tasks"** drawer from any portal header or the floating action button.
* **Broadcast Channel**: Send messages visible to all authenticated roles.
* **Admin-to-Manager Task Delegation**: Admins can assign approval and allocation tasks directly to a specific Manager.
* **1-Click Action Execution**: Managers and Admins can approve user signups or execute asset mints directly inside the task thread with 1 click.

---

## 🌐 Optional: Running with Full Hyperledger Fabric Network

If you wish to run the full Dockerized Hyperledger Fabric 2.5 blockchain network and Node.js backend:

### Additional Prerequisites
* **Docker & Docker Compose**: v24.0+
* **Go**: v1.22+
* **MongoDB**: v6.0+ running on port `27017`

### Execution Script
```bash
# Make startup scripts executable
chmod +x start.sh scripts/*.sh

# Run the master automated startup script
./start.sh
```

This script will:
1. Validate system prerequisites (Docker, Go, Node.js).
2. Download Hyperledger Fabric 2.5 binaries and test-network scripts if not already present.
3. Bring up the Fabric network with 2 peer organizations (`Org1MSP`, `Org2MSP`) and CouchDB state databases.
4. Deploy the Go chaincode (`sih26125`).
5. Launch the Node.js Express REST API server on port `5000`.
6. Start the React frontend on port `5173`.

---

## ❓ Troubleshooting & FAQs

### Q: Will this branch work when someone pulls it on Windows or macOS?
**A: Yes!** The frontend uses standard Vite and React 19 with client-side localStorage. It runs identically on Windows (Command Prompt / PowerShell), macOS, Linux, and WSL.

### Q: How do I reset the local database back to the clean genesis state?
**A: Open your browser's Developer Tools (F12)** -> **Console**, and run:
```javascript
localStorage.clear();
location.reload();
```
The database will automatically re-seed with all foundational identities, digital assets, and initial audit logs!

### Q: Do I need MongoDB or CouchDB to evaluate the application?
**A: No.** The default standalone execution mode stores all entities and audit records directly in the browser's persistent Local Database.
