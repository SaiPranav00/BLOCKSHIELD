#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while true; do
    clear
    echo "=========================================="
    echo "   SIH 2026 BLOCKCHAIN CONTROL MENU"
    echo "=========================================="
    echo "  1. Start Everything (Full Setup & Test)"
    echo "  2. Start Blockchain Network"
    echo "  3. Deploy Smart Contract"
    echo "  4. Run Organization Demo"
    echo "  5. Run All Tests"
    echo "  6. Stop Network"
    echo "  0. Exit"
    echo "=========================================="
    read -p "Enter option [0-6]: " choice

    case $choice in
        1)
            echo "Starting full platform..."
            "${PROJECT_ROOT}/scripts/network-up.sh"
            "${PROJECT_ROOT}/scripts/deploy-chaincode.sh"
            "${PROJECT_ROOT}/scripts/bootstrap.sh"
            "${PROJECT_ROOT}/scripts/test-all.sh"
            read -p "Done! Press Enter..."
            ;;
        2)
            "${PROJECT_ROOT}/scripts/network-up.sh"
            read -p "Done! Press Enter..."
            ;;
        3)
            "${PROJECT_ROOT}/scripts/deploy-chaincode.sh"
            read -p "Done! Press Enter..."
            ;;
        4)
            "${PROJECT_ROOT}/scripts/demo-organization.sh"
            read -p "Done! Press Enter..."
            ;;
        5)
            "${PROJECT_ROOT}/scripts/test-all.sh"
            read -p "Done! Press Enter..."
            ;;
        6)
            "${PROJECT_ROOT}/scripts/network-down.sh"
            read -p "Done! Press Enter..."
            ;;
        0)
            echo "Bye!"
            exit 0
            ;;
        *)
            echo "Invalid option!"
            sleep 1
            ;;
    esac
done
