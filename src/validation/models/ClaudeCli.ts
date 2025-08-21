import { execFileSync } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { IModelClient } from '../../contracts/types/ModelClient'
import { Config } from '../../config/Config'

export class ClaudeCli implements IModelClient {
  private readonly config: Config

  constructor(config?: Config) {
    this.config = config ?? new Config()
  }

  async ask(prompt: string): Promise<string> {
    try {
      const output = await this.executeClaudeCommand(prompt)
      await this.logOutput(output)
      return this.parseResponse(output)
    } catch (error) {
      return this.handleError(error)
    }
  }

  private async executeClaudeCommand(prompt: string): Promise<string> {
    const claudeBinary = this.config.useSystemClaude
      ? 'claude'
      : `${process.env.HOME}/.claude/local/claude`

    const args = [
      '-',
      '--output-format',
      'json',
      '--max-turns',
      '5',
      '--model',
      'sonnet',
    ]
    const claudeDir = this.ensureClaudeDir()

    return execFileSync(claudeBinary, args, {
      encoding: 'utf-8',
      timeout: 60000,
      input: prompt,
      cwd: claudeDir,
    })
  }

  private ensureClaudeDir(): string {
    const claudeDir = join(process.cwd(), '.claude')
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true })
    }
    return claudeDir
  }

  private async logOutput(output: string): Promise<void> {
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
        `[${new Date().toISOString()}] Claude CLI raw output: ${JSON.stringify(output)}\n`
      )
    } catch {
      // Ignore debug logging errors
    }
  }

  private parseResponse(output: string): string {
    const response = JSON.parse(output)
    return response.result ?? response.content ?? output
  }

  private async handleError(error: unknown): Promise<string> {
    let errorDetails: string
    let errorType: string

    if (error instanceof Error) {
      errorDetails = error.message
      errorType = error.name

      if (error.message.includes('ENOENT')) {
        errorType = 'BinaryNotFound'
        errorDetails = 'Claude CLI binary not found - check installation'
      } else if (error.message.includes('timeout')) {
        errorType = 'Timeout'
        errorDetails = 'Claude CLI request timed out'
      } else if (error.message.includes('EACCES')) {
        errorType = 'PermissionError'
        errorDetails = 'Permission denied accessing Claude CLI'
      }
    } else {
      errorDetails = String(error)
      errorType = 'UnknownError'
    }

    await this.logError(errorType, errorDetails)
    return this.getFallbackResponse(errorType)
  }

  private async logError(
    errorType: string,
    errorDetails: string
  ): Promise<void> {
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
        `[${new Date().toISOString()}] Claude CLI error [${errorType}]: ${errorDetails}\n`
      )
    } catch {
      // Ignore debug logging errors
    }
  }

  private getFallbackResponse(errorType: string): string {
    const fallbackReason = ((): string => {
      switch (errorType) {
        case 'BinaryNotFound':
          return 'Claude CLI not found - install Claude Code CLI to enable validation'
        case 'Timeout':
          return 'Validation timed out - please try again'
        case 'PermissionError':
          return 'Permission error with Claude CLI - check file permissions'
        default:
          return 'Todo Guard verification: Please confirm that you actually completed the todo(s) marked as done. What specific work did you accomplish?'
      }
    })()

    return JSON.stringify({
      decision: 'block',
      reason: fallbackReason,
    })
  }
}
