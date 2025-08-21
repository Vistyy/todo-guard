import { Context } from '../../contracts/types/Context'
import {
  isTodoWriteOperation,
  ToolOperation,
  TodoWriteOperation,
  Todo,
} from '../../contracts/schemas/toolSchemas'

// Import core prompts (always included)
import { ROLE_AND_CONTEXT } from '../prompts/role-and-context'
import { TODO_CORE_PRINCIPLES } from '../prompts/todo-core-principles'
import { RESPONSE_FORMAT } from '../prompts/response-format'

// Import operation-specific analysis
import { TODO_ANALYSIS } from '../prompts/todo-analysis'

export function generateDynamicContext(context: Context): string {
  const operation: ToolOperation = JSON.parse(context.modifications)

  // Build prompt in correct order
  const sections: string[] = [
    // 1. Core sections (always included)
    ROLE_AND_CONTEXT,
    TODO_CORE_PRINCIPLES,

    // 2. Operation-specific analysis (only for current operation)
    getOperationAnalysis(operation),

    // 3. Completed todos being validated
    context.completedTodos ? formatCompletedTodos(context.completedTodos) : '',

    // 4. Changes under review
    '\n## Changes to Review\n',
    formatOperation(operation),

    // 5. Previous todo state for comparison
    context.todo ? formatPreviousTodoState(context.todo) : '',

    // 6. Recent conversation context
    context.transcript ? formatTranscriptContext(context.transcript) : '',

    // 7. Response format
    RESPONSE_FORMAT,
  ]

  return sections.filter(Boolean).join('\n')
}

function getOperationAnalysis(operation: ToolOperation): string {
  if (isTodoWriteOperation(operation)) {
    return TODO_ANALYSIS
  }

  // For non-TodoWrite operations, no specific analysis needed in Todo Guard
  return ''
}

function formatOperation(operation: ToolOperation): string {
  if (isTodoWriteOperation(operation)) {
    return formatTodoWriteOperation(operation)
  }

  // For Todo Guard, we only validate TodoWrite operations
  return ''
}

// Context section descriptions
const TODO_MODIFICATIONS_DESCRIPTION = `This section shows the todo list changes being proposed. Compare the previous todo state with the current todo state to identify todos that were marked as completed.`

function formatTodoWriteOperation(operation: TodoWriteOperation): string {
  const todos = operation.tool_input.todos
  const todoItems = todos
    .map(
      (todo, index) =>
        `\n${index + 1}. [${todo.status}] ${todo.content} (Priority: ${todo.priority}, ID: ${todo.id})`
    )
    .join('')

  return [
    TODO_MODIFICATIONS_DESCRIPTION,
    '\n### Current Todo List\n',
    todoItems,
    '\n',
  ].join('')
}

function formatPreviousTodoState(todoJson: string): string {
  const todoOperation = JSON.parse(todoJson)
  const todos: Todo[] = todoOperation.tool_input?.todos ?? []

  const todoItems = todos
    .map(
      (todo, index) =>
        `\n${index + 1}. [${todo.status}] ${todo.content} (Priority: ${todo.priority}, ID: ${todo.id})`
    )
    .join('')

  return [
    '\n### Previous Todo State\n',
    'This shows the todo list state BEFORE the current TodoWrite operation. Compare this with the current todo list to identify which todos were marked as completed.\n',
    todoItems,
    '\n',
  ].join('')
}

function formatCompletedTodos(
  completedTodos: Array<{
    content: string
    previousStatus: string
    attemptNumber?: number
  }>
): string {
  if (completedTodos.length === 0) {
    return ''
  }

  const todoItems = completedTodos
    .map((todo, index) => {
      const attemptInfo = todo.attemptNumber
        ? ` (Attempt #${todo.attemptNumber})`
        : ''
      return `\n${index + 1}. "${todo.content}" (changed from ${todo.previousStatus} → completed)${attemptInfo}`
    })
    .join('')

  return [
    '\n## Todos Being Marked as Completed\n',
    'These are the specific todos that are being marked as completed in this operation:',
    todoItems,
    '\n\nYour task is to verify whether these todos were actually completed based on the conversation transcript below.\n',
  ].join('')
}

function formatTranscriptContext(transcript: string): string {
  if (!transcript.trim()) {
    return ''
  }

  // Limit transcript length to prevent token overflow
  const maxLength = 4000
  const truncatedTranscript =
    transcript.length > maxLength
      ? `${transcript.slice(-maxLength)}\n[...earlier conversation truncated...]`
      : transcript

  return [
    '\n## Recent Conversation Context\n',
    'Review this conversation to verify if the completed todos were actually accomplished:\n\n',
    truncatedTranscript,
    '\n',
  ].join('')
}
