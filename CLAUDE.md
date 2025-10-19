# CLAUDE.md - TLDR Agent Spec

This file provides guidance to Claude Code (claude.ai/code) when working with the TLDR specification repository.

## Project Overview

TLDR v0.1 is an agent-first command metadata standard that enables AI agents to discover and use CLIs through a minimal, parseable wire format. This repository contains:

- **Specification**: [docs/spec-v0.1.md](docs/spec-v0.1.md) - Formal TLDR v0.1 standard
- **Generators**: [scripts/](scripts/) - Three universal documentation/validation tools
- **Examples**: [docs/examples/](docs/examples/) - Real-world TLDR output
- **Reference Implementation**: [reference-implementations/forest/](reference-implementations/forest/) - TypeScript example

## Quick Start for Agents

```bash
# Discover all commands in a TLDR-compliant CLI
$ <cli> --tldr
# Returns: NAME, VERSION, SUMMARY, COMMANDS (comma-separated), TLDR_CALL

# Get detailed metadata for a specific command
$ <cli> <command> --tldr
# Returns: CMD, PURPOSE, INPUTS, OUTPUTS, SIDE_EFFECTS, FLAGS, EXAMPLES, RELATED
```

**Key principle**: One flag (`--tldr`) unlocks the entire CLI surface in structured, minimal format.

## File Structure

```
tldr-agent-spec/
├── README.md                    # Main entry point
├── CLAUDE.md                    # This file (agent guidance)
├── LICENSE                      # Public domain
├── docs/
│   ├── spec-v0.1.md            # Formal specification
│   └── examples/
│       └── forest_complete.txt  # Full Forest CLI documentation (19KB, 365 lines)
├── scripts/
│   ├── tldr-doc-gen.sh         # Bash generator (universal)
│   ├── tldr-doc-gen.js         # Node.js generator (multi-format)
│   ├── tldr-doc-gen.py         # Python generator (analytics)
│   ├── README.md               # Generator comparison
│   └── test-all.sh             # Test harness
└── reference-implementations/
    └── forest/
        ├── README.md           # Forest implementation guide
        └── tldr.ts             # Complete TypeScript implementation
```

## TLDR Wire Format (Quick Reference)

### ASCII Mode
```
KEY: value
```
- Uppercase keys, no blank lines
- Lists: comma-separated (COMMANDS, INPUTS, OUTPUTS, RELATED)
- Flags: semicolon-separated `--name=TYPE[=DEFAULT]|description`
- Examples: pipe-separated commands

### JSON Mode (Optional)
Same schema as ASCII, uppercase keys preserved:
```json
{
  "CMD": "capture",
  "FLAGS": [{"name": "stdin", "type": "BOOL", "default": false, "desc": "read from stdin"}]
}
```

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

## Required Fields

**Global index** (`<cli> --tldr`):
- `NAME`: CLI name
- `VERSION`: Semantic version
- `SUMMARY`: One-line description
- `COMMANDS`: Comma-separated list (use dots for namespacing: `node.read`)
- `TLDR_CALL`: Template for per-command TLDR

**Per-command** (`<cli> <command> --tldr`):
- `CMD`: Command name (matches COMMANDS list entry)
- `PURPOSE`: One-line description
- `INPUTS`: Input channels (ARGS, STDIN, FILE, ENV, none)
- `OUTPUTS`: What the command produces
- `SIDE_EFFECTS`: Mutations (DB writes, network, file I/O, or "none (read-only)")
- `FLAGS`: Semicolon-separated flag definitions
- `EXAMPLES`: Pipe-separated working examples
- `RELATED`: Comma-separated related command names

**Optional**:
- `SCHEMA_JSON`: Description of JSON output schema (for `--json` flags)

## Flag Types

| Type | Description | Example |
|------|-------------|---------|
| STR | String value | `--title=STR\|note title` |
| BOOL | Boolean flag | `--watch=BOOL=false\|enable watch mode` |
| INT | Integer | `--limit=INT=10\|max results` |
| FLOAT | Float | `--threshold=FLOAT=0.5\|score threshold` |
| FILE | File path | `--config=FILE\|config file path` |
| LIST | Comma-list | `--tags=LIST\|comma-separated tags` |
| STDIN | Stdin input | `--stdin=BOOL=false\|read from stdin` |

## Implementation Checklist

When implementing TLDR in a CLI:

1. ✅ Add `--tldr` flag to root command
2. ✅ Add `--tldr` flag to every command
3. ✅ Create metadata registry (see `reference-implementations/forest/tldr.ts`)
4. ✅ Wire up flag detection (check before running business logic)
5. ✅ Emit TLDR and exit (use `emitTldrAndExit()` pattern)
6. ✅ Validate: `./scripts/tldr-doc-gen.sh <your-cli> --validate`
7. ✅ Generate docs: `./scripts/tldr-doc-gen.sh <your-cli>`

## Modifying the Spec

If proposing changes to TLDR v0.1:

1. Update `docs/spec-v0.1.md` with your proposal
2. Update generators in `scripts/` to support the change
3. Update Forest reference implementation if needed
4. Regenerate examples: `./scripts/tldr-doc-gen.sh forest`
5. Test all three generators still work
6. Document breaking vs. non-breaking changes

## Design Principles

1. **Minimal tokens**: Every byte counts in LLM context windows
2. **Single-pass parseable**: No backtracking, no lookahead
3. **Universal**: Language/framework agnostic
4. **Self-documenting**: Types, defaults, examples inline
5. **Zero dependencies**: Plain ASCII, standard formats (JSON optional)

## Common Patterns

**Namespaced commands**: Use dots in COMMANDS list, spaces for invocation
```
COMMANDS: node.read,node.edit
$ cli node read  # (not cli node.read)
```

**Parameter commands**: Provide dummy param to access TLDR
```
$ cli read --tldr          # Error: missing required param
$ cli read <id> --tldr     # Works (TLDR checked before param validation)
```

**Side effects**: Be specific and honest
```
SIDE_EFFECTS: writes to SQLite DB,computes embeddings,creates edges
SIDE_EFFECTS: none (read-only)
SIDE_EFFECTS: network (HTTP GET to api.example.com)
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

- **Spec**: [docs/spec-v0.1.md](docs/spec-v0.1.md)
- **Forest CLI** (reference impl): https://github.com/your-org/forest
- **Generator comparison**: [scripts/README.md](scripts/README.md)
- **Example output**: [docs/examples/forest_complete.txt](docs/examples/forest_complete.txt)

---

**For questions about implementing TLDR in your CLI**: Check `reference-implementations/forest/README.md` and `tldr.ts` for a complete working example.
