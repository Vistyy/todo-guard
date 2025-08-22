# Fix Failing Tests

## Problem Description

After implementing the attempt counter fix, CI is broken due to tests expecting old behavior. Tests need to be updated to match the new behavior where:

1. Previous state tracking is now implemented
2. AI validation context includes transcript and completedTodos fields
3. First attempt blocking behavior is now active
4. Gentle prompt validation is in place

## Implementation Plan

### 1. Update Unit Tests (src/hooks/processHookData.test.ts)

- Add `transcript` and `completedTodos` fields to context expectations
- Update TodoWrite test to expect first-attempt blocking behavior
- Fix context structure assertions
- Add test case for second/subsequent attempts (should not be automatically blocked)

### 2. Update Integration Tests (test/integration/validator.core.test.ts)

- Change expectations from `decision: undefined` to `decision: 'block'`
- Update test descriptions to reflect new "always block on first attempt" behavior
- Adjust test scenarios for gentle prompt validation

### 3. Fix Error Handling Tests (src/validation/validator.test.ts)

- Restore original error message format for backward compatibility
- Update fallback message expectations
- Keep gentle prompts but fix error test assertions

### 4. Check for Additional Affected Tests

- Review and update `src/guard/GuardManager.test.ts` if affected by context changes
- Review and update `src/hooks/sessionHandler.test.ts` if affected by blocking behavior
- Update any snapshot tests that include validation context or error messages
- Search for other test files that might depend on old behavior patterns

## Expected Outcome

All tests should pass, restoring green CI build while maintaining new behavior.

## Files to Modify

**Primary (Known Failing):**

1. `src/hooks/processHookData.test.ts` - Update context expectations
2. `test/integration/validator.core.test.ts` - Update integration test expectations
3. `src/validation/validator.test.ts` - Fix error handling test assertions

**Secondary (Potential Impact):** 4. `src/guard/GuardManager.test.ts` - Check for context/behavior dependencies 5. `src/hooks/sessionHandler.test.ts` - Check for blocking behavior dependencies 6. Any snapshot test files - Update snapshots if validation context changed
