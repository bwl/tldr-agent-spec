#!/usr/bin/env node
/**
 * tldr-doc-gen.js - Universal TLDR v0.2 Documentation Generator (Node.js)
 *
 * Generates comprehensive documentation for any CLI implementing the TLDR v0.2 standard.
 * Produces multiple output formats with advanced validation and dependency analysis.
 *
 * Usage:
 *   ./tldr-doc-gen.js <cli-command> [--validate|--analyze]
 *
 * Examples:
 *   ./tldr-doc-gen.js forest
 *   ./tldr-doc-gen.js forest --validate
 *   ./tldr-doc-gen.js forest --analyze
 *   ./tldr-doc-gen.js git  # (if git implemented TLDR)
 *
 * Output Files:
 *   <cli>_tldr.txt - Human-readable ASCII documentation
 *   <cli>_tldr.md - Markdown with auto-generated TOC
 *   <cli>_tldr.json - Structured JSON with analytics
 *
 * Features:
 *   - Validates NDJSON format and keymap compliance
 *   - Analyzes dependency graph from related fields
 *   - Categorizes commands by namespace
 *   - Advanced validation with detailed error reporting
 *   - Multiple output formats for different use cases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute shell command and return output
 */
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if CLI command is available
 */
function isCommandAvailable(cli) {
  try {
    exec(`command -v ${cli}`, { shell: '/bin/bash' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse TLDR v0.2 NDJSON output
 */
function parseTldrOutput(output) {
  const lines = output.split('\n');

  if (lines.length < 2) {
    throw new Error('Invalid TLDR output: too few lines');
  }

  // Parse tool delimiter
  const toolDelimiter = lines[0];
  const toolMatch = toolDelimiter.match(/^---\s+tool:\s+(.+)\s+---$/);
  if (!toolMatch) {
    throw new Error(`Invalid tool delimiter: ${toolDelimiter}`);
  }
  const toolName = toolMatch[1];

  // Parse metadata header
  const metaLine = lines[1];
  if (!metaLine.startsWith('# meta:')) {
    throw new Error(`Invalid metadata line: ${metaLine}`);
  }

  const metaContent = metaLine.substring(7).trim(); // Remove '# meta:'
  const versionMatch = metaContent.match(/version=([^,]+)/);
  const keymapMatch = metaContent.match(/keymap=(\{[^}]+\})/);

  if (!versionMatch || !keymapMatch) {
    throw new Error('Metadata missing version or keymap');
  }

  const version = versionMatch[1];
  const keymap = JSON.parse(keymapMatch[1]);

  // Parse command records (skip first 2 lines)
  const commands = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    try {
      const cmd = JSON.parse(line);
      commands.push(cmd);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${i + 1}: ${line}`);
    }
  }

  return {
    toolName,
    version,
    keymap,
    commands,
    rawOutput: output
  };
}

/**
 * Resolve field name using keymap
 */
function resolveField(record, shortKey, keymap) {
  // Return the value directly since NDJSON uses short keys
  return record[shortKey];
}

/**
 * Get command name from record
 */
function getCommandName(record) {
  return record.cmd || record.command;
}

/**
 * Get purpose from record
 */
function getPurpose(record) {
  return record.p || record.purpose;
}

/**
 * Get related commands from record
 */
function getRelated(record) {
  const related = record.related || [];
  return Array.isArray(related) ? related : [];
}

/**
 * Validate TLDR format
 */
function validateTldrFormat(parsed) {
  const errors = [];
  const warnings = [];

  // Validate metadata
  if (!parsed.toolName) {
    errors.push('Missing tool name in delimiter');
  }
  if (!parsed.version) {
    errors.push('Missing version in metadata');
  }
  if (!parsed.keymap) {
    errors.push('Missing keymap in metadata');
  }

  // Validate commands
  for (let i = 0; i < parsed.commands.length; i++) {
    const cmd = parsed.commands[i];
    const cmdName = getCommandName(cmd);
    const purpose = getPurpose(cmd);

    if (!cmdName) {
      errors.push(`Command ${i + 1} missing 'cmd' field`);
    }
    if (!purpose) {
      warnings.push(`Command '${cmdName || i + 1}' missing 'p' (purpose) field`);
    }

    // Validate JSON structure
    if (typeof cmd !== 'object') {
      errors.push(`Command ${i + 1} is not a valid object`);
    }
  }

  return { errors, warnings };
}

/**
 * Build dependency graph from related fields
 */
function buildDependencyGraph(commands) {
  const graph = {};
  const incomingEdges = {};

  for (const cmd of commands) {
    const cmdName = getCommandName(cmd);
    const related = getRelated(cmd);
    graph[cmdName] = related;

    // Track incoming edges (reverse dependencies)
    for (const relatedCmd of related) {
      if (!incomingEdges[relatedCmd]) {
        incomingEdges[relatedCmd] = [];
      }
      incomingEdges[relatedCmd].push(cmdName);
    }
  }

  return {
    outgoing: graph,
    incoming: incomingEdges,
    // Calculate centrality (total edges)
    centrality: Object.fromEntries(
      commands.map(cmd => {
        const name = getCommandName(cmd);
        return [
          name,
          (graph[name] || []).length + (incomingEdges[name] || []).length
        ];
      })
    )
  };
}

/**
 * Categorize commands by namespace
 */
function categorizeCommands(commands) {
  const categories = {
    'top-level': [],
    namespaced: {}
  };

  for (const cmd of commands) {
    const name = getCommandName(cmd);
    if (name.includes('.')) {
      const [namespace] = name.split('.');
      if (!categories.namespaced[namespace]) {
        categories.namespaced[namespace] = [];
      }
      categories.namespaced[namespace].push(cmd);
    } else {
      categories['top-level'].push(cmd);
    }
  }

  return categories;
}

/**
 * Analyze flag types distribution
 */
function analyzeFlagTypes(commands) {
  const types = {};
  let totalFlags = 0;

  for (const cmd of commands) {
    const flags = cmd.fl || cmd.flags || [];
    totalFlags += flags.length;

    for (const flag of flags) {
      const type = flag.t || flag.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    }
  }

  return {
    distribution: types,
    total: totalFlags,
    averagePerCommand: commands.length > 0 ? (totalFlags / commands.length).toFixed(2) : 0
  };
}

/**
 * Analyze side effects distribution
 */
function analyzeSideEffects(commands) {
  const effects = {};
  let totalCommands = 0;

  for (const cmd of commands) {
    const sideEffects = cmd.effects || cmd.side_effects || [];
    if (sideEffects.length > 0) {
      totalCommands++;
      for (const effect of sideEffects) {
        effects[effect] = (effects[effect] || 0) + 1;
      }
    }
  }

  return {
    distribution: effects,
    commandsWithEffects: totalCommands,
    commandsWithoutEffects: commands.length - totalCommands
  };
}

/**
 * Generate Markdown documentation with TOC
 */
function generateMarkdownDocs(parsed) {
  const lines = [];

  // Header
  lines.push(`# ${parsed.toolName} v${parsed.version} - TLDR Documentation\n`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**TLDR Spec:** v0.2`);
  lines.push(`**Commands:** ${parsed.commands.length} total\n`);
  lines.push('---\n');

  // Table of Contents
  lines.push('## Table of Contents\n');
  lines.push('- [Metadata](#metadata)');
  lines.push('- [Command Categories](#command-categories)');
  lines.push('- [Command Details](#command-details)');

  const categories = categorizeCommands(parsed.commands);
  if (categories['top-level'].length > 0) {
    lines.push('  - [Top-Level Commands](#top-level-commands)');
  }
  for (const namespace of Object.keys(categories.namespaced).sort()) {
    lines.push(`  - [${namespace} Commands](#${namespace}-commands)`);
  }

  lines.push('- [Dependency Graph](#dependency-graph)');
  lines.push('- [Analytics](#analytics)\n');
  lines.push('---\n');

  // Metadata
  lines.push('## Metadata\n');
  lines.push(`**Tool:** ${parsed.toolName}`);
  lines.push(`**Version:** ${parsed.version}`);
  lines.push(`**Keymap:**`);
  lines.push('```json');
  lines.push(JSON.stringify(parsed.keymap, null, 2));
  lines.push('```\n');

  // Command Categories
  lines.push('## Command Categories\n');

  if (categories['top-level'].length > 0) {
    lines.push('### Top-Level Commands\n');
    for (const cmd of categories['top-level'].sort((a, b) => getCommandName(a).localeCompare(getCommandName(b)))) {
      lines.push(`- **${getCommandName(cmd)}** - ${getPurpose(cmd)}`);
    }
    lines.push('');
  }

  for (const namespace of Object.keys(categories.namespaced).sort()) {
    lines.push(`### ${namespace} Commands\n`);
    for (const cmd of categories.namespaced[namespace].sort((a, b) => getCommandName(a).localeCompare(getCommandName(b)))) {
      lines.push(`- **${getCommandName(cmd)}** - ${getPurpose(cmd)}`);
    }
    lines.push('');
  }

  // Command Details
  lines.push('## Command Details\n');

  for (const cmd of parsed.commands) {
    const name = getCommandName(cmd);
    const purpose = getPurpose(cmd);
    lines.push(`### \`${name}\`\n`);
    lines.push(`**Purpose:** ${purpose}\n`);

    // Inputs
    if (cmd.in || cmd.inputs) {
      const inputs = cmd.in || cmd.inputs;
      lines.push('**Inputs:**\n');
      for (const input of inputs) {
        const req = input.req || input.required ? ' (required)' : '';
        const def = input.d || input.default ? ` (default: ${input.d || input.default})` : '';
        lines.push(`- \`${input.n || input.name}\` (${input.t || input.type}${req}${def})`);
      }
      lines.push('');
    }

    // Outputs
    if (cmd.out || cmd.outputs) {
      const outputs = cmd.out || cmd.outputs;
      lines.push('**Outputs:**\n');
      for (const output of outputs) {
        lines.push(`- \`${output.n || output.name}\` (${output.t || output.type})`);
      }
      lines.push('');
    }

    // Side Effects
    if (cmd.effects || cmd.side_effects) {
      const effects = cmd.effects || cmd.side_effects;
      lines.push(`**Side Effects:** ${effects.join(', ')}\n`);
    }

    // Flags
    if (cmd.fl || cmd.flags) {
      const flags = cmd.fl || cmd.flags;
      if (flags.length > 0) {
        lines.push('**Flags:**\n');
        for (const flag of flags) {
          const name = flag.n || flag.name;
          const type = flag.t || flag.type;
          const def = flag.d !== undefined ? ` (default: ${flag.d})` : '';
          const alias = flag.al || flag.alias ? ` (alias: ${flag.al || flag.alias})` : '';
          const desc = flag.desc || flag.description || '';
          lines.push(`- \`--${name}\` (${type}${def}${alias}) - ${desc}`);
        }
        lines.push('');
      }
    }

    // Examples
    if (cmd.example || cmd.examples) {
      const examples = cmd.example ? [cmd.example] : (cmd.examples || []);
      if (examples.length > 0) {
        lines.push('**Examples:**\n');
        for (const example of examples) {
          lines.push('```bash');
          lines.push(example);
          lines.push('```');
        }
        lines.push('');
      }
    }

    // Related
    const related = getRelated(cmd);
    if (related.length > 0) {
      lines.push(`**Related:** ${related.map(r => `\`${r}\``).join(', ')}\n`);
    }

    // Raw JSON
    lines.push('**Raw JSON:**\n');
    lines.push('```json');
    lines.push(JSON.stringify(cmd, null, 2));
    lines.push('```\n');

    lines.push('---\n');
  }

  // Dependency Graph
  lines.push('## Dependency Graph\n');
  const graph = buildDependencyGraph(parsed.commands);

  lines.push('### Most Connected Commands\n');
  const sortedByCentrality = Object.entries(graph.centrality)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [cmd, centrality] of sortedByCentrality) {
    if (centrality > 0) {
      const outgoing = (graph.outgoing[cmd] || []).length;
      const incoming = (graph.incoming[cmd] || []).length;
      lines.push(`- **${cmd}** (${centrality} connections: ${outgoing} outgoing, ${incoming} incoming)`);
    }
  }
  lines.push('');

  // Analytics
  lines.push('## Analytics\n');

  const flagAnalysis = analyzeFlagTypes(parsed.commands);
  lines.push('### Flag Type Distribution\n');
  for (const [type, count] of Object.entries(flagAnalysis.distribution).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${type}**: ${count} flags`);
  }
  lines.push(`\n**Total Flags:** ${flagAnalysis.total}`);
  lines.push(`**Average per Command:** ${flagAnalysis.averagePerCommand}\n`);

  const sideEffectAnalysis = analyzeSideEffects(parsed.commands);
  lines.push('### Side Effects Distribution\n');
  for (const [effect, count] of Object.entries(sideEffectAnalysis.distribution).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${effect}**: ${count} commands`);
  }
  lines.push(`\n**Commands with side effects:** ${sideEffectAnalysis.commandsWithEffects}`);
  lines.push(`**Commands without side effects:** ${sideEffectAnalysis.commandsWithoutEffects}\n`);

  const namespaceCount = Object.keys(categories.namespaced).length;
  lines.push('### Command Distribution\n');
  lines.push(`- **Top-level commands:** ${categories['top-level'].length}`);
  lines.push(`- **Namespaces:** ${namespaceCount}`);
  for (const [namespace, cmds] of Object.entries(categories.namespaced).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`  - **${namespace}:** ${cmds.length} commands`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate ASCII text documentation
 */
function generateTextDocs(parsed) {
  const lines = [];
  const width = 80;
  const hr = '='.repeat(width);
  const hr2 = '-'.repeat(width);

  // Header
  lines.push(hr);
  lines.push(`  ${parsed.toolName} v${parsed.version} - Complete TLDR Documentation`);
  lines.push(hr);
  lines.push('');
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push('  TLDR Spec: v0.2');
  lines.push(`  Commands: ${parsed.commands.length} total`);
  lines.push('');
  lines.push(hr);
  lines.push('');

  // Raw TLDR output
  lines.push('RAW TLDR OUTPUT (NDJSON FORMAT)');
  lines.push(hr2);
  lines.push(parsed.rawOutput);
  lines.push('');
  lines.push(hr);
  lines.push('');

  // Command Index
  lines.push('COMMAND INDEX');
  lines.push(hr2);

  const categories = categorizeCommands(parsed.commands);

  if (categories['top-level'].length > 0) {
    lines.push('');
    lines.push('[Top-Level Commands]');
    for (const cmd of categories['top-level'].sort((a, b) => getCommandName(a).localeCompare(getCommandName(b)))) {
      lines.push(`  ${getCommandName(cmd)}`);
    }
  }

  for (const namespace of Object.keys(categories.namespaced).sort()) {
    lines.push('');
    lines.push(`[${namespace.charAt(0).toUpperCase() + namespace.slice(1)} Commands]`);
    for (const cmd of categories.namespaced[namespace].sort((a, b) => getCommandName(a).localeCompare(getCommandName(b)))) {
      lines.push(`  ${getCommandName(cmd)}`);
    }
  }

  lines.push('');
  lines.push(hr);
  lines.push('');

  // Command Details
  lines.push('COMMAND DETAILS (FORMATTED)');
  lines.push(hr);

  for (const cmd of parsed.commands) {
    const name = getCommandName(cmd);
    lines.push('');
    lines.push(`>>> ${name} <<<`);
    lines.push(hr2);
    lines.push(JSON.stringify(cmd, null, 2));
    lines.push('');
  }

  // Footer
  lines.push(hr);
  lines.push(`  End of ${parsed.toolName} TLDR Documentation`);
  lines.push('  Generated by: tldr-doc-gen.js (TLDR v0.2 Universal Generator)');
  lines.push(hr);

  return lines.join('\n');
}

/**
 * Generate JSON output with analytics
 */
function generateJsonDocs(parsed) {
  const graph = buildDependencyGraph(parsed.commands);
  const categories = categorizeCommands(parsed.commands);
  const flagAnalysis = analyzeFlagTypes(parsed.commands);
  const sideEffectAnalysis = analyzeSideEffects(parsed.commands);

  return JSON.stringify({
    metadata: {
      name: parsed.toolName,
      version: parsed.version,
      generated: new Date().toISOString(),
      tldrSpec: 'v0.2',
      totalCommands: parsed.commands.length,
      keymap: parsed.keymap
    },
    commands: parsed.commands.map(cmd => ({
      ...cmd,
      // Add resolved names for convenience
      _name: getCommandName(cmd),
      _purpose: getPurpose(cmd),
      _related: getRelated(cmd)
    })),
    analytics: {
      categories: {
        topLevel: categories['top-level'].map(c => getCommandName(c)),
        namespaced: Object.fromEntries(
          Object.entries(categories.namespaced).map(([ns, cmds]) => [
            ns,
            cmds.map(c => getCommandName(c))
          ])
        )
      },
      flagTypes: flagAnalysis,
      sideEffects: sideEffectAnalysis,
      dependencyGraph: graph,
      mostConnectedCommands: Object.entries(graph.centrality)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cmd, centrality]) => ({
          command: cmd,
          centrality,
          outgoing: (graph.outgoing[cmd] || []).length,
          incoming: (graph.incoming[cmd] || []).length
        }))
    },
    generatedBy: 'tldr-doc-gen.js (TLDR v0.2 Universal Generator)'
  }, null, 2);
}

// ============================================================================
// Main Logic
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tldr-doc-gen.js <cli-command> [--validate|--analyze]');
    console.error('');
    console.error('Examples:');
    console.error('  tldr-doc-gen.js forest');
    console.error('  tldr-doc-gen.js forest --validate');
    console.error('  tldr-doc-gen.js forest --analyze');
    process.exit(1);
  }

  const cli = args[0];
  const mode = args[1];

  // Check if CLI is available
  if (!isCommandAvailable(cli)) {
    console.error(`✖ Error: '${cli}' command not found`);
    process.exit(1);
  }

  console.log(`ℹ Fetching TLDR output from '${cli} --tldr'...`);

  // Fetch TLDR output
  let tldrOutput;
  try {
    tldrOutput = exec(`${cli} --tldr`);
  } catch (error) {
    console.error('✖ Failed to fetch TLDR output');
    console.error(error.message);
    process.exit(1);
  }

  // Parse TLDR output
  let parsed;
  try {
    parsed = parseTldrOutput(tldrOutput);
  } catch (error) {
    console.error('✖ Failed to parse TLDR output');
    console.error(error.message);
    process.exit(1);
  }

  console.log(`✔ Tool: ${parsed.toolName} v${parsed.version}`);
  console.log(`ℹ Found ${parsed.commands.length} commands`);

  // Validation mode
  if (mode === '--validate') {
    console.log('ℹ Running validation checks...\n');

    const validation = validateTldrFormat(parsed);

    if (validation.errors.length > 0) {
      console.error('✖ Validation errors:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠ Validation warnings:');
      validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    // Validation summary
    console.log('');
    console.log('========================================');
    console.log('VALIDATION SUMMARY');
    console.log('========================================');
    console.log(`ℹ CLI: ${parsed.toolName} v${parsed.version}`);
    console.log(`ℹ Total commands: ${parsed.commands.length}`);

    if (validation.errors.length > 0) {
      console.error(`✖ Validation errors: ${validation.errors.length}`);
    }

    if (validation.warnings.length > 0) {
      console.warn(`⚠ Validation warnings: ${validation.warnings.length}`);
    }

    console.log('');
    if (validation.errors.length === 0) {
      console.log(`✔ ${parsed.toolName} is TLDR v0.2 compliant ✨`);
      process.exit(0);
    } else {
      console.error(`✖ ${parsed.toolName} has validation failures`);
      process.exit(1);
    }
  }

  // Documentation generation mode
  console.log('ℹ Generating documentation files...');

  // Generate all formats
  const outputPrefix = cli;

  // Text format
  const textOutput = `${outputPrefix}_tldr.txt`;
  fs.writeFileSync(textOutput, generateTextDocs(parsed));
  console.log(`✔ Generated: ${textOutput}`);

  // Markdown format
  const mdOutput = `${outputPrefix}_tldr.md`;
  fs.writeFileSync(mdOutput, generateMarkdownDocs(parsed));
  console.log(`✔ Generated: ${mdOutput}`);

  // JSON format
  const jsonOutput = `${outputPrefix}_tldr.json`;
  fs.writeFileSync(jsonOutput, generateJsonDocs(parsed));
  console.log(`✔ Generated: ${jsonOutput}`);

  console.log('');
  console.log('✔ Done! Documentation generated in multiple formats.');
}

// Run main
if (require.main === module) {
  main();
}

module.exports = {
  parseTldrOutput,
  validateTldrFormat,
  buildDependencyGraph,
  categorizeCommands,
  analyzeFlagTypes,
  analyzeSideEffects
};
