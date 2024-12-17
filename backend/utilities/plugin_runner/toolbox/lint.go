package main

import (
	"bytes"
	_ "embed"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// JSON schema for plugin results.
var pluginResultSchema *jsonschema.Schema

//go:embed plugin-results.json
var pluginResultSchemaData []byte

func init() {
	schema, err := jsonschema.UnmarshalJSON(bytes.NewReader(pluginResultSchemaData))
	if err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	if err = c.AddResource("PluginResults", schema); err != nil {
		panic(err)
	}
	pluginResultSchema = c.MustCompile("PluginResults")
}

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
func lint(pluginType string, buf []byte) error {
	switch pluginType {
	case "configuration":
	case "inventory":
	case "sbom":
	case "secrets":
	case "static_analysis":
	case "vulnerability":
	default:
		return fmt.Errorf("unknown plugin type: %#v", pluginType)
	}

	if !utf8.Valid(buf) {
		return errors.New("invalid UTF-8")
	}

	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(buf))
	if err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	if err = pluginResultSchema.Validate(inst); err != nil {
		return err
	}

	return nil
}
