#!/usr/bin/env bash
# ==============================================================================
#  BLOCKSHIELD: Standalone Sovereign Frontend Startup Script (SIH26125)
#  Runs the BlockShield platform with 100% self-contained local cryptographic
#  ledger and full functionality. Zero Docker, Zero MongoDB, Zero backend needed!
# ==============================================================================

set -e

# Terminal colors
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
PURPLE="\033[0;35m"
RED="\033[0;31m"
NC="\033[0m"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
PORT="${PORT:-5173}"

echo -e "${CYAN}${BOLD}"
echo "========================================================================"
echo "    🛡️  BLOCKSHIELD: SOVEREIGN WEB APPLICATION & LOCAL LEDGER (SIH26125) "
echo "========================================================================"
echo -e "${NC}"

# 1. System checks
echo -e "${BLUE}[1/3] Verifying Node.js & npm runtime...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js v18+ to run the application.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm to continue.${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Node.js $(node -v) & npm $(npm -v) detected${NC}"

# 2. Dependencies check
echo -e "\n${BLUE}[2/3] Checking frontend dependencies...${NC}"
cd "${FRONTEND_DIR}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing dependencies in frontend directory...${NC}"
    npm install
else
    echo -e "${GREEN}  ✓ Dependencies installed in frontend/node_modules${NC}"
fi

# 3. Launch Vite server
echo -e "\n${BLUE}[3/3] Starting Standalone Sovereign Web Application...${NC}"
echo -e "${PURPLE}${BOLD}"
echo "------------------------------------------------------------------------"
echo "  🚀 PLATFORM READY & RUNNING IN STANDALONE SOVEREIGN MODE"
echo "------------------------------------------------------------------------"
echo -e "${NC}"
echo -e "  ${BOLD}🌐 Application URL:${NC}    ${CYAN}http://localhost:${PORT}${NC}"
echo -e "  ${BOLD}⚡ Execution Mode:${NC}     ${GREEN}100% Standalone (Built-in Cryptographic Ledger)${NC}"
echo -e "  ${BOLD}📦 External Stack:${NC}     ${YELLOW}Zero Docker / Zero MongoDB / Zero Backend Required${NC}"
echo ""
echo -e "  ${BOLD}🔐 Default Demo Credentials (All Roles Ready):${NC}"
echo -e "     • ${BLUE}Administrator:${NC}    Username: ${BOLD}ADMIN001${NC}    | Password: ${BOLD}password123${NC}"
echo -e "     • ${CYAN}Manager:${NC}          Username: ${BOLD}MANAGER001${NC}  | Password: ${BOLD}password123${NC}"
echo -e "     • ${PURPLE}Auditor:${NC}          Username: ${BOLD}AUDITOR001${NC}  | Password: ${BOLD}password123${NC}"
echo -e "     • ${GREEN}Custodian User:${NC}   Username: ${BOLD}USER001${NC}     | Password: ${BOLD}password123${NC}"
echo ""
echo -e "  ${YELLOW}${BOLD}⚠️  Admin Governance Notice:${NC}"
echo -e "     When new users submit registration requests, the ${BOLD}Administrator${NC}"
echo -e "     must manually approve them in the Admin Portal before they can log in."
echo ""
echo -e "------------------------------------------------------------------------"
echo -e "${YELLOW}Press Ctrl+C at any time to stop the server.${NC}\n"

exec npm run dev -- --host 0.0.0.0 --port "${PORT}"
