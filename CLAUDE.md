# Todo Guard

## Project Goal

Todo Guard is a Claude Code hook that enforces todo completion accountability by intercepting TodoWrite operations.
When Claude Code attempts to mark todos as completed, Todo Guard:

1. **Captures**: Intercepts TodoWrite operations that modify todo status
2. **Analyzes**: Examines todo progression patterns and completion claims
3. **Validates**: Checks accountability using pattern-based AI analysis
4. **Blocks**: Prevents suspicious completion patterns without proper progression
5. **Guides**: Explains violations and suggests honest progress tracking

This automated accountability maintains honest task management without cluttering prompts with reminders.

## Development Workflow

### Commit Guidelines

- **Atomic commits**: Each commit represents one logical change with its tests
- **Test and implementation together**: Never separate tests from the code they test
- **Explain why, not what**: Commit messages should explain the reason for the change
- **Conventional format**: Use prefixes to categorize changes: feat, fix, refactor, test, chore, docs

Example: `feat: add network request filtering to reduce noise in captured data` (explains why, not just what)

## Project Structure

The codebase is organized with core functionality in src/ and language-specific reporters:

```
reporters/                        # Language-specific test reporters
├── go/                           # todo-guard-go - Go test reporter
├── jest/                         # todo-guard-jest - Jest reporter (npm)
├── phpunit/                      # todo-guard/phpunit - PHPUnit reporter (composer)
├── pytest/                       # todo-guard-pytest - Pytest reporter (pip)
├── test/                         # Shared test artifacts and integration tests
└── vitest/                       # todo-guard-vitest - Vitest reporter (npm)

src/                              # Main CLI application
├── cli/                          # Hook entry point and context builder
├── config/                       # Configuration management
├── contracts/                    # Types and Zod schemas
├── guard/                        # Guard enable/disable management
├── hooks/                        # Claude Code hook parsing and processing
├── linters/                      # ESLint integration for code quality
├── processors/                   # Test result and lint processing
├── providers/                    # Model and linter client factories
├── storage/                      # Storage abstractions
├── validation/                   # TODO principle validation
│   ├── validator.ts              # Sends context to AI model and parses response
│   ├── context/                  # Formats operations for AI validation
│   ├── prompts/                  # TODO validation rules and AI instructions
│   └── models/                   # Claude CLI and Anthropic API clients
└── index.ts                      # Package entry point

test/                             # Main test suite (hooks, integration, utils)
docs/                             # Documentation (ADRs, configuration, etc.)
```

### Architecture

Todo Guard is organized as a TypeScript project with integrated language-specific reporters:

- **src/**: Core functionality including contracts, config, storage, and validation
- **reporters/**: Language-specific test reporters (go, jest, phpunit, pytest, vitest)
- **test/**: Comprehensive test suite with integration tests and utilities

### Testing

#### Guidelines

- **Use test helpers**: Extract setup logic into helper functions placed at the bottom of test files
- **Use test factories**: Always use factories from `test/utils/` instead of creating data inline
- **Group tests effectively**: Use `describe` blocks and `beforeEach` for common setup
- **Keep tests concise**: Keep as little logic in the tests themselves as possible

#### Commands

```bash
npm run build             # Build main package and workspace reporters (jest, vitest)
npm run test              # All unit tests and base integration tests
npm run test:unit         # Fast unit tests only
npm run test:integration  # Slow integration tests (run after major prompt changes)
npm run test:reporters    # Test all reporter implementations
npm run lint              # Check code style and quality
npm run format            # Auto-format code with Prettier
npm run checks            # Run all checks: typecheck, lint, format, and test
```

### Key Design Principles

- **Interface-driven**: Core functionality defined by interfaces (`Storage`, `ModelClient`)
- **Dependency injection**: Components receive dependencies as parameters
- **Single responsibility**: Each module has one clear purpose
- **Type safety**: Comprehensive TypeScript types with runtime validation
