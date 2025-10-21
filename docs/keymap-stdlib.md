# TLDR v0.2 Keymap Standard Library

**Purpose**: Reference vocabulary of 1-3 letter keys for TLDR v0.2 encoders (CLI authors).

**For decoders (AI agents)**: You do NOT need this document. Use the keymap provided in each tool's `# meta:` header. This reference exists only to promote consistency across tool implementations.

## Core Metadata

| Short | Full Name | Type | Required | Description | Example |
|-------|-----------|------|----------|-------------|---------|
| `cmd` | command | string | **Yes** | Command name (matches invocation) | "init", "clone", "node.read" |
| `p` | purpose | string | **Yes** | One-line command description | "Create an empty repository" |
| `v` | version | string | No | Command-specific version | "2.0", "beta" |
| `deprecated` | deprecated | boolean | No | Whether command is deprecated | true, false |
| `since` | since_version | string | No | Version when command was added | "1.5.0" |
| `alias` | alias_of | string | No | Canonical command this aliases | "ls" (for "list") |

## Inputs & Outputs

| Short | Full Name | Type | Required | Description | Example |
|-------|-----------|------|----------|-------------|---------|
| `in` | inputs | array | No | Input parameters/arguments | [{"n":"id","t":"str","req":1}] |
| `out` | outputs | array | No | Output channels/artifacts | [{"n":"result","t":"json"}] |
| `n` | name | string | **Yes**† | Parameter/output name | "message", "file_path" |
| `t` | type | string | **Yes**† | Data type | "str", "int", "bool", "file" |
| `req` | required | boolean/int | No | Required parameter (1 or true) | 1, true, false |
| `d` | default | any | No | Default value if omitted | "origin", 10, false |
| `desc` | description | string | No | Parameter description | "Commit message text" |
| `vals` | choices | array | No | Valid enum values | ["json","yaml","csv"] |
| `min` | minimum | number | No | Minimum value (numeric types) | 0, 1 |
| `max` | maximum | number | No | Maximum value (numeric types) | 100, 9999 |
| `pattern` | regex_pattern | string | No | Validation regex | "^[a-z0-9-]+$" |

† Required when appearing in `in` or `out` arrays

## Flags & Options

| Short | Full Name | Type | Required | Description | Example |
|-------|-----------|------|----------|-------------|---------|
| `fl` | flags | array | No | CLI flags/options | [{"n":"force","t":"bool"}] |
| `al` | alias | string | No | Short flag form | "-f", "-b" |
| `env` | env_var | string | No | Environment variable alternative | "GIT_BRANCH" |
| `conflicts` | conflicts_with | array | No | Mutually exclusive flags | ["--all","--id"] |
| `requires` | requires_flags | array | No | Flags required together | ["--user","--pass"] |

## Side Effects & Safety

| Short | Full Name | Type | Required | Description | Example |
|-------|-----------|------|----------|-------------|---------|
| `effects` | side_effects | array | No | Mutations performed | ["filesystem:write","db:write"] |
| `idempotent` | safe_to_repeat | boolean | No | Safe to run multiple times | true, false |
| `confirm` | requires_confirmation | boolean | No | Needs user confirmation | true (for destructive ops) |
| `reversible` | reversible | boolean | No | Can be undone | true, false |
| `undo` | undo_command | string | No | Command to reverse this one | "git reset HEAD~1" |

## Error Handling

| Short | Full Name | Type | Required | Description | Example |
|-------|-----------|------|----------|-------------|---------|
| `er` | errors | array | No | Expected error conditions | [{"code":"E_NET","msg":"..."}] |
| `code` | error_code | string | **Yes**‡ | Machine-readable error ID | "E_NOTFOUND", "ERR_TIMEOUT" |
| `msg` | message | string | **Yes**‡ | Human-readable error message | "File not found" |
| `retry` | retryable | boolean | No | Whether error is transient | true (network), false (validation) |
| `fix` | fix_suggestion | string | No | How to resolve the error | "Run 'git init' first" |
| `exitcode` | exit_code | int | No | Shell exit code for this error | 1, 2, 127 |

‡ Required when appearing in `er` arrays

## Examples & Documentation

| Short | Full Name | Type | Required | Description | Example |
|-------|-----------|------|----------|-------------|---------|
| `example` | example_command | string | No | Working command example | "git commit -m 'fix'" |
| `examples` | example_list | array | No | Multiple examples | ["git init","git init --bare"] |
| `related` | related_commands | array | No | Related command names | ["commit","push"] |
| `doc` | documentation_url | string | No | Link to full docs | "https://git-scm.com/docs/git-commit" |
| `notes` | notes | string | No | Implementation notes/caveats | "Requires Git 2.23+" |

## Type System

Standard values for `t` (type) field:

| Type | Description | Example Values | Validation |
|------|-------------|----------------|------------|
| `str` | String value | "hello", "path/to/file" | Any text |
| `int` | Integer | 42, -10, 0 | Whole numbers |
| `float` | Floating point | 3.14, -0.5 | Decimal numbers |
| `bool` | Boolean flag | true, false | true/false only |
| `file` | File path | "/etc/config", "./data.json" | Path to file |
| `dir` | Directory path | "/home/user", "." | Path to directory |
| `path` | Generic path | "/any/path" | File or directory |
| `hash` | Hash/digest | "a3f5b2c", "sha256:abc..." | Hex string |
| `url` | URL | "https://example.com" | Valid URL |
| `email` | Email address | "user@example.com" | Valid email |
| `uuid` | UUID | "550e8400-e29b-41d4-a716-..." | UUID format |
| `date` | Date | "2025-10-20" | ISO 8601 date |
| `datetime` | Date+time | "2025-10-20T15:30:00Z" | ISO 8601 datetime |
| `duration` | Time duration | "5m", "2h30m" | Duration format |
| `json` | JSON data | {"key":"value"} | Valid JSON |
| `yaml` | YAML data | "key: value" | Valid YAML |
| `list` | Array/list | ["a","b","c"] | JSON array |
| `map` | Key-value map | {"k":"v"} | JSON object |
| `enum` | Enumerated choice | "json" (from `vals`) | One of `vals` |
| `any` | Any type | 42, "text", true | No validation |

## Side Effects Vocabulary

Standard descriptors for `effects` field:

**Format**: `<domain>:<operation>[:<detail>]`

### Filesystem
- `filesystem:read` — Read files/directories
- `filesystem:write` — Create/modify files
- `filesystem:delete` — Remove files/directories
- `filesystem:watch` — Monitor filesystem changes

### Network
- `network:read` — HTTP GET, downloads
- `network:write` — HTTP POST/PUT, uploads
- `network:delete` — HTTP DELETE
- `network:ws` — WebSocket connections

### Database
- `db:read` — Database queries (SELECT)
- `db:write` — Database mutations (INSERT, UPDATE)
- `db:delete` — Database deletions
- `db:schema` — Schema changes (DDL)

### Repository (VCS)
- `repo:read` — Read repository state
- `repo:write` — Commit changes
- `repo:delete` — Delete commits/branches
- `repo:push` — Push to remote

### Process
- `process:spawn` — Launch new processes
- `process:kill` — Terminate processes
- `process:signal` — Send signals to processes

### State
- `state:read` — Read application state
- `state:write` — Modify application state
- `state:delete` — Clear/reset state

### Special
- `none` — Pure read-only, no side effects
- `terminal:clear` — Clear terminal screen
- `clipboard:write` — Write to clipboard

## Complete Keymap Example

Comprehensive keymap covering all standard library keys:

```json
{
  "cmd": "command",
  "p": "purpose",
  "v": "version",
  "deprecated": "deprecated",
  "since": "since_version",
  "alias": "alias_of",
  "in": "inputs",
  "out": "outputs",
  "n": "name",
  "t": "type",
  "req": "required",
  "d": "default",
  "desc": "description",
  "vals": "choices",
  "min": "minimum",
  "max": "maximum",
  "pattern": "regex_pattern",
  "fl": "flags",
  "al": "alias",
  "env": "env_var",
  "conflicts": "conflicts_with",
  "requires": "requires_flags",
  "effects": "side_effects",
  "idempotent": "safe_to_repeat",
  "confirm": "requires_confirmation",
  "reversible": "reversible",
  "undo": "undo_command",
  "er": "errors",
  "code": "error_code",
  "msg": "message",
  "retry": "retryable",
  "fix": "fix_suggestion",
  "exitcode": "exit_code",
  "example": "example_command",
  "examples": "example_list",
  "related": "related_commands",
  "doc": "documentation_url",
  "notes": "notes"
}
```

## Minimal Keymap Example

For simple CLIs, use only essential keys:

```json
{
  "cmd": "command",
  "p": "purpose",
  "in": "inputs",
  "out": "outputs",
  "fl": "flags",
  "n": "name",
  "t": "type",
  "d": "default",
  "example": "example_command"
}
```

## Custom Keys

You MAY add custom keys beyond this standard library:

1. Use descriptive short names (1-3 chars preferred)
2. Add them to your tool's keymap
3. Document their meaning in the keymap value
4. Remember: decoders ignore unknown keys (forward compatibility)

**Example custom keys**:
```json
{
  "cmd": "command",
  "p": "purpose",
  "perf": "performance_impact",     // Custom: high|medium|low
  "auth": "requires_authentication", // Custom: boolean
  "quota": "rate_limit_count"       // Custom: int
}
```

## Best Practices

1. **Start minimal**: Use only keys you need (cmd, p, example minimum)
2. **Be consistent**: Use same keymap across all your commands
3. **Follow conventions**: Prefer standard library keys over custom ones
4. **Document types**: Always specify `t` for inputs/outputs/flags
5. **Provide examples**: Include at least one `example` per command
6. **Describe effects**: Be explicit about `effects` (filesystem, network, etc.)
7. **Mark danger**: Set `confirm:true` for destructive operations
8. **Version properly**: Use semantic versioning in metadata

## Validation

To validate your TLDR output:

```bash
# Bash
./scripts/tldr-doc-gen.sh <cli> --validate

# Node.js
node scripts/tldr-doc-gen.js <cli> --validate

# Python
python3 scripts/tldr-doc-gen.py <cli> --validate
```

## Migration from v0.1

v0.1 field name → v0.2 short key mappings:

| v0.1 Field | v0.2 Key | Notes |
|------------|----------|-------|
| `CMD` | `cmd` | Lowercase |
| `PURPOSE` | `p` | Abbreviated |
| `INPUTS` | `in` | Array of objects (was comma-separated) |
| `OUTPUTS` | `out` | Array of objects (was comma-separated) |
| `FLAGS` | `fl` | Array of objects (was semicolon-separated) |
| `SIDE_EFFECTS` | `effects` | Array (was comma-separated) |
| `EXAMPLES` | `example` or `examples` | String or array |
| `RELATED` | `related` | Array (was comma-separated) |
| `NAME` | `tool` (in metadata) | Tool-level, not per-command |
| `VERSION` | `version` (in metadata) | Tool-level, not per-command |

## See Also

- TLDR v0.2 Specification: docs/spec-v0.2.md
- Reference implementation: reference-implementations/forest/
- Generators: scripts/ (Bash, Node.js, Python)
