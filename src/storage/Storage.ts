export const TRANSIENT_DATA = [
  'test',
  'todo',
  'modifications',
  'lint',
  'attempts',
  'previousTodos',
] as const

export interface Storage {
  saveTest(content: string): Promise<void>
  saveTodo(content: string): Promise<void>
  saveModifications(content: string): Promise<void>
  saveLint(content: string): Promise<void>
  saveConfig(content: string): Promise<void>
  saveAttempts(content: string): Promise<void>
  savePreviousTodos(content: string): Promise<void>
  getTest(): Promise<string | null>
  getTodo(): Promise<string | null>
  getModifications(): Promise<string | null>
  getLint(): Promise<string | null>
  getConfig(): Promise<string | null>
  getAttempts(): Promise<string | null>
  getPreviousTodos(): Promise<string | null>
  clearTransientData(): Promise<void>
}
