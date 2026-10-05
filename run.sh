#!/usr/bin/env bash
# ==============================================================================
#  BLOCKSHIELD: Standalone Sovereign Startup Script (SIH26125)
#  Runs both the Public User Portal (Port 5173) and the Enterprise Governance
#  Portal (Port 5174) concurrently with full functionality.
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
USER_PORT="${USER_PORT:-5173}"
ENTERPRISE_PORT="${ENTERPRISE_PORT:-5174}"

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

# 3. Clean up existing processes on the target ports
echo -e "\n${BLUE}[3/3] Initializing dual portal servers...${NC}"

if command -v lsof &> /dev/null; then
    lsof -ti:"${USER_PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti:"${ENTERPRISE_PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
elif command -v fuser &> /dev/null; then
    fuser -k "${USER_PORT}/tcp" 2>/dev/null || true
    fuser -k "${ENTERPRISE_PORT}/tcp" 2>/dev/null || true
fi

# Cleanup function to kill background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping BlockShield servers...${NC}"
    if [ -n "${PID_USER}" ] && kill -0 "${PID_USER}" 2>/dev/null; then
        kill "${PID_USER}" 2>/dev/null || true
    fi
    if [ -n "${PID_ENTERPRISE}" ] && kill -0 "${PID_ENTERPRISE}" 2>/dev/null; then
        kill "${PID_ENTERPRISE}" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 3A. Start User Portal on Port 5173
npx vite --host 0.0.0.0 --port "${USER_PORT}" &
PID_USER=$!

# 3B. Start Enterprise Governance Portal on Port 5174
npx vite --host 0.0.0.0 --port "${ENTERPRISE_PORT}" &
PID_ENTERPRISE=$!

sleep 1.5

echo -e "${PURPLE}${BOLD}"
echo "------------------------------------------------------------------------"
echo "  🚀 PLATFORMS READY & RUNNING CONCURRENTLY"
echo "------------------------------------------------------------------------"
echo -e "${NC}"
echo -e "  ${BOLD}🌐 Public User Portal (Main):${NC}    ${CYAN}http://localhost:${USER_PORT}${NC}  (Dedicated End-User Page)"
echo -e "  ${BOLD}🛡️  Enterprise Governance Portal:${NC} ${PURPLE}http://localhost:${ENTERPRISE_PORT}${NC} (Admin, Manager, Auditor)"
echo -e "  ${BOLD}⚡ Execution Mode:${NC}                ${GREEN}100% Standalone (Built-in Cryptographic Ledger)${NC}"
echo -e "  ${BOLD}📦 External Stack:${NC}                ${YELLOW}Zero Docker / Zero MongoDB / Zero Backend Required${NC}"
echo ""
echo -e "  ${BOLD}🔐 Role Demo Credentials (Strictly Isolated by Role):${NC}"
echo -e "     • ${GREEN}Custodian User (Port ${USER_PORT}):${NC}  Username: ${BOLD}USER001${NC}     | Password: ${BOLD}password123${NC}"
echo -e "     • ${BLUE}Administrator (Port ${ENTERPRISE_PORT}):${NC}   Username: ${BOLD}ADMIN001${NC}    | Password: ${BOLD}password123${NC}"
echo -e "     • ${CYAN}Manager (Port ${ENTERPRISE_PORT}):${NC}         Username: ${BOLD}MANAGER001${NC}  | Password: ${BOLD}password123${NC}"
echo -e "     • ${PURPLE}Auditor (Port ${ENTERPRISE_PORT}):${NC}         Username: ${BOLD}AUDITOR001${NC}  | Password: ${BOLD}password123${NC}"
echo ""
echo -e "  ${YELLOW}${BOLD}⚠️  Admin Governance Notice:${NC}"
echo -e "     When new users submit registration requests, the ${BOLD}Administrator${NC}"
echo -e "     must manually approve them in the Admin Portal before they can log in."
echo ""
echo -e "------------------------------------------------------------------------"
echo -e "${YELLOW}Press Ctrl+C at any time to stop both servers.${NC}\n"

wait "${PID_USER}" "${PID_ENTERPRISE}"
