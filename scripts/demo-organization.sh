#!/usr/bin/env bash
set -e

API_URL="${API_URL:-http://localhost:5000/api}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}=======================================================================${NC}"
echo -e "${CYAN}   SIH 2026 PLATFORM - REAL-WORLD ORGANIZATION WORKFLOW DEMONSTRATION  ${NC}"
echo -e "${CYAN}=======================================================================${NC}\n"

ORG_DID="did:sih26125:ORG_ISRO"
EMP_DID="did:sih26125:EMP_DR_SHARMA"
RECV_ORG_DID="did:sih26125:ORG_INSPACE"
ASSET_TOKEN_ID="NFT-ISRO-PATENT-2026-001"

echo -e "${YELLOW}Step 1: Generate Cryptographic Keypair for Organization (ISRO)...${NC}"
KEYPAIR_RES=$(curl -s -X POST "${API_URL}/dids/generate-keypair")
PUBKEY=$(echo "$KEYPAIR_RES" | grep -o '"publicKey":"[^"]*' | cut -d'"' -f4 | sed 's/\\n/\n/g')
echo -e "${GREEN}✓ Cryptographic RSA Keypair Generated Successfully!${NC}\n"

echo -e "${YELLOW}Step 2: Register Organization DID (${ORG_DID}) with ADMIN Role...${NC}"
RES_ORG=$(curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d "{\"did\":\"${ORG_DID}\",\"publicKey\":\"${PUBKEY}\",\"role\":\"ADMIN\"}")
echo -e "Ledger Response: ${RES_ORG}\n"

echo -e "${YELLOW}Step 3: Register Employee Identity (${EMP_DID}) as USER...${NC}"
RES_EMP=$(curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d "{\"did\":\"${EMP_DID}\",\"publicKey\":\"pubkey_dr_sharma\",\"role\":\"USER\"}")
echo -e "Ledger Response: ${RES_EMP}\n"

echo -e "${YELLOW}Step 4: Register Partner Agency (${RECV_ORG_DID}) as MANAGER...${NC}"
RES_RECV=$(curl -s -X POST "${API_URL}/dids" \
  -H "Content-Type: application/json" \
  -d "{\"did\":\"${RECV_ORG_DID}\",\"publicKey\":\"pubkey_inspace\",\"role\":\"MANAGER\"}")
echo -e "Ledger Response: ${RES_RECV}\n"

echo -e "${YELLOW}Step 5: ISRO Mints Tokenized Digital Patent (${ASSET_TOKEN_ID})...${NC}"
RES_MINT=$(curl -s -X POST "${API_URL}/nfts/mint" \
  -H "Content-Type: application/json" \
  -d "{\"adminDID\":\"${ORG_DID}\",\"tokenId\":\"${ASSET_TOKEN_ID}\",\"assetName\":\"Chandrayaan-4 Payload Propulsion Tech\",\"assetType\":\"PATENT\",\"metadata\":{\"field\":\"Aerospace\",\"classification\":\"SECRET\",\"year\":2026}}")
echo -e "Ledger Response: ${RES_MINT}\n"

echo -e "${YELLOW}Step 6: ISRO Allocates Patent Asset to Dr. Sharma (${EMP_DID})...${NC}"
RES_ALLOC=$(curl -s -X POST "${API_URL}/${ASSET_TOKEN_ID}/allocate" \
  -H "Content-Type: application/json" \
  -d "{\"actorDID\":\"${ORG_DID}\",\"ownerDID\":\"${EMP_DID}\"}" || curl -s -X POST "${API_URL}/nfts/${ASSET_TOKEN_ID}/allocate" \
  -H "Content-Type: application/json" \
  -d "{\"actorDID\":\"${ORG_DID}\",\"ownerDID\":\"${EMP_DID}\"}")
echo -e "Ledger Response: ${RES_ALLOC}\n"

echo -e "${YELLOW}Step 7: Search Assets Owned by Dr. Sharma (${EMP_DID})...${NC}"
RES_SEARCH=$(curl -s "${API_URL}/nfts/owner/${EMP_DID}")
echo -e "Ledger Query Result: ${RES_SEARCH}\n"

echo -e "${YELLOW}Step 8: Transfer Patent Asset from Dr. Sharma to IN-SPACe Agency (${RECV_ORG_DID})...${NC}"
RES_XFER=$(curl -s -X POST "${API_URL}/nfts/${ASSET_TOKEN_ID}/transfer" \
  -H "Content-Type: application/json" \
  -d "{\"actorDID\":\"${EMP_DID}\",\"newOwnerDID\":\"${RECV_ORG_DID}\"}")
echo -e "Ledger Response: ${RES_XFER}\n"

echo -e "${YELLOW}Step 9: Verify On-Chain Validity of ${ASSET_TOKEN_ID}...${NC}"
RES_VERIFY=$(curl -s -X POST "${API_URL}/nfts/${ASSET_TOKEN_ID}/verify")
echo -e "Ledger Verification Result: ${RES_VERIFY}\n"

echo -e "${YELLOW}Step 10: Query Immutable On-Ledger Audit Trail for Asset (${ASSET_TOKEN_ID})...${NC}"
RES_AUDIT=$(curl -s "${API_URL}/audit/resource/${ASSET_TOKEN_ID}")
echo -e "Audit Log Record: ${RES_AUDIT}\n"

echo -e "${CYAN}=======================================================================${NC}"
echo -e "${GREEN}    ORGANIZATION WORKFLOW DEMONSTRATION EXECUTED SUCCESSFULLY!          ${NC}"
echo -e "${CYAN}=======================================================================${NC}"
