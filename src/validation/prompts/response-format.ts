export const RESPONSE_FORMAT = `## Your Response

### Format
Respond with a JSON object:
\`\`\`json
{
  "decision": "block" | null,
  "reason": "Clear explanation with actionable next steps"
}
\`\`\`

### Decision Values
- **"block"**: False completion claim or invalid todo operation detected
- **null**: Todo operations are legitimate OR insufficient information to determine

### Writing Effective Reasons

When blocking, your reason must:
1. **Identify the specific violation** (e.g., "False completion claim")
2. **Explain why it's invalid** (e.g., "No evidence of described work")
3. **Provide the correct next step** (e.g., "Complete the actual work before marking as done")

#### Example Block Reasons:
- "False completion claim - todo marked as completed without evidence of the described work. Please complete the actual implementation before marking the todo as done."
- "Completion claim without supporting changes - todo describes 'Add user authentication' but no authentication-related code changes are visible. Ensure the work is actually completed."
- "Partial work claimed as complete - todo describes a complex feature but only minimal changes were made. Either complete the full implementation or mark the todo as 'in_progress'."
- "Gaming the system - marking unrelated todo as complete while working on different functionality. Only mark todos as complete when the specific described work is finished."

#### Example Approval Reasons:
- "Legitimate progress update - todo moved from pending to in_progress"
- "New todo addition - adding tasks to the todo list is always acceptable"
- "Todo completion with supporting evidence - work appears to match the todo description"
- "Status changes appear appropriate for the described work"

### Focus
Remember: You are ONLY evaluating todo completion legitimacy, not:
- Code quality or style
- Performance or optimization  
- Design patterns or architecture
- Variable names or formatting`
