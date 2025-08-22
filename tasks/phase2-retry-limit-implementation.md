# Phase 2: Add Retry Limit Feature Implementation Plan

## Goal

Prevent infinite loops by implementing a configurable maximum retry attempts limit that blocks completion after too many attempts with a "wait for user guidance" message.

## Current State Analysis

### Existing Components:

- `AttemptTracker` already tracks attempt counts per todo content
- `GuardManager` manages configuration and guard state
- `handleTodoValidation()` in `processHookData.ts` handles todo completion validation
- Current logic: blocks first attempts, allows subsequent attempts without limits

### Problem:

After first attempt denial, Claude can retry indefinitely, potentially causing automation deadlock.

## Implementation Steps

### 1. Schema Updates

**File**: `src/contracts/schemas/guardSchemas.ts`

- Add `maxRetryAttempts: z.number().min(1).max(10).optional()` to `GuardConfigSchema`
- Field is optional and defaults to 5 attempts if not configured

### 2. GuardManager Extension

**File**: `src/guard/GuardManager.ts`

- Add `static readonly DEFAULT_MAX_RETRY_ATTEMPTS = 5` constant
- Add `async getMaxRetryAttempts(): Promise<number>` method:
  ```typescript
  async getMaxRetryAttempts(): Promise<number> {
    const config = await this.getConfig()
    return config?.maxRetryAttempts ?? GuardManager.DEFAULT_MAX_RETRY_ATTEMPTS
  }
  ```

### 3. Retry Limit Logic Implementation

**File**: `src/hooks/processHookData.ts`

- Modify `handleTodoValidation()` function
- After processing `subsequentAttemptTodos`, check attempt count against limit
- Location: Around line 158, after incrementing attempts but before returning null
- Implementation:

  ```typescript
  // Check for retry limit exceeded (using > instead of >= for more intuitive behavior)
  const maxRetryAttempts = await guardManager.getMaxRetryAttempts()
  const todosExceedingLimit = []

  for (const todo of subsequentAttemptTodos) {
    const currentAttempts = await attemptTracker.getAttemptCount(todo.content)
    if (currentAttempts > maxRetryAttempts) {
      todosExceedingLimit.push(todo)
    }
  }

  if (todosExceedingLimit.length > 0) {
    const todoList = todosExceedingLimit.map((t) => `'${t.content}'`).join(', ')
    return {
      decision: 'block',
      reason: `Maximum retry attempts (${maxRetryAttempts}) exceeded for: ${todoList}. Please wait for user guidance or manually mark as completed.`,
    }
  }
  ```

### 4. Pass GuardManager to handleTodoValidation

**File**: `src/hooks/processHookData.ts`

- Update `handleTodoValidation()` function signature to accept `guardManager: GuardManager`
- Update call site around line 256 to pass `guardManager` instance

### 5. Test Implementation

**File**: `test/hooks/retryLimit.test.ts` (new file)

- Test default behavior (5 attempts)
- Test custom configuration override
- Test enforcement message when limit exceeded
- Test that limit doesn't apply to first attempts
- Test proper attempt counting across retries
- Test multiple todos hitting limit simultaneously

## Expected Behavior

1. **First attempt**: Always blocked (existing behavior)
2. **Subsequent attempts 2-5**: Allowed to proceed to AI validation
3. **Attempts 6+**: Blocked with retry limit message
4. **Custom config**: Respects user-configured `maxRetryAttempts` value
5. **Multiple todos**: Each todo tracked independently

## Integration Points

- Configuration loading through existing `GuardManager` patterns
- Attempt tracking through existing `AttemptTracker` class
- Validation blocking through existing `ValidationResult` return mechanism
- Debug logging through existing `logDebugInfo()` calls

## Testing Strategy

1. **Unit tests**: Test retry limit logic in isolation
2. **Integration tests**: Test full flow with actual attempt tracking
3. **Configuration tests**: Test default and custom retry limits
4. **Edge cases**: Test boundary conditions (exactly at limit, mixed scenarios)

## Risk Assessment

- **Low risk**: Uses existing patterns and infrastructure
- **Backwards compatible**: Optional configuration field
- **Fail safe**: Defaults to reasonable limit (5) if not configured
- **User control**: Can be adjusted per project needs

## Implementation Notes (Based on Gemini Review)

### Edge Case: Mixed Todos in Single Operation

- **Limitation**: When multiple todos are marked complete simultaneously, if any exceed the retry limit, the entire operation is blocked
- **Behavior**: "All or nothing" blocking for a single TodoWrite operation
- **Decision**: Accept this limitation for Phase 2 due to `handleTodoValidation` returning single result
- **Future**: Could be enhanced to filter individual todos, but would require significant refactoring

### Retry Limit Logic Clarification

- **Implementation**: Using `currentAttempts > maxRetryAttempts` (not `>=`)
- **Rationale**: More intuitive behavior where `maxRetryAttempts: 5` allows exactly 5 attempts
- **Example**: With limit of 5, attempts 1-5 are allowed, attempt 6 is blocked
- **User Experience**: Configuration value matches actual allowed attempts

## Success Criteria

- No infinite retry loops possible
- Configurable retry limits respected
- Clear user guidance when limit exceeded
- All existing functionality preserved
- Comprehensive test coverage
