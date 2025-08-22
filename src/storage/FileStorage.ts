import { Storage, TRANSIENT_DATA } from './Storage'
import { Config } from '../config/Config'
import fs from 'fs/promises'

export class FileStorage implements Storage {
  private readonly config: Config
  private readonly filePaths: Record<string, string>

  constructor(config?: Config) {
    this.config = config ?? new Config()
    this.filePaths = {
      test: this.config.testResultsFilePath,
      todo: this.config.todosFilePath,
      modifications: this.config.modificationsFilePath,
      lint: this.config.lintFilePath,
      config: this.config.configFilePath,
      attempts: this.config.attemptsFilePath,
      previousTodos: this.config.previousTodosFilePath,
    }
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.config.dataDir, { recursive: true })
  }

  private async save(type: string, content: string): Promise<void> {
    await this.ensureDirectory()
    await fs.writeFile(this.filePaths[type], content)
  }

  private async get(type: string): Promise<string | null> {
    try {
      return await fs.readFile(this.filePaths[type], 'utf-8')
    } catch {
      return null
    }
  }

  async saveTest(content: string): Promise<void> {
    await this.save('test', content)
  }

  async saveTodo(content: string): Promise<void> {
    await this.save('todo', content)
  }

  async saveModifications(content: string): Promise<void> {
    await this.save('modifications', content)
  }

  async saveLint(content: string): Promise<void> {
    await this.save('lint', content)
  }

  async saveConfig(content: string): Promise<void> {
    await this.save('config', content)
  }

  async saveAttempts(content: string): Promise<void> {
    await this.save('attempts', content)
  }

  async getTest(): Promise<string | null> {
    return this.get('test')
  }

  async getTodo(): Promise<string | null> {
    return this.get('todo')
  }

  async getModifications(): Promise<string | null> {
    return this.get('modifications')
  }

  async getLint(): Promise<string | null> {
    return this.get('lint')
  }

  async getConfig(): Promise<string | null> {
    return this.get('config')
  }

  async getAttempts(): Promise<string | null> {
    return this.get('attempts')
  }

  async savePreviousTodos(content: string): Promise<void> {
    await this.save('previousTodos', content)
  }

  async getPreviousTodos(): Promise<string | null> {
    return this.get('previousTodos')
  }

  async clearTransientData(): Promise<void> {
    await Promise.all(
      TRANSIENT_DATA.map((fileType) =>
        this.deleteFileIfExists(this.filePaths[fileType])
      )
    )
  }

  private async deleteFileIfExists(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Only ignore ENOENT errors (file not found)
      if (
        error instanceof Error &&
        'code' in error &&
        error.code !== 'ENOENT'
      ) {
        throw error
      }
    }
  }
}
