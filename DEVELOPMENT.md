# Development Guide

## Prerequisites

- Node.js 18+ and npm

## Using Dev Containers

For a consistent development environment with all dependencies pre-installed, see the [devcontainer setup guide](.devcontainer/README.md).

## Building

Before running tests, install dependencies and build the TypeScript package:

```bash
# Install dependencies
npm install

# Build the main package
npm run build
```

## Testing

Todo Guard has a comprehensive test suite focused on todo completion validation:

```bash
# Run all tests
npm run test

# Run only unit tests (fast)
npm run test:unit

# Run only integration tests (slow, requires AI model calls)
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit tests**: Fast tests in `src/` directories that mock dependencies
- **Integration tests**: End-to-end tests in `test/integration/` that make real AI model calls
- **Test factories**: Reusable test data generators in `test/utils/factories/`

### Testing Guidelines

- Use test helpers from `test/utils/factories/` for consistent test data
- Group related tests with `describe` blocks
- Use `beforeEach` for common setup
- Keep test logic minimal - extract setup into helper functions

## Code Quality

```bash
# Run all quality checks
npm run checks

# Individual commands
npm run typecheck    # TypeScript compilation check
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

## Local Development

### Testing Todo Guard with Claude Code

1. Build Todo Guard locally:

   ```bash
   npm run build
   npm link
   ```

2. In your test project, configure the hook in `.claude/hooks.json`:

   ```json
   {
     "hooks": [
       {
         "command": "todo-guard",
         "events": ["PreToolUse", "UserPromptSubmit", "SessionStart"]
       }
     ]
   }
   ```

3. Start a Claude Code session and use TodoWrite operations to test validation

### Debugging

Since Todo Guard is a hook, debugging can be tricky. Here are some approaches:

1. **Test the CLI directly**:

   ```bash
   echo '{"hook_event_name":"PreToolUse","tool_name":"TodoWrite","tool_input":{"todos":[{"content":"Test task","status":"completed","id":"test"}]}}' | todo-guard
   ```

2. **Check hook output**: Claude Code should show any output from failed hooks

3. **Add temporary logging** to `src/cli/todo-guard.ts`:

   ```typescript
   console.error('Todo Guard called with:', inputData)
   ```

4. **Verify hook is running**: Check if the hook is actually being invoked by Claude Code

## Architecture

Todo Guard is organized as a TypeScript project with these key components:

- **src/cli/**: Hook entry point (`todo-guard.ts`) and context building (`buildContext.ts`)
- **src/validation/**: AI-based todo completion validation and prompts
- **src/contracts/**: TypeScript types and Zod schemas for validation
- **src/storage/**: Storage abstractions (FileStorage, MemoryStorage)
- **src/guard/**: GuardManager for enable/disable functionality
- **src/hooks/**: Hook event processing and user prompt handling
- **test/**: Test suite with unit tests, integration tests, and factories

### Key Design Principles

- **Interface-driven**: Core functionality defined by interfaces (`Storage`, `ModelClient`)
- **Dependency injection**: Components receive dependencies as parameters
- **Single responsibility**: Each module has one clear purpose
- **Type safety**: Comprehensive TypeScript types with runtime validation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run quality checks: `npm run checks`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Guidelines

- **Atomic commits**: Each commit represents one logical change
- **Conventional format**: Use prefixes like `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- **Explain why, not what**: Commit messages should explain the reason for the change

Example: `feat: add pattern validation for bulk todo completions`
