#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_NETWORK_DIR="${PROJECT_ROOT}/blockchain/network/fabric-samples/test-network"
BIN_DIR="${PROJECT_ROOT}/blockchain/network/fabric-samples/bin"

export PATH="${BIN_DIR}:${PATH}"
export FABRIC_CFG_PATH="${PROJECT_ROOT}/blockchain/network/fabric-samples/config/"

echo "=== Starting Hyperledger Fabric Test Network (Channel: mychannel, CA: enabled, Database: CouchDB) ==="

if [ ! -d "${FABRIC_NETWORK_DIR}" ]; then
    echo "Error: Fabric test-network directory not found at ${FABRIC_NETWORK_DIR}"
    exit 1
fi

cd "${FABRIC_NETWORK_DIR}"

# Down first to clear existing state if any
./network.sh down || true
docker volume prune -f 2>/dev/null || true

# Bring up network with CouchDB state database
./network.sh up createChannel -c mychannel -s couchdb

# Deploy Chaincode sih26125
"${PROJECT_ROOT}/scripts/deploy-chaincode.sh"

echo "=== Fabric Network Started & Chaincode Deployed Successfully! ==="
