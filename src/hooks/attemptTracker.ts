import { Storage } from '../storage/Storage'

export interface AttemptData {
  [todoContent: string]: number
}

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface AttemptResult {
  exceededLimit: TodoItem[]
  firstAttempt: TodoItem[]
  subsequentAttempt: TodoItem[]
  shouldBlock: boolean
  blockReason?: string
}

export class AttemptTracker {
  constructor(private readonly storage: Storage) {}

  async processCompletionAttempt(
    currentTodos: TodoItem[],
    previousTodos: TodoItem[],
    maxRetryAttempts: number
  ): Promise<AttemptResult> {
    const result: AttemptResult = {
      exceededLimit: [],
      firstAttempt: [],
      subsequentAttempt: [],
      shouldBlock: false
    }

    const completedTodos = currentTodos.filter(todo => todo.status === 'completed')
    const newlyCompletedTodos = this.findNewlyCompletedTodos(currentTodos, previousTodos)
    const nonCompletedTodos = currentTodos.filter(todo => todo.status !== 'completed')
    
    await this.resetAttemptsForTodos(nonCompletedTodos.map(todo => todo.content))
    
    for (const todo of completedTodos) {
      const currentAttempts = await this.getAttemptCount(todo.content)
      
      if (currentAttempts >= maxRetryAttempts) {
        result.exceededLimit.push(todo)
      }
    }
    
    if (result.exceededLimit.length > 0) {
      const todoList = result.exceededLimit.map(t => `'${t.content}'`).join(', ')
      result.shouldBlock = true
      result.blockReason = `Maximum retry attempts (${maxRetryAttempts}) exceeded for: ${todoList}. Stop and await user confirmation.`
      return result
    }
    
    for (const todo of newlyCompletedTodos) {
      const attemptCount = await this.getAttemptCount(todo.content)
      
      if (attemptCount === 0) {
        result.firstAttempt.push(todo)
      } else {
        result.subsequentAttempt.push(todo)
      }
    }
    
    for (const todo of newlyCompletedTodos) {
      await this.incrementAttempt(todo.content)
    }
    
    if (result.firstAttempt.length > 0) {
      result.shouldBlock = true
      if (result.firstAttempt.length === 1) {
        result.blockReason = `Todo Guard: Verify that '${result.firstAttempt[0].content}' is actually complete.`
      } else {
        const todoList = result.firstAttempt.map(t => `'${t.content}'`).join(', ')
        result.blockReason = `Todo Guard: These tasks must be verified as complete: ${todoList}.`
      }
    }
    
    return result
  }

  async markAsSuccessfullyCompleted(todoContents: string[]): Promise<void> {
    const attemptsData = await this.getAttemptsData()
    for (const todoContent of todoContents) {
      delete attemptsData[todoContent]
    }
    await this.saveAttemptsData(attemptsData)
  }

  findNewlyCompletedTodos(currentTodos: TodoItem[], previousTodos: TodoItem[]): TodoItem[] {
    const newlyCompleted: TodoItem[] = []
    
    for (const currentTodo of currentTodos) {
      if (currentTodo.status === 'completed') {
        const previousTodo = previousTodos.find(p => p.content === currentTodo.content)
        const wasNotPreviouslyCompleted = !previousTodo || previousTodo.status !== 'completed'
        
        if (wasNotPreviouslyCompleted) {
          newlyCompleted.push(currentTodo)
        }
      }
    }
    
    return newlyCompleted
  }

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
    await this.markAsSuccessfullyCompleted(todoContents)
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