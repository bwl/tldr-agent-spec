# Forest CLI - TLDR Reference Implementation

This directory contains the complete TypeScript reference implementation of the TLDR v0.1 standard from the Forest CLI project.

## Overview

Forest is a graph-native knowledge base CLI that was the first full implementation of the TLDR standard. This reference implementation demonstrates:

- ✅ Complete metadata registry for 26 commands
- ✅ Both ASCII and JSON output modes
- ✅ Integration with Clerc CLI framework
- ✅ Type-safe TypeScript implementation
- ✅ Per-command TLDR flag handling
- ✅ Early exit pattern (TLDR before business logic)

## Files

- **`tldr.ts`**: Complete implementation
  - Type definitions (`FlagType`, `TldrFlag`, `CommandTldr`, `GlobalTldr`)
  - ASCII formatter (`formatTldrAscii()`)
  - JSON formatter (`formatTldrJson()`)
  - Exit helper (`emitTldrAndExit()`)
  - Metadata registry (`COMMAND_TLDR`) with all 26 commands
  - Global index generator (`getGlobalTldr()`)

## Implementation Pattern

### 1. Define Metadata Registry

```typescript
export const COMMAND_TLDR: Record<string, CommandTldr> = {
  capture: {
    cmd: 'capture',
    purpose: 'Create a new note and optionally auto-link into the graph',
    inputs: ['ARGS(title,body,tags)', 'STDIN', 'FILE'],
    outputs: ['node record', 'edges summary', 'optional preview'],
    sideEffects: 'writes to SQLite DB,computes embeddings,creates/updates edges',
    flags: [
      { name: 'title', type: 'STR', desc: 'note title' },
      { name: 'stdin', type: 'BOOL', default: false, desc: 'read entire stdin as body' },
      // ... more flags
    ],
    examples: [
      'forest capture --stdin < note.md',
      'forest capture --title "Idea" --body "Text"'
    ],
    related: ['explore', 'edges.propose', 'node.read'],
  },
  // ... 25 more commands
};
```

### 2. Add TLDR Flag to Commands

```typescript
// In command definition
flags: {
  // ... existing flags
  tldr: {
    type: String,
    description: 'Output command metadata for agent consumption (--tldr or --tldr=json)',
  },
}
```

### 3. Handle TLDR Early in Handler

```typescript
async ({ flags }) => {
  // Handle TLDR request FIRST (before any other logic)
  if (flags.tldr !== undefined) {
    const jsonMode = flags.tldr === 'json';
    emitTldrAndExit(COMMAND_TLDR.capture, jsonMode);
  }

  // ... rest of command logic
}
```

### 4. Root-Level TLDR (in main entry point)

```typescript
// src/index.ts - before CLI framework runs
const tldrIndex = rawArgs.findIndex((arg) => arg === '--tldr' || arg.startsWith('--tldr='));
if (tldrIndex !== -1 && tldrIndex === 0) {
  const tldrArg = rawArgs[tldrIndex];
  const jsonMode = tldrArg === '--tldr=json';
  const globalTldr = getGlobalTldr(getVersion());
  emitTldrAndExit(globalTldr, jsonMode);
}
```

## Integration with Clerc

Forest uses the [Clerc](https://github.com/chneau/clerc) CLI framework. Key integration points:

1. **Command registration**: Each command exports a factory function
2. **Flag handling**: TLDR flag added to every command's flags object
3. **Early exit**: TLDR check happens before `try/catch` business logic
4. **Type safety**: TypeScript ensures metadata completeness

## Full Forest Source

- **Main repo**: https://github.com/your-org/forest
- **TLDR implementation**: `src/cli/tldr.ts` (this file)
- **Command examples**: `src/cli/commands/*.ts`
- **Entry point**: `src/index.ts`

## Key Learnings

### What Worked Well

1. **Centralized registry**: Single `COMMAND_TLDR` object makes maintenance easy
2. **Type safety**: TypeScript caught missing fields during development
3. **Early exit pattern**: Checking TLDR before business logic prevents side effects
4. **Dual format**: JSON mode helps with debugging and validation

### Gotchas

1. **Parameter-required commands**: Need dummy parameter to access TLDR
   - `forest node read --tldr` fails (missing ID param)
   - `forest node read <id> --tldr` works
   - Solution: Document this, or make params optional when --tldr present

2. **Built-in commands**: Framework commands (help, completions) don't have TLDR
   - Listed in global index but can't be accessed
   - Solution: Filter them out or add TLDR support to framework

3. **Dotted command names**: Convention needed for namespacing
   - List as: `node.read` in COMMANDS
   - Invoke as: `node read` (space, not dot)
   - Solution: Document clearly in spec

## Usage Examples

```bash
# Global discovery
$ forest --tldr
NAME: forest
VERSION: 0.2.0
COMMANDS: capture,explore,search,node.read,node.edit,...

# Per-command TLDR (ASCII)
$ forest capture --tldr
CMD: capture
PURPOSE: Create a new note and optionally auto-link into the graph
FLAGS: --title=STR|note title;--stdin=BOOL=false|read from stdin
...

# Per-command TLDR (JSON)
$ forest search --tldr=json
{
  "CMD": "search",
  "PURPOSE": "Semantic search using embeddings",
  ...
}

# Subcommands work too
$ forest edges propose --tldr
CMD: edges.propose
...
```

## Adapting to Other Frameworks

This implementation uses Clerc, but the pattern works with any CLI framework:

### Commander.js
```javascript
program
  .command('capture')
  .option('--tldr [format]', 'TLDR metadata')
  .action((options) => {
    if (options.tldr !== undefined) {
      emitTldr(TLDR.capture, options.tldr === 'json');
      process.exit(0);
    }
    // ... command logic
  });
```

### Click (Python)
```python
@click.command()
@click.option('--tldr', is_flag=True)
def capture(tldr):
    if tldr:
        print(format_tldr(TLDR['capture']))
        sys.exit(0)
    # ... command logic
```

### Cobra (Go)
```go
cmd := &cobra.Command{
    Use: "capture",
    Run: func(cmd *cobra.Command, args []string) {
        if tldr, _ := cmd.Flags().GetBool("tldr"); tldr {
            fmt.Println(FormatTLDR(TLDR["capture"]))
            os.Exit(0)
        }
        // ... command logic
    },
}
cmd.Flags().Bool("tldr", false, "TLDR metadata")
```

## Validation

Validate the implementation using the generators:

```bash
# From tldr-agent-spec root
./scripts/tldr-doc-gen.sh forest --validate
node scripts/tldr-doc-gen.js forest --validate
python3 scripts/tldr-doc-gen.py forest --validate
```

All three should report Forest as TLDR v0.1 compliant.

## Questions?

- **Spec questions**: See `docs/spec-v0.1.md`
- **Implementation help**: Review this `tldr.ts` file
- **Generator usage**: See `scripts/README.md`
- **Forest-specific questions**: https://github.com/your-org/forest
