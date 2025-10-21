#!/usr/bin/env python3
"""
tldr-doc-gen.py - Universal TLDR v0.2 Documentation Generator (Python)

Generates comprehensive documentation and analytics for any CLI implementing
the TLDR v0.2 standard. Focus on data analysis, statistics, and validation.

Usage:
    ./tldr-doc-gen.py <cli-command> [--validate|--analyze]

Examples:
    ./tldr-doc-gen.py forest
    ./tldr-doc-gen.py forest --validate
    ./tldr-doc-gen.py forest --analyze
    ./tldr-doc-gen.py git  # (if git implemented TLDR)

Output Files:
    <cli>_tldr_analytics.json - Structured data with embedded analytics

Features:
    - Statistics: flag type distribution, command hierarchy, coverage metrics
    - Validation suite with detailed error reporting
    - Analytics embedded in JSON output
    - Dependency graph analysis
    - Coverage and completeness metrics
"""

import subprocess
import json
import sys
import shutil
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

# ============================================================================
# Core Functions
# ============================================================================

def exec_command(cmd: List[str], allow_failure: bool = False) -> Optional[str]:
    """Execute shell command and return output."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        if allow_failure:
            return None
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{e.stderr}")
    except FileNotFoundError:
        if allow_failure:
            return None
        raise RuntimeError(f"Command not found: {cmd[0]}")


def is_command_available(cli: str) -> bool:
    """Check if CLI command is available."""
    return shutil.which(cli) is not None


def parse_tldr_output(output: str) -> Dict[str, Any]:
    """Parse TLDR v0.2 NDJSON output."""
    lines = output.strip().split('\n')

    if len(lines) < 2:
        raise ValueError("Invalid TLDR output: too few lines")

    # Parse tool delimiter
    tool_delimiter = lines[0]
    tool_match = re.match(r'^---\s+tool:\s+(.+)\s+---$', tool_delimiter)
    if not tool_match:
        raise ValueError(f"Invalid tool delimiter: {tool_delimiter}")
    tool_name = tool_match.group(1)

    # Parse metadata header
    meta_line = lines[1]
    if not meta_line.startswith('# meta:'):
        raise ValueError(f"Invalid metadata line: {meta_line}")

    meta_content = meta_line[7:].strip()
    version_match = re.search(r'version=([^,]+)', meta_content)
    keymap_match = re.search(r'keymap=(\{[^}]+\})', meta_content)

    if not version_match or not keymap_match:
        raise ValueError("Metadata missing version or keymap")

    version = version_match.group(1)
    keymap = json.loads(keymap_match.group(1))

    # Parse command records (skip first 2 lines)
    commands = []
    for i, line in enumerate(lines[2:], start=3):
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
            commands.append(cmd)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON on line {i}: {line}\n{e}")

    return {
        'tool_name': tool_name,
        'version': version,
        'keymap': keymap,
        'commands': commands,
        'raw_output': output
    }


def get_command_name(cmd: Dict[str, Any]) -> str:
    """Get command name from record."""
    return cmd.get('cmd') or cmd.get('command', '')


def get_purpose(cmd: Dict[str, Any]) -> str:
    """Get purpose from record."""
    return cmd.get('p') or cmd.get('purpose', '')


def get_related(cmd: Dict[str, Any]) -> List[str]:
    """Get related commands from record."""
    related = cmd.get('related', [])
    return related if isinstance(related, list) else []


# ============================================================================
# Validation
# ============================================================================

def validate_tldr_format(parsed: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Validate TLDR format. Returns (errors, warnings)."""
    errors = []
    warnings = []

    # Validate metadata
    if not parsed.get('tool_name'):
        errors.append('Missing tool name in delimiter')
    if not parsed.get('version'):
        errors.append('Missing version in metadata')
    if not parsed.get('keymap'):
        errors.append('Missing keymap in metadata')

    # Validate commands
    for i, cmd in enumerate(parsed.get('commands', []), start=1):
        cmd_name = get_command_name(cmd)
        purpose = get_purpose(cmd)

        if not cmd_name:
            errors.append(f'Command {i} missing "cmd" field')
        if not purpose:
            warnings.append(f'Command "{cmd_name or i}" missing "p" (purpose) field')

        # Validate JSON structure
        if not isinstance(cmd, dict):
            errors.append(f'Command {i} is not a valid object')

    return errors, warnings


# ============================================================================
# Analytics
# ============================================================================

def build_dependency_graph(commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build dependency graph from related fields."""
    graph = {}
    incoming_edges = defaultdict(list)

    for cmd in commands:
        cmd_name = get_command_name(cmd)
        related = get_related(cmd)
        graph[cmd_name] = related

        # Track incoming edges (reverse dependencies)
        for related_cmd in related:
            incoming_edges[related_cmd].append(cmd_name)

    # Calculate centrality (total edges)
    centrality = {}
    for cmd in commands:
        cmd_name = get_command_name(cmd)
        centrality[cmd_name] = (
            len(graph.get(cmd_name, [])) +
            len(incoming_edges.get(cmd_name, []))
        )

    return {
        'outgoing': graph,
        'incoming': dict(incoming_edges),
        'centrality': centrality
    }


def categorize_commands(commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Categorize commands by namespace."""
    categories = {
        'top_level': [],
        'namespaced': defaultdict(list)
    }

    for cmd in commands:
        name = get_command_name(cmd)
        if '.' in name:
            namespace = name.split('.')[0]
            categories['namespaced'][namespace].append(cmd)
        else:
            categories['top_level'].append(cmd)

    return {
        'top_level': categories['top_level'],
        'namespaced': dict(categories['namespaced'])
    }


def analyze_flag_types(commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze flag types distribution."""
    types = Counter()
    total_flags = 0

    for cmd in commands:
        flags = cmd.get('fl') or cmd.get('flags', [])
        total_flags += len(flags)

        for flag in flags:
            flag_type = flag.get('t') or flag.get('type', 'unknown')
            types[flag_type] += 1

    return {
        'distribution': dict(types),
        'total': total_flags,
        'average_per_command': round(total_flags / len(commands), 2) if commands else 0
    }


def analyze_side_effects(commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze side effects distribution."""
    effects = Counter()
    commands_with_effects = 0

    for cmd in commands:
        side_effects = cmd.get('effects') or cmd.get('side_effects', [])
        if side_effects:
            commands_with_effects += 1
            for effect in side_effects:
                effects[effect] += 1

    return {
        'distribution': dict(effects),
        'commands_with_effects': commands_with_effects,
        'commands_without_effects': len(commands) - commands_with_effects
    }


def analyze_inputs_outputs(commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze inputs and outputs patterns."""
    input_types = Counter()
    output_types = Counter()
    commands_with_inputs = 0
    commands_with_outputs = 0

    for cmd in commands:
        inputs = cmd.get('in') or cmd.get('inputs', [])
        outputs = cmd.get('out') or cmd.get('outputs', [])

        if inputs:
            commands_with_inputs += 1
            for inp in inputs:
                inp_type = inp.get('t') or inp.get('type', 'unknown')
                input_types[inp_type] += 1

        if outputs:
            commands_with_outputs += 1
            for out in outputs:
                out_type = out.get('t') or out.get('type', 'unknown')
                output_types[out_type] += 1

    return {
        'input_types': dict(input_types),
        'output_types': dict(output_types),
        'commands_with_inputs': commands_with_inputs,
        'commands_with_outputs': commands_with_outputs
    }


def calculate_coverage_metrics(commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate documentation coverage metrics."""
    total = len(commands)

    metrics = {
        'with_purpose': 0,
        'with_examples': 0,
        'with_inputs': 0,
        'with_outputs': 0,
        'with_flags': 0,
        'with_side_effects': 0,
        'with_related': 0
    }

    for cmd in commands:
        if get_purpose(cmd):
            metrics['with_purpose'] += 1
        if cmd.get('example') or cmd.get('examples'):
            metrics['with_examples'] += 1
        if cmd.get('in') or cmd.get('inputs'):
            metrics['with_inputs'] += 1
        if cmd.get('out') or cmd.get('outputs'):
            metrics['with_outputs'] += 1
        if cmd.get('fl') or cmd.get('flags'):
            metrics['with_flags'] += 1
        if cmd.get('effects') or cmd.get('side_effects'):
            metrics['with_side_effects'] += 1
        if get_related(cmd):
            metrics['with_related'] += 1

    # Calculate percentages
    percentages = {
        key: round((value / total) * 100, 1) if total > 0 else 0
        for key, value in metrics.items()
    }

    return {
        'counts': metrics,
        'percentages': percentages,
        'total_commands': total
    }


# ============================================================================
# Output Generation
# ============================================================================

def generate_analytics_json(parsed: Dict[str, Any]) -> str:
    """Generate comprehensive analytics JSON."""
    commands = parsed['commands']

    graph = build_dependency_graph(commands)
    categories = categorize_commands(commands)
    flag_analysis = analyze_flag_types(commands)
    side_effect_analysis = analyze_side_effects(commands)
    io_analysis = analyze_inputs_outputs(commands)
    coverage = calculate_coverage_metrics(commands)

    # Most connected commands
    most_connected = sorted(
        graph['centrality'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]

    data = {
        'metadata': {
            'name': parsed['tool_name'],
            'version': parsed['version'],
            'generated': datetime.now(timezone.utc).isoformat(),
            'tldr_spec': 'v0.2',
            'total_commands': len(commands),
            'keymap': parsed['keymap']
        },
        'commands': [
            {
                **cmd,
                '_name': get_command_name(cmd),
                '_purpose': get_purpose(cmd),
                '_related': get_related(cmd)
            }
            for cmd in commands
        ],
        'analytics': {
            'categories': {
                'top_level': [get_command_name(c) for c in categories['top_level']],
                'namespaced': {
                    ns: [get_command_name(c) for c in cmds]
                    for ns, cmds in categories['namespaced'].items()
                }
            },
            'flag_types': flag_analysis,
            'side_effects': side_effect_analysis,
            'inputs_outputs': io_analysis,
            'coverage': coverage,
            'dependency_graph': {
                'outgoing': graph['outgoing'],
                'incoming': graph['incoming'],
                'centrality': graph['centrality'],
                'most_connected': [
                    {
                        'command': cmd,
                        'centrality': cent,
                        'outgoing': len(graph['outgoing'].get(cmd, [])),
                        'incoming': len(graph['incoming'].get(cmd, []))
                    }
                    for cmd, cent in most_connected if cent > 0
                ]
            }
        },
        'generated_by': 'tldr-doc-gen.py (TLDR v0.2 Universal Generator)'
    }

    return json.dumps(data, indent=2, ensure_ascii=False)


def print_console_analytics(parsed: Dict[str, Any]) -> None:
    """Print analytics to console."""
    commands = parsed['commands']

    print()
    print("=" * 60)
    print("TLDR v0.2 ANALYTICS")
    print("=" * 60)
    print()

    print(f"Tool: {parsed['tool_name']} v{parsed['version']}")
    print(f"Total Commands: {len(commands)}")
    print()

    # Categories
    categories = categorize_commands(commands)
    print("Command Distribution:")
    print(f"  Top-level: {len(categories['top_level'])}")
    print(f"  Namespaces: {len(categories['namespaced'])}")
    for ns, cmds in sorted(categories['namespaced'].items(), key=lambda x: len(x[1]), reverse=True):
        print(f"    {ns}: {len(cmds)} commands")
    print()

    # Coverage
    coverage = calculate_coverage_metrics(commands)
    print("Documentation Coverage:")
    for key, pct in coverage['percentages'].items():
        label = key.replace('_', ' ').title()
        print(f"  {label}: {pct}%")
    print()

    # Flag types
    flag_analysis = analyze_flag_types(commands)
    if flag_analysis['total'] > 0:
        print("Flag Type Distribution:")
        for flag_type, count in sorted(flag_analysis['distribution'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {flag_type}: {count}")
        print(f"  Average per command: {flag_analysis['average_per_command']}")
        print()

    # Side effects
    side_effect_analysis = analyze_side_effects(commands)
    if side_effect_analysis['commands_with_effects'] > 0:
        print("Side Effects Distribution:")
        for effect, count in sorted(side_effect_analysis['distribution'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {effect}: {count}")
        print(f"  Commands with side effects: {side_effect_analysis['commands_with_effects']}")
        print(f"  Commands without side effects: {side_effect_analysis['commands_without_effects']}")
        print()

    # Dependency graph
    graph = build_dependency_graph(commands)
    most_connected = sorted(
        graph['centrality'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    if any(cent > 0 for _, cent in most_connected):
        print("Most Connected Commands:")
        for cmd, cent in most_connected:
            if cent > 0:
                out = len(graph['outgoing'].get(cmd, []))
                inc = len(graph['incoming'].get(cmd, []))
                print(f"  {cmd}: {cent} connections ({out} outgoing, {inc} incoming)")

    print()
    print("=" * 60)


# ============================================================================
# Main
# ============================================================================

def main():
    if len(sys.argv) < 2:
        print("Usage: tldr-doc-gen.py <cli-command> [--validate|--analyze]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Examples:", file=sys.stderr)
        print("  tldr-doc-gen.py forest", file=sys.stderr)
        print("  tldr-doc-gen.py forest --validate", file=sys.stderr)
        print("  tldr-doc-gen.py forest --analyze", file=sys.stderr)
        sys.exit(1)

    cli = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else None

    # Check if CLI is available
    if not is_command_available(cli):
        print(f"✖ Error: '{cli}' command not found", file=sys.stderr)
        sys.exit(1)

    print(f"ℹ Fetching TLDR output from '{cli} --tldr'...")

    # Fetch TLDR output
    try:
        tldr_output = exec_command([cli, '--tldr'])
    except RuntimeError as e:
        print(f"✖ Failed to fetch TLDR output", file=sys.stderr)
        print(str(e), file=sys.stderr)
        sys.exit(1)

    # Parse TLDR output
    try:
        parsed = parse_tldr_output(tldr_output)
    except (ValueError, json.JSONDecodeError) as e:
        print(f"✖ Failed to parse TLDR output", file=sys.stderr)
        print(str(e), file=sys.stderr)
        sys.exit(1)

    print(f"✔ Tool: {parsed['tool_name']} v{parsed['version']}")
    print(f"ℹ Found {len(parsed['commands'])} commands")

    # Validation mode
    if mode == '--validate':
        print("ℹ Running validation checks...\n")

        errors, warnings = validate_tldr_format(parsed)

        if errors:
            print("✖ Validation errors:")
            for err in errors:
                print(f"  - {err}")

        if warnings:
            print("⚠ Validation warnings:")
            for warn in warnings:
                print(f"  - {warn}")

        # Validation summary
        print()
        print("=" * 40)
        print("VALIDATION SUMMARY")
        print("=" * 40)
        print(f"ℹ CLI: {parsed['tool_name']} v{parsed['version']}")
        print(f"ℹ Total commands: {len(parsed['commands'])}")

        if errors:
            print(f"✖ Validation errors: {len(errors)}")

        if warnings:
            print(f"⚠ Validation warnings: {len(warnings)}")

        print()
        if not errors:
            print(f"✔ {parsed['tool_name']} is TLDR v0.2 compliant ✨")
            sys.exit(0)
        else:
            print(f"✖ {parsed['tool_name']} has validation failures")
            sys.exit(1)

    # Analyze mode
    if mode == '--analyze':
        print_console_analytics(parsed)
        sys.exit(0)

    # Documentation generation mode
    print("ℹ Generating analytics JSON...")

    output_file = f"{cli}_tldr_analytics.json"
    analytics_json = generate_analytics_json(parsed)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(analytics_json)

    print(f"✔ Generated: {output_file}")

    # Show file size
    import os
    file_size = os.path.getsize(output_file)
    file_size_kb = file_size // 1024
    print(f"ℹ File size: {file_size_kb}KB ({file_size} bytes)")

    print()
    print("✔ Done! Analytics generated.")
    print(f"   Run with --analyze flag to see console analytics")


if __name__ == '__main__':
    main()
