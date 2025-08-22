# Fix Attempt Counter Over-Incrementing Issue

## Problem Description

The system currently has a critical design flaw where attempt counters are incremented for ALL completed todos in every TodoWrite operation, even if they were already completed. This causes:

1. **Incorrect attempt counts**: "Test Case 1" has attempt count of 9 from repeated operations instead of 1
2. **Unpredictable AI validation**: AI receives ALL completed todos in context, randomly questioning old completions

## Root Cause Analysis

Looking at `src/hooks/processHookData.ts:65-79`, the current logic:

1. Gets ALL completed todos from the current operation
2. Increments attempt counters for ALL of them
3. No differentiation between newly completed vs already completed todos

The AI context building in `buildContextWithTranscript()` (lines 282-297) includes ALL completed todos, causing the AI to validate todos that were completed in previous operations.

## Implementation Plan

### 1. Add Previous State Storage

**Files**: `src/storage/Storage.ts`, `src/storage/FileStorage.ts`, `src/config/Config.ts`

Add methods to track the previous todo state:

- `getPreviousTodos()` and `savePreviousTodos()` to Storage interface
- Implement in FileStorage using `previousTodos.json`
- Add `previousTodosFilePath` to Config
- **Edge case handling**: Handle missing/corrupted `previousTodos.json` gracefully

### 2. Update HookEvents to Save Previous State

**File**: `src/hooks/HookEvents.ts`

In `persistOperation()` method, implement the correct sequence:

1. Read current content of `todos.json`
2. If current content exists, save it as `previousTodos.json`
3. Then save the new state to `todos.json`
4. **Edge case handling**: Handle cases where `todos.json` doesn't exist

**Suggested implementation**:

```typescript
private async persistOperation(operation: ToolOperation): Promise<void> {
  const content = JSON.stringify(operation, null, 2);

  if (isTodoWriteOperation(operation)) {
    const currentTodos = await this.storage.getTodo();
    if (currentTodos) {
      await this.storage.savePreviousTodos(currentTodos);
    }
    await this.storage.saveTodo(content);
  } else {
    await this.storage.saveModifications(content);
  }
}
```

### 3. Implement State Comparison Logic

**File**: `src/hooks/processHookData.ts`

In `handleTodoValidation()` (around line 35):

1. Retrieve previous todo state from storage
2. Parse both current and previous todo lists (handle parsing errors)
3. Compare states to identify newly completed todos (status changed from non-completed to completed)
4. Only process attempt tracking for newly completed todos
5. Skip already-completed todos entirely
6. **Edge case handling**: First run where no previous state exists - treat all completed todos as newly completed

### 4. Fix AI Context Building

**File**: `src/hooks/processHookData.ts`

In `buildContextWithTranscript()` (around line 282):

1. Use the same state comparison logic to identify newly completed todos
2. Only include newly completed todos in the `completedTodos` array
3. Remove already-completed todos from AI validation context
4. **Edge case handling**: Ensure robust parsing and comparison logic

## Expected Behavior After Fix

1. **Attempt counters**: Only increment once per todo, when it transitions from non-completed to completed
2. **AI validation**: Only validates newly completed todos, not previously completed ones
3. **Consistent behavior**: Repeated operations don't affect already-completed todos

## Implementation Steps

1. ✅ Add previous state storage methods to Storage interface and FileStorage (with error handling)
2. ✅ Update Config to include previousTodosFilePath
3. ✅ Modify HookEvents.persistOperation() to save previous state before updates (correct sequence)
4. ✅ Implement state comparison in handleTodoValidation() (with first-run handling)
5. ✅ Update buildContextWithTranscript() to filter todos (robust parsing)
6. ✅ Update existing tests to mock new storage methods
7. ✅ Add new test cases for edge cases (first-run, corrupted files)
8. ✅ Test the fix with existing integration scenarios

## Files to Modify

1. `src/storage/Storage.ts` - Add interface methods
2. `src/storage/FileStorage.ts` - Implement storage methods
3. `src/config/Config.ts` - Add file path configuration
4. `src/hooks/HookEvents.ts` - Save previous state before updates
5. `src/hooks/processHookData.ts` - Compare states and filter todos

## Edge Cases to Handle

Based on Gemini's review, these edge cases must be explicitly handled:

1. **First Run / Missing `previousTodos.json`**: When the file doesn't exist, `getPreviousTodos()` must return `null` or empty array gracefully. All completed todos should be treated as "newly completed."

2. **Corrupted `previousTodos.json`**: File could be corrupted or contain invalid JSON. Implementation must wrap parsing in try-catch blocks and default to empty previous state on errors.

3. **Empty `todos.json`**: When no `todos.json` exists, `storage.getTodo()` returns `null`. The logic must handle this by either not creating a `previousTodos.json` or creating an empty one.

4. **Race Conditions**: The sequence in `HookEvents.persistOperation()` must be atomic - read current, save as previous, then write new - to avoid state mismatches.

## Test Cases to Validate

### Core Functionality

1. First completion of a todo should increment attempt counter to 1
2. Subsequent operations with same completed todo should not increment counter
3. AI should only validate newly completed todos, not previously completed ones
4. Mixed operations (some new completions, some existing) should only process new ones

### Edge Cases

5. **First run scenario**: No `previousTodos.json` exists - all completed todos treated as newly completed
6. **Corrupted file**: Invalid JSON in `previousTodos.json` - defaults to empty previous state
7. **Empty todos**: No current `todos.json` exists - handles gracefully without errors
8. **State ordering**: Correct sequence in `persistOperation()` prevents race conditions
