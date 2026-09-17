package main

import (
	"encoding/json"
	"testing"
)

func seedTestDIDs(contract *SmartContract, ctx *MockTransactionContext) (adminDID, managerDID, user1DID, user2DID string) {
	adminDID = "did:sih26125:admin1"
	managerDID = "did:sih26125:manager1"
	user1DID = "did:sih26125:user1"
	user2DID = "did:sih26125:user2"

	_, _ = contract.CreateDID(ctx, adminDID, "pub_admin", "ADMIN")
	_, _ = contract.CreateDID(ctx, managerDID, "pub_manager", "MANAGER")
	_, _ = contract.CreateDID(ctx, user1DID, "pub_user1", "USER")
	_, _ = contract.CreateDID(ctx, user2DID, "pub_user2", "USER")

	return adminDID, managerDID, user1DID, user2DID
}

func TestMintNFT(t *testing.T) {
	contract, ctx := SetupTestContext()
	adminDID, _, user1DID, _ := seedTestDIDs(contract, ctx)

	// 1. Admin Mints NFT -> Success
	tokenID := "NFT-100"
	nft, err := contract.MintNFT(ctx, adminDID, tokenID, "Degree Cert", "CERTIFICATE", `{"grade":"A+"}`)
	if err != nil {
		t.Fatalf("MintNFT failed for ADMIN: %v", err)
	}
	if nft.TokenID != tokenID || nft.CreatorDID != adminDID || nft.Status != "ACTIVE" {
		t.Errorf("Unexpected NFT record: %+v", nft)
	}

	// 2. Non-Admin (USER) attempts Mint -> Access Denied Error
	_, err = contract.MintNFT(ctx, user1DID, "NFT-101", "Fake Cert", "CERTIFICATE", `{}`)
	if err == nil {
		t.Errorf("Expected error when USER attempts MintNFT, got nil")
	}

	// 3. Duplicate Mint attempt -> Error
	_, err = contract.MintNFT(ctx, adminDID, tokenID, "Duplicate Cert", "CERTIFICATE", `{}`)
	if err == nil {
		t.Errorf("Expected error for duplicate token ID, got nil")
	}
}

func TestAllocateNFT(t *testing.T) {
	contract, ctx := SetupTestContext()
	adminDID, managerDID, user1DID, _ := seedTestDIDs(contract, ctx)

	tokenID := "NFT-200"
	_, _ = contract.MintNFT(ctx, adminDID, tokenID, "Land Deed", "PROPERTY", `{}`)

	// 1. Manager Allocates NFT to User 1 -> Success
	allocated, err := contract.AllocateNFT(ctx, managerDID, tokenID, user1DID)
	if err != nil {
		t.Fatalf("AllocateNFT failed for MANAGER: %v", err)
	}
	if allocated.OwnerDID != user1DID {
		t.Errorf("Expected owner %s, got %s", user1DID, allocated.OwnerDID)
	}

	// 2. User attempts Allocation -> Access Denied Error
	_, err = contract.AllocateNFT(ctx, user1DID, tokenID, user1DID)
	if err == nil {
		t.Errorf("Expected error when USER attempts AllocateNFT, got nil")
	}

	// 3. Allocate to non-existent target DID -> Error
	_, err = contract.AllocateNFT(ctx, adminDID, tokenID, "did:sih26125:ghost")
	if err == nil {
		t.Errorf("Expected error when allocating to non-existent DID, got nil")
	}
}

func TestTransferNFT(t *testing.T) {
	contract, ctx := SetupTestContext()
	adminDID, _, user1DID, user2DID := seedTestDIDs(contract, ctx)

	tokenID := "NFT-300"
	_, _ = contract.MintNFT(ctx, adminDID, tokenID, "Patent Token", "PATENT", `{}`)
	_, _ = contract.AllocateNFT(ctx, adminDID, tokenID, user1DID)

	// 1. Current owner (User 1) transfers NFT to User 2 -> Success
	xfer, err := contract.TransferNFT(ctx, user1DID, tokenID, user2DID)
	if err != nil {
		t.Fatalf("TransferNFT failed for owner: %v", err)
	}
	if xfer.OwnerDID != user2DID {
		t.Errorf("Expected owner %s, got %s", user2DID, xfer.OwnerDID)
	}

	// 2. Admin forced transfer from User 2 to User 1 -> Success
	xferAdmin, err := contract.TransferNFT(ctx, adminDID, tokenID, user1DID)
	if err != nil {
		t.Fatalf("TransferNFT failed for ADMIN override: %v", err)
	}
	if xferAdmin.OwnerDID != user1DID {
		t.Errorf("Expected owner %s, got %s", user1DID, xferAdmin.OwnerDID)
	}

	// 3. Unauthorized non-owner (User 2) attempt to transfer -> Error
	_, err = contract.TransferNFT(ctx, user2DID, tokenID, user2DID)
	if err == nil {
		t.Errorf("Expected error when non-owner attempts TransferNFT, got nil")
	}
}

func TestRevokeNFT(t *testing.T) {
	contract, ctx := SetupTestContext()
	adminDID, _, user1DID, _ := seedTestDIDs(contract, ctx)

	tokenID := "NFT-400"
	_, _ = contract.MintNFT(ctx, adminDID, tokenID, "Identity Badge", "BADGE", `{}`)

	// 1. Non-Admin (USER) attempts Revocation -> Access Denied Error
	_, err := contract.RevokeNFT(ctx, user1DID, tokenID)
	if err == nil {
		t.Errorf("Expected error when USER attempts RevokeNFT, got nil")
	}

	// 2. Admin revokes NFT -> Success
	revoked, err := contract.RevokeNFT(ctx, adminDID, tokenID)
	if err != nil {
		t.Fatalf("RevokeNFT failed for ADMIN: %v", err)
	}
	if revoked.Status != "REVOKED" {
		t.Errorf("Expected status REVOKED, got %s", revoked.Status)
	}

	// 3. Attempting transfer of revoked NFT -> Error
	_, err = contract.TransferNFT(ctx, adminDID, tokenID, user1DID)
	if err == nil {
		t.Errorf("Expected error when transferring REVOKED NFT, got nil")
	}
}

func TestVerifyNFT(t *testing.T) {
	contract, ctx := SetupTestContext()
	adminDID, _, user1DID, _ := seedTestDIDs(contract, ctx)

	tokenActive := "NFT-500"
	tokenRevoked := "NFT-501"

	_, _ = contract.MintNFT(ctx, adminDID, tokenActive, "Active NFT", "DOC", `{}`)
	_, _ = contract.AllocateNFT(ctx, adminDID, tokenActive, user1DID)

	_, _ = contract.MintNFT(ctx, adminDID, tokenRevoked, "Revoked NFT", "DOC", `{}`)
	_, _ = contract.RevokeNFT(ctx, adminDID, tokenRevoked)

	// 1. Verify Active NFT
	resActiveStr, err := contract.VerifyNFT(ctx, tokenActive)
	if err != nil {
		t.Fatalf("VerifyNFT failed: %v", err)
	}
	var resActive map[string]interface{}
	_ = json.Unmarshal([]byte(resActiveStr), &resActive)
	if resActive["valid"] != true || resActive["ownerDID"] != user1DID {
		t.Errorf("Unexpected verification output for active NFT: %s", resActiveStr)
	}

	// 2. Verify Revoked NFT
	resRevokedStr, err := contract.VerifyNFT(ctx, tokenRevoked)
	if err != nil {
		t.Fatalf("VerifyNFT failed: %v", err)
	}
	var resRevoked map[string]interface{}
	_ = json.Unmarshal([]byte(resRevokedStr), &resRevoked)
	if resRevoked["valid"] != false || resRevoked["status"] != "REVOKED" {
		t.Errorf("Expected valid=false for revoked NFT: %s", resRevokedStr)
	}

	// 3. Verify Non-existent NFT
	resMissingStr, err := contract.VerifyNFT(ctx, "NFT-GHOST")
	if err != nil {
		t.Fatalf("VerifyNFT failed: %v", err)
	}
	var resMissing map[string]interface{}
	_ = json.Unmarshal([]byte(resMissingStr), &resMissing)
	if resMissing["valid"] != false || resMissing["exists"] != false {
		t.Errorf("Expected valid=false for missing NFT: %s", resMissingStr)
	}
}

func TestGetAssetsByOwnerDIDAndHistory(t *testing.T) {
	contract, ctx := SetupTestContext()
	adminDID, _, user1DID, _ := seedTestDIDs(contract, ctx)

	tokenID := "NFT-600"
	_, _ = contract.MintNFT(ctx, adminDID, tokenID, "Owned Asset", "DOC", `{}`)
	_, _ = contract.AllocateNFT(ctx, adminDID, tokenID, user1DID)

	// 1. Query assets by owner DID
	assets, err := contract.GetAssetsByOwnerDID(ctx, user1DID)
	if err != nil {
		t.Fatalf("GetAssetsByOwnerDID failed: %v", err)
	}
	if len(assets) != 1 || assets[0].TokenID != tokenID {
		t.Errorf("Unexpected query result: %+v", assets)
	}

	// 2. Query NFT ownership history
	historyJSON, err := contract.GetNFTHistory(ctx, tokenID)
	if err != nil {
		t.Fatalf("GetNFTHistory failed: %v", err)
	}
	if historyJSON == "" {
		t.Errorf("Expected non-empty history JSON string")
	}

	// 3. Get all NFTs
	allNFTs, err := contract.GetAllNFTs(ctx)
	if err != nil {
		t.Fatalf("GetAllNFTs failed: %v", err)
	}
	if len(allNFTs) < 1 {
		t.Errorf("Expected at least 1 NFT in GetAllNFTs")
	}
}
