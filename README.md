# Todo Guard

[![npm version](https://badge.fury.io/js/todo-guard.svg)](https://www.npmjs.com/package/todo-guard)
[![CI](https://github.com/nizos/todo-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/todo-guard/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/todo-guard/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/todo-guard/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Automated todo completion accountability for Claude Code.

## Overview

Todo Guard ensures Claude Code provides honest progress tracking when working with todo lists. When Claude tries to mark todos as completed without proper progression or evidence, Todo Guard blocks the action and guides toward more accountable task management.

## Features

- **Completion Pattern Validation** - Ensures todos follow proper progression patterns (pending → in_progress → completed)
- **Bulk Completion Prevention** - Blocks suspicious patterns like marking multiple complex tasks complete simultaneously
- **Task Scope Awareness** - Allows direct completion for simple tasks, requires progression for complex ones
- **Session Control** - Toggle on and off mid-session with simple commands
- **Configurable Validation** - Configure which files to validate with ignore patterns
- **Flexible AI Models** - Use local Claude CLI or Anthropic API

## Requirements

- Node.js 18+
- Claude Code or Anthropic API key

## Quick Start

### 1. Install Todo Guard

```bash
npm install -g todo-guard
```

### 2. Configure Claude Code Hook

Add Todo Guard as a hook in your Claude Code configuration. Create or update your `.claude/hooks.json`:

```json
{
  "hooks": [
    {
      "command": "todo-guard",
      "events": [
        "PreToolUse",
        "PostToolUse",
        "UserPromptSubmit",
        "SessionStart"
      ]
    }
  ]
}
```

### 3. Start Using

That's it! Todo Guard will now monitor your todo operations and ensure accountability:

- ✅ **Allowed**: Simple tasks completing directly (pending → completed)
- ✅ **Allowed**: Complex tasks with progression (pending → in_progress → completed)
- ❌ **Blocked**: Complex tasks jumping to completed without progression
- ❌ **Blocked**: Multiple todos marked complete simultaneously without justification

## Commands

Control Todo Guard during your Claude Code session:

- `todo-guard on` - Enable Todo Guard validation
- `todo-guard off` - Disable Todo Guard validation

## How It Works

Todo Guard intercepts Claude Code's TodoWrite operations and analyzes completion patterns:

1. **Pattern Recognition**: Identifies todos changing to "completed" status
2. **Progression Analysis**: Checks if complex tasks went through proper states
3. **Context Evaluation**: Considers task complexity and previous todo states
4. **Decision Making**: Blocks suspicious patterns, allows legitimate completions

## Configuration

### Ignore Patterns

Create `.claude/todo-guard-ignore` to exclude files from validation:

```
# Ignore generated files
dist/**
node_modules/**
*.generated.ts

# Ignore documentation
docs/**
*.md
```

### Model Configuration

Configure which AI model to use in `.claude/config.json`:

```json
{
  "todoGuard": {
    "modelType": "claude-cli",
    "anthropicApiKey": "your-api-key-here"
  }
}
```

## Validation Logic

Todo Guard uses pattern-based validation focused on accountability:

### ✅ Approved Patterns

- Direct completion of simple tasks ("Fix typo in README")
- Research/planning tasks marked complete
- Tasks that progressed through in_progress state
- Adding new todos to the list

### ❌ Blocked Patterns

- Complex implementation tasks jumping straight to completed
- Bulk marking of multiple todos as complete
- Unrealistic completion timing for task scope
- Gaming patterns (create + immediately complete)

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for development setup, testing, and contribution guidelines.

## License

MIT - see [LICENSE](LICENSE) file for details.
