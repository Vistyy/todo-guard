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
import { AttemptTracker, TodoItem } from './attemptTracker'

const LOG_PATH = 'tmp/todo-guard-debug.log'


interface TodoOperation {
  tool_input: {
    todos: TodoItem[]
  }
}

function parseOperationTodos(operationJson: string): TodoItem[] {
  try {
    const operation = JSON.parse(operationJson) as TodoOperation
    return operation.tool_input.todos
  } catch {
    return []
  }
}

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

async function handleTodoValidation(hookData: HookData, storage: Storage, guardManager: GuardManager): Promise<ValidationResult | null> {
  const operation = ToolOperationSchema.safeParse(hookData)
  if (!operation.success || !isTodoWriteOperation(operation.data)) {
    return null
  }

  const currentTodos = operation.data.tool_input.todos
  const hasCompletedTodos = currentTodos.some(todo => todo.status === 'completed')
  
  await logDebugInfo('Has completed todos', {
    hasCompletedTodos,
    todos: currentTodos.map(t => ({content: t.content, status: t.status}))
  })
  
  if (!hasCompletedTodos) {
    return null
  }

  const previousTodoJson = await storage.getPreviousTodos()
  const previousTodos = previousTodoJson ? parseOperationTodos(previousTodoJson) : []
  
  await logDebugInfo('Previous todos loaded', { 
    count: previousTodos.length, 
    todos: previousTodos.map(t => ({content: t.content, status: t.status}))
  })

  const attemptTracker = new AttemptTracker(storage)
  const maxRetryAttempts = await guardManager.getMaxRetryAttempts()
  
  await logDebugInfo(`Processing attempt tracking with max retry attempts: ${maxRetryAttempts}`)
  
  const attemptResult = await attemptTracker.processCompletionAttempt(
    currentTodos,
    previousTodos,
    maxRetryAttempts
  )
  
  await logDebugInfo('Attempt tracking result', {
    exceededLimit: attemptResult.exceededLimit.length,
    firstAttempt: attemptResult.firstAttempt.length,
    subsequentAttempt: attemptResult.subsequentAttempt.length,
    shouldBlock: attemptResult.shouldBlock,
    blockReason: attemptResult.blockReason
  })
  
  if (attemptResult.shouldBlock) {
    return {
      decision: 'block',
      reason: attemptResult.blockReason!
    }
  }
  
  return null
}

export interface ProcessHookDataDeps {
  storage?: Storage
  validator?: (context: Context) => Promise<ValidationResult>
  userPromptHandler?: UserPromptHandler
  skipHookEvents?: boolean
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

  if (!deps.skipHookEvents) {
    await processHookEvent(parsedData, storage)
  }

  // Todo Guard doesn't use PostToolUse linting (that was Todo Guard functionality)
  if (hookResult.data.hook_event_name === 'PostToolUse') {
    return defaultResult
  }

  if (await shouldSkipValidation(hookResult.data)) {
    return defaultResult
  }

  // Only validate TodoWrite operations that have completed todos
  if (hookResult.data.hook_event_name === 'PreToolUse') {
    const todoValidationResult = await handleTodoValidation(hookResult.data, storage, guardManager)
    if (todoValidationResult) {
      return todoValidationResult
    }
    
  }

  await logDebugInfo('About to call performValidation')
  
  const validationResult = await performValidation(deps, hookResult.data)
  
  await logDebugInfo('Validation result', validationResult)
  
  // If AI validation passed (no block decision), clean up newly completed todos from attempt tracking
  if (!validationResult.decision && deps.validator) {
    const operation = ToolOperationSchema.safeParse(hookResult.data)
    if (operation.success && isTodoWriteOperation(operation.data)) {
      const previousTodoJson = await storage.getPreviousTodos()
      const previousTodos = previousTodoJson ? parseOperationTodos(previousTodoJson) : []
      const attemptTracker = new AttemptTracker(storage)
      const newlyCompletedTodos = attemptTracker.findNewlyCompletedTodos(operation.data.tool_input.todos, previousTodos)
      
      if (newlyCompletedTodos.length > 0) {
        const newlyCompletedContents = newlyCompletedTodos.map(todo => todo.content)
        await attemptTracker.markAsSuccessfullyCompleted(newlyCompletedContents)
        await logDebugInfo('Cleaned up newly completed todos from attempt tracking after AI validation passed', newlyCompletedContents)
      }

      // After successful validation, update the previous todos state
      const todoOperationForPrevious = JSON.stringify({
        tool_input: operation.data.tool_input
      }, null, 2)
      await storage.savePreviousTodos(todoOperationForPrevious)
      await logDebugInfo('Updated previous todos state after successful validation')
    }
  }
  
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
    
    // Extract only newly completed todos from the current operation with attempt counts
    if (operation.success && isTodoWriteOperation(operation.data)) {
      const attemptTracker = new AttemptTracker(storage)
      
      // Get previous todo state for comparison
      const previousTodoJson = await storage.getPreviousTodos()
      const previousTodos = previousTodoJson ? parseOperationTodos(previousTodoJson) : []
      
      // Find newly completed todos (only those that changed from non-completed to completed)
      const newlyCompletedTodos = attemptTracker.findNewlyCompletedTodos(operation.data.tool_input.todos, previousTodos)
      
      await logDebugInfo('Building context with newly completed todos only', {
        totalCompleted: operation.data.tool_input.todos.filter((t: TodoItem) => t.status === 'completed').length,
        newlyCompleted: newlyCompletedTodos.length,
        newlyCompletedTodos: newlyCompletedTodos.map((t: TodoItem) => t.content)
      })
      
      const completedTodosData = await Promise.all(
        newlyCompletedTodos.map(async (todoItem: TodoItem) => {
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

