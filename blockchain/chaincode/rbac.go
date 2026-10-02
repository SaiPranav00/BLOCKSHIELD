package main

import (
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Role constants
const (
	RoleAdmin   = "ADMIN"
	RoleManager = "MANAGER"
	RoleAuditor = "AUDITOR"
	RoleUser    = "USER"
)

// ValidateRole returns error if role is invalid
func ValidateRole(role string) (string, error) {
	r := strings.ToUpper(strings.TrimSpace(role))
	switch r {
	case RoleAdmin, RoleManager, RoleAuditor, RoleUser:
		return r, nil
	default:
		return "", fmt.Errorf("invalid role '%s'. Allowed roles: ADMIN, MANAGER, AUDITOR, USER", role)
	}
}

// checkAccessInternal is an internal helper that verifies actor DID exists, is active, and possesses one of the required roles.
func (s *SmartContract) checkAccessInternal(ctx contractapi.TransactionContextInterface, actorDID string, allowedRoles []string) (*Identity, error) {
	if actorDID == "" {
		return nil, fmt.Errorf("access denied: actorDID is required")
	}

	identity, err := s.GetDID(ctx, actorDID)
	if err != nil {
		return nil, fmt.Errorf("access denied: actor DID %s not found on ledger: %v", actorDID, err)
	}

	if identity.Status != "ACTIVE" {
		return nil, fmt.Errorf("access denied: actor DID %s status is %s", actorDID, identity.Status)
	}

	actorRole := strings.ToUpper(identity.Role)

	// ADMIN role has full permissions across all operations
	if actorRole == RoleAdmin {
		return identity, nil
	}

	for _, allowed := range allowedRoles {
		if actorRole == strings.ToUpper(allowed) {
			return identity, nil
		}
	}

	return nil, fmt.Errorf("access denied: role '%s' (DID %s) is not authorized for this operation. Required: %v", actorRole, actorDID, allowedRoles)
}

// AssignRole changes the role of a target DID (ADMIN only)
func (s *SmartContract) AssignRole(ctx contractapi.TransactionContextInterface, adminDID string, targetDID string, newRole string) (*Identity, error) {
	// 1. Verify caller has ADMIN role
	_, err := s.checkAccessInternal(ctx, adminDID, []string{RoleAdmin})
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "ASSIGN_ROLE", targetDID, "DENIED", err.Error())
		return nil, err
	}

	// 2. Validate new role
	validRole, err := ValidateRole(newRole)
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "ASSIGN_ROLE", targetDID, "DENIED", err.Error())
		return nil, err
	}

	// 3. Update target DID role
	targetIdentity, err := s.UpdateDID(ctx, targetDID, "", validRole, "")
	if err != nil {
		_ = s.RecordAuditEvent(ctx, adminDID, "ASSIGN_ROLE", targetDID, "DENIED", err.Error())
		return nil, err
	}

	// 4. Log allowed attempt
	_ = s.RecordAuditEvent(ctx, adminDID, "ASSIGN_ROLE", targetDID, "ALLOWED", fmt.Sprintf("Role updated to %s", validRole))

	return targetIdentity, nil
}

// GetRole returns the role of a given DID
func (s *SmartContract) GetRole(ctx contractapi.TransactionContextInterface, did string) (string, error) {
	identity, err := s.GetDID(ctx, did)
	if err != nil {
		return "", err
	}
	return identity.Role, nil
}
