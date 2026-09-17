# NFT Digital Asset Model & Lifecycle

## Data Model
```json
{
  "docType": "nft",
  "tokenId": "NFT-001",
  "assetName": "Digital Certificate",
  "assetType": "CERTIFICATE",
  "metadata": "{\"degree\":\"B.Tech\",\"gpa\":\"3.9\"}",
  "creatorDID": "did:sih26125:ADMIN001",
  "ownerDID": "did:sih26125:N123456",
  "status": "ACTIVE",
  "createdAt": "2026-09-07T17:27:34Z",
  "updatedAt": "2026-09-07T17:27:36Z"
}
```

## Lifecycle States
1. **Creation (Minting)**: `MintNFT(adminDID, tokenId, assetName, assetType, metadata)`. Creates unallocated NFT with `Status = ACTIVE`.
2. **Allocation**: `AllocateNFT(actorDID, tokenId, ownerDID)`. Links NFT to an active target owner DID.
3. **Transfer**: `TransferNFT(actorDID, tokenId, newOwnerDID)`. Moves ownership while recording full history on ledger.
4. **Verification**: `VerifyNFT(tokenId)`. Evaluates active status of NFT and target owner.
5. **Revocation**: `RevokeNFT(adminDID, tokenId)`. Sets status to `REVOKED`. Revoked NFTs cannot be transferred.
