import { buildContext } from '../cli/buildContext'
import { HookData, HookEvents } from './HookEvents'
import { UserPromptHandler } from './userPromptHandler'
import { SessionHandler } from './sessionHandler'
import { GuardManager } from '../guard/GuardManager'
import { Storage } from '../storage/Storage'
import { FileStorage } from '../storage/FileStorage'
import { ValidationResult } from '../contracts/types/ValidationResult'
import { Context } from '../contracts/types/Context'
import { HookDataSchema, ToolOperationSchema } from '../contracts/schemas/toolSchemas'

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

  if (shouldSkipValidation(hookResult.data)) {
    return defaultResult
  }

  // For PreToolUse, check if we should notify about lint issues
  if (hookResult.data.hook_event_name === 'PreToolUse') {
    const lintNotification = await checkLintNotification()
    if (lintNotification.decision === 'block') {
      return lintNotification
    }
  }

  return await performValidation(deps)
}

async function processHookEvent(parsedData: unknown, storage?: Storage): Promise<void> {
  if (storage) {
    const hookEvents = new HookEvents(storage)
    await hookEvents.processEvent(parsedData)
  }
}

function shouldSkipValidation(hookData: HookData): boolean {
  const operationResult = ToolOperationSchema.safeParse({
    ...hookData,
    tool_input: hookData.tool_input,
  })

  return !operationResult.success
}

async function performValidation(deps: ProcessHookDataDeps): Promise<ValidationResult> {
  if (deps.validator && deps.storage) {
    const context = await buildContext(deps.storage)
    return await deps.validator(context)
  }
  
  return defaultResult
}

async function checkLintNotification(): Promise<ValidationResult> {
  // Todo Guard doesn't use lint notifications - this functionality was for TDD Guard
  return defaultResult
}
