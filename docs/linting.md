# Linting and Refactoring Support

Todo Guard can optionally check code quality during the refactoring phase (when tests are green) using ESLint.
When issues are detected, the coding agent will be prompted to fix them.

## Why Use Refactoring Support?

During the TODO green phase, the coding agent may:

- Clean up implementation code
- Extract methods or constants
- Improve naming
- Remove duplication

The refactoring support helps by:

- Running ESLint automatically after file modifications
- Detecting code quality issues
- Prompting the coding agent to fix any issues found

## Setup

1. **Install ESLint** in your project:

   ```bash
   npm install --save-dev eslint@latest
   ```

2. **Enable linting** by setting the environment variable:

   ```bash
   LINTER_TYPE=eslint
   ```

   Note: Currently only ESLint is supported. Additional linters may be added in the future.

3. **Configure the PostToolUse hook**

   ### Interactive Setup (Recommended)
   1. Type `/hooks` in Claude Code
   2. Select `PostToolUse - After tool execution`
   3. Choose `+ Add new matcher...`
   4. Enter: `Write|Edit|MultiEdit`
   5. Select `+ Add new hook...`
   6. Enter command: `todo-guard`
   7. Choose where to save (same location as your PreToolUse hook)

   ### Manual Configuration

   Add to your `.claude/settings.json`:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Write|Edit|MultiEdit",
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

## How It Works

When enabled:

1. After any file modification (Edit, MultiEdit, Write)
2. Todo Guard runs ESLint on modified files
3. If issues are found, the coding agent receives a notification
4. The agent will then fix the identified issues

Without `LINTER_TYPE=eslint`, Todo Guard skips all linting operations.

**Tip**: Configure ESLint with complexity rules (e.g., `complexity`, `max-depth`) and the SonarJS plugin to encourage meaningful refactoring.
These rules help identify code that could benefit from simplification during the green phase.

## ESLint Configuration

For effective refactoring support, consider adding these rules to your `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    complexity: ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', 50],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 4],
  },
}
```

## Troubleshooting

### ESLint Not Running

1. Verify ESLint is installed: `npm list eslint`
2. Check that `LINTER_TYPE=eslint` is set in your `.env` file
3. Ensure the PostToolUse hook is configured
4. Restart your Claude session after making changes
