# Todo Guard Test Scenarios

This document outlines test cases for validating the "first attempt always denies" Todo Guard system with improved UX and gentle validation.

## Test Case 1: Single Todo - Happy Path

**Objective**: Verify the basic first-attempt denial and subsequent validation flow.

**Steps**:

1. Create todo: `"Write a hello world function"`
2. Actually implement the function in a file
3. Mark as completed → **Expected**: First attempt auto-blocks with gentle message
4. Provide simple confirmation: "Yes, I created hello.js with the function"
5. Retry → **Expected**: AI validates and approves

**Success Criteria**:

- First attempt blocked with message like "Did you actually complete 'Write a hello world function'?"
- Second attempt goes to AI validation
- AI approves based on evidence in conversation

## Test Case 2: Single Todo - False Claim

**Objective**: Verify the system catches false completion claims.

**Steps**:

1. Create todo: `"Implement user authentication"`
2. DON'T implement anything
3. Mark as completed → **Expected**: First attempt auto-blocks
4. Provide vague response: "Yeah, it's done"
5. Retry → **Expected**: AI detects no actual work in transcript and blocks

**Success Criteria**:

- First attempt blocked appropriately
- AI validation detects inconsistency between claim and transcript
- Final result blocks the false claim

## Test Case 3: Bulk Todos - Mixed States (Enhanced)

**Objective**: Test the improved bulk operation UX and mixed validation results.

**Steps**:

1. Create 3 todos: `"Fix bug A"`, `"Add feature B"`, `"Update docs C"`
2. Actually complete only "Fix bug A" (make a real change)
3. Mark all 3 as completed → **Expected**: Single block listing all 3 todos
4. Provide: "Fixed bug A in line 42, didn't do B and C yet"
5. Retry → **Expected**: AI approves A, questions B and C
6. **Follow-up**: Mark only B and C as completed again
7. Provide explanations for B and C
8. Retry → **Expected**: Only B and C re-validated, A stays completed

**Success Criteria**:

- No verification loop - single block for all first-attempt todos
- AI can handle mixed validation (approve some, block others)
- State management preserves previously approved todos

## Test Case 4: Reset Attempts

**Objective**: Verify attempt counters reset when todos change status.

**Steps**:

1. Create todo: `"Research databases"`
2. Mark completed → Blocked (attempt 0→1)
3. Mark back to pending → Attempt should reset
4. Mark completed again → **Expected**: Blocked again (attempt 0→1, not 1→2)

**Success Criteria**:

- Attempt counter resets when todo moves back to pending
- Second completion attempt starts from 0 again

## Test Case 5: Session Restart

**Objective**: Verify attempts clear on new sessions.

**Steps**:

1. Create todo, mark completed (gets blocked, attempt = 1)
2. Simulate new session (restart Claude Code or trigger SessionStart)
3. Mark completed → **Expected**: Blocked (attempts cleared back to 0)

**Success Criteria**:

- New session clears all attempt tracking
- Todo completion starts fresh with first-attempt denial

## Test Case 6: Gentle Validation Balance

**Objective**: Ensure prompts are gentle but still effective.

**Steps**:

1. Create todo: `"Simple task"`
2. Complete it properly
3. First attempt → **Expected**: Auto-block with gentle message like "Did you complete 'Simple task'?"
4. Try false claim: "Yes" (with no evidence in transcript)
5. Second attempt → **Expected**: AI still catches the inconsistency despite gentle prompts

**Success Criteria**:

- Gentle, conversational prompts (no "show code" demands)
- AI still effective at detecting false claims
- Balance between user-friendly and accountability

## Test Case 7: Bulk Operations - All First Attempts

**Objective**: Test the improved batching when all todos are first attempts.

**Steps**:

1. Create 4 new todos: `"Task 1"`, `"Task 2"`, `"Task 3"`, `"Task 4"`
2. Mark all 4 as completed simultaneously
3. **Expected**: Single block message listing all 4 todos
4. Provide confirmation for all
5. Retry → **Expected**: All 4 go to AI validation together

**Success Criteria**:

- Single block message for all first-attempt todos
- No tedious verification loop
- Efficient batch processing

## Test Case 8: Bulk Operations - Mixed Attempt States

**Objective**: Test when some todos are first attempts and others are subsequent attempts.

**Steps**:

1. Create 3 todos: `"TaskA"`, `"TaskB"`, `"TaskC"`
2. Mark TaskA completed, get blocked, verify (now TaskA has attempt count = 1)
3. Mark all 3 as completed → **Expected**: Only TaskB and TaskC should be auto-blocked (first attempts)
4. TaskA should proceed to AI validation (subsequent attempt)

**Success Criteria**:

- Only first-attempt todos get batched into auto-block
- Subsequent-attempt todos proceed to AI validation
- Mixed handling works correctly

## Notes for Interactive Testing

- **Debug Logs**: Monitor `tmp/todo-guard-debug.log` for attempt counts and flow
- **Gentle Prompts**: Verify no demands for "show code" or "provide evidence"
- **UX Improvements**: No verification loops for bulk operations
- **State Management**: Attempt counters behave correctly across different scenarios
- **Balance**: System remains effective while being user-friendly

## Expected Improvements

1. **Better UX**: Bulk operations no longer create tedious verification loops
2. **Gentler Tone**: Prompts are conversational, not interrogational
3. **Maintained Effectiveness**: System still catches false claims
4. **Efficient Processing**: Batched first-attempt handling
5. **Clear State Management**: Proper attempt tracking and reset behavior
