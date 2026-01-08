# TLDR v0.2: CONSTRAINTS Field

## Problem
Agents can't distinguish what commands **can't** do. `edges.sweep` only works on suggestions—discoverable via error only.

## Solution
Add `CONSTRAINTS` field. Minimal tokens. Machine-parseable.

## Format

**ASCII:**
```
CONSTRAINTS: suggestions-only,no-undo,destructive
```

**JSON:**
```json
"CONSTRAINTS": ["suggestions-only", "no-undo", "destructive"]
```

## Vocabulary (Standard Codes)

**Scope:**
- `suggestions-only` - operates on pending edges only
- `accepted-only` - operates on accepted edges only
- `requires-existing` - target must exist
- `no-self-reference` - cannot link to self

**Persistence:**
- `no-undo` - irreversible
- `no-bulk-undo` - per-item undo only
- `destructive` - deletes data permanently

**State:**
- `requires-config` - needs env/config setup
- `requires-runtime=X` - specific runtime (bun, node, etc)
- `single-instance` - no concurrent runs
- `blocks-writes` - locks DB during execution

**Performance:**
- `slow-at-scale` - degrades with dataset size
- `blocking` - holds terminal/process

## Examples

```
CMD: edges.sweep
CONSTRAINTS: suggestions-only,no-bulk-undo

CMD: node.delete
CONSTRAINTS: no-undo,destructive

CMD: admin:recompute-embeddings
CONSTRAINTS: requires-config,blocks-writes,slow-at-scale

CMD: serve
CONSTRAINTS: requires-runtime=bun,single-instance,blocking

CMD: node.link
CONSTRAINTS: requires-existing,no-self-reference
```

## Rules
- Comma-separated
- Use standard codes (extensible vocab)
- Max 5 constraints per command
- Omit if none apply
- No free-form text

## Testing
Agent with CONSTRAINTS correctly rejected `edges.sweep` for accepted edges (without: suggested invalid command).
