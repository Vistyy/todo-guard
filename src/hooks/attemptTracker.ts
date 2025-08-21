import { Storage } from '../storage/Storage'

export interface AttemptData {
  [todoContent: string]: number
}

export class AttemptTracker {
  constructor(private readonly storage: Storage) {}

  async getAttemptCount(todoContent: string): Promise<number> {
    const attemptsData = await this.getAttemptsData()
    return attemptsData[todoContent] ?? 0
  }

  async incrementAttempt(todoContent: string): Promise<void> {
    const attemptsData = await this.getAttemptsData()
    attemptsData[todoContent] = (attemptsData[todoContent] ?? 0) + 1
    await this.saveAttemptsData(attemptsData)
  }

  async resetAttempt(todoContent: string): Promise<void> {
    const attemptsData = await this.getAttemptsData()
    delete attemptsData[todoContent]
    await this.saveAttemptsData(attemptsData)
  }

  async clearAllAttempts(): Promise<void> {
    await this.saveAttemptsData({})
  }

  async resetAttemptsForTodos(todoContents: string[]): Promise<void> {
    const attemptsData = await this.getAttemptsData()
    for (const todoContent of todoContents) {
      delete attemptsData[todoContent]
    }
    await this.saveAttemptsData(attemptsData)
  }

  private async getAttemptsData(): Promise<AttemptData> {
    try {
      const data = await this.storage.getAttempts()
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  private async saveAttemptsData(data: AttemptData): Promise<void> {
    await this.storage.saveAttempts(JSON.stringify(data, null, 2))
  }
}