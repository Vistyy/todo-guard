# Claude Binary Configuration

Claude Code can be installed in different ways depending on your system and installation method.
Todo Guard needs to locate your Claude binary to validate changes. This guide helps you configure Todo Guard to work with your installation.

## Finding Your Claude Installation

First, locate where Claude is installed on your system:

```bash
# Check system-wide installation
which claude

# Check local installation
ls ~/.claude/local/claude
```

One of these should show your Claude installation path.

## Configuration Options

If Todo Guard cannot find your Claude installation, choose one of these solutions:

### Option 1: Environment Variable

If Claude is in your PATH, add to your `.env` file:

```bash
USE_SYSTEM_CLAUDE=true
```

### Option 2: Symlink

Point Todo Guard to your Claude installation:

```bash
# Create the directory if it doesn't exist
mkdir -p ~/.claude/local

# Create symlink (replace /path/to/your/claude with your actual path)
ln -s /path/to/your/claude ~/.claude/local/claude
```

Example for Homebrew on macOS:

```bash
ln -s /opt/homebrew/bin/claude ~/.claude/local/claude
```

### Option 3: Migrate Installation

Use Claude Code's built-in command to set up Claude in the standard location:

```bash
/migrate-installer
```

## Troubleshooting

If Claude CLI fails unexpectedly, check for environment variable conflicts:

```bash
# Claude uses your authenticated session, not an API key
unset ANTHROPIC_API_KEY
```

## Getting Help

If you continue to experience issues:

1. Run `which claude` and note the output
2. Check if `~/.claude/local/claude` exists
3. Open an issue at [github.com/nizos/todo-guard/issues](https://github.com/nizos/todo-guard/issues) with this information
