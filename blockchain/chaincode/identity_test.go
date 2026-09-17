package main

import (
	"encoding/json"
	"testing"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func TestContractReflect(t *testing.T) {
	contract := new(SmartContract)
	cc, err := contractapi.NewChaincode(contract)
	if err != nil {
		t.Fatalf("Failed to create chaincode: %v", err)
	}
	if cc == nil {
		t.Fatalf("Chaincode instance is nil")
	}
}

func TestCreateDID(t *testing.T) {
	contract, ctx := SetupTestContext()

	// 1. Successful DID Creation
	did := "did:sih26125:user100"
	pubKey := "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
	role := "USER"

	identity, err := contract.CreateDID(ctx, did, pubKey, role)
	if err != nil {
		t.Fatalf("CreateDID failed: %v", err)
	}
	if identity.DID != did || identity.Role != "USER" || identity.Status != "ACTIVE" {
		t.Errorf("Unexpected DID record created: %+v", identity)
	}

	// 2. Duplicate DID creation failure
	_, err = contract.CreateDID(ctx, did, pubKey, role)
	if err == nil {
		t.Errorf("Expected error when creating duplicate DID, got nil")
	}

	// 3. Invalid DID prefix failure
	_, err = contract.CreateDID(ctx, "did:other:123", pubKey, role)
	if err == nil {
		t.Errorf("Expected error for invalid DID prefix, got nil")
	}

	// 4. Invalid Role failure
	_, err = contract.CreateDID(ctx, "did:sih26125:user101", pubKey, "INVALID_ROLE")
	if err == nil {
		t.Errorf("Expected error for invalid role, got nil")
	}
}

func TestGetDID(t *testing.T) {
	contract, ctx := SetupTestContext()

	did := "did:sih26125:user200"
	_, err := contract.CreateDID(ctx, did, "pubkey_200", "MANAGER")
	if err != nil {
		t.Fatalf("Failed to seed DID: %v", err)
	}

	// 1. Existing DID lookup
	fetched, err := contract.GetDID(ctx, did)
	if err != nil {
		t.Fatalf("GetDID failed: %v", err)
	}
	if fetched.DID != did || fetched.Role != "MANAGER" {
		t.Errorf("GetDID mismatch: %+v", fetched)
	}

	// 2. Non-existent DID lookup
	_, err = contract.GetDID(ctx, "did:sih26125:nonexistent")
	if err == nil {
		t.Errorf("Expected error for non-existent DID, got nil")
	}
}

func TestUpdateDID(t *testing.T) {
	contract, ctx := SetupTestContext()

	did := "did:sih26125:user300"
	_, err := contract.CreateDID(ctx, did, "old_key", "USER")
	if err != nil {
		t.Fatalf("Failed to seed DID: %v", err)
	}

	// 1. Update public key and role
	updated, err := contract.UpdateDID(ctx, did, "new_key", "AUDITOR")
	if err != nil {
		t.Fatalf("UpdateDID failed: %v", err)
	}
	if updated.PublicKey != "new_key" || updated.Role != "AUDITOR" {
		t.Errorf("UpdateDID failed to apply changes: %+v", updated)
	}

	// 2. Revoke DID then attempt update -> Expect Error
	_, err = contract.RevokeDID(ctx, did)
	if err != nil {
		t.Fatalf("RevokeDID failed: %v", err)
	}

	_, err = contract.UpdateDID(ctx, did, "newer_key", "USER")
	if err == nil {
		t.Errorf("Expected error updating revoked DID, got nil")
	}
}

func TestRevokeDID(t *testing.T) {
	contract, ctx := SetupTestContext()

	did := "did:sih26125:user400"
	_, err := contract.CreateDID(ctx, did, "key_400", "USER")
	if err != nil {
		t.Fatalf("Failed to seed DID: %v", err)
	}

	// 1. Revoke active DID
	revoked, err := contract.RevokeDID(ctx, did)
	if err != nil {
		t.Fatalf("RevokeDID failed: %v", err)
	}
	if revoked.Status != "REVOKED" {
		t.Errorf("Expected status REVOKED, got %s", revoked.Status)
	}

	// 2. Revoke non-existent DID
	_, err = contract.RevokeDID(ctx, "did:sih26125:fake")
	if err == nil {
		t.Errorf("Expected error revoking non-existent DID, got nil")
	}
}

func TestVerifyDID(t *testing.T) {
	contract, ctx := SetupTestContext()

	didActive := "did:sih26125:active_user"
	didRevoked := "did:sih26125:revoked_user"

	_, _ = contract.CreateDID(ctx, didActive, "key_active", "ADMIN")
	_, _ = contract.CreateDID(ctx, didRevoked, "key_revoked", "USER")
	_, _ = contract.RevokeDID(ctx, didRevoked)

	// 1. Verify Active DID
	resActiveStr, err := contract.VerifyDID(ctx, didActive)
	if err != nil {
		t.Fatalf("VerifyDID failed: %v", err)
	}
	var resActive map[string]interface{}
	_ = json.Unmarshal([]byte(resActiveStr), &resActive)
	if resActive["valid"] != true || resActive["role"] != "ADMIN" {
		t.Errorf("Unexpected verification result for active DID: %s", resActiveStr)
	}

	// 2. Verify Revoked DID
	resRevokedStr, err := contract.VerifyDID(ctx, didRevoked)
	if err != nil {
		t.Fatalf("VerifyDID failed: %v", err)
	}
	var resRevoked map[string]interface{}
	_ = json.Unmarshal([]byte(resRevokedStr), &resRevoked)
	if resRevoked["valid"] != false {
		t.Errorf("Expected valid=false for revoked DID: %s", resRevokedStr)
	}

	// 3. Verify Non-existent DID
	resMissingStr, err := contract.VerifyDID(ctx, "did:sih26125:missing")
	if err != nil {
		t.Fatalf("VerifyDID failed: %v", err)
	}
	var resMissing map[string]interface{}
	_ = json.Unmarshal([]byte(resMissingStr), &resMissing)
	if resMissing["valid"] != false {
		t.Errorf("Expected valid=false for missing DID: %s", resMissingStr)
	}
}

func TestGetAllDIDs(t *testing.T) {
	contract, ctx := SetupTestContext()

	_, _ = contract.CreateDID(ctx, "did:sih26125:d1", "key1", "USER")
	_, _ = contract.CreateDID(ctx, "did:sih26125:d2", "key2", "ADMIN")

	list, err := contract.GetAllDIDs(ctx)
	if err != nil {
		t.Fatalf("GetAllDIDs failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("Expected 2 DIDs, got %d", len(list))
	}
}
