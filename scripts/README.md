# TLDR Documentation Generator Scripts

Three implementations of a universal TLDR v0.2 documentation generator, each with different strengths and output formats.

## Overview

All scripts work with **any** CLI that implements the TLDR v0.2 standard. They validate NDJSON format compliance, generate documentation, and analyze command structures.

## Scripts

### 1. `tldr-doc-gen.sh` (Bash)
**Focus**: Simple, portable, human-readable output

**Output**:
- `<cli>_tldr.txt` - Complete ASCII documentation

**Usage**:
```bash
./tldr-doc-gen.sh forest
./tldr-doc-gen.sh forest --validate
```

**Features**:
- ☑ Comprehensive validation with colored output
- ☑ Command categorization by namespace
- ☑ Single text file output
- ☑ No dependencies (pure bash)
- ☑ Works on any UNIX-like system

---

### 2. `tldr-doc-gen.js` (Node.js)
**Focus**: Multi-format output, dependency analysis, developer-friendly

**Output**:
- `<cli>_tldr.txt` - Human-readable ASCII
- `<cli>_tldr.md` - Markdown with auto-generated TOC
- `<cli>_tldr.json` - Structured JSON with embedded analytics

**Usage**:
```bash
./tldr-doc-gen.js forest
./tldr-doc-gen.js forest --validate
node tldr-doc-gen.js forest  # Alternative
```

**Features**:
- ☑ Three output formats (TXT, MD, JSON)
- ☑ Dependency graph analysis (from RELATED fields)
- ☑ Command categorization by namespace
- ☑ Flag type distribution analysis
- ☑ Markdown with clickable TOC
- ☑ Structured JSON for programmatic access
- ☑ Detailed validation with error reporting

**Example outputs**:
- `forest_tldr.txt` - 13KB ASCII documentation
- `forest_tldr.md` - 13KB Markdown with navigation
- `forest_tldr.json` - 32KB structured data with analytics

---

### 3. `tldr-doc-gen.py` (Python)
**Focus**: Data analysis, statistics, visual reporting

**Output**:
- `<cli>_tldr_analytics.json` - Structured JSON with embedded analytics
- `<cli>_tldr_report.html` - Optional visual HTML report

**Usage**:
```bash
./tldr-doc-gen.py forest
./tldr-doc-gen.py forest --validate
./tldr-doc-gen.py forest --analyze  # Print analytics to console
./tldr-doc-gen.py forest --html     # Generate HTML report
```

**Features**:
- ☑ Advanced analytics and metrics
- ☑ Coverage analysis (commands with examples, schemas, etc.)
- ☑ Flag type distribution
- ☑ Command hierarchy visualization
- ☑ Dependency graph with centrality calculation
- ☑ Beautiful HTML report with charts and metrics
- ☑ Console analytics mode for quick insights
- ☑ Python-native for data science workflows

**Analytics includes**:
- Total commands and namespace distribution
- Flag type distribution and averages
- Coverage metrics (% with examples, schemas, etc.)
- Most connected commands (centrality analysis)
- Dependency graph (incoming/outgoing edges)

**Example outputs**:
- `forest_tldr_analytics.json` - 23KB JSON with analytics
- `forest_tldr_report.html` - 10KB visual report

---

## Comparison Table

| Feature | Bash | Node.js | Python |
|---------|------|---------|--------|
| Text output | ☑ | ☑ | ☐ |
| Markdown output | ☐ | ☑ | ☐ |
| JSON output | ☐ | ☑ | ☑ |
| HTML output | ☐ | ☐ | ☑ |
| Validation | ☑ | ☑ | ☑ |
| Dependency graph | ☐ | ☑ | ☑ |
| Flag analysis | ☐ | ☑ | ☑ |
| Coverage metrics | ☐ | ☐ | ☑ |
| Analytics console | ☐ | ☐ | ☑ |
| No dependencies | ☑ | ☐ | ☐ |
| Cross-platform | ☑ | ☑ | ☑ |

## Choosing a Script

**Use `tldr-doc-gen.sh` when**:
- You want simple, portable, human-readable output
- You need to work in environments without Node.js/Python
- You're generating docs for manual reading

**Use `tldr-doc-gen.js` when**:
- You need multiple output formats (TXT, MD, JSON)
- You want structured data for programmatic access
- You're integrating with JavaScript/Node.js tools
- You want Markdown with navigation for wikis/docs sites

**Use `tldr-doc-gen.py` when**:
- You need advanced analytics and metrics
- You want visual HTML reports for stakeholders
- You're doing data analysis on CLI design
- You want to track documentation coverage
- You're integrating with Python data science workflows

## Examples

### Generate all formats
```bash
# Bash: Human-readable text only
./tldr-doc-gen.sh forest

# Node.js: Text, Markdown, and JSON
./tldr-doc-gen.js forest

# Python: JSON analytics and HTML report
./tldr-doc-gen.py forest --html
```

### Validation
```bash
# All scripts support validation
./tldr-doc-gen.sh forest --validate
./tldr-doc-gen.js forest --validate
./tldr-doc-gen.py forest --validate
```

### Analytics
```bash
# Python: Print analytics to console
./tldr-doc-gen.py forest --analyze

# Output:
# ==================================================
# ANALYTICS REPORT
# ==================================================
# 
# Total Commands: 18
# 
# Command Hierarchy:
#   top-level: 11 commands
#   edges: 3 commands
#   tags: 2 commands
#   export: 2 commands
# 
# Flag Type Distribution:
#   BOOL: 17
#   INT: 10
#   STR: 6
#   FLOAT: 3
#   FILE: 1
#   LIST: 1
# ...
```

## TLDR v0.2 Standard

All scripts work with any CLI implementing the TLDR v0.2 standard (NDJSON format):

**Single call** (`<cli> --tldr`):
```
--- tool: git ---
# meta: tool=git, version=2.46, keymap={cmd:command,p:purpose,in:inputs,out:outputs,...}
{"cmd":"init","p":"Create an empty repository","in":[],"out":[{"n":"repo_dir","t":"dir"}],...}
{"cmd":"clone","p":"Clone an existing repository","in":[{"n":"repo_url","t":"str","req":1}],...}
{"cmd":"commit","p":"Record staged changes","in":[{"n":"message","t":"str","req":1}],...}
{"cmd":"push","p":"Send commits to remote","in":[{"n":"remote","t":"str","d":"origin"}],...}
```

**Key features**:
- Tool delimiter: `--- tool: <name> ---`
- Metadata header: `# meta:` with tool name, version, and keymap
- Command records: One JSON object per line (NDJSON)
- Keymap: Defines field meanings (e.g., `cmd:command`, `p:purpose`)

See [docs/spec-v0.2.md](../docs/spec-v0.2.md) for complete specification.

## License

These scripts are part of the Forest project.
