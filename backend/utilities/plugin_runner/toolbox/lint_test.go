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

func TestInvalidFinding(t *testing.T) {
	actual := lint("secrets", []byte(`{
		"success": true,
		"truncated": false,
		"details": [{
			"filename": "src/env/config.json",
			"line": 42,
			"commit": "45d6bf712794a90aea3304dbb0d2dfa3a1b9ecef",
			"type": "aws",
			"author": "George P. Burdell <george.p.burdell@example.com>"
		}, {
			"filename": "src/env/loader.yml",
			"line": "42",
			"commit": "678f73297c93a88fd91a5fd0c45d7a10d43fad58",
			"type": "ssh",
			"author": "George P. Burdell <george.p.burdell@example.com>"
		}],
		"errors": ["failed to scan"]
	}`))
	if !containsValidationError(actual, "/details/1/line", "got string, want integer") {
		t.Fatalf("expected type error, got %v", actual)
	}
}

func TestValidVulnerability(t *testing.T) {
	actual := lint("vulnerability", []byte(`{
		"success": false,
		"truncated": false,
		"details": [{
			"component": "package-1.2.3",
			"source": "src/package.json",
			"id": "CVE-2019-00000",
			"description": "An unauthenticated RCE vulnerability exists in package <= 1.2.3",
			"severity": "critical",
			"remediation": "Upgrade to package 1.2.4 or later"
		}],
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}
}

func TestValidStaticAnalysis(t *testing.T) {
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

func TestValidSecrets(t *testing.T) {
	actual := lint("secrets", []byte(`{
		"success": true,
		"truncated": false,
		"details": [{
			"filename": "src/env/config.json",
			"line": 42,
			"commit": "45d6bf712794a90aea3304dbb0d2dfa3a1b9ecef",
			"type": "aws",
			"author": "George P. Burdell <george.p.burdell@example.com>"
		}],
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}
}

func TestValidConfiguration(t *testing.T) {
	actual := lint("configuration", []byte(`{
		"success": true,
		"truncated": false,
		"details": [{
			"name": "Branch Rule - Require Status Checks",
			"description": "Requires that a branch rule is enabled that requires status checks on pull requests",
			"severity": "medium"
		}],
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}
}

func TestValidInventory(t *testing.T) {
	// The "details" payload for inventory plugins can be anything.

	actual := lint("inventory", []byte(`{
		"success": true,
		"truncated": false,
		"details": {"foo": {"bar": "baz"}},
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}

	actual = lint("inventory", []byte(`{
		"success": true,
		"truncated": false,
		"details": [["foo", false]],
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}
}

func TestValidSBOM(t *testing.T) {
	actual := lint("sbom", []byte(`{
		"success": true,
		"truncated": false,
		"details": [
			[
				{"sbom": "foo"}
			],
			[
				{
					"bom-ref": "pkg:golang/cloud.google.com/go/datastore@1.1.0",
					"type": "gomod",
					"name": "cloud.google.com/go/datastore",
					"version": "1.1.0",
					"licenses": [
						{
							"id": "Apache-2.0",
							"name": "Apache-2.0"
						}
					]
				}
			]
		],
		"errors": ["failed to scan"]
	}`))
	if actual != nil {
		t.Fatalf("expected no errors, got %v", actual)
	}
}

func TestSBOMMissingValue(t *testing.T) {
	actual := lint("sbom", []byte(`{
		"success": true,
		"truncated": false,
		"details": [
			[]
		],
		"errors": ["failed to scan"]
	}`))
	if !containsValidationError(actual, "/details", "minItems: got 1, want 2") {
		t.Fatalf("expected required error, got %v", actual)
	}
}

func TestUnknownType(t *testing.T) {
	actual := lint("foo", []byte("{}"))
	if actual == nil || !strings.Contains(actual.Error(), "unknown plugin type") {
		t.Fatalf("expected plugin type")
	}
}
