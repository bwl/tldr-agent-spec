# CLAUDE.md - TLDR Agent Spec

This file provides guidance to Claude Code (claude.ai/code) when working with the TLDR specification repository.

## Project Overview

TLDR v0.2 is an agent-first command metadata standard using NDJSON with explicit field mappings. AI agents discover and use CLIs through a single `--tldr` call. This repository contains:

- **Specification**: [docs/spec-v0.2.md](docs/spec-v0.2.md) - Formal TLDR v0.2 standard
- **Keymap Library**: [docs/keymap-stdlib.md](docs/keymap-stdlib.md) - Standard 1-2 letter field reference
- **Generators**: [scripts/](scripts/) - Three universal documentation/validation tools
- **Examples**: [docs/examples/](docs/examples/) - Real-world TLDR v0.2 output
- **Migration Guide**: [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md)

## Quick Start for Agents

```bash
# Single call returns ALL commands with full metadata (NDJSON format)
$ <cli> --tldr
# Returns:
# Line 1: --- tool: <name> ---
# Line 2: # meta: tool=<name>, version=<ver>, keymap={...}
# Line 3+: {"cmd":"<name>","p":"<purpose>",...} (one JSON per line)
```

**Example**:
```bash
$ git --tldr
--- tool: git ---
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,in:inputs,...}
{"cmd":"init","p":"Create an empty repository",...}
{"cmd":"clone","p":"Clone an existing repository",...}
{"cmd":"commit","p":"Record staged changes",...}
```

**Key principles**:
- **Single call**: One `--tldr` gets all commands
- **Deterministic**: Keymap explicitly defines field meanings
- **Compact**: 40% fewer tokens than v0.1

## File Structure

```
tldr-agent-spec/
├── README.md                          # Main entry point
├── CLAUDE.md                          # This file (agent guidance)
├── LICENSE                            # Public domain
├── docs/
│   ├── spec-v0.2.md                  # Formal TLDR v0.2 specification
│   ├── keymap-stdlib.md              # Standard 1-2 letter keymap library
│   └── examples/
│       └── git_v02_example.txt       # Git CLI example (v0.2 format)
├── scripts/
│   ├── tldr-doc-gen.sh               # Bash generator (zero dependencies)
│   ├── tldr-doc-gen.js               # Node.js generator (multi-format)
│   ├── tldr-doc-gen.py               # Python generator (analytics)
│   ├── README.md                     # Generator comparison
│   └── test-all.sh                   # Test harness
└── reference-implementations/
    └── forest/
        └── MIGRATION_V02.md          # v0.1 → v0.2 migration guide
```

## TLDR v0.2 Wire Format (Quick Reference)

### NDJSON Format
```
--- tool: <name> ---
# meta: tool=<name>, version=<semver>, keymap={<short:full,...>}
{"cmd":"<name>","p":"<purpose>","in":[...],"out":[...],...}
{"cmd":"<name>","p":"<purpose>",...}
```

1. **Tool delimiter** (line 1): `--- tool: <name> ---`
2. **Metadata header** (line 2): `# meta: tool=<name>, version=<ver>, keymap=<JSON>`
3. **Command records** (line 3+): One JSON object per line (NDJSON)

### Keymap
The metadata line includes a `keymap` JSON object that maps short keys to full field names:

```json
{
  "cmd": "command",
  "p": "purpose",
  "in": "inputs",
  "out": "outputs",
  "fl": "flags",
  "effects": "side_effects",
  "example": "example_command"
}
```

**Decoders (AI agents)**: Use the keymap to interpret ALL fields. Do NOT infer meanings beyond the explicit mappings.

## Validation & Documentation

All three generators can validate TLDR compliance and generate docs:

```bash
# Bash (zero dependencies, works anywhere)
./scripts/tldr-doc-gen.sh <cli> --validate
./scripts/tldr-doc-gen.sh <cli>  # → <cli>_tldr.txt

# Node.js (multi-format: TXT, MD with TOC, JSON)
node scripts/tldr-doc-gen.js <cli> --validate
node scripts/tldr-doc-gen.js <cli>  # → <cli>_tldr.{txt,md,json}

# Python (analytics + HTML visual reports)
python3 scripts/tldr-doc-gen.py <cli> --validate
python3 scripts/tldr-doc-gen.py <cli> --analyze  # Console analytics
python3 scripts/tldr-doc-gen.py <cli>  # → <cli>_tldr_analytics.json + <cli>_tldr_report.html
```

## Required Fields (v0.2)

**Metadata header** (required in `# meta:` line):
- `tool`: Tool name
- `version`: Semantic version
- `keymap`: JSON object mapping short keys to full names

**Command records** (required in each JSON line):
- `cmd` (or keymap equivalent): Command name
- `p` (or keymap equivalent): Purpose/description

**Recommended fields** (use keymap standard library):
- `in`: Input parameters (array of objects)
- `out`: Outputs (array of objects)
- `fl`: Flags (array of objects)
- `effects`: Side effects (array of strings)
- `example`: Example command (string)
- `related`: Related commands (array of strings)

See [docs/keymap-stdlib.md](docs/keymap-stdlib.md) for complete field reference.

## Type System (v0.2)

| Type | Description | Example |
|------|-------------|---------|
| `str` | String value | `{"n":"title","t":"str"}` |
| `int` | Integer | `{"n":"limit","t":"int","d":10}` |
| `float` | Floating point | `{"n":"threshold","t":"float"}` |
| `bool` | Boolean flag | `{"n":"watch","t":"bool","d":false}` |
| `file` | File path | `{"n":"config","t":"file"}` |
| `dir` | Directory path | `{"n":"output","t":"dir"}` |
| `list` | Array | `{"n":"tags","t":"list"}` |
| `enum` | Choice | `{"n":"format","t":"enum","vals":["json","yaml"]}` |

## Implementation Checklist (v0.2)

When implementing TLDR v0.2 in a CLI:

1. ✅ Define keymap (use standard library from `docs/keymap-stdlib.md`)
2. ✅ Create metadata registry with short keys
3. ✅ Add `--tldr` flag handler to root command
4. ✅ Emit tool delimiter: `--- tool: <name> ---`
5. ✅ Emit metadata header: `# meta: tool=<name>, version=<ver>, keymap=<JSON>`
6. ✅ Emit command records: One JSON object per line (NDJSON)
7. ✅ Validate: `./scripts/tldr-doc-gen.sh <your-cli> --validate`
8. ✅ Generate docs: `./scripts/tldr-doc-gen.sh <your-cli>`

See [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md) for detailed migration guide.

## Modifying the Spec

If proposing changes to TLDR v0.2:

1. Update `docs/spec-v0.2.md` with your proposal
2. Update generators in `scripts/` to support the change
3. Update keymap standard library (`docs/keymap-stdlib.md`) if adding new fields
4. Update migration guide if change affects v0.1 → v0.2 migration
5. Test all three generators still work
6. Document breaking vs. non-breaking changes
7. Prefer non-breaking extensions via optional fields

## Design Principles

1. **Minimal tokens**: Every byte counts in LLM context windows
2. **Single-pass parseable**: No backtracking, no lookahead
3. **Universal**: Language/framework agnostic
4. **Self-documenting**: Types, defaults, examples inline
5. **Zero dependencies**: Plain ASCII, standard formats (JSON optional)

## Common Patterns (v0.2)

**Namespaced commands**: Use dots in command names
```json
{"cmd":"node.read","p":"Display a node's content",...}
{"cmd":"node.edit","p":"Edit a node's content",...}
```
Invocation: `$ cli node read <id>` (not `cli node.read`)

**Side effects**: Use structured descriptors
```json
{"effects":["db:write","compute:embeddings"],"idempotent":false}
{"effects":["none"]}
{"effects":["network:read","filesystem:write"]}
```

**Required vs. optional inputs**:
```json
{"in":[
  {"n":"id","t":"str","req":1},           // Required
  {"n":"limit","t":"int","d":10}          // Optional with default
]}
```

## Testing

```bash
# Test all generators
cd scripts && ./test-all.sh

# Manually test each
./scripts/tldr-doc-gen.sh forest --validate
node scripts/tldr-doc-gen.js forest --validate
python3 scripts/tldr-doc-gen.py forest --validate
```

## Resources

- **Spec**: [docs/spec-v0.2.md](docs/spec-v0.2.md)
- **Keymap Standard Library**: [docs/keymap-stdlib.md](docs/keymap-stdlib.md)
- **Migration Guide**: [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md)
- **Generator comparison**: [scripts/README.md](scripts/README.md)
- **Example output**: [docs/examples/git_v02_example.txt](docs/examples/git_v02_example.txt)
- **Forest CLI**: https://github.com/bwl/forest (v0.1, will migrate to v0.2)

---

**For questions about implementing TLDR v0.2**: Check [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md) for complete migration guide with examples.
