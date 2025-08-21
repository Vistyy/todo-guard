import { HookData, HookEvents } from './HookEvents'
import { UserPromptHandler } from './userPromptHandler'
import { SessionHandler } from './sessionHandler'
import { GuardManager } from '../guard/GuardManager'
import { Storage } from '../storage/Storage'
import { FileStorage } from '../storage/FileStorage'
import { ValidationResult } from '../contracts/types/ValidationResult'
import { Context } from '../contracts/types/Context'
import { HookDataSchema, ToolOperationSchema, isTodoWriteOperation } from '../contracts/schemas/toolSchemas'
import { TranscriptReader } from './transcriptReader'
import { AttemptTracker } from './attemptTracker'

const LOG_PATH = 'tmp/todo-guard-debug.log'

async function logDebugInfo(message: string, data?: unknown): Promise<void> {
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    // Ensure directory exists
    const dir = path.dirname(LOG_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    const logEntry = data ? 
      `[${new Date().toISOString()}] ${message}: ${JSON.stringify(data)}\n` :
      `[${new Date().toISOString()}] ${message}\n`
    fs.appendFileSync(LOG_PATH, logEntry)
  } catch {
    // Ignore debug logging errors
  }
}

async function handleTodoValidation(hookData: HookData, storage: Storage): Promise<ValidationResult | null> {
  const operation = ToolOperationSchema.safeParse(hookData)
  if (!operation.success || !isTodoWriteOperation(operation.data)) {
    return null
  }

  const hasCompletedTodos = operation.data.tool_input.todos.some(todo => todo.status === 'completed')
  
  await logDebugInfo('Has completed todos', {
    hasCompletedTodos,
    todos: operation.data.tool_input.todos.map(t => ({content: t.content, status: t.status}))
  })
  
  if (!hasCompletedTodos) {
    return null
  }

  const attemptTracker = new AttemptTracker(storage)
  const completedTodos = operation.data.tool_input.todos.filter(todo => todo.status === 'completed')
  const nonCompletedTodos = operation.data.tool_input.todos.filter(todo => todo.status !== 'completed')
  
  if (nonCompletedTodos.length > 0) {
    const todoContentsToReset = nonCompletedTodos.map(todo => todo.content)
    await attemptTracker.resetAttemptsForTodos(todoContentsToReset)
    await logDebugInfo('Reset attempts for todos moved back to non-completed', todoContentsToReset)
  }
  
  const firstAttemptTodos = []
  const subsequentAttemptTodos = []
  
  for (const todo of completedTodos) {
    const attemptCount = await attemptTracker.getAttemptCount(todo.content)
    await logDebugInfo(`Todo "${todo.content}" attempt count`, attemptCount)
    
    if (attemptCount === 0) {
      firstAttemptTodos.push(todo)
    } else {
      subsequentAttemptTodos.push(todo)
    }
  }

  if (firstAttemptTodos.length > 0) {
    for (const todo of firstAttemptTodos) {
      await attemptTracker.incrementAttempt(todo.content)
    }
    
    if (firstAttemptTodos.length === 1) {
      return {
        decision: 'block',
        reason: `Todo Guard check: Did you actually complete '${firstAttemptTodos[0].content}'?`
      }
    } 
      const todoList = firstAttemptTodos.map(t => `'${t.content}'`).join(', ')
      return {
        decision: 'block',
        reason: `Todo Guard check: You marked ${todoList} as completed. Please confirm you actually completed these tasks.`
      }
    
  }

  for (const todo of subsequentAttemptTodos) {
    await attemptTracker.incrementAttempt(todo.content)
  }
  
  return null
}

export interface ProcessHookDataDeps {
  storage?: Storage
  validator?: (context: Context) => Promise<ValidationResult>
  userPromptHandler?: UserPromptHandler
}

export const defaultResult: ValidationResult = {
  decision: undefined,
  reason: '',
}

function extractFilePath(parsedData: unknown): string | null {
  if (!parsedData || typeof parsedData !== 'object') {
    return null
  }
  
  const data = parsedData as Record<string, unknown>
  const toolInput = data.tool_input
  
  if (!toolInput || typeof toolInput !== 'object' || !('file_path' in toolInput)) {
    return null
  }
  
  const filePath = (toolInput as Record<string, unknown>).file_path
  if (typeof filePath !== 'string') {
    return null
  }
  
  return filePath
}

export async function processHookData(
  inputData: string,
  deps: ProcessHookDataDeps = {}
): Promise<ValidationResult> {
  const parsedData = JSON.parse(inputData)
  
  await logDebugInfo('Hook triggered', {
    hook_event: parsedData.hook_event_name,
    tool_name: parsedData.tool_name,
    hasTranscript: !!parsedData.transcript_path
  })
  
  // Initialize dependencies
  const storage = deps.storage ?? new FileStorage()
  const guardManager = new GuardManager(storage)
  const userPromptHandler = deps.userPromptHandler ?? new UserPromptHandler(guardManager)
  
  // Skip validation for ignored files based on patterns
  const filePath = extractFilePath(parsedData)
  if (filePath && await guardManager.shouldIgnoreFile(filePath)) {
    return defaultResult
  }
  const sessionHandler = new SessionHandler(storage)
  
  // Process SessionStart events
  if (parsedData.hook_event_name === 'SessionStart') {
    await sessionHandler.processSessionStart(inputData)
    return defaultResult
  }
  
  // Process user commands
  const stateResult = await userPromptHandler.processUserCommand(inputData)
  if (stateResult) {
    return stateResult
  }

  // Check if guard is disabled and return early if so
  const disabledResult = await userPromptHandler.getDisabledResult()
  if (disabledResult) {
    return disabledResult
  }

  const hookResult = HookDataSchema.safeParse(parsedData)
  if (!hookResult.success) {
    return defaultResult
  }

  await processHookEvent(parsedData, storage)

  // Todo Guard doesn't use PostToolUse linting (that was Todo Guard functionality)
  if (hookResult.data.hook_event_name === 'PostToolUse') {
    return defaultResult
  }

  if (await shouldSkipValidation(hookResult.data)) {
    return defaultResult
  }

  // Only validate TodoWrite operations that have completed todos
  if (hookResult.data.hook_event_name === 'PreToolUse') {
    const todoValidationResult = await handleTodoValidation(hookResult.data, storage)
    if (todoValidationResult) {
      return todoValidationResult
    }
  }

  await logDebugInfo('About to call performValidation')
  
  const validationResult = await performValidation(deps, hookResult.data)
  
  await logDebugInfo('Validation result', validationResult)
  
  return validationResult
}

async function processHookEvent(parsedData: unknown, storage?: Storage): Promise<void> {
  if (storage) {
    const hookEvents = new HookEvents(storage)
    await hookEvents.processEvent(parsedData)
  }
}

async function shouldSkipValidation(hookData: HookData): Promise<boolean> {
  const operationResult = ToolOperationSchema.safeParse({
    ...hookData,
    tool_input: hookData.tool_input,
  })

  if (!operationResult.success) {
    await logDebugInfo('Schema validation failed', operationResult.error.issues)
  }

  return !operationResult.success
}

async function performValidation(deps: ProcessHookDataDeps, hookData: HookData): Promise<ValidationResult> {
  await logDebugInfo('performValidation', { hasValidator: !!deps.validator, hasStorage: !!deps.storage })
  
  if (deps.validator && deps.storage) {
    await logDebugInfo('Building context with transcript')
    
    try {
      const context = await buildContextWithTranscript(deps.storage, hookData)
      await logDebugInfo('Context built, calling validator')
      
      const result = await deps.validator(context)
      await logDebugInfo('Validator returned', result)
      
      return result
    } catch (error: unknown) {
      await logDebugInfo('Validation error', error)
      return defaultResult
    }
  }
  
  await logDebugInfo('No validator or storage, returning default result')
  
  return defaultResult
}


async function buildContextWithTranscript(storage: Storage, hookData: HookData): Promise<Context> {
  try {
    // Use hookData directly as modifications instead of fetching from storage
    // This fixes the issue where TodoWrite operations save to storage.saveTodo() 
    // but we were trying to fetch from storage.getModifications()
    const operation = ToolOperationSchema.safeParse(hookData)
    const modifications = operation.success ? JSON.stringify(operation.data, null, 2) : ''
    
    // Get previous todo state from storage for comparison
    const todo = await storage.getTodo()
    
    const transcriptReader = new TranscriptReader()
    const transcriptPath = hookData.transcript_path
    
    await logDebugInfo('Building context with transcript path', transcriptPath)
    
    let transcript = ''
    let completedTodos: Array<{ content: string; previousStatus: string; attemptNumber: number }> = []
    
    if (transcriptPath) {
      const recentEntries = transcriptReader.readRecentContext(transcriptPath)
      await logDebugInfo('Read transcript entries', { count: recentEntries.length })
      
      transcript = transcriptReader.extractConversationText(recentEntries)
      await logDebugInfo('Extracted conversation text', { length: transcript.length })
    }
    
    // Extract completed todos from the current operation with attempt counts
    if (operation.success && isTodoWriteOperation(operation.data)) {
      const attemptTracker = new AttemptTracker(storage)
      const completedTodosData = await Promise.all(
        operation.data.tool_input.todos
          .filter(todoItem => todoItem.status === 'completed')
          .map(async (todoItem) => {
            const attemptCount = await attemptTracker.getAttemptCount(todoItem.content)
            return { 
              content: todoItem.content, 
              previousStatus: 'unknown',
              attemptNumber: attemptCount
            }
          })
      )
      completedTodos = completedTodosData
    }
    
    return {
      modifications,
      todo: todo ?? '',
      transcript,
      completedTodos
    }
  } catch (error: unknown) {
    await logDebugInfo('Error in buildContextWithTranscript', error)
    
    // Return minimal context on error
    return {
      modifications: '',
      todo: '',
      transcript: '',
      completedTodos: []
    }
  }
}

