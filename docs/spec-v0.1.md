# TLDR Standard v0.1 - Agent-First Command Metadata

**Status**: Draft Specification
**Version**: 0.1
**Date**: 2025-01-20
**Authors**: Forest CLI Team

## Abstract

TLDR (Too Long; Didn't Read) is a minimal, parseable command metadata format designed for AI agent ingestion. It provides a universal interface for CLIs to expose their command structure, flags, examples, and relationships in a machine-readable format optimized for single-pass parsing and minimal token consumption.

## Motivation

Modern AI agents need to discover and use CLI tools programmatically. Existing documentation formats (man pages, --help text, external docs) suffer from:

1. **High token cost**: Verbose prose optimized for human reading
2. **Inconsistent format**: No standard schema across tools
3. **Discovery friction**: No universal entry point to enumerate commands
4. **Manual parsing**: Free-form text requires complex NLP to extract structure

TLDR solves these problems with a **predictable, minimal wire format** that any CLI can implement and any agent can parse.

## Design Principles

1. **Single-pass parseable**: No backtracking, no lookahead required
2. **Minimal tokens**: Optimized for LLM context windows
3. **Universal**: Works for any CLI (language/framework agnostic)
4. **Self-documenting**: Includes types, defaults, examples inline
5. **Zero dependencies**: Plain ASCII, no special parsing libraries needed

## Specification

### Discovery Mechanism

Every TLDR-compliant CLI MUST:

1. Accept `--tldr` flag at the root level to emit global index
2. Accept `--tldr` flag on every command to emit command-specific metadata
3. Optionally accept `--tldr=json` for JSON output (same schema)

```bash
# Global discovery
<cli> --tldr          # ASCII format (required)
<cli> --tldr=json     # JSON format (optional)

# Per-command metadata
<cli> <command> --tldr          # ASCII format (required)
<cli> <command> --tldr=json     # JSON format (optional)
```

### Wire Format

#### ASCII Mode (Required)

**Format**: `KEY: value` pairs, one per line, no blank lines, uppercase keys.

**Global Index Required Keys**:
```
NAME: <cli-name>
VERSION: <semver-string>
SUMMARY: <one-line-description>
COMMANDS: <comma-separated-list>
TLDR_CALL: <template-for-per-command-tldr>
```

**Example**:
```
NAME: forest
VERSION: 0.2.0
SUMMARY: Graph-native knowledge base CLI
COMMANDS: capture,explore,search,stats,node.read,node.edit,edges.propose
TLDR_CALL: forest <command> --tldr
```

**Command-Level Required Keys**:
```
CMD: <command-name>
PURPOSE: <one-line-description>
INPUTS: <comma-separated-input-channels>
OUTPUTS: <comma-separated-outputs>
SIDE_EFFECTS: <one-line-description>
FLAGS: <semicolon-separated-flag-definitions>
EXAMPLES: <pipe-separated-examples>
RELATED: <comma-separated-related-commands>
```

**FLAG Format**: `--name=TYPE[=DEFAULT]|description`
- **TYPE**: STR, BOOL, INT, FLOAT, FILE, LIST, STDIN
- **DEFAULT**: Optional default value
- **Description**: Human-readable flag purpose

**Example**:
```
FLAGS: --title=STR|note title;--stdin=BOOL=false|read from stdin;--limit=INT=10|max results
```

**Full Command Example**:
```
CMD: capture
PURPOSE: Create a new note and optionally auto-link into the graph
INPUTS: ARGS(title,body,tags),STDIN,FILE
OUTPUTS: node record,edges summary,optional preview
SIDE_EFFECTS: writes to SQLite DB,computes embeddings,creates/updates edges
FLAGS: --title=STR|note title;--body=STR|note body;--stdin=BOOL=false|read from stdin
EXAMPLES: forest capture --stdin < note.md|forest capture --title "Idea" --body "Text"
RELATED: explore,edges.propose,node.read
```

**Optional Keys**:
```
SCHEMA_JSON: <description-of-json-output-schema>
```

#### JSON Mode (Optional)

Same schema as ASCII, but structured. Keys remain uppercase for consistency.

**Global Index**:
```json
{
  "NAME": "forest",
  "VERSION": "0.2.0",
  "SUMMARY": "Graph-native knowledge base CLI",
  "COMMANDS": ["capture", "explore", "search"],
  "TLDR_CALL": "forest <command> --tldr"
}
```

**Command-Level**:
```json
{
  "CMD": "capture",
  "PURPOSE": "Create a new note and optionally auto-link into the graph",
  "INPUTS": ["ARGS(title,body,tags)", "STDIN", "FILE"],
  "OUTPUTS": ["node record", "edges summary"],
  "SIDE_EFFECTS": "writes to SQLite DB,computes embeddings",
  "FLAGS": [
    {"name": "title", "type": "STR", "default": null, "desc": "note title"},
    {"name": "stdin", "type": "BOOL", "default": false, "desc": "read from stdin"}
  ],
  "EXAMPLES": [
    "forest capture --stdin < note.md",
    "forest capture --title \"Idea\" --body \"Text\""
  ],
  "RELATED": ["explore", "edges.propose", "node.read"],
  "SCHEMA_JSON": "emits {\"node\":{\"id\":STR,\"title\":STR}}"
}
```

### Naming Conventions

**Commands**:
- Top-level: `capture`, `search`, `stats`
- Namespaced: Use dot notation in COMMANDS list, space notation for invocation
  - List as: `node.read`, `edges.propose`
  - Invoke as: `forest node read`, `forest edges propose`

**Flag Types**:
- `STR`: String value
- `BOOL`: Boolean flag (presence = true)
- `INT`: Integer number
- `FLOAT`: Floating-point number
- `FILE`: File path
- `LIST`: Comma-separated list
- `STDIN`: Reads from standard input

**Input Channels**:
- `ARGS(param1,param2)`: Positional parameters
- `STDIN`: Reads from standard input
- `FILE`: Reads from file via flag
- `ENV(VAR1,VAR2)`: Environment variables
- `none`: No inputs required

**Side Effects**:
- `none (read-only)`: No mutations
- `writes to <target>`: File/DB writes
- `network`: HTTP/network calls
- `spawns process`: Subprocess creation

## Validation

A TLDR-compliant CLI implementation MUST:

1. ✅ Respond to `<cli> --tldr` with valid global index
2. ✅ Include all required global keys (NAME, VERSION, SUMMARY, COMMANDS, TLDR_CALL)
3. ✅ Respond to `<cli> <command> --tldr` for every listed command
4. ✅ Include all required command keys (CMD, PURPOSE, INPUTS, OUTPUTS, SIDE_EFFECTS, FLAGS, EXAMPLES, RELATED)
5. ✅ Use consistent CMD value (matches command name in COMMANDS list)
6. ✅ Provide at least one example per command
7. ✅ Use only specified flag types (STR, BOOL, INT, FLOAT, FILE, LIST, STDIN)

Optional (for --tldr=json support):
8. ⭕ Respond to `<cli> --tldr=json` and `<cli> <command> --tldr=json`
9. ⭕ Ensure ASCII and JSON outputs contain identical data

## Reference Implementation

See Forest CLI for a complete reference implementation:
- TypeScript implementation: `src/cli/tldr.ts`
- Command integration: `src/cli/commands/*.ts`
- Global metadata registry: `COMMAND_TLDR` object

## Validation Tools

Three official validation/documentation generators are available:

1. **Bash** (`scripts/tldr-doc-gen.sh`): Universal, zero-dependency
2. **Node.js** (`scripts/tldr-doc-gen.js`): Multi-format output (TXT/MD/JSON)
3. **Python** (`scripts/tldr-doc-gen.py`): Analytics and HTML reports

Usage:
```bash
# Validate compliance
./scripts/tldr-doc-gen.sh <cli> --validate

# Generate documentation
./scripts/tldr-doc-gen.sh <cli>
node scripts/tldr-doc-gen.js <cli>
python3 scripts/tldr-doc-gen.py <cli>
```

## Benefits for Agents

1. **Zero-shot discovery**: Learn entire CLI surface in one round-trip
2. **Minimal tokens**: ~2KB for 30-command CLI vs. 50KB+ for traditional docs
3. **Predictable parsing**: Fixed schema, no NLP required
4. **Self-documenting**: Types, defaults, examples embedded
5. **Relationship graph**: RELATED field enables command discovery paths

## Adoption Guide

### For CLI Authors

1. Add `--tldr` flag handling to your CLI framework
2. Create metadata registry (see `src/cli/tldr.ts` example)
3. Populate metadata for each command (CMD, PURPOSE, INPUTS, etc.)
4. Wire up flag detection to emit TLDR and exit early
5. Validate with: `./scripts/tldr-doc-gen.sh <your-cli> --validate`

### For Agent Developers

1. Call `<cli> --tldr` to discover all commands
2. Parse COMMANDS field (comma-separated)
3. For each command: call `<cli> <command> --tldr` (convert dots to spaces)
4. Parse FLAGS to understand parameters and types
5. Use EXAMPLES as templates for invocation
6. Follow RELATED links for discovery

## Future Considerations

Potential additions for v0.2:

- **Versioning**: Include TLDR_SPEC_VERSION field
- **Deprecation**: DEPRECATED flag for commands/flags
- **Aliases**: ALIASES field for command name variations
- **Subcommands**: Formal SUBCOMMANDS field vs. dot notation
- **Return codes**: EXIT_CODES field documenting success/error codes
- **Permissions**: REQUIRES field (e.g., "sudo", "auth", "network")

## License

This specification is released into the public domain. Implementers may use, modify, and distribute freely without attribution.

## References

- Forest CLI: https://github.com/your-org/forest (reference implementation)
- Documentation Generators: `scripts/tldr-doc-gen.{sh,js,py}`
- Example Output: `docs/forest_tldr_example.txt`

---

**Changelog**:
- 2025-01-20: Initial draft (v0.1)
