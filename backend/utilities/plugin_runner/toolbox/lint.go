package main

import (
	"bytes"
	"embed"
	"errors"
	"fmt"
	"unicode/utf8"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// Root namespace for the schemas (not a real resource).
const schemaRoot = "https://wbd.com/artemis/plugin"

//go:embed schemas/*.json
var pluginResultsSchemas embed.FS

// mustLoadSchema loads an embedded JSON schema by ID.
// Panics on error.
func mustLoadSchema(id string) any {
	buf, err := pluginResultsSchemas.ReadFile("schemas/" + id + ".json")
	if err != nil {
		panic(err)
	}

	schema, err := jsonschema.UnmarshalJSON(bytes.NewReader(buf))
	if err != nil {
		panic(err)
	}

	return schema
}

// Plugin type -> schema ID.
var pluginTypeSchemaMap = map[string]string{
	"configuration":   "configuration-finding",
	"inventory":       "unknown-finding", // Open-ended schema.
	"secrets":         "secrets-finding",
	"static_analysis": "static-analysis-finding",
	"vulnerability":   "vulnerability-finding",
}

// mustCompileSchema compiles the JSON schema for the given plugin type.
// Panics on error.
func mustCompileSchema(pluginType string) *jsonschema.Schema {
	var err error

	c := jsonschema.NewCompiler()

	if err = c.AddResource(schemaRoot+"/plugin-results.json", mustLoadSchema("plugin-results")); err != nil {
		panic(err)
	}

	// The schema of the findings is determined by the plugin type, which
	// isn't included in the results JSON itself.
	// As a hack, we load the type-specific schema as "finding.json" so that
	// the reference in plugin-results.json is compiled to the correct schema.
	findingSchemaID, ok := pluginTypeSchemaMap[pluginType]
	if !ok {
		// Open-ended finding schema so the top-level schema will compile.
		findingSchemaID = "unknown-finding"
	}
	if err = c.AddResource(schemaRoot+"/finding.json", mustLoadSchema(findingSchemaID)); err != nil {
		panic(err)
	}

	return c.MustCompile(schemaRoot + "/plugin-results.json")
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

	if err = mustCompileSchema(pluginType).Validate(inst); err != nil {
		return err
	}

	return nil
}
