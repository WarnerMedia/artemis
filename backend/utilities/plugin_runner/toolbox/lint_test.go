package main

import (
	"fmt"
	"strings"
	"testing"
)

// containsValidationError checks if the schema validation error includes an
// error at the specified JSON path and message prefix.
func containsValidationError(err error, path string, message string) bool {
	// For now, it's sufficient to look for the formatted substring.
	// In the future, we may want to traverse the err.Causes to make sure
	// we find the specific error.
	return strings.Contains(err.Error(),
		fmt.Sprintf("- at '%s': %s", path, message))
}

func TestInvalidUTF8(t *testing.T) {
	actual := lint("vulnerability", []byte{0xff, 123, 125})
	if actual == nil || !strings.Contains(actual.Error(), "invalid UTF-8") {
		t.Fatalf("expected UTF-8 error, got %v", actual)
	}
}

func TestNotObject(t *testing.T) {
	actual := lint("vulnerability", []byte(`"success"`))
	if !containsValidationError(actual, "", "got string, want object") {
		t.Fatalf("expected format error, got %v", actual)
	}
}

func TestInvalidTypes(t *testing.T) {
	actual := lint("vulnerability", []byte(`{
		"success": "yes",
		"errors": "bar"
	}`))
	if !containsValidationError(actual, "/success", "got string, want boolean") {
		t.Fatalf("expected type error, got %v", actual)
	}
	if !containsValidationError(actual, "/errors", "got string, want array") {
		t.Fatalf("expected type error, got %v", actual)
	}
}

func TestTruncated(t *testing.T) {
	actual := lint("vulnerability", []byte(`{"truncated": true}`))
	if !containsValidationError(actual, "/truncated", "value must be false") {
		t.Fatalf("expected value error, got %v", actual)
	}
}

func TestRequiredFields(t *testing.T) {
	actual := lint("vulnerability", []byte(`{}`))
	if !containsValidationError(actual, "", "missing properties") {
		t.Fatalf("expected required error, got %v", actual)
	}
}

func TestValid(t *testing.T) {
	actual := lint("static_analysis", []byte(`{
		"success": false,
		"truncated": false,
		"details": [{
			"filename": "foo.c",
			"line": 12,
			"message": "Double-free of 'buf'",
			"severity": "medium",
			"type": "Memory safety"
		}],
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}
}

func TestUnknownType(t *testing.T) {
	actual := lint("foo", []byte("{}"))
	if actual == nil || !strings.Contains(actual.Error(), "unknown plugin type") {
		t.Fatalf("expected plugin type")
	}
}
