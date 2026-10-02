package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TransferRequest defines an asset custodian transfer request workflow
type TransferRequest struct {
	ObjectType  string `json:"docType"`     // "transfer_request"
	RequestID   string `json:"requestId"`   // e.g. "TR-1001"
	TokenID     string `json:"tokenId"`     // e.g. "NFT-1001"
	AssetID     string `json:"assetId"`     // e.g. "BEL-RF-00421"
	FromDID     string `json:"fromDID"`     // Current custodian DID
	ToDID       string `json:"toDID"`       // Proposed new custodian DID
	RequestedBy string `json:"requestedBy"` // User DID initiating request
	Reason      string `json:"reason"`      // Transfer justification
	Status      string `json:"status"`      // "PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"
	ApprovedBy  string `json:"approvedBy"`  // Manager or Admin DID who approved/rejected
	CreatedAt   string `json:"createdAt"`
	ApprovedAt  string `json:"approvedAt"`
}

const TransferReqPrefix = "TRREQ_"

// CreateTransferRequest initiates an asset custodian transfer request (USER/Custodian)
func (s *SmartContract) CreateTransferRequest(ctx contractapi.TransactionContextInterface, requestedByDID string, tokenId string, toDID string, reason string) (*TransferRequest, error) {
	// 1. Retrieve asset from ledger
	nft, err := s.GetNFT(ctx, tokenId)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, requestedByDID, "TRANSFER_REQUESTED", tokenId, "DENIED", err.Error())
		return nil, fmt.Errorf("asset token %s not found: %v", tokenId, err)
	}

	if nft.Status == "REVOKED" {
		errMsg := fmt.Sprintf("cannot request transfer for revoked asset %s", tokenId)
		_ = s.RecordAuditEvent(ctx, requestedByDID, "TRANSFER_REQUESTED", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	currentCustodian := nft.Custodian
	if currentCustodian == "" {
		currentCustodian = nft.OwnerDID
	}

	// 2. Authorization check: Requester must be current custodian or ADMIN/MANAGER
	if requestedByDID != currentCustodian {
		userIdentity, err := s.GetDID(ctx, requestedByDID)
		if err != nil || (userIdentity.Role != RoleAdmin && userIdentity.Role != RoleManager) {
			errMsg := fmt.Sprintf("access denied: actor %s is not current custodian (%s) of asset %s", requestedByDID, currentCustodian, tokenId)
			_ = s.RecordAuditEvent(ctx, requestedByDID, "TRANSFER_REQUESTED", tokenId, "DENIED", errMsg)
			return nil, fmt.Errorf(errMsg)
		}
	}

	// 3. Verify target custodian DID exists and is ACTIVE
	targetIdentity, err := s.GetDID(ctx, toDID)
	if err != nil || targetIdentity.Status != "ACTIVE" {
		errMsg := fmt.Sprintf("target custodian DID %s is invalid or not ACTIVE", toDID)
		_ = s.RecordAuditEvent(ctx, requestedByDID, "TRANSFER_REQUESTED", tokenId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var nowStr string
	var timeSec int64
	if err == nil && txTimestamp != nil {
		nowStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
		timeSec = txTimestamp.Seconds
	} else {
		nowStr = time.Now().UTC().Format(time.RFC3339)
		timeSec = time.Now().Unix()
	}

	txID := ctx.GetStub().GetTxID()
	reqID := fmt.Sprintf("TR-%d-%s", timeSec, txID[:6])

	transferReq := TransferRequest{
		ObjectType:  "transfer_request",
		RequestID:   reqID,
		TokenID:     tokenId,
		AssetID:     nft.AssetID,
		FromDID:     currentCustodian,
		ToDID:       toDID,
		RequestedBy: requestedByDID,
		Reason:      strings.TrimSpace(reason),
		Status:      "PENDING",
		ApprovedBy:  "",
		CreatedAt:   nowStr,
		ApprovedAt:  "",
	}

	reqJSON, err := json.Marshal(transferReq)
	if err != nil {
		return nil, err
	}

	key := TransferReqPrefix + reqID
	err = ctx.GetStub().PutState(key, reqJSON)
	if err != nil {
		return nil, err
	}

	// Update asset status to TRANSFER_PENDING
	nft.Status = "TRANSFER_PENDING"
	nft.UpdatedAt = nowStr
	nftJSON, _ := json.Marshal(nft)
	_ = ctx.GetStub().PutState(tokenId, nftJSON)

	_ = s.RecordAuditEvent(ctx, requestedByDID, "TRANSFER_REQUESTED", reqID, "ALLOWED", fmt.Sprintf("Requested asset %s transfer from %s to %s (Reason: %s)", tokenId, currentCustodian, toDID, reason))
	return &transferReq, nil
}

// ApproveTransferRequest approves a pending transfer request and updates custodian (MANAGER or ADMIN)
func (s *SmartContract) ApproveTransferRequest(ctx contractapi.TransactionContextInterface, approverDID string, requestId string) (*TransferRequest, error) {
	// 1. Enforce MANAGER or ADMIN role
	approver, err := s.checkAccessInternal(ctx, approverDID, []string{RoleAdmin, RoleManager})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_APPROVED", requestId, "DENIED", err.Error())
		return nil, err
	}

	// 2. Retrieve Transfer Request
	key := TransferReqPrefix + requestId
	reqJSON, err := ctx.GetStub().GetState(key)
	if err != nil || reqJSON == nil {
		// Try direct lookup without prefix
		reqJSON, err = ctx.GetStub().GetState(requestId)
		if err != nil || reqJSON == nil {
			errMsg := fmt.Sprintf("transfer request %s not found", requestId)
			_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_APPROVED", requestId, "DENIED", errMsg)
			return nil, fmt.Errorf(errMsg)
		}
		key = requestId
	}

	var req TransferRequest
	err = json.Unmarshal(reqJSON, &req)
	if err != nil {
		return nil, err
	}

	if req.Status != "PENDING" {
		errMsg := fmt.Sprintf("cannot approve transfer request %s with status %s", requestId, req.Status)
		_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_APPROVED", requestId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	// 3. Update asset custodian on ledger
	nft, err := s.GetNFT(ctx, req.TokenID)
	if err != nil {
		return nil, err
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var nowStr string
	if err == nil && txTimestamp != nil {
		nowStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nowStr = time.Now().UTC().Format(time.RFC3339)
	}

	oldCustodian := nft.Custodian
	nft.Custodian = req.ToDID
	nft.OwnerDID = req.ToDID
	nft.Status = "ACTIVE"
	nft.UpdatedAt = nowStr

	// Set target department if available
	targetIdentity, err := s.GetDID(ctx, req.ToDID)
	if err == nil && targetIdentity.Department != "" {
		nft.Department = targetIdentity.Department
	}

	nftJSON, err := json.Marshal(nft)
	if err != nil {
		return nil, err
	}
	err = ctx.GetStub().PutState(req.TokenID, nftJSON)
	if err != nil {
		return nil, err
	}

	// 4. Update Transfer Request record
	req.Status = "APPROVED"
	req.ApprovedBy = approverDID
	req.ApprovedAt = nowStr

	updatedReqJSON, _ := json.Marshal(req)
	_ = ctx.GetStub().PutState(key, updatedReqJSON)

	_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_APPROVED", requestId, "ALLOWED", fmt.Sprintf("Approved transfer %s: Asset %s custodian updated from %s to %s by %s (%s)", requestId, req.TokenID, oldCustodian, req.ToDID, approverDID, approver.Role))
	_ = s.RecordAuditEvent(ctx, approverDID, "ASSET_TRANSFERRED", req.TokenID, "ALLOWED", fmt.Sprintf("Asset %s custodian transferred to %s upon approval of request %s", req.TokenID, req.ToDID, requestId))

	return &req, nil
}

// RejectTransferRequest rejects a pending transfer request (MANAGER or ADMIN)
func (s *SmartContract) RejectTransferRequest(ctx contractapi.TransactionContextInterface, approverDID string, requestId string, reason string) (*TransferRequest, error) {
	// 1. Enforce MANAGER or ADMIN role
	_, err := s.checkAccessInternal(ctx, approverDID, []string{RoleAdmin, RoleManager})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_REJECTED", requestId, "DENIED", err.Error())
		return nil, err
	}

	// 2. Retrieve Transfer Request
	key := TransferReqPrefix + requestId
	reqJSON, err := ctx.GetStub().GetState(key)
	if err != nil || reqJSON == nil {
		reqJSON, err = ctx.GetStub().GetState(requestId)
		if err != nil || reqJSON == nil {
			errMsg := fmt.Sprintf("transfer request %s not found", requestId)
			_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_REJECTED", requestId, "DENIED", errMsg)
			return nil, fmt.Errorf(errMsg)
		}
		key = requestId
	}

	var req TransferRequest
	err = json.Unmarshal(reqJSON, &req)
	if err != nil {
		return nil, err
	}

	if req.Status != "PENDING" {
		errMsg := fmt.Sprintf("cannot reject transfer request %s with status %s", requestId, req.Status)
		_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_REJECTED", requestId, "DENIED", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var nowStr string
	if err == nil && txTimestamp != nil {
		nowStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nowStr = time.Now().UTC().Format(time.RFC3339)
	}

	// Restore asset status to ACTIVE
	nft, err := s.GetNFT(ctx, req.TokenID)
	if err == nil {
		nft.Status = "ACTIVE"
		nft.UpdatedAt = nowStr
		nftJSON, _ := json.Marshal(nft)
		_ = ctx.GetStub().PutState(req.TokenID, nftJSON)
	}

	req.Status = "REJECTED"
	req.ApprovedBy = approverDID
	req.ApprovedAt = nowStr

	updatedReqJSON, _ := json.Marshal(req)
	_ = ctx.GetStub().PutState(key, updatedReqJSON)

	_ = s.RecordAuditEvent(ctx, approverDID, "TRANSFER_REJECTED", requestId, "ALLOWED", fmt.Sprintf("Rejected transfer %s for asset %s (Reason: %s)", requestId, req.TokenID, reason))
	return &req, nil
}

// GetPendingTransferRequests queries all transfer requests in PENDING status
func (s *SmartContract) GetPendingTransferRequests(ctx contractapi.TransactionContextInterface) ([]*TransferRequest, error) {
	queryString := `{"selector":{"docType":"transfer_request","status":"PENDING"}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		resultsIterator, err = ctx.GetStub().GetStateByRange(TransferReqPrefix, TransferReqPrefix+"\uffff")
		if err != nil {
			return nil, err
		}
	}
	defer resultsIterator.Close()

	var requests []*TransferRequest
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var req TransferRequest
		err = json.Unmarshal(queryResponse.Value, &req)
		if err != nil {
			continue
		}
		if req.ObjectType == "transfer_request" && req.Status == "PENDING" {
			requests = append(requests, &req)
		}
	}

	return requests, nil
}

// GetTransferRequest retrieves a specific transfer request by ID
func (s *SmartContract) GetTransferRequest(ctx contractapi.TransactionContextInterface, requestId string) (*TransferRequest, error) {
	key := TransferReqPrefix + requestId
	reqJSON, err := ctx.GetStub().GetState(key)
	if err != nil || reqJSON == nil {
		reqJSON, err = ctx.GetStub().GetState(requestId)
		if err != nil || reqJSON == nil {
			return nil, fmt.Errorf("transfer request %s not found", requestId)
		}
	}

	var req TransferRequest
	err = json.Unmarshal(reqJSON, &req)
	if err != nil {
		return nil, err
	}

	return &req, nil
}

// GetTransferRequestsByDID returns all transfer requests involving a given DID
func (s *SmartContract) GetTransferRequestsByDID(ctx contractapi.TransactionContextInterface, did string) ([]*TransferRequest, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"transfer_request","$or":[{"fromDID":"%s"},{"toDID":"%s"},{"requestedBy":"%s"}]}}`, did, did, did)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		resultsIterator, err = ctx.GetStub().GetStateByRange(TransferReqPrefix, TransferReqPrefix+"\uffff")
		if err != nil {
			return nil, err
		}
	}
	defer resultsIterator.Close()

	var requests []*TransferRequest
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var req TransferRequest
		err = json.Unmarshal(queryResponse.Value, &req)
		if err != nil {
			continue
		}
		if req.FromDID == did || req.ToDID == did || req.RequestedBy == did {
			requests = append(requests, &req)
		}
	}

	return requests, nil
}
