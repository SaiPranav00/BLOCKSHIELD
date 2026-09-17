# Decentralized Identity (DID) Model

## DID Format
The platform uses the DID URI format:
`did:sih26125:<unique-id>`

Examples:
- `did:sih26125:ADMIN001`
- `did:sih26125:N123456`

## Identity Data Structure
```json
{
  "docType": "identity",
  "did": "did:sih26125:N123456",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "role": "USER",
  "status": "ACTIVE",
  "createdBy": "eDUwOTo6Q049b3JnMWFkbWlu...",
  "createdAt": "2026-09-07T17:27:31Z",
  "updatedAt": "2026-09-07T17:27:31Z"
}
```

## Security & Privacy Rule
- **Private keys MUST NEVER be stored on the Fabric ledger, chaincode state, backend database, or logs.**
- The private key remains exclusively with the identity client.
- The ledger contains only public keys and verification metadata required for identity validation.

## Verification Workflow
1. Client signs a challenge or transaction payload using their local private key.
2. Client sends `{ did, message, signature }` to the Node.js API.
3. Backend retrieves the registered public key from the Fabric ledger using `GetDID(did)`.
4. Backend verifies the signature using Node.js native `crypto.verify()`.
5. If valid, identity is verified and authentication succeeds.
