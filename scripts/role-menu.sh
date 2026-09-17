#!/usr/bin/env bash
# ==============================================================================
# SIH 2026 PLATFORM - STREAMLINED INTERACTIVE TERMINAL CONTROL MENU
# ==============================================================================

set -e

# Base Configuration
API_URL="${API_URL:-http://localhost:5000/api}"

# Default Active DID Contexts per Role
ADMIN_DID="${ADMIN_DID:-did:sih26125:ADMIN001}"
MANAGER_DID="${MANAGER_DID:-did:sih26125:MANAGER001}"
AUDITOR_DID="${AUDITOR_DID:-did:sih26125:AUDITOR001}"
USER_DID="${USER_DID:-did:sih26125:USER001}"

# Colors & Formatting
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Restore cursor on exit
cleanup() {
    tput cnorm 2>/dev/null || printf "\033[?25h"
}
trap cleanup EXIT INT TERM

# Helper for JSON Formatting
format_json() {
    local input="$1"
    if command -v jq >/dev/null 2>&1; then
        echo "$input" | jq . 2>/dev/null || echo "$input"
    elif command -v python3 >/dev/null 2>&1; then
        echo "$input" | python3 -m json.tool 2>/dev/null || echo "$input"
    else
        echo "$input"
    fi
}

pause_and_continue() {
    echo ""
    echo -e "${DIM}Press ENTER to return to menu...${NC}"
    read -r
}

print_header_bar() {
    local subtitle="$1"
    clear
    echo -e "${CYAN}================================================================================${NC}"
    echo -e "${BOLD}${CYAN}          SIH 2026 HYPERLEDGER FABRIC PLATFORM - MULTI-ROLE TERMINAL            ${NC}"
    echo -e "${CYAN}================================================================================${NC}"
    if [ -n "$subtitle" ]; then
        echo -e " ${BOLD}${YELLOW}${subtitle}${NC}"
        echo -e "${CYAN}--------------------------------------------------------------------------------${NC}"
    fi
}

# ==============================================================================
# REUSABLE ARROW-KEY MENU SELECTOR (Outline Style)
# ==============================================================================

SELECTED_INDEX=0

prompt_arrow_menu() {
    local subtitle="$1"
    shift
    local options=("$@")
    local count=${#options[@]}
    local current=0
    local key_seq

    tput civis 2>/dev/null || printf "\033[?25l"

    while true; do
        print_header_bar "$subtitle"
        echo -e "${DIM} Navigate using ${BOLD}⬆ / ⬇ ARROW KEYS${NC}${DIM}, press ${BOLD}ENTER ↵${NC}${DIM} to select:${NC}\n"

        for i in "${!options[@]}"; do
            if [ "$i" -eq "$current" ]; then
                echo -e " ${BOLD}${CYAN}👉 [ ${WHITE}${BOLD}${options[$i]}${CYAN} ]${NC}"
            else
                echo -e "     ${DIM}${options[$i]}${NC}"
            fi
        done
        echo -e "\n${CYAN}================================================================================${NC}"

        IFS= read -rsn1 key_char

        if [[ "$key_char" == $'\x1b' ]]; then
            read -rsn2 -t 0.1 key_seq 2>/dev/null || key_seq=""
            case "$key_seq" in
                '[A') current=$(( (current - 1 + count) % count )) ;; # UP Arrow
                '[B') current=$(( (current + 1) % count )) ;;         # DOWN Arrow
            esac
        elif [[ "$key_char" == "" ]]; then
            tput cnorm 2>/dev/null || printf "\033[?25h"
            SELECTED_INDEX=$current
            return 0
        elif [[ "$key_char" =~ [0-9] ]]; then
            if [ "$key_char" -lt "$count" ]; then
                current=$key_char
            fi
        fi
    done
}

# ==============================================================================
# 👑 1. ADMIN MENU
# ==============================================================================

menu_admin() {
    local admin_options=(
        "👤 1. Register New DID Identity"
        "🔐 2. Assign / Change Role for DID"
        "❌ 3. Revoke DID Identity"
        "💎 4. Mint New Digital Asset (NFT)"
        "❌ 5. Revoke Digital Asset (NFT)"
        "📜 6. View All Audit Logs"
        "↩️  0. Return to Main Role Portal"
    )

    while true; do
        prompt_arrow_menu "👑 ADMIN ROLE MENU  |  Active DID: ${ADMIN_DID}" "${admin_options[@]}"

        case $SELECTED_INDEX in
            0)
                echo -e "\n${YELLOW}--- Register New DID ---${NC}"
                read -p "Enter DID [e.g. did:sih26125:USER001]: " NEW_DID
                [ -z "$NEW_DID" ] && NEW_DID="did:sih26125:USER$(date +%s | tail -c 4)"
                read -p "Enter Role [USER / MANAGER / AUDITOR / ADMIN] (default: USER): " ROLE
                [ -z "$ROLE" ] && ROLE="USER"

                KEYPAIR_RES=$(curl -s -X POST "${API_URL}/dids/generate-keypair")
                PUBKEY=$(echo "$KEYPAIR_RES" | grep -o '"publicKey":"[^"]*' | cut -d'"' -f4 | sed 's/\\n/\n/g')
                [ -z "$PUBKEY" ] && PUBKEY="pubkey_$(date +%s)"

                PAYLOAD=$(cat <<EOF
{
  "did": "${NEW_DID}",
  "publicKey": $(echo "$PUBKEY" | jq -R -s .),
  "role": "${ROLE}"
}
EOF
)
                RES=$(curl -s -X POST "${API_URL}/dids" -H "Content-Type: application/json" -d "$PAYLOAD")
                echo -e "${GREEN}Ledger Result:${NC}"
                format_json "$RES"
                pause_and_continue
                ;;
            1)
                echo -e "\n${YELLOW}--- Assign / Change Role ---${NC}"
                read -p "Target DID: " T_DID
                read -p "New Role [ADMIN / MANAGER / AUDITOR / USER]: " N_ROLE
                PAYLOAD=$(cat <<EOF
{
  "adminDID": "${ADMIN_DID}",
  "targetDID": "${T_DID}",
  "newRole": "${N_ROLE}"
}
EOF
)
                RES=$(curl -s -X POST "${API_URL}/roles/assign" -H "Content-Type: application/json" -d "$PAYLOAD")
                format_json "$RES"
                pause_and_continue
                ;;
            2)
                echo -e "\n${RED}--- REVOKE DID IDENTITY ---${NC}"
                read -p "Enter DID to REVOKE: " T_DID
                if [ -n "$T_DID" ]; then
                    read -p "Confirm revocation of ${T_DID}? (y/N): " CONFIRM
                    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
                        RES=$(curl -s -X POST "${API_URL}/dids/${T_DID}/revoke")
                        format_json "$RES"
                    fi
                fi
                pause_and_continue
                ;;
            3)
                echo -e "\n${YELLOW}--- Mint New Digital Asset (NFT) ---${NC}"
                read -p "Token ID: " T_ID
                [ -z "$T_ID" ] && T_ID="NFT-2026-$(date +%s | tail -c 4)"
                read -p "Asset Name: " A_NAME
                [ -z "$A_NAME" ] && A_NAME="Admin Minted Certificate"
                read -p "Asset Type [CERTIFICATE / PROPERTY / PATENT]: " A_TYPE
                [ -z "$A_TYPE" ] && A_TYPE="CERTIFICATE"

                PAYLOAD=$(cat <<EOF
{
  "adminDID": "${ADMIN_DID}",
  "tokenId": "${T_ID}",
  "assetName": "${A_NAME}",
  "assetType": "${A_TYPE}",
  "metadata": {
    "mintedBy": "${ADMIN_DID}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF
)
                RES=$(curl -s -X POST "${API_URL}/nfts/mint" -H "Content-Type: application/json" -d "$PAYLOAD")
                format_json "$RES"
                pause_and_continue
                ;;
            4)
                echo -e "\n${RED}--- REVOKE NFT ASSET ---${NC}"
                read -p "Token ID to Revoke: " T_ID
                if [ -n "$T_ID" ]; then
                    PAYLOAD=$(cat <<EOF
{
  "adminDID": "${ADMIN_DID}"
}
EOF
)
                    RES=$(curl -s -X POST "${API_URL}/nfts/${T_ID}/revoke" -H "Content-Type: application/json" -d "$PAYLOAD")
                    format_json "$RES"
                fi
                pause_and_continue
                ;;
            5)
                echo -e "\n${YELLOW}Querying all audit logs...${NC}"
                RES=$(curl -s -X GET "${API_URL}/audit")
                format_json "$RES"
                pause_and_continue
                ;;
            6)
                break
                ;;
        esac
    done
}

# ==============================================================================
# 👔 2. MANAGER MENU
# ==============================================================================

menu_manager() {
    local manager_options=(
        "💎 1. Allocate NFT to Owner DID"
        "💎 2. Transfer NFT Ownership"
        "💎 3. Search Assets Owned by Specific DID"
        "💎 4. Verify NFT Authenticity & Status"
        "↩️  0. Return to Main Role Portal"
    )

    while true; do
        prompt_arrow_menu "👔 MANAGER ROLE MENU  |  Active DID: ${MANAGER_DID}" "${manager_options[@]}"

        case $SELECTED_INDEX in
            0)
                echo -e "\n${YELLOW}--- Allocate NFT ---${NC}"
                read -p "Token ID to allocate: " T_ID
                read -p "Assign Target Owner DID: " O_DID
                PAYLOAD=$(cat <<EOF
{
  "actorDID": "${MANAGER_DID}",
  "ownerDID": "${O_DID}"
}
EOF
)
                RES=$(curl -s -X POST "${API_URL}/nfts/${T_ID}/allocate" -H "Content-Type: application/json" -d "$PAYLOAD")
                format_json "$RES"
                pause_and_continue
                ;;
            1)
                echo -e "\n${YELLOW}--- Transfer NFT Ownership ---${NC}"
                read -p "Token ID: " T_ID
                read -p "New Owner DID: " N_DID
                PAYLOAD=$(cat <<EOF
{
  "actorDID": "${MANAGER_DID}",
  "newOwnerDID": "${N_DID}"
}
EOF
)
                RES=$(curl -s -X POST "${API_URL}/nfts/${T_ID}/transfer" -H "Content-Type: application/json" -d "$PAYLOAD")
                format_json "$RES"
                pause_and_continue
                ;;
            2)
                echo -e "\n${YELLOW}--- Search Assets by Owner DID ---${NC}"
                read -p "Owner DID: " O_DID
                if [ -n "$O_DID" ]; then
                    RES=$(curl -s -X GET "${API_URL}/nfts/owner/${O_DID}")
                    format_json "$RES"
                fi
                pause_and_continue
                ;;
            3)
                echo -e "\n${YELLOW}--- Verify NFT On-Chain Authenticity ---${NC}"
                read -p "Token ID: " T_ID
                if [ -n "$T_ID" ]; then
                    RES=$(curl -s -X POST "${API_URL}/nfts/${T_ID}/verify")
                    format_json "$RES"
                fi
                pause_and_continue
                ;;
            4)
                break
                ;;
        esac
    done
}

# ==============================================================================
# 🔍 3. AUDITOR MENU
# ==============================================================================

menu_auditor() {
    local auditor_options=(
        "📜 1. View All Ledger Audit Logs"
        "📜 2. Filter Audit Logs by Resource ID (Token/DID)"
        "👤 3. List All Registered DIDs & Roles"
        "📜 4. View NFT Provenance / History Timeline"
        "↩️  0. Return to Main Role Portal"
    )

    while true; do
        prompt_arrow_menu "🔍 AUDITOR ROLE MENU  |  Active DID: ${AUDITOR_DID}" "${auditor_options[@]}"

        case $SELECTED_INDEX in
            0)
                echo -e "\n${YELLOW}Querying all audit log entries...${NC}"
                RES=$(curl -s -X GET "${API_URL}/audit")
                format_json "$RES"
                pause_and_continue
                ;;
            1)
                echo -e "\n${YELLOW}--- Filter Audit Logs by Resource ID ---${NC}"
                read -p "Resource ID (Token ID or DID): " R_ID
                if [ -n "$R_ID" ]; then
                    RES=$(curl -s -X GET "${API_URL}/audit/${R_ID}")
                    format_json "$RES"
                fi
                pause_and_continue
                ;;
            2)
                echo -e "\n${YELLOW}Querying all registered DIDs...${NC}"
                RES=$(curl -s -X GET "${API_URL}/dids")
                format_json "$RES"
                pause_and_continue
                ;;
            3)
                echo -e "\n${YELLOW}--- View NFT Provenance Timeline ---${NC}"
                read -p "Token ID: " T_ID
                if [ -n "$T_ID" ]; then
                    RES=$(curl -s -X GET "${API_URL}/nfts/${T_ID}/history")
                    format_json "$RES"
                fi
                pause_and_continue
                ;;
            4)
                break
                ;;
        esac
    done
}

# ==============================================================================
# 👤 4. USER MENU
# ==============================================================================

menu_user() {
    local user_options=(
        "💎 1. View My Owned Assets (${USER_DID})"
        "💎 2. Transfer My Asset to Another DID"
        "💎 3. Verify Asset Authenticity & Status"
        "↩️  0. Return to Main Role Portal"
    )

    while true; do
        prompt_arrow_menu "👤 USER ROLE MENU  |  Active DID: ${USER_DID}" "${user_options[@]}"

        case $SELECTED_INDEX in
            0)
                echo -e "\n${YELLOW}Querying assets owned by ${USER_DID}...${NC}"
                RES=$(curl -s -X GET "${API_URL}/nfts/owner/${USER_DID}")
                format_json "$RES"
                pause_and_continue
                ;;
            1)
                echo -e "\n${YELLOW}--- Transfer My Asset ---${NC}"
                read -p "Token ID to Transfer: " T_ID
                read -p "Recipient New Owner DID: " N_DID
                PAYLOAD=$(cat <<EOF
{
  "actorDID": "${USER_DID}",
  "newOwnerDID": "${N_DID}"
}
EOF
)
                RES=$(curl -s -X POST "${API_URL}/nfts/${T_ID}/transfer" -H "Content-Type: application/json" -d "$PAYLOAD")
                format_json "$RES"
                pause_and_continue
                ;;
            2)
                echo -e "\n${YELLOW}--- Verify Asset Authenticity ---${NC}"
                read -p "Token ID: " T_ID
                if [ -n "$T_ID" ]; then
                    RES=$(curl -s -X POST "${API_URL}/nfts/${T_ID}/verify")
                    format_json "$RES"
                fi
                pause_and_continue
                ;;
            3)
                break
                ;;
        esac
    done
}

# ==============================================================================
# MAIN PORTAL LOOP
# ==============================================================================

if [ "$1" == "--role" ] && [ -n "$2" ]; then
    case "$2" in
        admin) menu_admin; exit 0 ;;
        manager) menu_manager; exit 0 ;;
        auditor) menu_auditor; exit 0 ;;
        user) menu_user; exit 0 ;;
    esac
fi

main_portal() {
    local main_options=(
        "👑 1. ADMIN MENU     - Full Control (DID Reg, Roles, Minting, Revocations, Audits)"
        "👔 2. MANAGER MENU   - Asset Operations (Allocations, Transfers, Asset Lookups)"
        "🔍 3. AUDITOR MENU   - Compliance (Immutable Audit Logs, Registry & Provenance)"
        "👤 4. USER MENU      - Self Services (View Owned Assets, Asset Transfers)"
        "🚪 0. EXIT PORTAL"
    )

    while true; do
        prompt_arrow_menu "MAIN ROLE PORTAL  |  API Target: ${API_URL}" "${main_options[@]}"

        case $SELECTED_INDEX in
            0) menu_admin ;;
            1) menu_manager ;;
            2) menu_auditor ;;
            3) menu_user ;;
            4)
                echo -e "\n${GREEN}Exiting Multi-Role Platform Control Portal. Goodbye!${NC}"
                exit 0
                ;;
        esac
    done
}

# Run main portal
main_portal
