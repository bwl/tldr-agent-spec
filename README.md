# TLDR v0.1 - Agent-First Command Metadata Standard

> **The missing standard for AI agents to discover and use CLIs**

TLDR (Too Long; Didn't Read) is a minimal, parseable command metadata format that lets AI agents learn your entire CLI in a single round-trip — no manuals, no trial-and-error, just structured metadata optimized for machine consumption.

## The Problem

```bash
# Traditional approach: agents struggle with verbose, inconsistent output
$ my-cli --help
Usage: my-cli [OPTIONS] COMMAND [ARGS]...

A complex CLI tool that does various things across multiple
subsystems. This help text goes on for pages with examples,
edge cases, and formatting that's hard to parse...

# 500+ lines of prose later...
```

**Result**: Agents burn tokens parsing free-form text, miss commands, and need multiple attempts to understand usage.

## The TLDR Solution

```bash
# TLDR approach: structured, minimal, parseable
$ my-cli --tldr
NAME: my-cli
VERSION: 1.0.0
SUMMARY: A complex CLI tool
COMMANDS: init,build,deploy,config.set,config.get
TLDR_CALL: my-cli <command> --tldr

$ my-cli build --tldr
CMD: build
PURPOSE: Build the project
INPUTS: ARGS(target),ENV(BUILD_ENV)
OUTPUTS: build artifacts,status report
SIDE_EFFECTS: writes to dist/,reads package.json
FLAGS: --target=STR=production|deployment target;--watch=BOOL=false|enable watch mode
EXAMPLES: my-cli build|my-cli build --target staging --watch
RELATED: deploy,init
```

**Result**: Agents learn the entire CLI in <2KB, with types, defaults, examples, and relationships — all in one pass.

## Key Features

✅ **Zero-shot discovery**: `<cli> --tldr` reveals all commands
✅ **Minimal tokens**: ~2KB for 30-command CLI vs. 50KB+ traditional docs
✅ **Type-aware**: Flags include STR, BOOL, INT, FLOAT, FILE, LIST types
✅ **Self-documenting**: Examples embedded inline
✅ **Relationship graph**: RELATED field creates discovery paths
✅ **Universal**: Language/framework agnostic

## Quick Start

### For AI Agents

```bash
# 1. Discover all commands
$ forest --tldr
COMMANDS: capture,explore,search,node.read,edges.propose,...

# 2. Get command details
$ forest capture --tldr
CMD: capture
FLAGS: --stdin=BOOL=false|read from stdin;--tags=LIST|comma-separated tags
EXAMPLES: forest capture --stdin < note.md

# 3. Use it!
$ echo "My idea" | forest capture --stdin
```

### For CLI Authors

```typescript
// 1. Define metadata
const TLDR = {
  capture: {
    cmd: 'capture',
    purpose: 'Create a new note',
    inputs: ['STDIN', 'FILE'],
    outputs: ['node record'],
    sideEffects: 'writes to DB',
    flags: [
      { name: 'stdin', type: 'BOOL', default: false, desc: 'read from stdin' }
    ],
    examples: ['forest capture --stdin < note.md'],
    related: ['explore', 'search']
  }
};

// 2. Add --tldr handler
if (flags.tldr) {
  console.log(formatTldr(TLDR.capture));
  process.exit(0);
}
```

See [reference-implementations/forest/](reference-implementations/forest/) for a complete TypeScript example.

## Documentation Generators

Three universal tools to validate and document any TLDR-compliant CLI:

### 1. Bash (Universal, Zero Dependencies)
```bash
./scripts/tldr-doc-gen.sh <cli>              # Generate docs
./scripts/tldr-doc-gen.sh <cli> --validate  # Validate compliance
```

### 2. Node.js (Multi-Format Output)
```bash
node scripts/tldr-doc-gen.js <cli>           # Generate TXT/MD/JSON
node scripts/tldr-doc-gen.js <cli> --validate
```

### 3. Python (Analytics & Visualization)
```bash
python3 scripts/tldr-doc-gen.py <cli>        # Generate JSON + HTML report
python3 scripts/tldr-doc-gen.py <cli> --analyze
```

**Example output**: See [docs/examples/forest_complete.txt](docs/examples/forest_complete.txt)

## Specification

Full spec: [docs/spec-v0.1.md](docs/spec-v0.1.md)

### Wire Format

**ASCII** (required):
```
KEY: value
```
- Uppercase keys, single-pass parseable
- Comma-separated lists
- Semicolon-separated flags
- Pipe-separated examples

**JSON** (optional):
```json
{
  "CMD": "capture",
  "FLAGS": [{"name": "stdin", "type": "BOOL", "default": false}],
  ...
}
```

### Required Fields

**Global index** (`<cli> --tldr`):
- NAME, VERSION, SUMMARY, COMMANDS, TLDR_CALL

**Command-level** (`<cli> <command> --tldr`):
- CMD, PURPOSE, INPUTS, OUTPUTS, SIDE_EFFECTS, FLAGS, EXAMPLES, RELATED

### Flag Types

- `STR` - String value
- `BOOL` - Boolean flag
- `INT` - Integer
- `FLOAT` - Floating-point number
- `FILE` - File path
- `LIST` - Comma-separated list
- `STDIN` - Reads from standard input

## Benefits

### For AI Agents
- **One round-trip learning**: Entire CLI in single request
- **Predictable parsing**: No NLP required
- **Type safety**: Know parameter types before calling
- **Discovery**: Follow RELATED links to explore features

### For CLI Authors
- **Automatic documentation**: Generators create docs from TLDR
- **Better UX**: Agents use your CLI correctly on first try
- **Future-proof**: Standard interface as agents evolve
- **Low effort**: ~10 lines per command

## Examples in the Wild

- **Forest CLI**: Graph-native knowledge base ([reference-implementations/forest/](reference-implementations/forest/))
- *Want your CLI listed? Open a PR!*

## Installation

```bash
# Clone this repo
git clone https://github.com/your-org/tldr-agent-spec.git

# Make generators executable (if needed)
chmod +x tldr-agent-spec/scripts/*.{sh,py}

# Test on an example CLI
cd tldr-agent-spec
./scripts/tldr-doc-gen.sh forest --validate
```

## Contributing

This is a draft spec (v0.1). We welcome:
- Reference implementations in other languages
- Generator improvements
- Spec clarifications and extensions
- Real-world usage feedback

Open an issue or PR!

## License

Public domain. Use, modify, distribute freely.

## Links

- **Spec**: [docs/spec-v0.1.md](docs/spec-v0.1.md)
- **Generators**: [scripts/](scripts/)
- **Examples**: [docs/examples/](docs/examples/)
- **Reference Implementation**: [reference-implementations/forest/](reference-implementations/forest/)

---

**TL;DR for humans**: Add `--tldr` to your CLI. Agents will love you. 🤖✨
