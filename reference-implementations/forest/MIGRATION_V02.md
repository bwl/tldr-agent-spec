# Migrating Forest to TLDR v0.2

This document outlines the changes needed to upgrade the Forest CLI reference implementation from TLDR v0.1 to v0.2.

## Overview of Changes

**Format**: ASCII KEY:value → NDJSON with metadata header
**Discovery**: Two-stage (global + per-command) → Single call returns all commands
**Field names**: Full words → 1-2 letter abbreviations with keymap

## Required Changes

### 1. Update TLDR Output Format

**Before (v0.1)**:
```
$ forest --tldr
NAME: forest
VERSION: 0.2.0
SUMMARY: Personal knowledge graph CLI
COMMANDS: capture,node.read,node.edit,search
TLDR_CALL: forest <command> --tldr
```

**After (v0.2)**:
```
$ forest --tldr
--- tool: forest ---
# meta: tool=forest, version=0.2.0, keymap={cmd:command,p:purpose,in:inputs,out:outputs,fl:flags,effects:side_effects,example:example_command}
{"cmd":"capture","p":"Quick-capture text to a new node","in":[{"n":"text","t":"str","req":1}],"out":[{"n":"node_id","t":"str"}],"fl":[{"n":"stdin","t":"bool","d":false}],"effects":["db:write"],"example":"forest capture 'Meeting notes'"}
{"cmd":"node.read","p":"Display a node's content","in":[{"n":"id","t":"str","req":1}],"out":[{"n":"content","t":"str"}],"fl":[],"effects":["db:read"],"example":"forest node read abc123"}
{"cmd":"node.edit","p":"Edit a node's content","in":[{"n":"id","t":"str","req":1}],"out":[],"fl":[{"n":"editor","t":"str","d":"$EDITOR"}],"effects":["db:write"],"example":"forest node edit abc123"}
{"cmd":"search","p":"Full-text search across nodes","in":[{"n":"query","t":"str","req":1}],"out":[{"n":"results","t":"list"}],"fl":[{"n":"limit","t":"int","d":10}],"effects":["db:read"],"example":"forest search 'machine learning'"}
```

### 2. Define Your Keymap

Choose abbreviated field names (1-3 characters) and create a keymap. Recommended standard keys:

```typescript
const KEYMAP = {
  cmd: 'command',
  p: 'purpose',
  in: 'inputs',
  out: 'outputs',
  fl: 'flags',
  n: 'name',
  t: 'type',
  req: 'required',
  d: 'default',
  effects: 'side_effects',
  example: 'example_command',
  related: 'related_commands'
};
```

See `docs/keymap-stdlib.md` for the complete standard library of field names.

### 3. Update Metadata Registry

**Before (v0.1)**:
```typescript
const TLDR_REGISTRY = {
  capture: {
    CMD: 'capture',
    PURPOSE: 'Quick-capture text to a new node',
    INPUTS: 'text (required)',
    OUTPUTS: 'node ID',
    // ...
  }
};
```

**After (v0.2)**:
```typescript
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
```

### 4. Update Emitter Function

**Before (v0.1)**:
```typescript
function emitTldr(command: string) {
  const meta = TLDR_REGISTRY[command];
  const lines = [];

  lines.push(`CMD: ${meta.CMD}`);
  lines.push(`PURPOSE: ${meta.PURPOSE}`);
  lines.push(`INPUTS: ${meta.INPUTS}`);
  // ...

  console.log(lines.join('\n'));
  process.exit(0);
}
```

**After (v0.2)**:
```typescript
function emitTldrV2(command?: string) {
  const toolName = 'forest';
  const version = '0.2.0';
  const keymap = {
    cmd: 'command',
    p: 'purpose',
    in: 'inputs',
    out: 'outputs',
    fl: 'flags',
    n: 'name',
    t: 'type',
    req: 'required',
    d: 'default',
    effects: 'side_effects',
    example: 'example_command'
  };

  // Tool delimiter
  console.log(`--- tool: ${toolName} ---`);

  // Metadata header
  console.log(`# meta: tool=${toolName}, version=${version}, keymap=${JSON.stringify(keymap)}`);

  // Command records (all commands, or filtered by `command` param if provided)
  const commands = command
    ? [TLDR_REGISTRY[command]]
    : Object.values(TLDR_REGISTRY);

  for (const cmd of commands) {
    console.log(JSON.stringify(cmd));
  }

  process.exit(0);
}
```

### 5. Update Flag Detection

**Before (v0.1)**:
```typescript
// Check for --tldr flag before parsing arguments
if (process.argv.includes('--tldr')) {
  emitTldr(commandName);
}
```

**After (v0.2)**:
```typescript
// Check for --tldr flag at root level (no command specified)
if (process.argv.includes('--tldr') && !commandName) {
  emitTldrV2(); // Emit all commands
}

// Check for --tldr flag at command level (optional: for single-command queries)
if (process.argv.includes('--tldr') && commandName) {
  emitTldrV2(commandName); // Emit single command
}
```

### 6. Update Type System

Map your existing types to v0.2 standard types:

| v0.1 | v0.2 | Notes |
|------|------|-------|
| STRING | str | Shortened |
| INT | int | Shortened |
| BOOL | bool | Shortened |
| FILE | file | Lowercase |
| STDIN | - | Now a flag with `t: 'bool'` |
| LIST | list | Lowercase |

### 7. Side Effects Vocabulary

Use structured side effect descriptors:

**Before (v0.1)**:
```typescript
SIDE_EFFECTS: 'writes to SQLite DB,computes embeddings'
```

**After (v0.2)**:
```typescript
effects: ['db:write', 'compute:embeddings']
```

Standard patterns:
- `filesystem:read`, `filesystem:write`
- `network:read`, `network:write`
- `db:read`, `db:write`
- `repo:write`
- `none` (read-only operations)

## Testing Your Implementation

Once updated, test with the v0.2 generators:

```bash
# Bash (zero dependencies)
./scripts/tldr-doc-gen.sh forest --validate

# Node.js (multi-format output)
node scripts/tldr-doc-gen.js forest --validate

# Python (analytics)
python3 scripts/tldr-doc-gen.py forest --validate
```

All three should report: `✔ forest is TLDR v0.2 compliant ✨`

## Migration Checklist

- [ ] Define keymap (use standard library from `docs/keymap-stdlib.md`)
- [ ] Convert TLDR_REGISTRY to use short keys
- [ ] Update emitter to output NDJSON format
- [ ] Add tool delimiter and metadata header
- [ ] Update flag detection logic
- [ ] Convert side effects to structured format
- [ ] Test with all three generators (--validate)
- [ ] Generate new documentation examples
- [ ] Update Forest README with v0.2 examples

## Backward Compatibility

To support both v0.1 and v0.2 during migration:

```typescript
// Support both --tldr (v0.2) and --tldr-v1 flags
if (process.argv.includes('--tldr-v1')) {
  emitTldrV1(); // Old ASCII format
} else if (process.argv.includes('--tldr')) {
  emitTldrV2(); // New NDJSON format
}
```

Deprecate v0.1 after a transition period (e.g., 3-6 months).

## Resources

- **Spec**: `docs/spec-v0.2.md`
- **Keymap Library**: `docs/keymap-stdlib.md`
- **Generators**: `scripts/` (Bash, Node.js, Python)
- **Example**: `docs/examples/git_v02.txt` (reference output)

---

**Questions?** Open an issue at https://github.com/bwl/tldr-agent-spec/issues
