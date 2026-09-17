package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// NFT represents a unique digital asset on the Fabric ledger
type NFT struct {
	ObjectType string `json:"docType"` // "nft" for CouchDB rich query support
	TokenID    string `json:"tokenId"`
	AssetName  string `json:"assetName"`
	AssetType  string `json:"assetType"`
	Metadata   string `json:"metadata"`
	CreatorDID string `json:"creatorDID"`
	OwnerDID   string `json:"ownerDID"`
	Status     string `json:"status"` // "ACTIVE", "REVOKED"
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

// MintNFT creates a new unique NFT record (ADMIN only)
func (s *SmartContract) MintNFT(ctx contractapi.TransactionContextInterface, adminDID string, tokenId string, assetName string, assetType string, metadata string) (*NFT, error) {
	// 1. Enforce ADMIN role check in Chaincode
	_, err := s.checkAccessInternal(ctx, adminDID, []string{RoleAdmin})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "MINT_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	// 2. Check if TokenID already exists
	exists, err := s.NFTExists(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "MINT_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}
	if exists {
		errMsg := fmt.Sprintf("NFT token ID %s already exists", tokenId)
		_ = s.RecordAuditEvent(ctx, adminDID, "MINT_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var nowStr string
	if err == nil && txTimestamp != nil {
		nowStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nowStr = time.Now().UTC().Format(time.RFC3339)
	}

	nft := NFT{
		ObjectType: "nft",
		TokenID:    tokenId,
		AssetName:  assetName,
		AssetType:  strings.ToUpper(assetType),
		Metadata:   metadata,
		CreatorDID: adminDID,
		OwnerDID:   "", // Unassigned before allocation
		Status:     "ACTIVE",
		CreatedAt:  nowStr,
		UpdatedAt:  nowStr,
	}

	nftJSON, err := json.Marshal(nft)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(tokenId, nftJSON)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "MINT_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	_ = s.RecordAuditEvent(ctx, adminDID, "MINT_NFT", tokenId, "ALLOWED", fmt.Sprintf("Minted NFT '%s' (%s)", assetName, assetType))
	return &nft, nil
}

// AllocateNFT assigns an unallocated or owned NFT to a target DID (ADMIN or MANAGER)
func (s *SmartContract) AllocateNFT(ctx contractapi.TransactionContextInterface, actorDID string, tokenId string, ownerDID string) (*NFT, error) {
	// 1. Permission check (ADMIN or MANAGER)
	_, err := s.checkAccessInternal(ctx, actorDID, []string{RoleAdmin, RoleManager})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, actorDID, "ALLOCATE_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	// 2. Retrieve NFT
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, actorDID, "ALLOCATE_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	if nft.Status == "REVOKED" {
		errMsg := fmt.Sprintf("cannot allocate revoked NFT %s", tokenId)
		_ = s.RecordAuditEvent(ctx, actorDID, "ALLOCATE_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 3. Verify target owner DID exists and is ACTIVE
	targetIdentity, err := s.GetDID(ctx, ownerDID)
	if err != nil {
		errMsg := fmt.Sprintf("target owner DID %s not found: %v", ownerDID, err)
		_ = s.RecordAuditEvent(ctx, actorDID, "ALLOCATE_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	if targetIdentity.Status != "ACTIVE" {
		errMsg := fmt.Sprintf("target owner DID %s is %s", ownerDID, targetIdentity.Status)
		_ = s.RecordAuditEvent(ctx, actorDID, "ALLOCATE_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 4. Update owner
	nft.OwnerDID = ownerDID
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err == nil && txTimestamp != nil {
		nft.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nft.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	nftJSON, err := json.Marshal(nft)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(tokenId, nftJSON)
	if err != nil {
		return nil, err
	}

	_ = s.RecordAuditEvent(ctx, actorDID, "ALLOCATE_NFT", tokenId, "ALLOWED", fmt.Sprintf("Allocated NFT %s to DID %s", tokenId, ownerDID))
	return nft, nil
}

// TransferNFT moves ownership of an active NFT to a new active owner DID
func (s *SmartContract) TransferNFT(ctx contractapi.TransactionContextInterface, actorDID string, tokenId string, newOwnerDID string) (*NFT, error) {
	// 1. Retrieve NFT
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, actorDID, "TRANSFER_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	if nft.Status != "ACTIVE" {
		errMsg := fmt.Sprintf("cannot transfer NFT %s with status %s", tokenId, nft.Status)
		_ = s.RecordAuditEvent(ctx, actorDID, "TRANSFER_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 2. Authorization check: Actor must be current owner, ADMIN, or MANAGER
	if actorDID != nft.OwnerDID {
		actorIdentity, err := s.GetDID(ctx, actorDID)
		if err != nil || (actorIdentity.Role != RoleAdmin && actorIdentity.Role != RoleManager) {
			errMsg := fmt.Sprintf("actor DID %s is not current owner (%s), ADMIN, nor MANAGER", actorDID, nft.OwnerDID)
			_ = s.RecordAuditEvent(ctx, actorDID, "TRANSFER_NFT", tokenId, "DENIED", errMsg)
			return nil, fmt.Errorf(errMsg)
		}
	}

	// 3. Verify new owner DID exists and is ACTIVE
	newOwnerIdentity, err := s.GetDID(ctx, newOwnerDID)
	if err != nil {
		errMsg := fmt.Sprintf("new owner DID %s does not exist", newOwnerDID)
		_ = s.RecordAuditEvent(ctx, actorDID, "TRANSFER_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}
	if newOwnerIdentity.Status != "ACTIVE" {
		errMsg := fmt.Sprintf("new owner DID %s is %s", newOwnerDID, newOwnerIdentity.Status)
		_ = s.RecordAuditEvent(ctx, actorDID, "TRANSFER_NFT", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 4. Update owner & timestamp
	oldOwner := nft.OwnerDID
	nft.OwnerDID = newOwnerDID
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err == nil && txTimestamp != nil {
		nft.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nft.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	nftJSON, err := json.Marshal(nft)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(tokenId, nftJSON)
	if err != nil {
		return nil, err
	}

	_ = s.RecordAuditEvent(ctx, actorDID, "TRANSFER_NFT", tokenId, "ALLOWED", fmt.Sprintf("Transferred NFT %s from %s to %s", tokenId, oldOwner, newOwnerDID))
	return nft, nil
}

// RevokeNFT marks an NFT as REVOKED (ADMIN only)
func (s *SmartContract) RevokeNFT(ctx contractapi.TransactionContextInterface, adminDID string, tokenId string) (*NFT, error) {
	// 1. Enforce ADMIN role
	_, err := s.checkAccessInternal(ctx, adminDID, []string{RoleAdmin})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "REVOKE_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	// 2. Get NFT
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "REVOKE_NFT", tokenId, "DENIED", err.Error())
		return nil, err
	}

	nft.Status = "REVOKED"
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err == nil && txTimestamp != nil {
		nft.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nft.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	nftJSON, err := json.Marshal(nft)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(tokenId, nftJSON)
	if err != nil {
		return nil, err
	}

	_ = s.RecordAuditEvent(ctx, adminDID, "REVOKE_NFT", tokenId, "ALLOWED", fmt.Sprintf("NFT %s revoked", tokenId))
	return nft, nil
}

// VerifyNFT validates NFT existence, status, and owner status, returning JSON string
func (s *SmartContract) VerifyNFT(ctx contractapi.TransactionContextInterface, tokenId string) (string, error) {
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		return `{"valid":false,"exists":false,"reason":"NFT does not exist"}`, nil
	}

	if nft.Status == "REVOKED" {
		resMap := map[string]interface{}{
			"valid":      false,
			"exists":     true,
			"tokenId":    nft.TokenID,
			"assetName":  nft.AssetName,
			"assetType":  nft.AssetType,
			"ownerDID":   nft.OwnerDID,
			"creatorDID": nft.CreatorDID,
			"status":     "REVOKED",
			"reason":     "NFT status is REVOKED",
		}
		bytes, _ := json.Marshal(resMap)
		return string(bytes), nil
	}

	ownerStatus := "ACTIVE"
	if nft.OwnerDID != "" {
		ownerIdentity, err := s.GetDID(ctx, nft.OwnerDID)
		if err != nil {
			ownerStatus = "NOT_FOUND"
		} else {
			ownerStatus = ownerIdentity.Status
		}
	}

	valid := nft.Status == "ACTIVE" && (ownerStatus == "ACTIVE" || nft.OwnerDID == "")

	resMap := map[string]interface{}{
		"valid":       valid,
		"exists":      true,
		"tokenId":     nft.TokenID,
		"assetName":   nft.AssetName,
		"assetType":   nft.AssetType,
		"metadata":    nft.Metadata,
		"ownerDID":    nft.OwnerDID,
		"ownerStatus": ownerStatus,
		"creatorDID":  nft.CreatorDID,
		"status":      nft.Status,
	}
	bytes, _ := json.Marshal(resMap)
	return string(bytes), nil
}

// GetAssetsByOwnerDID returns all NFTs owned by a given DID
func (s *SmartContract) GetAssetsByOwnerDID(ctx contractapi.TransactionContextInterface, ownerDID string) ([]*NFT, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"nft","ownerDID":"%s"}}`, ownerDID)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var nfts []*NFT
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var nft NFT
		err = json.Unmarshal(queryResponse.Value, &nft)
		if err != nil {
			continue
		}
		nfts = append(nfts, &nft)
	}

	return nfts, nil
}

// GetNFTHistory returns historical ownership and update records for an NFT as JSON string
func (s *SmartContract) GetNFTHistory(ctx contractapi.TransactionContextInterface, tokenId string) (string, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(tokenId)
	if err != nil {
		return "", fmt.Errorf("failed to get history for token %s: %v", tokenId, err)
	}
	defer resultsIterator.Close()

	var history []map[string]interface{}
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return "", err
		}

		var nft map[string]interface{}
		if !response.IsDelete && len(response.Value) > 0 {
			_ = json.Unmarshal(response.Value, &nft)
		}

		item := map[string]interface{}{
			"txId":      response.TxId,
			"timestamp": fmt.Sprintf("%d", response.Timestamp.Seconds),
			"isDelete":  response.IsDelete,
			"nft":       nft,
		}
		history = append(history, item)
	}

	bytes, err := json.Marshal(history)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// GetNFT retrieves an NFT record by TokenID
func (s *SmartContract) GetNFT(ctx contractapi.TransactionContextInterface, tokenId string) (*NFT, error) {
	nftJSON, err := ctx.GetStub().GetState(tokenId)
	if err != nil {
		return nil, fmt.Errorf("failed to read NFT from world state: %v", err)
	}
	if nftJSON == nil {
		return nil, fmt.Errorf("NFT %s does not exist", tokenId)
	}

	var nft NFT
	err = json.Unmarshal(nftJSON, &nft)
	if err != nil {
		return nil, err
	}

	return &nft, nil
}

// NFTExists returns true if NFT token ID exists
func (s *SmartContract) NFTExists(ctx contractapi.TransactionContextInterface, tokenId string) (bool, error) {
	nftJSON, err := ctx.GetStub().GetState(tokenId)
	if err != nil {
		return false, err
	}
	return nftJSON != nil, nil
}

// GetAllNFTs returns all registered NFTs
func (s *SmartContract) GetAllNFTs(ctx contractapi.TransactionContextInterface) ([]*NFT, error) {
	queryString := `{"selector":{"docType":"nft"}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		resultsIterator, err = ctx.GetStub().GetStateByRange("NFT-", "NFT-\uffff")
		if err != nil {
			return nil, err
		}
	}
	defer resultsIterator.Close()

	var nfts []*NFT
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var nft NFT
		err = json.Unmarshal(queryResponse.Value, &nft)
		if err != nil {
			continue
		}
		if nft.ObjectType == "nft" || strings.HasPrefix(nft.TokenID, "NFT-") {
			nfts = append(nfts, &nft)
		}
	}

	return nfts, nil
}
