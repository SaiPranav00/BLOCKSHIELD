#!/usr/bin/env bash
set -e

API_URL="${API_URL:-http://localhost:5000/api}"

echo "======================================================="
echo "=== SIH 2026 PLATFORM END-TO-END AUTOMATED TEST ==="
echo "======================================================="
echo ""

TEST_DID_ADMIN="did:sih26125:ADMIN_E2E"
TEST_DID_USER1="did:sih26125:USER_E2E_1"
TEST_DID_USER2="did:sih26125:USER_E2E_2"
TEST_NFT_ID="NFT-E2E-999"

# Helper for HTTP POST
post_json() {
  local url="$1"
  local data="$2"
  curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data"
}

# Helper for HTTP GET
get_json() {
  local url="$1"
  curl -s "$url"
}

echo "Step 1: Check Backend & Fabric Network Status..."
HEALTH=$(get_json "http://localhost:5000/health")
echo "Health: ${HEALTH}"
echo ""

echo "Step 2: Create Admin DID (${TEST_DID_ADMIN})..."
RES_ADMIN=$(post_json "${API_URL}/dids" "{\"did\":\"${TEST_DID_ADMIN}\",\"publicKey\":\"pubkey_admin_e2e\",\"role\":\"ADMIN\"}")
echo "Response: ${RES_ADMIN}"
echo ""

echo "Step 3: Create User DID (${TEST_DID_USER1})..."
RES_USER1=$(post_json "${API_URL}/dids" "{\"did\":\"${TEST_DID_USER1}\",\"publicKey\":\"pubkey_user1_e2e\",\"role\":\"USER\"}")
echo "Response: ${RES_USER1}"
echo ""

echo "Step 4: Create User 2 DID (${TEST_DID_USER2})..."
RES_USER2=$(post_json "${API_URL}/dids" "{\"did\":\"${TEST_DID_USER2}\",\"publicKey\":\"pubkey_user2_e2e\",\"role\":\"USER\"}")
echo "Response: ${RES_USER2}"
echo ""

echo "Step 5: Assign Role (ADMIN assigns MANAGER to USER1)..."
RES_ROLE=$(post_json "${API_URL}/roles/assign" "{\"adminDID\":\"${TEST_DID_ADMIN}\",\"targetDID\":\"${TEST_DID_USER1}\",\"newRole\":\"MANAGER\"}")
echo "Response: ${RES_ROLE}"
echo ""

echo "Step 6: Admin Mints NFT (${TEST_NFT_ID})..."
RES_MINT=$(post_json "${API_URL}/nfts/mint" "{\"adminDID\":\"${TEST_DID_ADMIN}\",\"tokenId\":\"${TEST_NFT_ID}\",\"assetName\":\"E2E Certificate\",\"assetType\":\"CERTIFICATE\",\"metadata\":{\"title\":\"SIH Champion\"}}")
echo "Response: ${RES_MINT}"
echo ""

echo "Step 7: Admin Allocates NFT (${TEST_NFT_ID}) to User 1..."
RES_ALLOC=$(post_json "${API_URL}/nfts/${TEST_NFT_ID}/allocate" "{\"actorDID\":\"${TEST_DID_ADMIN}\",\"ownerDID\":\"${TEST_DID_USER1}\"}")
echo "Response: ${RES_ALLOC}"
echo ""

echo "Step 8: User 1 Searches Owned Assets..."
RES_SEARCH=$(get_json "${API_URL}/nfts/owner/${TEST_DID_USER1}")
echo "Response: ${RES_SEARCH}"
echo ""

echo "Step 9: Verify NFT Validity..."
RES_VERIFY1=$(post_json "${API_URL}/nfts/${TEST_NFT_ID}/verify" "{}")
echo "Response: ${RES_VERIFY1}"
echo ""

echo "Step 10: Unauthorized Mint Attempt by User 2 -> Expect Chaincode DENIED..."
RES_UNAUTH=$(post_json "${API_URL}/nfts/mint" "{\"adminDID\":\"${TEST_DID_USER2}\",\"tokenId\":\"NFT-UNAUTH\",\"assetName\":\"Fake Asset\",\"assetType\":\"FAKE\",\"metadata\":{}}")
echo "Response: ${RES_UNAUTH}"
echo ""

echo "Step 11: Transfer NFT from User 1 to User 2..."
RES_XFER=$(post_json "${API_URL}/nfts/${TEST_NFT_ID}/transfer" "{\"actorDID\":\"${TEST_DID_USER1}\",\"newOwnerDID\":\"${TEST_DID_USER2}\"}")
echo "Response: ${RES_XFER}"
echo ""

echo "Step 12: Get Ownership History for ${TEST_NFT_ID}..."
RES_HIST=$(get_json "${API_URL}/nfts/${TEST_NFT_ID}/history")
echo "Response: ${RES_HIST}"
echo ""

echo "Step 13: Auditor Views Audit Trail..."
RES_AUDIT=$(get_json "${API_URL}/audit")
echo "Response: ${RES_AUDIT}"
echo ""

echo "Step 14: Admin Revokes NFT (${TEST_NFT_ID})..."
RES_REVOKE=$(post_json "${API_URL}/nfts/${TEST_NFT_ID}/revoke" "{\"adminDID\":\"${TEST_DID_ADMIN}\"}")
echo "Response: ${RES_REVOKE}"
echo ""

echo "Step 15: Verify Revoked NFT -> Expect INVALID..."
RES_VERIFY2=$(post_json "${API_URL}/nfts/${TEST_NFT_ID}/verify" "{}")
echo "Response: ${RES_VERIFY2}"
echo ""

echo "======================================================="
echo "=== TEST SUMMARY ASSERTION CHECK ==="
echo "======================================================="

CHECK_DID=false
CHECK_ROLE=false
CHECK_MINT=false
CHECK_ALLOC=false
CHECK_SEARCH=false
CHECK_VERIFY=false
CHECK_XFER=false
CHECK_UNAUTH=false
CHECK_AUDIT=false
CHECK_REVOKE=false
CHECK_E2E=false

if [[ "$RES_USER1" == *"did:sih26125:USER_E2E_1"* ]]; then CHECK_DID=true; fi
if [[ "$RES_ROLE" == *"MANAGER"* ]]; then CHECK_ROLE=true; fi
if [[ "$RES_MINT" == *"${TEST_NFT_ID}"* ]]; then CHECK_MINT=true; fi
if [[ "$RES_ALLOC" == *"${TEST_DID_USER1}"* ]]; then CHECK_ALLOC=true; fi
if [[ "$RES_SEARCH" == *"${TEST_NFT_ID}"* ]]; then CHECK_SEARCH=true; fi
if [[ "$RES_VERIFY1" == *"true"* ]]; then CHECK_VERIFY=true; fi
if [[ "$RES_XFER" == *"${TEST_DID_USER2}"* ]]; then CHECK_XFER=true; fi
if [[ "$RES_UNAUTH" == *"access denied"* || "$RES_UNAUTH" == *"false"* ]]; then CHECK_UNAUTH=true; fi
if [[ "$RES_AUDIT" == *"docType"* ]]; then CHECK_AUDIT=true; fi
if [[ "$RES_REVOKE" == *"REVOKED"* ]]; then CHECK_REVOKE=true; fi

if [ "$CHECK_DID" = true ] && [ "$CHECK_MINT" = true ] && [ "$CHECK_XFER" = true ]; then
  CHECK_E2E=true
fi

print_status() {
  local label="$1"
  local status="$2"
  if [ "$status" = true ]; then
    printf "%-20s ✓\n" "$label"
  else
    printf "%-20s ✗\n" "$label"
  fi
}

print_status "DID Creation" "$CHECK_DID"
print_status "Role Assignment" "$CHECK_ROLE"
print_status "NFT Minting" "$CHECK_MINT"
print_status "NFT Allocation" "$CHECK_ALLOC"
print_status "NFT Search" "$CHECK_SEARCH"
print_status "NFT Verification" "$CHECK_VERIFY"
print_status "NFT Transfer" "$CHECK_XFER"
print_status "Unauthorized Test" "$CHECK_UNAUTH"
print_status "Audit Trail" "$CHECK_AUDIT"
print_status "NFT Revocation" "$CHECK_REVOKE"
print_status "End-to-End Test" "$CHECK_E2E"

echo "======================================================="
