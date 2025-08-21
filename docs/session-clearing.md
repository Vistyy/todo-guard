# Todo Guard Session Clearing

Todo Guard automatically clears transient data when starting a new Claude Code session, preventing outdated test results from affecting TODO validation.

## What Gets Cleared

- Test results from previous sessions
- Lint reports and code quality checks
- Any other transient validation data

**Note:** The guard's enabled/disabled state is preserved across sessions.

## Setup

To enable automatic session clearing, you need to add the SessionStart hook to your Claude Code configuration.
You can set this up either through the interactive `/hooks` command or by manually editing your settings file.

### Using Interactive Setup (Recommended)

1. Type `/hooks` in Claude Code
2. Select `SessionStart - When a new session is started`
3. Select `+ Add new matcher…`
4. Enter matcher: `startup|resume|clear`
5. Select `+ Add new hook…`
6. Enter command: `todo-guard`
7. Choose where to save:
   - **Project settings** (`.claude/settings.json`) - Recommended for team consistency
   - **Local settings** (`.claude/settings.local.json`) - For personal preferences
   - **User settings** (`~/.claude/settings.json`) - For global configuration

### Manual Configuration (Alternative)

Add the following to your `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear",
        "hooks": [
          {
            "type": "command",
            "command": "todo-guard"
          }
        ]
      }
    ]
  }
}
```

Note: Your configuration file may already have other hooks configured.
Simply add the `SessionStart` section to your existing hooks object.

## How It Works

The SessionStart hook triggers when:

- Claude Code starts up (`startup`)
- A session is resumed (`resume`)
- The `/clear` command is used (`clear`)

When triggered, Todo Guard clears all transient data while preserving the guard state.

## Tips

- No manual intervention needed - clearing happens automatically
- To toggle the guard on/off, use the [quick commands](quick-commands.md)
- For debugging, check `.claude/todo-guard/` to see stored data
