#!/usr/bin/env bash
set -e

API_URL="${API_URL:-http://localhost:5000/api}"

echo "======================================================="
echo "=== SIH 2026 BLOCKSHIELD Platform Bootstrap Data    ==="
echo "======================================================="

echo "1. Registering ADMIN Identity (did:sih26125:ADMIN001)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:ADMIN001","publicKey":"pubkey_admin_pem","role":"ADMIN","department":"Executive"}' || true
echo ""

echo "2. Registering MANAGER Identity (did:sih26125:MGR001)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:MGR001","publicKey":"pubkey_manager_pem","role":"MANAGER","department":"R&D"}' || true
echo ""

echo "3. Registering AUDITOR Identity (did:sih26125:AUDIT001)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:AUDIT001","publicKey":"pubkey_auditor_pem","role":"AUDITOR","department":"Compliance"}' || true
echo ""

echo "4. Registering USER Identity - Engineer A (did:sih26125:N123456)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:N123456","publicKey":"pubkey_engA_pem","role":"USER","department":"R&D"}' || true
echo ""

echo "5. Registering USER Identity - Engineer B (did:sih26125:ENG002)..."
curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d '{"did":"did:sih26125:ENG002","publicKey":"pubkey_engB_pem","role":"USER","department":"R&D"}' || true
echo ""

echo "6. Minting Representative Assets (BEL Defense Electronics & Hardware)..."
curl -s -X POST "${API_URL}/nfts/mint" \
  -H "Content-Type: application/json" \
  -d '{"adminDID":"did:sih26125:ADMIN001","tokenId":"NFT-1001","assetName":"RF Signal Analyzer","assetType":"TESTING_EQUIPMENT","metadata":{"assetId":"BEL-RF-00421","legalOwner":"BEL","department":"R&D","location":"R&D Lab 1","specs":"9kHz - 6GHz frequency range"}}' || true
echo ""

curl -s -X POST "${API_URL}/nfts/mint" \
  -H "Content-Type: application/json" \
  -d '{"adminDID":"did:sih26125:ADMIN001","tokenId":"NFT-1002","assetName":"Engineering Workstation","assetType":"HARDWARE","metadata":{"assetId":"BEL-WS-0077","legalOwner":"BEL","department":"R&D","location":"Building B, Floor 2","specs":"128GB RAM, RTX A6000"}}' || true
echo ""

curl -s -X POST "${API_URL}/nfts/mint" \
  -H "Content-Type: application/json" \
  -d '{"adminDID":"did:sih26125:ADMIN001","tokenId":"NFT-1003","assetName":"Secure Communication Device","assetType":"COMMUNICATION","metadata":{"assetId":"BEL-COM-00309","legalOwner":"BEL","department":"Avionics","location":"Avionics Lab 3","specs":"Encrypted VHF Transceiver"}}' || true
echo ""

echo "7. Allocating NFT-1001 custodian to Engineer A (did:sih26125:N123456)..."
curl -s -X POST "${API_URL}/nfts/NFT-1001/allocate" \
  -H "Content-Type: application/json" \
  -d '{"actorDID":"did:sih26125:ADMIN001","ownerDID":"did:sih26125:N123456"}' || true
echo ""

echo "8. Creating Transfer Request from Engineer A to Engineer B..."
curl -s -X POST "${API_URL}/transfers/request" \
  -H "Content-Type: application/json" \
  -d '{"requestedByDID":"did:sih26125:N123456","tokenId":"NFT-1001","toDID":"did:sih26125:ENG002","reason":"Reassigned for Radar Signal Calibration project"}' || true
echo ""

echo "=== Bootstrap Data Initialization Complete! ==="
