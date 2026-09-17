package main

import (
	"testing"
)

func TestRecordAuditEvent(t *testing.T) {
	contract, ctx := SetupTestContext()

	actorDID := "did:sih26125:actor1"
	action := "MINT_NFT"
	resourceID := "NFT-700"
	result := "ALLOWED"
	details := "Minted test NFT"

	// 1. Record Audit Event
	err := contract.RecordAuditEvent(ctx, actorDID, action, resourceID, result, details)
	if err != nil {
		t.Fatalf("RecordAuditEvent failed: %v", err)
	}

	// 2. Retrieve recorded audit logs by resource ID
	logs, err := contract.GetAuditLogsByResource(ctx, resourceID)
	if err != nil {
		t.Fatalf("GetAuditLogsByResource failed: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("Expected 1 audit log entry, got %d", len(logs))
	}

	log := logs[0]
	if log.ActorDID != actorDID || log.Action != action || log.ResourceID != resourceID || log.Result != result {
		t.Errorf("Audit log entry mismatch: %+v", log)
	}
}

func TestGetAuditLogs(t *testing.T) {
	contract, ctx := SetupTestContext()

	_ = contract.RecordAuditEvent(ctx, "did:sih26125:admin", "CREATE_DID", "did:sih26125:user1", "ALLOWED", "User registered")
	_ = contract.RecordAuditEvent(ctx, "did:sih26125:user2", "MINT_NFT", "NFT-800", "DENIED", "Unauthorized role")

	// Query all audit logs
	allLogs, err := contract.GetAuditLogs(ctx)
	if err != nil {
		t.Fatalf("GetAuditLogs failed: %v", err)
	}
	if len(allLogs) != 2 {
		t.Errorf("Expected 2 audit log entries, got %d", len(allLogs))
	}
}
