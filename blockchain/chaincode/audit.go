package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// AuditEvent defines an immutable audit log record stored on ledger
type AuditEvent struct {
	ObjectType string `json:"docType"` // "audit" for CouchDB rich query support
	EventID    string `json:"eventId"`
	ActorDID   string `json:"actorDID"`
	Action     string `json:"action"`
	ResourceID string `json:"resourceId"`
	Result     string `json:"result"` // "ALLOWED", "DENIED"
	Timestamp  string `json:"timestamp"`
	Details    string `json:"details"`
}

// RecordAuditEvent writes an audit log entry to the ledger
func (s *SmartContract) RecordAuditEvent(ctx contractapi.TransactionContextInterface, actorDID string, action string, resourceID string, result string, details string) error {
	txID := ctx.GetStub().GetTxID()
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()

	var timeStr string
	if err == nil && txTimestamp != nil {
		timeStr = fmt.Sprintf("%d", txTimestamp.Seconds)
	} else {
		timeStr = ctx.GetStub().GetTxID()
	}

	eventID := fmt.Sprintf("AUDIT_%s_%s", timeStr, txID)

	audit := AuditEvent{
		ObjectType: "audit",
		EventID:    eventID,
		ActorDID:   actorDID,
		Action:     action,
		ResourceID: resourceID,
		Result:     result,
		Timestamp:  timeStr,
		Details:    details,
	}

	auditJSON, err := json.Marshal(audit)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(eventID, auditJSON)
}

// GetAuditLogs retrieves all audit trail entries from the ledger
func (s *SmartContract) GetAuditLogs(ctx contractapi.TransactionContextInterface) ([]*AuditEvent, error) {
	queryString := `{"selector":{"docType":"audit"}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		resultsIterator, err = ctx.GetStub().GetStateByRange("AUDIT_", "AUDIT_\uffff")
		if err != nil {
			return nil, err
		}
	}
	defer resultsIterator.Close()

	var auditLogs []*AuditEvent
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var audit AuditEvent
		err = json.Unmarshal(queryResponse.Value, &audit)
		if err != nil {
			continue
		}
		if audit.ObjectType == "audit" {
			auditLogs = append(auditLogs, &audit)
		}
	}

	return auditLogs, nil
}

// GetAuditLogsByResource retrieves audit records for a specific resource ID (e.g. NFT-001 or DID)
func (s *SmartContract) GetAuditLogsByResource(ctx contractapi.TransactionContextInterface, resourceID string) ([]*AuditEvent, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"audit","resourceId":"%s"}}`, resourceID)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var auditLogs []*AuditEvent
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var audit AuditEvent
		err = json.Unmarshal(queryResponse.Value, &audit)
		if err != nil {
			continue
		}
		auditLogs = append(auditLogs, &audit)
	}

	return auditLogs, nil
}
