# TLDR v0.2 - Agent-First Command Metadata Standard

> **The missing standard for AI agents to discover and use CLIs**

TLDR (Too Long; Didn't Read) is a deterministic, agent-first command metadata format using NDJSON with explicit field mappings. AI agents learn your entire CLI in a single `--tldr` call — no manuals, no inference, just compact structured metadata.

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
# TLDR v0.2: NDJSON with keymap, all commands in one call
$ my-cli --tldr
--- tool: my-cli ---
# meta: tool=my-cli, version=1.0.0, keymap={cmd:command,p:purpose,in:inputs,out:outputs,fl:flags,effects:side_effects,example:example_command}
{"cmd":"init","p":"Initialize project","in":[],"out":[{"n":"config","t":"file"}],"fl":[],"effects":["filesystem:write"],"example":"my-cli init"}
{"cmd":"build","p":"Build the project","in":[{"n":"target","t":"str","d":"production"}],"out":[{"n":"artifacts","t":"dir"}],"fl":[{"n":"watch","t":"bool","d":false}],"effects":["filesystem:write","filesystem:read"],"example":"my-cli build --watch"}
{"cmd":"deploy","p":"Deploy to environment","in":[{"n":"env","t":"str","req":1}],"out":[],"fl":[{"n":"force","t":"bool"}],"effects":["network:write"],"example":"my-cli deploy staging"}
```

**Result**: Agents learn the entire CLI in <1.5KB (40% smaller than v0.1), with types, defaults, examples — all in one deterministic pass.

## Key Features

✅ **Single-call discovery**: `<cli> --tldr` returns ALL commands in one NDJSON response
✅ **Ultra-compact**: ~1.5KB for 30-command CLI (40% smaller than v0.1)
✅ **Deterministic**: Explicit keymap eliminates field inference
✅ **Type-aware**: Short keys (1-2 letters) for str, bool, int, float, file, list, etc.
✅ **Self-documenting**: Examples, defaults, and types inline
✅ **Relationship graph**: Related field creates command discovery paths
✅ **Universal**: Language/framework agnostic, NDJSON-based

## Quick Start

### For AI Agents

```bash
# 1. Single call gets ALL commands with full metadata
$ git --tldr
--- tool: git ---
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,...}
{"cmd":"init","p":"Create an empty repository",...}
{"cmd":"clone","p":"Clone an existing repository",...}
{"cmd":"commit","p":"Record staged changes",...}
{"cmd":"push","p":"Send commits to remote",...}

# 2. Parse the keymap to understand field meanings
# 3. Use commands directly with full type information
$ git commit -m 'Add feature'
```

### For CLI Authors

```typescript
// 1. Define keymap (use standard library from docs/keymap-stdlib.md)
const KEYMAP = {
  cmd: 'command', p: 'purpose', in: 'inputs', out: 'outputs',
  fl: 'flags', n: 'name', t: 'type', d: 'default',
  effects: 'side_effects', example: 'example_command'
};

// 2. Define metadata registry
const TLDR_REGISTRY = {
  capture: {
    cmd: 'capture',
    p: 'Quick-capture text to a new node',
    in: [{ n: 'text', t: 'str', req: 1 }],
    out: [{ n: 'node_id', t: 'str' }],
    fl: [{ n: 'stdin', t: 'bool', d: false }],
    effects: ['db:write'],
    example: "forest capture 'Meeting notes'"
  }
};

// 3. Add --tldr handler (emit NDJSON)
if (process.argv.includes('--tldr')) {
  console.log(`--- tool: forest ---`);
  console.log(`# meta: tool=forest, version=0.2.0, keymap=${JSON.stringify(KEYMAP)}`);
  for (const cmd of Object.values(TLDR_REGISTRY)) {
    console.log(JSON.stringify(cmd));
  }
  process.exit(0);
}
```

See [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md) for complete migration guide.

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

**Example output**: See [docs/examples/git_v02_example.txt](docs/examples/git_v02_example.txt)

## Specification

Full spec: [docs/spec-v0.2.md](docs/spec-v0.2.md)

### Wire Format

**NDJSON** with metadata header:
```
--- tool: <name> ---
# meta: tool=<name>, version=<semver>, keymap={<mappings>}
{"cmd":"<name>","p":"<purpose>",...}
{"cmd":"<name>","p":"<purpose>",...}
```

1. **Tool delimiter**: ASCII art `--- tool: <name> ---`
2. **Metadata line**: `# meta:` with tool name, version, and keymap (JSON)
3. **Command records**: One JSON object per line (NDJSON)

### Keymap (Field Mappings)

Decoders (AI agents) use the keymap to interpret fields. Standard library in [docs/keymap-stdlib.md](docs/keymap-stdlib.md):

| Short | Full Name | Description |
|-------|-----------|-------------|
| `cmd` | command | Command name |
| `p` | purpose | One-line description |
| `in` | inputs | Input parameters (array of objects) |
| `out` | outputs | Output channels/artifacts |
| `fl` | flags | CLI flags/options |
| `t` | type | Data type (str, int, bool, file, etc.) |
| `req` | required | Required parameter (1=required) |
| `d` | default | Default value if not provided |
| `effects` | side_effects | Mutations (array: "db:write", "network:read", etc.) |
| `example` | example_command | Working example invocation |

### Type System

- `str` - String value
- `int` - Integer
- `float` - Floating point
- `bool` - Boolean flag
- `file` - File path
- `dir` - Directory path
- `hash` - Hash/digest
- `url` - URL
- `list` - Array/list
- `enum` - Enumerated choice

## Benefits

### For AI Agents
- **Single call, all commands**: Get entire CLI in one `--tldr` invocation
- **Zero inference**: Explicit keymap defines all field meanings
- **40% more compact**: Shorter keys = fewer tokens consumed
- **Type safety**: Know parameter types, defaults, and requirements upfront
- **Deterministic parsing**: Standard NDJSON, no ambiguity

### For CLI Authors
- **Minimal implementation**: ~15 lines total (keymap + handler)
- **Automatic documentation**: Three generators create docs from TLDR
- **Better agent UX**: Agents use your CLI correctly on first try
- **Future-proof**: Standard interface as agents evolve
- **Migration path**: v0.1 implementations upgrade easily (see migration guide)

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

TLDR v0.2 is stable but open to feedback. We welcome:
- Reference implementations in other languages
- Generator improvements
- Spec clarifications (non-breaking preferred)
- Real-world usage feedback
- Additional keymap standard library entries

Open an issue or PR!

## Migration from v0.1

See [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md) for complete migration guide.

**Breaking changes**:
- Wire format: ASCII → NDJSON
- Discovery: Two-stage → Single call
- Field names: Full words → Abbreviated with keymap

**Migration time**: ~30 minutes for typical CLI

## License

Public domain. Use, modify, distribute freely.

## Links

- **Spec**: [docs/spec-v0.2.md](docs/spec-v0.2.md)
- **Keymap Standard Library**: [docs/keymap-stdlib.md](docs/keymap-stdlib.md)
- **Generators**: [scripts/](scripts/) (Bash, Node.js, Python)
- **Examples**: [docs/examples/](docs/examples/)
- **Migration Guide**: [reference-implementations/forest/MIGRATION_V02.md](reference-implementations/forest/MIGRATION_V02.md)

---

**TL;DR for humans**: Add `--tldr` to your CLI. Agents will love you. 🤖✨
