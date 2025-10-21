# TLDR::CMD Format Specification — v0.2

**Status**: Draft
**Version**: 0.2.0
**Date**: 2025-10-20
**Supersedes**: TLDR v0.1

## Abstract

TLDR v0.2 is a deterministic, agent-first command metadata format using NDJSON (newline-delimited JSON) with explicit field mappings defined in a metadata header. This eliminates ambiguity, reduces token overhead through short keys, and provides a self-describing wire format that requires no external schema resolution.

## Key Changes from v0.1

- **Format**: ASCII KEY:value → NDJSON with metadata header
- **Determinism**: Explicit keymap eliminates field inference
- **Compactness**: 1-2 letter keys reduce token count by ~40%
- **Discovery**: Single `--tldr` flag outputs all commands in one response
- **Self-describing**: Metadata header defines field semantics

## Wire Format

### Structure

```
--- tool: <tool_name> ---
# meta: tool=<name>, version=<semver>, keymap={<mappings>}
{"cmd":"<name>","p":"<purpose>",...}
{"cmd":"<name>","p":"<purpose>",...}
...
```

1. **Tool delimiter**: `--- tool: <name> ---` (ASCII art separator)
2. **Metadata line**: Starts with `# meta:`, defines tool name, version, and field keymap
3. **Command lines**: One NDJSON object per command

### Metadata Header

Format: `# meta: tool=<name>, version=<semver>, keymap={<key:meaning,...>}`

**Required fields**:
- `tool`: CLI tool name (alphanumeric, hyphens, underscores)
- `version`: Semantic version string (e.g., "2.46", "1.0.0-beta")
- `keymap`: JSON object mapping short keys to their semantic meanings

**Example**:
```
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,in:inputs,out:outputs}
```

### Keymap

The keymap is a JSON object where:
- **Keys**: 1-3 character field names used in command records (lowercase)
- **Values**: Full semantic names describing what the field represents

Decoders (AI agents) MUST use the keymap to interpret fields. Do NOT infer meanings beyond the explicit mappings.

**Standard keymap entries** (see docs/keymap-stdlib.md for complete reference):

| Short | Full Name | Type | Description |
|-------|-----------|------|-------------|
| `cmd` | command | string | Command name |
| `p` | purpose | string | One-line command description |
| `in` | inputs | array | Input parameters (required/optional) |
| `out` | outputs | array | Output channels/artifacts |
| `fl` | flags | array | CLI flags/options |
| `t` | type | string | Data type (str, int, bool, file, etc.) |
| `req` | required | boolean/int | Required parameter (1=required, 0=optional) |
| `d` | default | any | Default value if not provided |
| `vals` | choices | array | Enumerated valid values |
| `al` | alias | string | Short flag alias (e.g., "-b") |
| `effects` | side_effects | array | Mutations (network, filesystem, db) |
| `idempotent` | safe_to_repeat | boolean | Safe to run multiple times with same inputs |
| `confirm` | requires_confirmation | boolean | Requires user confirmation for destructive ops |
| `er` | errors | array | Expected error conditions |
| `code` | error_code | string | Machine-readable error identifier |
| `msg` | message | string | Human-readable error message |
| `retry` | retryable | boolean | Whether error is transient/retryable |
| `example` | example_command | string | Working example invocation |

### Command Records

Each line after the metadata header is a JSON object representing one command.

**Minimal required fields**:
- `cmd`: Command name (string)
- `p`: Purpose/description (string)

**Recommended fields**:
- `in`: Input parameters (array of objects with `n` (name), `t` (type), `req` (required))
- `out`: Outputs (array of objects with `n` (name), `t` (type))
- `fl`: Flags (array of objects with `n` (name), `t` (type), `d` (default), `al` (alias))
- `effects`: Side effects (array of strings like "network:write", "filesystem:read")
- `idempotent`: Safe to repeat (boolean)
- `confirm`: Requires confirmation (boolean)
- `er`: Errors (array of objects with `code`, `msg`, `retry`)
- `example`: Example command (string)

## Discovery Protocol

### Getting Tool Metadata

```bash
$ <cli> --tldr
```

**Output**: NDJSON format with metadata header and all command records

**Example**:
```
--- tool: git ---
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,in:inputs,...}
{"cmd":"init","p":"Create an empty repository",...}
{"cmd":"clone","p":"Clone an existing repository",...}
{"cmd":"commit","p":"Record staged changes",...}
```

### Per-Command Details (Optional)

Implementers MAY support per-command queries:

```bash
$ <cli> <command> --tldr
```

**Output**: Single NDJSON line with metadata header and one command record

**Example**:
```
--- tool: git ---
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,...}
{"cmd":"commit","p":"Record staged changes","in":[{"n":"message","t":"str","req":1}],...}
```

## Type System

Common types used in `t` (type) fields:

| Type | Description | Example Values |
|------|-------------|----------------|
| `str` | String value | "hello", "path/to/file" |
| `int` | Integer | 42, -10, 0 |
| `float` | Floating point | 3.14, -0.5 |
| `bool` | Boolean flag | true, false |
| `file` | File path | "/etc/config", "./data.json" |
| `dir` | Directory path | "/home/user", "." |
| `hash` | Hash/digest | "a3f5b2c", "sha256:..." |
| `url` | URL | "https://example.com" |
| `list` | Array/list | ["a", "b", "c"] |
| `enum` | Enumerated choice | One of `vals` array |

## Side Effects Vocabulary

Use consistent, machine-readable side effect descriptors:

**Format**: `<domain>:<operation>`

**Common descriptors**:
- `filesystem:read` — Reads files/directories
- `filesystem:write` — Creates/modifies/deletes files
- `network:read` — HTTP GET, downloads
- `network:write` — HTTP POST/PUT, uploads
- `db:read` — Database queries
- `db:write` — Database mutations
- `repo:write` — Version control commits
- `none` — Pure read-only operation

## Determinism Rules

1. **No inference**: Decoders MUST NOT invent field meanings beyond the keymap
2. **Unknown keys**: Fields not in keymap SHOULD be ignored (forward compatibility)
3. **Missing required fields**: Commands without `cmd` and `p` are invalid
4. **Keymap precedence**: Keymap overrides any standard library assumptions
5. **Case sensitivity**: Keys are case-sensitive (lowercase preferred)

## Parsing Algorithm

1. Read first line, verify it starts with `--- tool:`
2. Read second line, verify it starts with `# meta:`
3. Parse metadata: extract `tool`, `version`, and `keymap` JSON
4. For each subsequent line:
   - Parse as JSON object
   - Validate `cmd` and `p` fields exist
   - Interpret all fields using the keymap
   - Collect into command registry

## Example: Complete Git Metadata

```
--- tool: git ---
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,in:inputs,out:outputs,t:type,req:required,d:default,vals:choices,al:alias,fl:flags,effects:side_effects,idempotent:safe_to_repeat,confirm:requires_confirmation,er:errors,code:error_code,msg:message,retry:retryable,example:example_command}
{"cmd":"init","p":"Create an empty repository","in":[],"out":[{"n":"repo_dir","t":"dir"}],"fl":[{"n":"bare","t":"bool","d":false}],"effects":["filesystem:write"],"idempotent":true,"confirm":false,"er":[{"code":"E_EXISTS","msg":"already initialized"}],"example":"git init"}
{"cmd":"clone","p":"Clone an existing repository","in":[{"n":"repo_url","t":"str","req":1}],"out":[{"n":"repo_dir","t":"dir"}],"fl":[{"n":"branch","t":"str","al":"-b"}],"effects":["network:read","filesystem:write"],"idempotent":true,"confirm":false,"er":[{"code":"E_NET","msg":"network failure"}],"example":"git clone https://github.com/user/repo.git"}
{"cmd":"commit","p":"Record staged changes","in":[{"n":"message","t":"str","req":1}],"out":[{"n":"commit_id","t":"hash"}],"fl":[{"n":"amend","t":"bool"}],"effects":["repo:write"],"idempotent":false,"confirm":false,"er":[{"code":"E_EMPTY","msg":"no changes"}],"example":"git commit -m 'fix bug'"}
{"cmd":"push","p":"Send commits to remote","in":[{"n":"remote","t":"str","d":"origin"}],"fl":[{"n":"force","t":"bool","al":"-f"}],"effects":["network:write"],"idempotent":false,"confirm":true,"er":[{"code":"E_CONFLICT","msg":"non-fast-forward rejected"}],"example":"git push origin main"}
```

## Example: Minimal Tool

```
--- tool: hello ---
# meta: tool=hello, version=1.0, keymap={cmd:command,p:purpose,example:example_command}
{"cmd":"greet","p":"Print a greeting","example":"hello greet"}
{"cmd":"version","p":"Show version","example":"hello version"}
```

## Implementation Checklist

1. Add `--tldr` flag to root command
2. Create metadata registry with all commands
3. Define keymap (use standard library from docs/keymap-stdlib.md)
4. Implement TLDR emitter:
   - Print tool delimiter
   - Print metadata header with keymap
   - Print one NDJSON line per command
5. Validate output against spec (see scripts/)
6. Test with generators: `./scripts/tldr-doc-gen.sh <cli> --validate`

## Migration from v0.1

**Breaking changes**:
- Wire format is completely different (ASCII → NDJSON)
- Discovery changed: single `--tldr` replaces two-stage index/command pattern
- Field names are now abbreviated and defined by keymap

**Migration path for decoders (AI agents)**:
- Detect format by first line (`---` vs. uppercase ASCII keys)
- Parse v0.2 using keymap from metadata header
- Fall back to v0.1 parser if no tool delimiter found

**Migration path for encoders (CLI authors)**:
- Keep v0.1 implementation temporarily
- Add v0.2 emitter alongside (e.g., `--tldr` vs `--tldr-v1`)
- Switch `--tldr` to v0.2 once agents adopt new spec
- Remove v0.1 after deprecation period

## Version History

- **v0.2** (2025-10-20): NDJSON format with keymap metadata
- **v0.1** (2025-10-01): Initial ASCII KEY:value format

## License

Public domain (Unlicense). See LICENSE file.

## References

- Standard keymap library: docs/keymap-stdlib.md
- Reference implementation: reference-implementations/forest/
- Generators: scripts/ (Bash, Node.js, Python)
