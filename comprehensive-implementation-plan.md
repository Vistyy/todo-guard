# Comprehensive Implementation Plan

## 🎯 Priority-Ordered Action Plan

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

✅ **Completed:** All failing tests have been fixed and CI is restored

### Short-term (This Week):

- Phase 2: Add retry limit feature ✅
- Phase 3: Clean up dead code ✅
- Phase 4: Add core component tests ✅

### Later (Next Week):

- Phase 5: Implement debug logging ✅
- Phase 6: Future enhancements (as needed)

## 🚀 Expected Outcomes

1. **Restored CI**: All tests passing with new behavior
2. **No Infinite Loops**: Configurable retry limits prevent deadlock
3. **Better Code Quality**: Dead code removed, design documented
4. **Improved Test Coverage**: New components properly tested
5. **Easier Debugging**: Optional debug logging when needed
6. **User Flexibility**: Configurable retry limits (and potentially first-attempt denial)

This plan addresses all issues identified by both our analysis and Gemini's review, prioritized by impact and urgency.
