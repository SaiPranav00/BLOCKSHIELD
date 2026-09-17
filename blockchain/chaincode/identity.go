package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Identity represents a Decentralized Identity (DID) on the Fabric ledger
type Identity struct {
	ObjectType string `json:"docType"` // "identity" for CouchDB rich query support
	DID        string `json:"did"`
	PublicKey  string `json:"publicKey"`
	Role       string `json:"role"`
	Status     string `json:"status"` // "ACTIVE", "REVOKED"
	CreatedBy  string `json:"createdBy"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

const DIDPrefix = "did:sih26125:"

// CreateDID registers a new Decentralized Identity record on the ledger
func (s *SmartContract) CreateDID(ctx contractapi.TransactionContextInterface, did string, publicKey string, role string) (*Identity, error) {
	if !strings.HasPrefix(did, DIDPrefix) {
		return nil, fmt.Errorf("invalid DID format. Must start with '%s'", DIDPrefix)
	}

	exists, err := s.DIDExists(ctx, did)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("identity with DID %s already exists", did)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var nowStr string
	if err == nil && txTimestamp != nil {
		nowStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		nowStr = time.Now().UTC().Format(time.RFC3339)
	}

	clientIdentity, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientIdentity = "UNKNOWN_CLIENT"
	}

	validRole, err := ValidateRole(role)
	if err != nil {
		return nil, err
	}

	identity := Identity{
		ObjectType: "identity",
		DID:        did,
		PublicKey:  publicKey,
		Role:       validRole,
		Status:     "ACTIVE",
		CreatedBy:  clientIdentity,
		CreatedAt:  nowStr,
		UpdatedAt:  nowStr,
	}

	identityJSON, err := json.Marshal(identity)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(did, identityJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to put state for DID %s: %v", did, err)
	}

	_ = s.RecordAuditEvent(ctx, clientIdentity, "CREATE_DID", did, "ALLOWED", fmt.Sprintf("DID registered with role %s", validRole))

	return &identity, nil
}

// GetDID retrieves an Identity record by DID string
func (s *SmartContract) GetDID(ctx contractapi.TransactionContextInterface, did string) (*Identity, error) {
	identityJSON, err := ctx.GetStub().GetState(did)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if identityJSON == nil {
		return nil, fmt.Errorf("identity %s does not exist", did)
	}

	var identity Identity
	err = json.Unmarshal(identityJSON, &identity)
	if err != nil {
		return nil, err
	}

	return &identity, nil
}

// DIDExists returns true if identity exists on ledger
func (s *SmartContract) DIDExists(ctx contractapi.TransactionContextInterface, did string) (bool, error) {
	identityJSON, err := ctx.GetStub().GetState(did)
	if err != nil {
		return false, err
	}
	return identityJSON != nil, nil
}

// GetAllDIDs queries all identity records
func (s *SmartContract) GetAllDIDs(ctx contractapi.TransactionContextInterface) ([]*Identity, error) {
	queryString := `{"selector":{"docType":"identity"}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		// Fallback to range query if selector query fails
		resultsIterator, err = ctx.GetStub().GetStateByRange("did:sih26125:", "did:sih26125:\uffff")
		if err != nil {
			return nil, err
		}
	}
	defer resultsIterator.Close()

	var identities []*Identity
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var identity Identity
		err = json.Unmarshal(queryResponse.Value, &identity)
		if err != nil {
			continue
		}
		if identity.ObjectType == "identity" || strings.HasPrefix(identity.DID, DIDPrefix) {
			identities = append(identities, &identity)
		}
	}

	return identities, nil
}

// UpdateDID updates DID details (public key or role)
func (s *SmartContract) UpdateDID(ctx contractapi.TransactionContextInterface, did string, newPublicKey string, newRole string) (*Identity, error) {
	identity, err := s.GetDID(ctx, did)
	if err != nil {
		return nil, err
	}

	if identity.Status == "REVOKED" {
		return nil, fmt.Errorf("cannot update revoked DID %s", did)
	}

	if newPublicKey != "" {
		identity.PublicKey = newPublicKey
	}
	if newRole != "" {
		validRole, err := ValidateRole(newRole)
		if err != nil {
			return nil, err
		}
		identity.Role = validRole
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err == nil && txTimestamp != nil {
		identity.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		identity.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	identityJSON, err := json.Marshal(identity)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(did, identityJSON)
	if err != nil {
		return nil, err
	}

	clientIdentity, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientIdentity = "UNKNOWN_CLIENT"
	}
	_ = s.RecordAuditEvent(ctx, clientIdentity, "UPDATE_DID", did, "ALLOWED", "DID updated")

	return identity, nil
}

// RevokeDID marks a DID status as REVOKED
func (s *SmartContract) RevokeDID(ctx contractapi.TransactionContextInterface, did string) (*Identity, error) {
	identity, err := s.GetDID(ctx, did)
	if err != nil {
		return nil, err
	}

	identity.Status = "REVOKED"
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err == nil && txTimestamp != nil {
		identity.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		identity.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	identityJSON, err := json.Marshal(identity)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(did, identityJSON)
	if err != nil {
		return nil, err
	}

	clientIdentity, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientIdentity = "UNKNOWN_CLIENT"
	}
	_ = s.RecordAuditEvent(ctx, clientIdentity, "REVOKE_DID", did, "ALLOWED", fmt.Sprintf("DID %s revoked", did))

	return identity, nil
}

// VerifyDID returns valid=true if DID exists and is ACTIVE
func (s *SmartContract) VerifyDID(ctx contractapi.TransactionContextInterface, did string) (string, error) {
	identity, err := s.GetDID(ctx, did)
	if err != nil {
		return `{"valid":false,"reason":"DID not found"}`, nil
	}

	if identity.Status != "ACTIVE" {
		return fmt.Sprintf(`{"valid":false,"did":"%s","status":"%s"}`, identity.DID, identity.Status), nil
	}

	return fmt.Sprintf(`{"valid":true,"did":"%s","role":"%s","status":"ACTIVE"}`, identity.DID, identity.Role), nil
}
