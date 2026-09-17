#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_NETWORK_DIR="${PROJECT_ROOT}/blockchain/network/fabric-samples/test-network"
BIN_DIR="${PROJECT_ROOT}/blockchain/network/fabric-samples/bin"

export PATH="${BIN_DIR}:${PATH}"

echo "=== Tearing Down Hyperledger Fabric Test Network ==="

if [ -d "${FABRIC_NETWORK_DIR}" ]; then
    cd "${FABRIC_NETWORK_DIR}"
    ./network.sh down
fi

echo "=== Network Stopped and Cleaned Up Successfully! ==="
