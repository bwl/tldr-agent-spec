#!/usr/bin/env bash
#
# tldr-doc-gen.sh - Universal TLDR v0.2 Documentation Generator
#
# Generates comprehensive documentation for any CLI implementing the TLDR v0.2 standard.
#
# Usage:
#   ./tldr-doc-gen.sh <cli-command> [--validate]
#
# Examples:
#   ./tldr-doc-gen.sh forest
#   ./tldr-doc-gen.sh forest --validate
#   ./tldr-doc-gen.sh git --validate  # (if git implemented TLDR)
#
# Output:
#   <cli>_tldr.txt - Complete human-readable documentation
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLI="${1:-}"
VALIDATE_ONLY=false

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <cli-command> [--validate]"
  echo ""
  echo "Examples:"
  echo "  $0 forest"
  echo "  $0 forest --validate"
  exit 1
fi

if [[ "$#" -ge 2 ]] && [[ "$2" == "--validate" ]]; then
  VALIDATE_ONLY=true
fi

# Check if CLI is available
if ! command -v "$CLI" &> /dev/null; then
  echo -e "${RED}✖ Error: '$CLI' command not found${NC}"
  exit 1
fi

# Output file
OUTPUT="${CLI}_tldr.txt"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Validation counters
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

log_error() {
  echo -e "${RED}✖ $1${NC}" >&2
  ((VALIDATION_ERRORS++))
}

log_warning() {
  echo -e "${YELLOW}⚠ $1${NC}" >&2
  ((VALIDATION_WARNINGS++))
}

log_success() {
  echo -e "${GREEN}✔ $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# JSON parsing helper (using grep/sed for zero dependencies)
json_value() {
  local json="$1"
  local key="$2"
  # Simple JSON string extraction (handles basic cases)
  echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed -E "s/\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]*)\"/\1/"
}

json_array_value() {
  local json="$1"
  local key="$2"
  # Extract array from JSON (returns everything between [ and ])
  echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*\[[^]]*\]" | sed -E "s/\"$key\"[[:space:]]*:[[:space:]]*\[(.*)\]/\1/"
}

# Fetch TLDR output
log_info "Fetching TLDR output from '$CLI --tldr'..."
if ! TLDR_OUTPUT=$($CLI --tldr 2>&1); then
  log_error "Failed to fetch TLDR output"
  exit 1
fi

# Save to temp file for processing
echo "$TLDR_OUTPUT" > "$TEMP_DIR/tldr_raw.txt"

# Parse header lines
TOOL_DELIMITER=$(head -n 1 "$TEMP_DIR/tldr_raw.txt")
META_LINE=$(sed -n '2p' "$TEMP_DIR/tldr_raw.txt")

# Validate tool delimiter
if [[ ! "$TOOL_DELIMITER" =~ ^---\ tool:\ .+\ ---$ ]]; then
  log_error "Invalid tool delimiter (expected '--- tool: <name> ---'): $TOOL_DELIMITER"
  exit 1
fi

TOOL_NAME=$(echo "$TOOL_DELIMITER" | sed -E 's/^---[[:space:]]+tool:[[:space:]]+(.+)[[:space:]]+---$/\1/')
log_success "Tool: $TOOL_NAME"

# Validate metadata line
if [[ ! "$META_LINE" =~ ^#\ meta: ]]; then
  log_error "Invalid metadata line (expected '# meta: ...'): $META_LINE"
  exit 1
fi

# Extract metadata fields
TOOL_META=$(echo "$META_LINE" | sed 's/^# meta:[[:space:]]*//')
TOOL_VERSION=$(echo "$TOOL_META" | grep -o "version=[^,]*" | cut -d= -f2)
KEYMAP=$(echo "$TOOL_META" | grep -o "keymap={[^}]*}" | sed 's/keymap=//')

if [[ -z "$TOOL_VERSION" ]]; then
  log_error "Metadata missing 'version' field"
fi
if [[ -z "$KEYMAP" ]]; then
  log_error "Metadata missing 'keymap' field"
fi

log_success "Version: $TOOL_VERSION"
log_info "Keymap: $KEYMAP"

# Extract command lines (skip first 2 lines: delimiter and metadata)
tail -n +3 "$TEMP_DIR/tldr_raw.txt" > "$TEMP_DIR/commands.ndjson"

# Count commands
TOTAL_COMMANDS=$(wc -l < "$TEMP_DIR/commands.ndjson" | xargs)

if [[ $TOTAL_COMMANDS -eq 0 ]]; then
  log_error "No commands found in TLDR output"
  exit 1
fi

log_info "Found $TOTAL_COMMANDS commands"

# Validation mode: check all command records
if $VALIDATE_ONLY; then
  log_info "Running validation checks..."

  VALID_COMMANDS=0
  INVALID_COMMANDS=0

  while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Validate JSON syntax (basic check)
    if ! echo "$line" | grep -q "^{.*}$"; then
      log_error "Invalid JSON syntax: $line"
      ((INVALID_COMMANDS++))
      continue
    fi

    # Extract cmd and p fields (using our helper)
    CMD_NAME=$(json_value "$line" "cmd")
    PURPOSE=$(json_value "$line" "p")

    if [[ -z "$CMD_NAME" ]]; then
      log_warning "Command missing 'cmd' field: $line"
      ((INVALID_COMMANDS++))
      continue
    fi

    if [[ -z "$PURPOSE" ]]; then
      log_warning "Command '$CMD_NAME' missing 'p' (purpose) field"
    fi

    ((VALID_COMMANDS++))

  done < "$TEMP_DIR/commands.ndjson"

  echo ""
  echo "════════════════════════════════════════"
  echo "VALIDATION SUMMARY"
  echo "════════════════════════════════════════"
  log_info "CLI: $TOOL_NAME v$TOOL_VERSION"
  log_info "Total commands: $TOTAL_COMMANDS"
  log_success "Valid commands: $VALID_COMMANDS"

  if [[ $INVALID_COMMANDS -gt 0 ]]; then
    log_error "Invalid commands: $INVALID_COMMANDS"
  fi

  if [[ $VALIDATION_ERRORS -gt 0 ]]; then
    log_error "Validation errors: $VALIDATION_ERRORS"
  fi

  if [[ $VALIDATION_WARNINGS -gt 0 ]]; then
    log_warning "Validation warnings: $VALIDATION_WARNINGS"
  fi

  echo ""
  if [[ $VALIDATION_ERRORS -eq 0 ]] && [[ $INVALID_COMMANDS -eq 0 ]]; then
    log_success "$TOOL_NAME is TLDR v0.2 compliant ✨"
    exit 0
  else
    log_error "$TOOL_NAME has validation failures"
    exit 1
  fi
fi

# Documentation generation mode
log_info "Generating documentation to $OUTPUT..."

{
  # Header
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo "  $TOOL_NAME v$TOOL_VERSION - Complete TLDR Documentation"
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo ""
  echo "  Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "  TLDR Spec: v0.2"
  echo "  Commands: $TOTAL_COMMANDS total"
  echo ""
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo ""

  # Raw TLDR output
  echo "RAW TLDR OUTPUT (NDJSON FORMAT)"
  echo "────────────────────────────────────────────────────────────────────────────────"
  cat "$TEMP_DIR/tldr_raw.txt"
  echo ""
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo ""

  # Command index
  echo "COMMAND INDEX"
  echo "────────────────────────────────────────────────────────────────────────────────"
  echo ""

  declare -A CATEGORIES
  TOP_LEVEL=()

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue

    CMD_NAME=$(json_value "$line" "cmd")
    PURPOSE=$(json_value "$line" "p")

    if [[ "$CMD_NAME" == *.* ]]; then
      # Namespaced command (e.g., "node.read")
      prefix=$(echo "$CMD_NAME" | cut -d. -f1)
      CATEGORIES[$prefix]+="$CMD_NAME|$PURPOSE;"
    else
      # Top-level command
      TOP_LEVEL+=("$CMD_NAME|$PURPOSE")
    fi
  done < "$TEMP_DIR/commands.ndjson"

  if [[ ${#TOP_LEVEL[@]} -gt 0 ]]; then
    echo "[Top-Level Commands]"
    for item in "${TOP_LEVEL[@]}"; do
      cmd=$(echo "$item" | cut -d'|' -f1)
      purpose=$(echo "$item" | cut -d'|' -f2)
      printf "  %-20s  %s\n" "$cmd" "$purpose"
    done
    echo ""
  fi

  for category in $(printf '%s\n' "${!CATEGORIES[@]}" | sort); do
    echo "[${category^} Commands]"
    IFS=';' read -ra ITEMS <<< "${CATEGORIES[$category]}"
    for item in "${ITEMS[@]}"; do
      [[ -z "$item" ]] && continue
      cmd=$(echo "$item" | cut -d'|' -f1)
      purpose=$(echo "$item" | cut -d'|' -f2)
      printf "  %-20s  %s\n" "$cmd" "$purpose"
    done
    echo ""
  done

  echo "════════════════════════════════════════════════════════════════════════════════"
  echo ""

  # Command details (pretty-printed JSON)
  echo "COMMAND DETAILS (FORMATTED)"
  echo "════════════════════════════════════════════════════════════════════════════════"

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue

    CMD_NAME=$(json_value "$line" "cmd")

    echo ""
    echo ">>> $CMD_NAME <<<"
    echo "────────────────────────────────────────────────────────────────────────────────"

    # Pretty-print JSON (basic indentation)
    echo "$line" | sed 's/,"/,\n  "/g' | sed 's/^{/{  /' | sed 's/}$/  }/'

    echo ""
  done < "$TEMP_DIR/commands.ndjson"

  # Footer
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo "  End of $TOOL_NAME TLDR Documentation"
  echo "  Generated by: tldr-doc-gen.sh (TLDR v0.2 Universal Generator)"
  echo "════════════════════════════════════════════════════════════════════════════════"

} > "$OUTPUT"

log_success "Documentation generated: $OUTPUT"

# Show file size
FILE_SIZE=$(wc -c < "$OUTPUT" | xargs)
FILE_SIZE_KB=$((FILE_SIZE / 1024))
log_info "File size: ${FILE_SIZE_KB}KB ($FILE_SIZE bytes)"

# Show line count
LINE_COUNT=$(wc -l < "$OUTPUT" | xargs)
log_info "Line count: $LINE_COUNT lines"

echo ""
log_success "Done! View with: cat $OUTPUT"
