package main

import (
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/packntrack/jsonValidator"
)

type LintErrors []error

func (errs LintErrors) String() string {
	var sb strings.Builder
	sb.WriteRune('[')
	for i, e := range errs {
		if i > 0 {
			sb.WriteString(", ")
		}
		sb.WriteString(fmt.Sprintf("%#v", e.Error()))
	}
	sb.WriteRune(']')
	return sb.String()
}

// lint validates the JSON results from the plugin.
func lint(buf []byte) LintErrors {
	var retv []error

	if !utf8.Valid(buf) {
		retv = append(retv, errors.New("invalid UTF-8"))
		return retv
	}

	var result struct {
		Success   *bool    `validations:"type=bool;required=true"`
		Truncated *bool    `validations:"type=bool;required=true"`
		Details   any      `validations:"required=true"`
		Errors    []string `validations:"type=[]string;required=true"`
	}

	errs := jsonValidator.Validate(buf, &result)
	retv = append(retv, errs...)

	if result.Truncated != nil && *result.Truncated {
		retv = append(retv, jsonValidator.ValidationError{
			Field: "truncated", Message: "Must be false",
		})
	}

	//TODO: Validate details based on plugin type.

	return retv
}
