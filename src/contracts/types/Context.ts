export type Context = {
  modifications: string
  todo?: string
  transcript?: string
  completedTodos?: Array<{
    content: string
    previousStatus: string
    attemptNumber?: number
  }>
}
