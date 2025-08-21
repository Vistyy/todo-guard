export type ValidationResult = {
  decision: 'approve' | 'block' | undefined
  reason: string
  continue?: boolean
  stopReason?: string
  approvedTodos?: string[] // List of todo contents that were approved
  blockedTodos?: string[] // List of todo contents that were blocked
}
