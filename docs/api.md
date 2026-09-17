# SIH 2026 REST API Documentation & Frontend Integration Contract

**Base URL**: `http://localhost:5000/api`

---

## 1. IDENTITY MANAGEMENT (DID)

### 1.1 Create DID
- **METHOD**: `POST`
- **URL**: `/api/dids`
- **PURPOSE**: Registers a new Decentralized Identity on the Hyperledger Fabric ledger.
- **AUTHORIZED ROLES**: `ADMIN`
- **REQUEST BODY**:
```json
{
  "did": "did:sih26125:N123456",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "role": "USER"
}
```
- **SUCCESS RESPONSE (201 Created)**:
```json
{
  "success": true,
  "data": {
    "docType": "identity",
    "did": "did:sih26125:N123456",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
    "role": "USER",
    "status": "ACTIVE",
    "createdBy": "eDUwOTo6Q049...",
    "createdAt": "2026-09-07T17:27:31Z",
    "updatedAt": "2026-09-07T17:27:31Z"
  }
}
```

### 1.2 Get All DIDs
- **METHOD**: `GET`
- **URL**: `/api/dids`
- **PURPOSE**: Retrieves all registered DIDs from the ledger.
- **AUTHORIZED ROLES**: `ADMIN`, `AUDITOR`
- **SUCCESS RESPONSE (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "did": "did:sih26125:ADMIN001",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  ]
}
```

### 1.3 Get DID Details
- **METHOD**: `GET`
- **URL**: `/api/dids/:did`
- **PURPOSE**: Fetches the identity document for a specific DID.
- **AUTHORIZED ROLES**: `ADMIN`, `MANAGER`, `AUDITOR`, `USER` (Self)
- **SUCCESS RESPONSE (200 OK)**:
```json
{
  "success": true,
  "data": {
    "did": "did:sih26125:N123456",
    "publicKey": "...",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

### 1.4 Update DID
- **METHOD**: `PUT`
- **URL**: `/api/dids/:did`
- **PURPOSE**: Updates public key or role associated with a DID.
- **AUTHORIZED ROLES**: `ADMIN`
- **REQUEST BODY**:
```json
{
  "newPublicKey": "...",
  "newRole": "MANAGER"
}
```

### 1.5 Revoke DID
- **METHOD**: `POST`
- **URL**: `/api/dids/:did/revoke`
- **PURPOSE**: Marks a DID as `REVOKED`. Revoked identities cannot initiate operations.
- **AUTHORIZED ROLES**: `ADMIN`
- **SUCCESS RESPONSE (200 OK)**:
```json
{
  "success": true,
  "data": {
    "did": "did:sih26125:N123456",
    "status": "REVOKED"
  }
}
```

### 1.6 Cryptographic Signature Verification
- **METHOD**: `POST`
- **URL**: `/api/dids/verify`
- **PURPOSE**: Verifies a client message signature against registered DID public key without transmitting private keys.
- **REQUEST BODY**:
```json
{
  "did": "did:sih26125:N123456",
  "message": "Authentication token string",
  "signature": "3045022100a..."
}
```
- **RESPONSE (200 OK)**:
```json
{
  "valid": true,
  "did": "did:sih26125:N123456"
}
```

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC)

### 2.1 Assign Role
- **METHOD**: `POST`
- **URL**: `/api/roles/assign`
- **PURPOSE**: Assigns or changes the role of a DID on ledger.
- **AUTHORIZED ROLES**: `ADMIN`
- **REQUEST BODY**:
```json
{
  "adminDID": "did:sih26125:ADMIN001",
  "targetDID": "did:sih26125:N123456",
  "newRole": "MANAGER"
}
```

### 2.2 Get Role
- **METHOD**: `GET`
- **URL**: `/api/roles/:did`
- **PURPOSE**: Fetches the current role of a DID.
- **SUCCESS RESPONSE (200 OK)**:
```json
{
  "success": true,
  "data": {
    "did": "did:sih26125:N123456",
    "role": "MANAGER"
  }
}
```

---

## 3. NFT DIGITAL ASSET MANAGEMENT

### 3.1 Mint NFT
- **METHOD**: `POST`
- **URL**: `/api/nfts/mint`
- **PURPOSE**: Creates a new unique tokenized digital asset on ledger.
- **AUTHORIZED ROLES**: `ADMIN`
- **REQUEST BODY**:
```json
{
  "adminDID": "did:sih26125:ADMIN001",
  "tokenId": "NFT-001",
  "assetName": "Degree Certificate",
  "assetType": "CERTIFICATE",
  "metadata": {
    "university": "IIT Madras",
    "degree": "B.Tech Computer Science"
  }
}
```

### 3.2 Allocate NFT
- **METHOD**: `POST`
- **URL**: `/api/nfts/:tokenId/allocate`
- **PURPOSE**: Allocates an unassigned NFT to a specific target DID.
- **AUTHORIZED ROLES**: `ADMIN`, `MANAGER`
- **REQUEST BODY**:
```json
{
  "actorDID": "did:sih26125:ADMIN001",
  "ownerDID": "did:sih26125:N123456"
}
```

### 3.3 Transfer NFT
- **METHOD**: `POST`
- **URL**: `/api/nfts/:tokenId/transfer`
- **PURPOSE**: Transfers ownership of an active NFT to a new active owner DID.
- **AUTHORIZED ROLES**: Authorized Current Owner (`ownerDID`) or `ADMIN`
- **REQUEST BODY**:
```json
{
  "actorDID": "did:sih26125:N123456",
  "newOwnerDID": "did:sih26125:N789012"
}
```

### 3.4 Revoke NFT
- **METHOD**: `POST`
- **URL**: `/api/nfts/:tokenId/revoke`
- **PURPOSE**: Marks an NFT status as `REVOKED`. Revoked NFTs cannot be transferred.
- **AUTHORIZED ROLES**: `ADMIN`
- **REQUEST BODY**:
```json
{
  "adminDID": "did:sih26125:ADMIN001"
}
```

### 3.5 Verify NFT
- **METHOD**: `POST`
- **URL**: `/api/nfts/:tokenId/verify`
- **PURPOSE**: Validates existence, active status, owner status, and validity of an NFT.
- **RESPONSE**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "exists": true,
    "tokenId": "NFT-001",
    "assetName": "Degree Certificate",
    "assetType": "CERTIFICATE",
    "ownerDID": "did:sih26125:N123456",
    "ownerStatus": "ACTIVE",
    "status": "ACTIVE"
  }
}
```

### 3.6 Search Assets by Owner DID
- **METHOD**: `GET`
- **URL**: `/api/nfts/owner/:did`
- **PURPOSE**: Queries all active/assigned NFTs owned by a given DID.
- **SUCCESS RESPONSE (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "tokenId": "NFT-001",
      "assetName": "Degree Certificate",
      "ownerDID": "did:sih26125:N123456",
      "status": "ACTIVE"
    }
  ]
}
```

### 3.7 Get NFT Ownership History
- **METHOD**: `GET`
- **URL**: `/api/nfts/:tokenId/history`
- **PURPOSE**: Fetches immutable historical audit trail of all transactions for a token.
- **SUCCESS RESPONSE (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "txId": "98284e81...",
      "timestamp": "1788801605",
      "isDelete": false,
      "nft": {
        "tokenId": "NFT-001",
        "ownerDID": "did:sih26125:N789012"
      }
    }
  ]
}
```

---

## 4. AUDIT TRAIL

### 4.1 Get Audit Logs
- **METHOD**: `GET`
- **URL**: `/api/audit`
- **PURPOSE**: Queries all immutable on-ledger audit events (`ALLOWED` and `DENIED`).
- **AUTHORIZED ROLES**: `ADMIN`, `AUDITOR`

### 4.2 Get Audit Logs by Resource ID
- **METHOD**: `GET`
- **URL**: `/api/audit/:resourceId`
- **PURPOSE**: Queries audit events for a specific resource ID (e.g. `NFT-001` or `did:sih26125:N123456`).
- **AUTHORIZED ROLES**: `ADMIN`, `AUDITOR`

---

## 5. AUTHENTICATION & ACCESS CONTROL

### 5.1 Auth Verify
- **METHOD**: `POST`
- **URL**: `/api/auth/verify`
- **REQUEST BODY**:
```json
{
  "did": "did:sih26125:N123456",
  "message": "nonce_123456",
  "signature": "3045022100..."
}
```

### 5.2 Access Check
- **METHOD**: `POST`
- **URL**: `/api/access/check`
- **REQUEST BODY**:
```json
{
  "actorDID": "did:sih26125:N123456",
  "allowedRoles": ["ADMIN", "MANAGER"]
}
```
