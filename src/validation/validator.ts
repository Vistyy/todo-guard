import { ValidationResult } from '../contracts/types/ValidationResult'
import { Context } from '../contracts/types/Context'
import { IModelClient } from '../contracts/types/ModelClient'
import { ClaudeCli } from './models/ClaudeCli'
import { generateDynamicContext } from './context/context'

interface ModelResponseJson {
  decision: 'block' | 'approve' | null
  reason: string
}

export async function validator(
  context: Context,
  modelClient: IModelClient = new ClaudeCli()
): Promise<ValidationResult> {
  try {
    const prompt = generateDynamicContext(context)

    try {
      const fs = await import('fs')
      const path = await import('path')
      const logPath = 'tmp/todo-guard-debug.log'
      const dir = path.dirname(logPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.appendFileSync(
        logPath,
        `[${new Date().toISOString()}] Sending prompt to AI model\n`
      )
    } catch {
      // Ignore debug logging errors
    }

    const response = await modelClient.ask(prompt)

    try {
      const fs2 = await import('fs')
      const path2 = await import('path')
      const logPath2 = 'tmp/todo-guard-debug.log'
      const dir2 = path2.dirname(logPath2)
      if (!fs2.existsSync(dir2)) {
        fs2.mkdirSync(dir2, { recursive: true })
      }
      fs2.appendFileSync(
        logPath2,
        `[${new Date().toISOString()}] AI response: ${JSON.stringify(response)}\n`
      )
    } catch {
      // Ignore debug logging errors
    }

    return parseModelResponse(response)
  } catch (error) {
    // Comprehensive error handling with different error types
    let errorMessage: string
    let errorCode: string

    if (error instanceof Error) {
      errorMessage = error.message
      errorCode = error.name
    } else if (typeof error === 'string') {
      errorMessage = error
      errorCode = 'StringError'
    } else {
      errorMessage = 'Unknown error occurred'
      errorCode = 'UnknownError'
    }

    try {
      const fs3 = await import('fs')
      const path3 = await import('path')
      const logPath3 = 'tmp/todo-guard-debug.log'
      const dir3 = path3.dirname(logPath3)
      if (!fs3.existsSync(dir3)) {
        fs3.mkdirSync(dir3, { recursive: true })
      }
      fs3.appendFileSync(
        logPath3,
        `[${new Date().toISOString()}] Validation error [${errorCode}]: ${errorMessage}\n`
      )
    } catch {
      // Ignore debug logging errors
    }

    // Specific error handling based on error type
    const reason = ((): string => {
      switch (errorCode) {
        case 'TypeError':
          return 'Type error during validation - check input format'
        case 'SyntaxError':
          return 'Syntax error in validation input'
        case 'NetworkError':
          return 'Network error connecting to model - try again'
        default:
          return errorMessage === 'No response from model'
            ? 'No response from model, try again'
            : `Error during validation: ${errorMessage}`
      }
    })()

    return {
      decision: 'block',
      reason,
    }
  }
}

function parseModelResponse(response: string): ValidationResult {
  try {
    const jsonString = extractJsonString(response)
    const parsed = JSON.parse(jsonString)
    return normalizeValidationResult(parsed)
  } catch (error) {
    // Handle specific "No response from model" case
    if (error instanceof Error && error.message === 'No response from model') {
      return {
        decision: 'block',
        reason: 'No response from model, try again',
      }
    }

    // If JSON parsing fails, create a default blocking response
    return {
      decision: 'block',
      reason: `Todo Guard verification: Please confirm that you actually completed the todo(s) marked as done. Describe what specific work you accomplished.`,
    }
  }
}

function extractJsonString(response: string): string {
  // Handle undefined/null responses
  if (!response) {
    throw new Error('No response from model')
  }

  const jsonFromCodeBlock = extractFromJsonCodeBlock(response)
  if (jsonFromCodeBlock) {
    return jsonFromCodeBlock
  }

  const jsonFromGenericBlock = extractFromGenericCodeBlock(response)
  if (jsonFromGenericBlock) {
    return jsonFromGenericBlock
  }

  // Try to extract plain JSON from text
  const plainJson = extractPlainJson(response)
  if (plainJson) {
    return plainJson
  }

  return response
}

function extractFromJsonCodeBlock(response: string): string | null {
  // Find all json code blocks
  const startPattern = '```json'
  const endPattern = '```'
  const blocks: string[] = []

  let startIndex = 0
  let blockStart = response.indexOf(startPattern, startIndex)

  while (blockStart !== -1) {
    const contentStart = blockStart + startPattern.length
    const blockEnd = response.indexOf(endPattern, contentStart)
    if (blockEnd === -1) break

    const content = response.substring(contentStart, blockEnd).trim()
    blocks.push(content)
    startIndex = blockEnd + endPattern.length
    blockStart = response.indexOf(startPattern, startIndex)
  }

  if (blocks.length > 0) {
    return blocks[blocks.length - 1]
  }

  return null
}

function extractPlainJson(response: string): string | null {
  // Simple regex to find JSON objects containing both "decision" and "reason" (in any order)
  const pattern =
    /\{[^{}]*"decision"[^{}]*"reason"[^{}]*}|\{[^{}]*"reason"[^{}]*"decision"[^{}]*}/g
  const matches = response.match(pattern)

  if (!matches) return null

  // Return the last match (most likely the final decision)
  const lastMatch = matches[matches.length - 1]

  // Validate it's proper JSON
  if (isValidJson(lastMatch)) {
    return lastMatch
  }

  return null
}

function extractFromGenericCodeBlock(response: string): string | null {
  const codeBlock = findCodeBlock(response)
  if (!codeBlock) return null

  const content = codeBlock.trim()
  return isValidJson(content) ? content : null
}

function findCodeBlock(response: string): string | null {
  const startPattern = '```'
  const blockStart = response.indexOf(startPattern)
  if (blockStart === -1) return null

  const contentStart = skipWhitespace(
    response,
    blockStart + startPattern.length
  )
  const blockEnd = response.indexOf(startPattern, contentStart)
  if (blockEnd === -1) return null

  return response.substring(contentStart, blockEnd)
}

function skipWhitespace(text: string, startIndex: number): number {
  let index = startIndex
  while (index < text.length && /\s/.test(text[index])) {
    index++
  }
  return index
}

function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

function normalizeValidationResult(
  parsed: ModelResponseJson
): ValidationResult {
  return {
    decision: parsed.decision ?? undefined,
    reason: parsed.reason,
  }
}
