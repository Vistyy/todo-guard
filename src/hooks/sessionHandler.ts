import { Storage } from '../storage/Storage'
import { FileStorage } from '../storage/FileStorage'
import { SessionStartSchema } from '../contracts/schemas/toolSchemas'
import { AttemptTracker } from './attemptTracker'

export class SessionHandler {
  private readonly storage: Storage

  constructor(storage?: Storage) {
    this.storage = storage ?? new FileStorage()
  }

  async processSessionStart(hookData: string): Promise<void> {
    const parsedData = JSON.parse(hookData)
    const sessionStartResult = SessionStartSchema.safeParse(parsedData)
    
    if (!sessionStartResult.success) {
      return
    }

    // Clear all transient data including attempt tracking
    await this.storage.clearTransientData()
    
    // Also explicitly clear attempts to ensure clean slate
    const attemptTracker = new AttemptTracker(this.storage)
    await attemptTracker.clearAllAttempts()
  }
}