# Role-Based Access Control (RBAC) Specification

## Initial Roles
1. `ADMIN`: System administrator with complete operational permissions.
2. `MANAGER`: Operational manager authorized to allocate assets and view reports.
3. `AUDITOR`: Immutable audit reviewer (read-only access).
4. `USER`: Standard end-user owning and transferring permitted digital assets.

## Permission Matrix

| Operation | ADMIN | MANAGER | AUDITOR | USER |
|---|:---:|:---:|:---:|:---:|
| `CreateDID` | ✓ | ✗ | ✗ | ✗ |
| `AssignRole` | ✓ | ✗ | ✗ | ✗ |
| `RevokeDID` | ✓ | ✗ | ✗ | ✗ |
| `MintNFT` | ✓ | ✗ | ✗ | ✗ |
| `AllocateNFT` | ✓ | ✓ | ✗ | ✗ |
| `TransferNFT` | Authorized | Authorized | ✗ | Owner Only |
| `RevokeNFT` | ✓ | ✗ | ✗ | ✗ |
| `VerifyNFT` | ✓ | ✓ | ✓ | ✓ |
| `GetAssetsByOwnerDID` | ✓ | Authorized | ✓ | Own Assets |
| `GetAuditLogs` | ✓ | ✗ | ✓ | ✗ |

## Chaincode Enforcement Rule
Authorization MUST NOT be checked solely in React or Node.js.
Go chaincode enforces permission checks directly before executing state modifications. If an unauthorized caller attempts a direct invocation, the transaction is rejected on-chain and recorded in the audit log as `DENIED`.
