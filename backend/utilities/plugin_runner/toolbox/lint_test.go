package main

import (
	"strings"
	"testing"
)

// containsErr checks if there is an error in the list which contains all
// of the specified substrings.
func containsErr(errs []error, substrs ...string) bool {
search:
	for _, e := range errs {
		for _, substr := range substrs {
			if !strings.Contains(e.Error(), substr) {
				continue search
			}
		}
		return true
	}
	return false
}

func TestInvalidUTF8(t *testing.T) {
	actual := lint([]byte{0xff, 123, 125})
	if !containsErr(actual, "invalid UTF-8") {
		t.Fatalf("expected UTF-8 error, got %v", actual)
	}
}

func TestNotObject(t *testing.T) {
	actual := lint([]byte(`"success"`))
	if !containsErr(actual, "Field json", "invalid format") {
		t.Fatalf("expected type error, got %v", actual)
	}
}

func TestInvalidTypes(t *testing.T) {
	actual := lint([]byte(`{
		"success": "yes",
		"errors": "bar"
	}`))
	if !containsErr(actual, "Field success", "invalid format") {
		t.Fatalf("expected type error, got %v", actual)
	}
	if !containsErr(actual, "Field errors", "invalid format") {
		t.Fatalf("expected type error, got %v", actual)
	}
}

func TestTruncated(t *testing.T) {
	actual := lint([]byte(`{"truncated": true}`))
	if !containsErr(actual, "Field truncated", "Must be false") {
		t.Fatalf("expected value error, got %v", actual)
	}
}

func TestRequiredFields(t *testing.T) {
	actual := lint([]byte(`{}`))
	if !containsErr(actual, "Field success", "is required") {
		t.Fatalf("expected required error, got %v", actual)
	}
	if !containsErr(actual, "Field truncated", "is required") {
		t.Fatalf("expected required error, got %v", actual)
	}
	if !containsErr(actual, "Field details", "is required") {
		t.Fatalf("expected required error, got %v", actual)
	}
	if !containsErr(actual, "Field errors", "is required") {
		t.Fatalf("expected required error, got %v", actual)
	}
}

func TestValid(t *testing.T) {
	actual := lint([]byte(`{
		"success": false,
		"truncated": false,
		"details": [{
			"component": "foo",
			"source": "Dockerfile"
		}],
		"errors": ["failed to scan"]
	}`))
	if len(actual) > 0 {
		t.Fatalf("expected no errors, got %v", actual)
	}
}
