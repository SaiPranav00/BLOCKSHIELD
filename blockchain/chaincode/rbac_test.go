package main

import (
	"testing"
)

func TestValidateRole(t *testing.T) {
	validRoles := []string{"ADMIN", "MANAGER", "AUDITOR", "USER", "admin", " manager "}
	for _, r := range validRoles {
		role, err := ValidateRole(r)
		if err != nil {
			t.Errorf("ValidateRole(%s) returned unexpected error: %v", r, err)
		}
		if role == "" {
			t.Errorf("ValidateRole(%s) returned empty string", r)
		}
	}

	invalidRoles := []string{"INVALID", "SUPERADMIN", "GUEST", ""}
	for _, r := range invalidRoles {
		_, err := ValidateRole(r)
		if err == nil {
			t.Errorf("ValidateRole(%s) expected error but got none", r)
		}
	}
}
