#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_NETWORK_DIR="${PROJECT_ROOT}/blockchain/network/fabric-samples/test-network"
BIN_DIR="${PROJECT_ROOT}/blockchain/network/fabric-samples/bin"
CHAINCODE_DIR="${PROJECT_ROOT}/blockchain/chaincode"

export PATH="${BIN_DIR}:${PATH}"
export FABRIC_CFG_PATH="${PROJECT_ROOT}/blockchain/network/fabric-samples/config/"

echo "=== Deploying Chaincode 'sih26125' to Channel 'mychannel' ==="

cd "${FABRIC_NETWORK_DIR}"

# Determine if chaincode is already committed
COMMITTED=$(peer lifecycle chaincode querycommitted --channelID mychannel --name sih26125 2>/dev/null | grep "Version:" || true)

if [ -z "$COMMITTED" ]; then
    echo "First-time deployment with InitLedger..."
    ./network.sh deployCC \
        -c mychannel \
        -ccn sih26125 \
        -ccp "${CHAINCODE_DIR}" \
        -ccl go \
        -cci InitLedger
else
    echo "Upgrading committed chaincode..."
    ./network.sh deployCC \
        -c mychannel \
        -ccn sih26125 \
        -ccp "${CHAINCODE_DIR}" \
        -ccl go
fi

echo "=== Chaincode 'sih26125' Deployed Successfully! ==="
