package main

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract defines the SIH26125 chaincode structure
type SmartContract struct {
	contractapi.Contract
}

// InitLedger initializes ledger state
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("SIH26125 Chaincode Initialized successfully")
	return nil
}

// Ping checks chaincode responsiveness
func (s *SmartContract) Ping(ctx contractapi.TransactionContextInterface) (string, error) {
	return "pong", nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating SIH26125 chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting SIH26125 chaincode: %v\n", err)
	}
}
