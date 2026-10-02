package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// NFT represents a unique tokenized digital/physical asset record on the Fabric ledger.
// It separates legal ownership (e.g. "BEL") from current custodian assignment.
type NFT struct {
	ObjectType   string `json:"docType"`      // "nft" for CouchDB rich query support
	TokenID      string `json:"tokenId"`      // Unique token ID (e.g. "NFT-1001")
	AssetID      string `json:"assetId"`      // Physical/Asset registry ID (e.g. "BEL-RF-00421")
	AssetName    string `json:"assetName"`    // Human readable asset name (e.g. "RF Signal Analyzer")
	AssetType    string `json:"assetType"`    // Category (e.g. "TESTING_EQUIPMENT", "WORKSTATION", "COMMUNICATION")
	LegalOwner   string `json:"legalOwner"`   // Legal owner entity (defaults to "BEL")
	Custodian    string `json:"custodian"`    // Current assigned custodian DID
	OwnerDID     string `json:"ownerDID"`     // Alias for custodian (for backward compatibility)
	Department   string `json:"department"`   // Responsible department (e.g. "R&D")
	Location     string `json:"location"`     // Physical or network location (e.g. "R&D Lab 1")
	Metadata     string `json:"metadata"`     // Detailed metadata JSON string
	MetadataHash string `json:"metadataHash"` // Hash or cryptographic reference of metadata
	CreatorDID   string `json:"creatorDID"`   // Admin DID who minted the token
	Status       string `json:"status"`       // "REGISTERED", "ACTIVE", "TRANSFER_PENDING", "TRANSFERRED", "REVOKED"
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// MintNFT creates a new unique NFT record (ADMIN only)
func (s *SmartContract) MintNFT(ctx contractapi.TransactionContextInterface, adminDID string, tokenId string, assetName string, assetType string, metadata string, targetOwnerDID string) (*NFT, error) {
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

	initialCustodian := strings.TrimSpace(targetOwnerDID)
	if initialCustodian == "UNASSIGNED" {
		initialCustodian = ""
	}

	status := "REGISTERED"
	if initialCustodian != "" {
		status = "ACTIVE"
	}

	// Extract assetId or department from metadata if formatted as JSON
	assetId := fmt.Sprintf("BEL-%s-%s", strings.ToUpper(strings.ReplaceAll(assetType, " ", "")), strings.TrimPrefix(tokenId, "NFT-"))
	department := "R&D"
	location := "R&D Lab 1"
	legalOwner := "BEL"
	metadataHash := ""

	if metadata != "" && strings.HasPrefix(strings.TrimSpace(metadata), "{") {
		var metaMap map[string]interface{}
		if err := json.Unmarshal([]byte(metadata), &metaMap); err == nil {
			if idVal, ok := metaMap["assetId"].(string); ok && idVal != "" {
				assetId = idVal
			}
			if deptVal, ok := metaMap["department"].(string); ok && deptVal != "" {
				department = deptVal
			}
			if locVal, ok := metaMap["location"].(string); ok && locVal != "" {
				location = locVal
			}
			if ownerVal, ok := metaMap["legalOwner"].(string); ok && ownerVal != "" {
				legalOwner = ownerVal
			}
			if hashVal, ok := metaMap["metadataHash"].(string); ok && hashVal != "" {
				metadataHash = hashVal
			}
		}
	}

	nft := NFT{
		ObjectType:   "nft",
		TokenID:      tokenId,
		AssetID:      assetId,
		AssetName:    assetName,
		AssetType:    strings.ToUpper(assetType),
		LegalOwner:   legalOwner,
		Custodian:    initialCustodian,
		OwnerDID:     initialCustodian,
		Department:   department,
		Location:     location,
		Metadata:     metadata,
		MetadataHash: metadataHash,
		CreatorDID:   adminDID,
		Status:       status,
		CreatedAt:    nowStr,
		UpdatedAt:    nowStr,
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

	_ = s.RecordAuditEvent(ctx, adminDID, "ASSET_MINTED", tokenId, "ALLOWED", fmt.Sprintf("Minted tokenized asset '%s' (%s), Legal Owner: %s, Custodian: %s", assetName, assetType, legalOwner, initialCustodian))
	return &nft, nil
}

// AllocateNFT assigns an unallocated or owned asset to a target DID custodian (ADMIN or MANAGER)
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

	// 4. Update custodian and department
	nft.Custodian = ownerDID
	nft.OwnerDID = ownerDID
	if targetIdentity.Department != "" {
		nft.Department = targetIdentity.Department
	}
	nft.Status = "ACTIVE"

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

	_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_ALLOCATED", tokenId, "ALLOWED", fmt.Sprintf("Allocated asset %s custodian to DID %s", tokenId, ownerDID))
	return nft, nil
}

// TransferNFT moves custodian assignment of an active asset to a new custodian DID (Direct transfer by ADMIN/MANAGER)
func (s *SmartContract) TransferNFT(ctx contractapi.TransactionContextInterface, actorDID string, tokenId string, newOwnerDID string) (*NFT, error) {
	// 1. Retrieve NFT
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_TRANSFERRED", tokenId, "DENIED", err.Error())
		return nil, err
	}

	if nft.Status == "REVOKED" {
		errMsg := fmt.Sprintf("cannot transfer asset %s with status %s", tokenId, nft.Status)
		_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_TRANSFERRED", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 2. Authorization check: Actor must be current custodian, ADMIN, or MANAGER
	currentCustodian := nft.Custodian
	if currentCustodian == "" {
		currentCustodian = nft.OwnerDID
	}

	if actorDID != currentCustodian {
		actorIdentity, err := s.GetDID(ctx, actorDID)
		if err != nil || (actorIdentity.Role != RoleAdmin && actorIdentity.Role != RoleManager) {
			errMsg := fmt.Sprintf("actor DID %s is not current custodian (%s), ADMIN, nor MANAGER", actorDID, currentCustodian)
			_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_TRANSFERRED", tokenId, "DENIED", errMsg)
			return nil, fmt.Errorf(errMsg)
		}
	}

	// 3. Verify new custodian DID exists and is ACTIVE
	newOwnerIdentity, err := s.GetDID(ctx, newOwnerDID)
	if err != nil {
		errMsg := fmt.Sprintf("new custodian DID %s does not exist", newOwnerDID)
		_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_TRANSFERRED", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}
	if newOwnerIdentity.Status != "ACTIVE" {
		errMsg := fmt.Sprintf("new custodian DID %s is %s", newOwnerDID, newOwnerIdentity.Status)
		_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_TRANSFERRED", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 4. Update custodian & timestamp
	oldCustodian := currentCustodian
	nft.Custodian = newOwnerDID
	nft.OwnerDID = newOwnerDID
	if newOwnerIdentity.Department != "" {
		nft.Department = newOwnerIdentity.Department
	}
	nft.Status = "ACTIVE"

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

	_ = s.RecordAuditEvent(ctx, actorDID, "ASSET_TRANSFERRED", tokenId, "ALLOWED", fmt.Sprintf("Transferred asset %s custodian from %s to %s", tokenId, oldCustodian, newOwnerDID))
	return nft, nil
}

// RevokeNFT marks an asset token as REVOKED (ADMIN only)
func (s *SmartContract) RevokeNFT(ctx contractapi.TransactionContextInterface, adminDID string, tokenId string) (*NFT, error) {
	// 1. Enforce ADMIN role
	_, err := s.checkAccessInternal(ctx, adminDID, []string{RoleAdmin})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "ASSET_REVOKED", tokenId, "DENIED", err.Error())
		return nil, err
	}

	// 2. Get NFT
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "ASSET_REVOKED", tokenId, "DENIED", err.Error())
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

	_ = s.RecordAuditEvent(ctx, adminDID, "ASSET_REVOKED", tokenId, "ALLOWED", fmt.Sprintf("Asset token %s revoked", tokenId))
	return nft, nil
}

// VerifyNFT validates asset existence, status, legal owner, and custodian status
func (s *SmartContract) VerifyNFT(ctx contractapi.TransactionContextInterface, tokenId string) (string, error) {
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		return `{"valid":false,"exists":false,"reason":"Asset token does not exist on ledger"}`, nil
	}

	if nft.Status == "REVOKED" {
		resMap := map[string]interface{}{
			"valid":      false,
			"exists":     true,
			"tokenId":    nft.TokenID,
			"assetId":    nft.AssetID,
			"assetName":  nft.AssetName,
			"assetType":  nft.AssetType,
			"legalOwner": nft.LegalOwner,
			"custodian":  nft.Custodian,
			"ownerDID":   nft.OwnerDID,
			"creatorDID": nft.CreatorDID,
			"status":     "REVOKED",
			"reason":     "Asset token status is REVOKED",
		}
		bytes, _ := json.Marshal(resMap)
		return string(bytes), nil
	}

	custodianStatus := "ACTIVE"
	custodianDID := nft.Custodian
	if custodianDID == "" {
		custodianDID = nft.OwnerDID
	}

	if custodianDID != "" {
		custodianIdentity, err := s.GetDID(ctx, custodianDID)
		if err != nil {
			custodianStatus = "NOT_FOUND"
		} else {
			custodianStatus = custodianIdentity.Status
		}
	}

	valid := (nft.Status == "ACTIVE" || nft.Status == "REGISTERED" || nft.Status == "TRANSFERRED" || nft.Status == "TRANSFER_PENDING") && (custodianStatus == "ACTIVE" || custodianDID == "")

	resMap := map[string]interface{}{
		"valid":           valid,
		"exists":          true,
		"tokenId":         nft.TokenID,
		"assetId":         nft.AssetID,
		"assetName":       nft.AssetName,
		"assetType":       nft.AssetType,
		"legalOwner":      nft.LegalOwner,
		"custodian":       custodianDID,
		"ownerDID":        custodianDID,
		"custodianStatus": custodianStatus,
		"department":      nft.Department,
		"location":        nft.Location,
		"metadata":        nft.Metadata,
		"metadataHash":    nft.MetadataHash,
		"creatorDID":      nft.CreatorDID,
		"status":          nft.Status,
	}
	bytes, _ := json.Marshal(resMap)
	return string(bytes), nil
}

// GetAssetsByOwnerDID returns all NFTs where DID is custodian
func (s *SmartContract) GetAssetsByOwnerDID(ctx contractapi.TransactionContextInterface, ownerDID string) ([]*NFT, error) {
	return s.GetAssetsByCustodianDID(ctx, ownerDID)
}

// GetAssetsByCustodianDID returns all NFTs where DID is custodian
func (s *SmartContract) GetAssetsByCustodianDID(ctx contractapi.TransactionContextInterface, custodianDID string) ([]*NFT, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"nft","$or":[{"custodian":"%s"},{"ownerDID":"%s"}]}}`, custodianDID, custodianDID)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		// Fallback query
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
		if nft.Custodian == custodianDID || nft.OwnerDID == custodianDID {
			nfts = append(nfts, &nft)
		}
	}

	return nfts, nil
}

// GetAssetsByDepartment returns all NFTs assigned to a department
func (s *SmartContract) GetAssetsByDepartment(ctx contractapi.TransactionContextInterface, department string) ([]*NFT, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"nft","department":"%s"}}`, department)
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
		if strings.EqualFold(nft.Department, department) {
			nfts = append(nfts, &nft)
		}
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
		return nil, fmt.Errorf("NFT asset %s does not exist", tokenId)
	}

	var nft NFT
	err = json.Unmarshal(nftJSON, &nft)
	if err != nil {
		return nil, err
	}

	if nft.Custodian == "" && nft.OwnerDID != "" {
		nft.Custodian = nft.OwnerDID
	}
	if nft.LegalOwner == "" {
		nft.LegalOwner = "BEL"
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
			if nft.Custodian == "" && nft.OwnerDID != "" {
				nft.Custodian = nft.OwnerDID
			}
			if nft.LegalOwner == "" {
				nft.LegalOwner = "BEL"
			}
			nfts = append(nfts, &nft)
		}
	}

	return nfts, nil
}
