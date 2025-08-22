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

interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface TodoOperation {
  tool_input: {
    todos: TodoItem[]
  }
}

function parseOperationTodos(operationJson: string): TodoItem[] {
  try {
    const operation = JSON.parse(operationJson) as TodoOperation
    return operation.tool_input?.todos || []
  } catch {
    return []
  }
}

function findNewlyCompletedTodos(currentTodos: TodoItem[], previousTodos: TodoItem[]): TodoItem[] {
  const newlyCompleted: TodoItem[] = []
  
  for (const currentTodo of currentTodos) {
    if (currentTodo.status === 'completed') {
      // Check if this todo was not completed in the previous state
      const previousTodo = previousTodos.find(p => p.content === currentTodo.content)
      const wasNotPreviouslyCompleted = !previousTodo || previousTodo.status !== 'completed'
      
      if (wasNotPreviouslyCompleted) {
        newlyCompleted.push(currentTodo)
      }
    }
  }
  
  return newlyCompleted
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

  // Get previous todo state for comparison
  const previousTodoJson = await storage.getPreviousTodos()
  const previousTodos = previousTodoJson ? parseOperationTodos(previousTodoJson) : []
  
  await logDebugInfo('Previous todos loaded', { 
    count: previousTodos.length, 
    todos: previousTodos.map(t => ({content: t.content, status: t.status}))
  })

  // Identify newly completed todos (changed from non-completed to completed)
  const newlyCompletedTodos = findNewlyCompletedTodos(currentTodos, previousTodos)
  
  await logDebugInfo('Newly completed todos identified', {
    count: newlyCompletedTodos.length,
    todos: newlyCompletedTodos.map(t => ({content: t.content, status: t.status}))
  })

  const attemptTracker = new AttemptTracker(storage)
  
  // Check retry limit for ALL completed todos in the request (whether newly completed or not)
  const maxRetryAttempts = await guardManager.getMaxRetryAttempts()
  await logDebugInfo(`Max retry attempts configured: ${maxRetryAttempts}`)
  const todosExceedingLimit = []
  
  for (const todo of currentTodos.filter(t => t.status === 'completed')) {
    const currentAttempts = await attemptTracker.getAttemptCount(todo.content)
    await logDebugInfo(`Completed todo "${todo.content}" attempt count: ${currentAttempts}, max: ${maxRetryAttempts}`)
    
    // Check if this todo has exceeded the retry limit  
    // Using >= because we check BEFORE incrementing the attempt count
    if (currentAttempts >= maxRetryAttempts) {
      await logDebugInfo(`Todo "${todo.content}" exceeds retry limit: ${currentAttempts} >= ${maxRetryAttempts}`)
      todosExceedingLimit.push(todo)
    }
  }
  
  // Block if any todos exceed retry limit
  if (todosExceedingLimit.length > 0) {
    const todoList = todosExceedingLimit.map(t => `'${t.content}'`).join(', ')
    return {
      decision: 'block',
      reason: `Maximum retry attempts (${maxRetryAttempts}) exceeded for: ${todoList}. Please wait for user guidance or manually mark as completed.`
    }
  }

  // If no newly completed todos, skip validation entirely
  if (newlyCompletedTodos.length === 0) {
    await logDebugInfo('No newly completed todos, skipping validation')
    // Still increment attempts for all completed todos in request before skipping
    for (const todo of currentTodos.filter(t => t.status === 'completed')) {
      await attemptTracker.incrementAttempt(todo.content)
    }
    return null
  }

  const nonCompletedTodos = currentTodos.filter(todo => todo.status !== 'completed')
  
  // Reset attempts for todos moved back to non-completed
  if (nonCompletedTodos.length > 0) {
    const todoContentsToReset = nonCompletedTodos.map(todo => todo.content)
    await attemptTracker.resetAttemptsForTodos(todoContentsToReset)
    await logDebugInfo('Reset attempts for todos moved back to non-completed', todoContentsToReset)
  }

  const firstAttemptTodos = []
  const subsequentAttemptTodos = []
  
  await logDebugInfo('Processing newly completed todos for first attempt logic', {
    newlyCompletedCount: newlyCompletedTodos.length,
    newlyCompletedTodos: newlyCompletedTodos.map(t => t.content)
  })
  
  // Process newly completed todos for first vs subsequent attempt logic BEFORE incrementing
  for (const todo of newlyCompletedTodos) {
    const attemptCount = await attemptTracker.getAttemptCount(todo.content)
    await logDebugInfo(`Checking attempt count for "${todo.content}": ${attemptCount}`)
    
    if (attemptCount === 0) {
      firstAttemptTodos.push(todo)
      await logDebugInfo(`Added "${todo.content}" to first attempt todos`)
    } else {
      subsequentAttemptTodos.push(todo)
      await logDebugInfo(`Added "${todo.content}" to subsequent attempt todos`)
    }
  }

  await logDebugInfo('First attempt analysis complete', {
    firstAttemptCount: firstAttemptTodos.length,
    subsequentAttemptCount: subsequentAttemptTodos.length
  })

  // Now increment attempt counter for ALL completed todos in the request
  for (const todo of currentTodos.filter(t => t.status === 'completed')) {
    await attemptTracker.incrementAttempt(todo.content)
    await logDebugInfo(`Incremented attempt counter for "${todo.content}"`)
  }

  if (firstAttemptTodos.length > 0) {
    await logDebugInfo('Found first attempt todos, blocking with first attempt message')
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
      const newlyCompletedTodos = findNewlyCompletedTodos(operation.data.tool_input.todos, previousTodos)
      
      await logDebugInfo('Building context with newly completed todos only', {
        totalCompleted: operation.data.tool_input.todos.filter(t => t.status === 'completed').length,
        newlyCompleted: newlyCompletedTodos.length,
        newlyCompletedTodos: newlyCompletedTodos.map(t => t.content)
      })
      
      const completedTodosData = await Promise.all(
        newlyCompletedTodos.map(async (todoItem) => {
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

