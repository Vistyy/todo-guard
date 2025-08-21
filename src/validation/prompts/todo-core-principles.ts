export const TODO_CORE_PRINCIPLES = `## Todo Completion Validation Fundamentals

### The Todo Accountability Cycle
The foundation of Todo Guard is ensuring honest progress tracking:

1. **Completion Patterns**: Recognize legitimate vs suspicious patterns
   - Progressive completion (pending → in_progress → completed) suggests real work
   - Sudden completions without progression are suspicious
   - Bulk marking multiple todos as complete is a red flag

2. **Context Awareness**: Different todo types need different validation
   - **Implementation tasks** - Would normally show gradual progress
   - **Research/Planning tasks** - May legitimately jump to completed
   - **Quick fixes** - Could reasonably go straight to completed
   - **Complex features** - Should show progression through states

3. **Accountability Standards**: Focus on behavior patterns
   - **Legitimate patterns** - Gradual progress, reasonable timing, one at a time
   - **Suspicious patterns** - Bulk completions, no progression, too quick
   - **Context matters** - Consider the nature and scope of the todo

### Core Violations

1. **Suspicious Completion Patterns**
   - Marking todos as completed without any progression history
   - Jumping straight from pending to completed on complex tasks
   - No time elapsed between creation and completion of substantial work

2. **Bulk Completion Fraud**  
   - Marking multiple todos as complete simultaneously
   - Pattern of rapid-fire completions without realistic time gaps
   - Clearing entire todo lists at once

3. **Gaming the System**
   - Creating and immediately completing todos to appear productive
   - Marking todos complete then immediately creating similar ones
   - Pattern of only marking todos complete without ever using in_progress

### Validation Principles

Each todo completion should be evaluated based on:
- **Progression Pattern**: Does the completion follow a realistic workflow?
- **Timing**: Is there reasonable time between state changes?
- **Context**: Does the todo type justify the completion pattern?

### Todo Types and Standards

1. **Implementation Tasks**
   - Typically show progression: pending → in_progress → completed
   - Complex implementations should have time gaps between states
   - Example: "Add user authentication" → expect gradual progress

2. **Research/Planning Tasks**
   - May legitimately jump from pending to completed
   - Less suspicious without in_progress state
   - Example: "Research database options" → direct completion acceptable

3. **Bug Fix Tasks**
   - Small fixes might go straight to completed
   - Complex debugging should show progression
   - Example: "Fix typo" vs "Debug memory leak" - different patterns expected

4. **Documentation Tasks**
   - Can vary based on scope
   - Quick updates may complete directly
   - Example: "Update README" - pattern depends on extent of changes

### General Validation Guidelines
- Be skeptical of suspicious patterns, not individual completions
- Consider the todo's scope and complexity
- Look for gaming behaviors (bulk completions, no progression)
- Quick completions are fine for simple tasks
- Complex tasks without progression are suspicious
`
