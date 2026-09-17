#!/usr/bin/env bash
set -e

API_URL="${API_URL:-http://localhost:5000/api}"

echo "======================================================="
echo "=== SIH 2026 Platform Bootstrap Data Initialization ==="
echo "======================================================="

echo "1. Registering ADMIN Identity (did:sih26125:ADMIN001)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:ADMIN001","publicKey":"pubkey_admin_pem","role":"ADMIN"}' || true
echo ""

echo "2. Registering MANAGER Identity (did:sih26125:MGR001)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:MGR001","publicKey":"pubkey_manager_pem","role":"MANAGER"}' || true
echo ""

echo "3. Registering AUDITOR Identity (did:sih26125:AUDIT001)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:AUDIT001","publicKey":"pubkey_auditor_pem","role":"AUDITOR"}' || true
echo ""

echo "4. Registering USER Identity (did:sih26125:N123456)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:N123456","publicKey":"pubkey_user_pem","role":"USER"}' || true
echo ""

echo "5. Minting Sample NFT (NFT-BOOTSTRAP-01) as ADMIN..."
curl -s -X POST "${API_URL}/nfts/mint" \
  -H "Content-Type: application/json" \
  -d '{"adminDID":"did:sih26125:ADMIN001","tokenId":"NFT-BOOTSTRAP-01","assetName":"SIH 2026 Certificate","assetType":"CERTIFICATE","metadata":{"event":"Smart India Hackathon 2026"}}' || true
echo ""

echo "6. Allocating NFT-BOOTSTRAP-01 to USER (did:sih26125:N123456)..."
curl -s -X POST "${API_URL}/nfts/NFT-BOOTSTRAP-01/allocate" \
  -H "Content-Type: application/json" \
  -d '{"actorDID":"did:sih26125:ADMIN001","ownerDID":"did:sih26125:N123456"}' || true
echo ""

echo "=== Bootstrap Data Initialization Complete! ==="
