# Comprehensive Implementation Plan

## 🎯 Priority-Ordered Action Plan

### Phase 0: Fix Core Design Flaws (Critical - System behavior issues)

**Goal**: Fix fundamental design flaws discovered during test scenario validation

**Issue 1**: Attempt Counter Over-Incrementing

- Problem: System increments counters for ALL completed todos in every operation, even already-completed ones
- Current: "Test Case 1" has attempt count of 9 from repeated operations
- Expected: Should only increment for newly completed todos

**Issue 2**: Unpredictable AI Validation

- Problem: AI receives ALL completed todos in context, randomly questioning old completions
- Current: AI questioned "Update docs C" when trying to change "Research databases"
- Expected: AI should only validate newly completed todos

**Implementation Steps**:

1. **Add Previous State Tracking** (src/storage/Storage.ts)
   - Add `getPreviousTodos()` and `savePreviousTodos()` methods
   - Store todo list state before each operation

2. **State Comparison Logic** (src/hooks/processHookData.ts)
   - In `handleTodoValidation()`, compare current vs previous todo states
   - Identify newly completed todos (changed from non-completed to completed)
   - Only process attempt tracking for newly completed todos

3. **Fix AI Context Building** (src/hooks/processHookData.ts)
   - In `buildContextWithTranscript()`, only include newly completed todos
   - Remove already-completed todos from AI validation context

4. **Update HookEvents** (src/hooks/HookEvents.ts)
   - Save current todo state as "previous" for next operation comparison

### Phase 1: Fix Failing Tests (Critical - CI is broken)

**Goal**: Restore green build by updating tests to match new behavior

1. **Update Unit Tests** (src/hooks/processHookData.test.ts)
   - Add `transcript` and `completedTodos` fields to context expectations
   - Update TodoWrite test to expect first-attempt blocking behavior
   - Fix context structure assertions

2. **Update Integration Tests** (test/integration/validator.core.test.ts)
   - Change expectations from `decision: undefined` to `decision: 'block'`
   - Update test descriptions to reflect new "always block on first attempt" behavior
   - Adjust test scenarios for gentle prompt validation

3. **Fix Error Handling Tests** (src/validation/validator.test.ts)
   - Restore original error message format for backward compatibility
   - Update fallback message expectations
   - Keep gentle prompts but fix error test assertions

### Phase 2: Add Retry Limit Feature (High - Prevents infinite loops)

**Goal**: Implement configurable max retry attempts to prevent automation deadlock

1. **Update GuardConfigSchema** (src/contracts/schemas/guardSchemas.ts)
   - Add `maxRetryAttempts: z.number().min(1).max(10).optional()`

2. **Extend GuardManager** (src/guard/GuardManager.ts)
   - Add `DEFAULT_MAX_RETRY_ATTEMPTS = 5`
   - Add `getMaxRetryAttempts()` method

3. **Implement Retry Limit Logic** (src/hooks/processHookData.ts)
   - Check attempt count against configurable limit
   - Block with "wait for user guidance" message after max attempts
   - Pass guardManager to get configured limit

4. **Add Tests for Retry Limit**
   - Test default behavior (5 attempts)
   - Test custom configuration
   - Test limit enforcement message

### Phase 3: Clean Up Dead Code (Medium - Code quality)

**Goal**: Remove unused code and improve maintainability

1. **Remove Unused TranscriptReader Methods**
   - Delete `detectCompletedTodos` method (confirmed dead code)
   - Document that we only care about current operation + recent transcript

2. **Document Design Intent**
   - Add comments explaining retry counter design
   - Clarify why `previousStatus: 'unknown'` is intentional
   - Document conversation-based validation approach

### Phase 4: Add Core Component Tests (Medium - Test coverage)

**Goal**: Add unit tests for new components

1. **Create attemptTracker.test.ts**
   - Test `getAttemptCount` with various scenarios
   - Test `incrementAttempt` counter behavior
   - Test `resetAttempt` and `clearAllAttempts`
   - Test `resetAttemptsForTodos` batch operations
   - Test storage error handling

2. **Refactor TranscriptReader for Testability**
   - Change to accept file content instead of file path
   - OR inject file system interface
   - Simplify complex content extraction logic

3. **Create transcriptReader.test.ts**
   - Test `readRecentContext` with various JSONL formats
   - Test `extractConversationText` content normalization
   - Test error handling for malformed entries

### Phase 5: Implement Debug Logging (Low - Nice to have)

**Goal**: Add configurable debug logging for troubleshooting

1. **Add Debug Flag to Config** (src/config/Config.ts)
   - Add `debugLogging` property
   - Read from `TODO_GUARD_DEBUG` environment variable
   - Default to false

2. **Create Debug Logger Utility** (src/utils/debug.ts)

   ```typescript
   export function debugLog(message: string): void {
     if (config.debugLogging) {
       fs.appendFileSync('tmp/todo-guard-debug.log', message)
     }
   }
   ```

3. **Replace Direct Logging Calls**
   - Update 22 occurrences across 3 files:
     - src/hooks/processHookData.ts (17 occurrences)
     - src/validation/validator.ts (3 occurrences)
     - src/validation/models/ClaudeCli.ts (2 occurrences)
   - Use new `debugLog()` function

### Phase 6: Future Enhancements (Optional)

**Goal**: Make the system more flexible and user-friendly

1. **Make "First Attempt Denial" Configurable**
   - Add `firstAttemptDenial: boolean` to GuardConfig
   - Default to true for backward compatibility
   - Allow users to disable for simpler workflows

2. **Add Integration Tests for New Features**
   - Test bulk operation batching
   - Test retry limit enforcement
   - Test attempt counter reset scenarios

## 📊 Summary

### Immediate (Today):

- Phase 0: Fix core design flaws ⚡ **NEW - CRITICAL**
- Phase 1: Fix all failing tests ✅

### Short-term (This Week):

- Phase 2: Add retry limit feature ✅
- Phase 3: Clean up dead code ✅
- Phase 4: Add core component tests ✅

### Later (Next Week):

- Phase 5: Implement debug logging ✅
- Phase 6: Future enhancements (as needed)

## 🚀 Expected Outcomes

1. **Fixed Core Behavior**: Attempt counters only increment for newly completed todos, AI only validates new completions
2. **Restored CI**: All tests passing with new behavior
3. **No Infinite Loops**: Configurable retry limits prevent deadlock
4. **Better Code Quality**: Dead code removed, design documented
5. **Improved Test Coverage**: New components properly tested
6. **Easier Debugging**: Optional debug logging when needed
7. **User Flexibility**: Configurable retry limits (and potentially first-attempt denial)

This plan addresses all issues identified by both our analysis and Gemini's review, prioritized by impact and urgency.
