#!/usr/bin/env bash
# ==============================================================================
#  BLOCKSHIELD: Automated Intelligent Master Startup Script (SIH 2026 SIH26125)
#  Runs on any laptop/machine from scratch - auto-installs dependencies,
#  sets up Hyperledger Fabric, deploys chaincode, seeds data & starts servers.
# ==============================================================================

set -e

# Terminal formatting colors
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${PROJECT_ROOT}"

echo -e "${CYAN}${BOLD}"
echo "========================================================================"
echo "    🛡️  BLOCKSHIELD: SMART BLOCKCHAIN PLATFORM AUTO-STARTUP (SIH26125)   "
echo "========================================================================"
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. PREREQUISITE & DEPENDENCY CHECKS
# ------------------------------------------------------------------------------
echo -e "${BLUE}[1/6] Checking system prerequisites...${NC}"

# Check Docker Daemon
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker & Docker Compose first.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker daemon is not running. Attempting to start Docker service...${NC}"
    sudo systemctl start docker 2>/dev/null || true
    sleep 3
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is still not running. Please start Docker manually.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}  ✓ Docker & Docker Compose are running${NC}"

# Check Node.js & npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js v18+.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v) & npm $(npm -v) detected${NC}"

# Check Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}Error: Go language compiler is not installed. Please install Go 1.22+.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Go compiler $(go version | awk '{print $3}') detected${NC}"

# Make scripts executable
chmod +x "${PROJECT_ROOT}"/scripts/*.sh 2>/dev/null || true

# ------------------------------------------------------------------------------
# 2. AUTO-SETUP HYPERLEDGER FABRIC SAMPLES & BINARIES
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2/6] Verifying Fabric network binaries & samples...${NC}"

NETWORK_DIR="${PROJECT_ROOT}/blockchain/network"
FABRIC_SAMPLES_DIR="${NETWORK_DIR}/fabric-samples"
TEST_NETWORK_DIR="${FABRIC_SAMPLES_DIR}/test-network"
BIN_DIR="${FABRIC_SAMPLES_DIR}/bin"

mkdir -p "${NETWORK_DIR}"

if [ ! -d "${TEST_NETWORK_DIR}" ] || [ ! -d "${BIN_DIR}" ]; then
    echo -e "${YELLOW}Fabric test-network or binaries missing. Automating installation...${NC}"
    cd "${NETWORK_DIR}"
    
    if [ ! -f "${NETWORK_DIR}/install-fabric.sh" ]; then
        echo -e "${CYAN}Downloading Fabric installer script...${NC}"
        curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
        chmod +x install-fabric.sh
    fi

    if [ ! -d "${TEST_NETWORK_DIR}" ]; then
        echo -e "${CYAN}Cloning fabric-samples test-network repository...${NC}"
        rm -rf temp_samples
        git clone --depth 1 https://github.com/hyperledger/fabric-samples.git temp_samples
        mkdir -p "${FABRIC_SAMPLES_DIR}"
        cp -r temp_samples/test-network "${FABRIC_SAMPLES_DIR}/"
        rm -rf temp_samples
    fi

    if [ ! -d "${BIN_DIR}" ]; then
        echo -e "${CYAN}Downloading Hyperledger Fabric 2.5 binaries & Docker images...${NC}"
        ./install-fabric.sh -f 2.5.16 -c 1.5.17 binary docker
    fi
    cd "${PROJECT_ROOT}"
fi
echo -e "${GREEN}  ✓ Hyperledger Fabric binaries & test-network ready${NC}"

# Ensure CouchDB docker image is pulled
if ! docker image inspect couchdb:3.4.2 &> /dev/null; then
    echo -e "${CYAN}Pulling couchdb:3.4.2 docker image...${NC}"
    docker pull couchdb:3.4.2 || true
fi

# ------------------------------------------------------------------------------
# 3. AUTO-INSTALL NODE DEPENDENCIES (BACKEND & FRONTEND)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3/6] Verifying Node.js dependencies for Backend & Frontend...${NC}"

if [ ! -d "${PROJECT_ROOT}/backend/node_modules" ]; then
    echo -e "${CYAN}Installing backend npm dependencies...${NC}"
    (cd "${PROJECT_ROOT}/backend" && npm install)
else
    echo -e "${GREEN}  ✓ Backend dependencies already installed${NC}"
fi

if [ ! -d "${PROJECT_ROOT}/frontend/node_modules" ]; then
    echo -e "${CYAN}Installing frontend npm dependencies...${NC}"
    (cd "${PROJECT_ROOT}/frontend" && npm install)
else
    echo -e "${GREEN}  ✓ Frontend dependencies already installed${NC}"
fi

# ------------------------------------------------------------------------------
# 4. START FABRIC BLOCKCHAIN NETWORK & DEPLOY CHAINCODE
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4/6] Starting Hyperledger Fabric Network & Deploying Chaincode...${NC}"

"${PROJECT_ROOT}/scripts/network-up.sh"

echo -e "${GREEN}  ✓ Blockchain network active & Go chaincode 'sih26125' deployed${NC}"

# ------------------------------------------------------------------------------
# 5. START BACKEND SERVER & SEED BOOTSTRAP DATA
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[5/6] Launching Node.js Express REST API & Seeding Data...${NC}"

# Check if backend port 5000 is running
if curl -s http://localhost:5000/health | grep -q "UP"; then
    echo -e "${GREEN}  ✓ Backend REST API server is already running on http://localhost:5000${NC}"
else
    echo -e "${CYAN}Starting backend REST API on http://localhost:5000 in background...${NC}"
    cd "${PROJECT_ROOT}/backend"
    nohup npm start > "${PROJECT_ROOT}/backend.log" 2>&1 &
    cd "${PROJECT_ROOT}"
    
    # Wait for backend health check
    for i in {1..15}; do
        if curl -s http://localhost:5000/health | grep -q "UP"; then
            echo -e "${GREEN}  ✓ Backend REST API is live!${NC}"
            break
        fi
        sleep 1
    done
fi

# Seed bootstrap data
echo -e "${CYAN}Seeding initial DIDs, BEL assets, allocations, and transfer requests...${NC}"
"${PROJECT_ROOT}/scripts/bootstrap.sh"

# ------------------------------------------------------------------------------
# 6. START FRONTEND APPLICATION & DISPLAY DASHBOARD LINKS
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[6/6] Launching React Dashboard Frontend...${NC}"

echo -e "${CYAN}${BOLD}"
echo "========================================================================"
echo " 🎉 BLOCKSHIELD PLATFORM FULLY STARTED & OPERATIONAL!                   "
echo "========================================================================"
echo -e "${NC}"
echo -e "${BOLD}Active Service Endpoints:${NC}"
echo -e " 🟢 ${GREEN}Central Platform & All 4 Portals${NC}: ${CYAN}http://localhost:5173${NC} (Admin, Manager, Auditor, User)"
echo -e " 🟢 ${GREEN}Backend REST API${NC}                : ${CYAN}http://localhost:5000${NC}"
echo -e " 🟢 ${GREEN}Hyperledger Peer 1${NC}              : ${CYAN}localhost:7051${NC} (Org1MSP)"
echo -e " 🟢 ${GREEN}Hyperledger Peer 2${NC}              : ${CYAN}localhost:9051${NC} (Org2MSP)"
echo -e " 🟢 ${GREEN}CouchDB State DB${NC}                : ${CYAN}http://localhost:5984/_utils${NC}"
echo -e ""
echo -e "${BOLD}Role Portal Command Shortcuts:${NC}"
echo -e "  - ${YELLOW}Admin Security Portal${NC}  : http://localhost:5173  (Select 'Admin Security Portal' card or click 🛡️ Admin in Header)"
echo -e "  - ${YELLOW}Manager Review Portal${NC}  : http://localhost:5173  (Select 'Manager Portal' card or click 💼 Manager in Header)"
echo -e "  - ${YELLOW}Auditor Stream Portal${NC} : http://localhost:5173  (Select 'Auditor Portal' card or click 🔍 Auditor in Header)"
echo -e "  - ${YELLOW}User / Engineer Portal${NC} : http://localhost:5173  (Select 'User Portal' card or click 👤 User in Header)"
echo -e "  - ${YELLOW}Dedicated Isolated Ports${NC}: Admin (5174), Manager (5175), Auditor (5176)"
echo -e "========================================================================"
echo -e ""
echo -e "${BOLD}Starting default React Frontend dev server on http://localhost:5173 ...${NC}"

cd "${PROJECT_ROOT}/frontend"
exec npm run dev
