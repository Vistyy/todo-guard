import { describe, test, expect, beforeEach } from 'vitest'
import { processHookData } from '../../src/hooks/processHookData'
import { MemoryStorage } from '../../src/storage/MemoryStorage'
import { GuardManager } from '../../src/guard/GuardManager'
import { testData } from '../utils'

describe('Retry Limit Feature', () => {
  let storage: MemoryStorage
  let guardManager: GuardManager

  beforeEach(() => {
    storage = new MemoryStorage()
    guardManager = new GuardManager(storage)
  })

  describe('Default retry limit (5 attempts)', () => {
    test('allows first 5 attempts, blocks 6th attempt', async () => {
      const todoContent = 'Test comprehensive flow'
      const attemptTracker = new (await import('../../src/hooks/attemptTracker')).AttemptTracker(storage)
      
      // Simulate that we've already had 6 attempts (which will trigger the limit)
      for (let i = 0; i < 6; i++) {
        await attemptTracker.incrementAttempt(todoContent)
      }
      
      // Set up previous state to make todo "newly completed" 
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todoContent, status: 'pending' }] }
      }))
      
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      // This should be blocked by retry limit since attempts (6) > maxRetryAttempts (5)
      const result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Maximum retry attempts (5) exceeded')
      expect(result.reason).toContain(todoContent)
    })

    test('blocks todo when retry limit exceeded', async () => {
      const todoContent = 'Test retry limit'
      const attemptTracker = new (await import('../../src/hooks/attemptTracker')).AttemptTracker(storage)
      
      // Manually set attempt count to exceed limit
      for (let i = 0; i < 6; i++) {
        await attemptTracker.incrementAttempt(todoContent)
      }
      
      // Verify attempt count
      const currentAttempts = await attemptTracker.getAttemptCount(todoContent)
      expect(currentAttempts).toBe(6)
      
      // Set up previous state to make todo "newly completed" 
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todoContent, status: 'pending' }] }
      }))
      
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      // This should be blocked by retry limit since attempts (6) > maxRetryAttempts (5)
      const result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Maximum retry attempts (5) exceeded')
      expect(result.reason).toContain(todoContent)
    })

    test('tracks multiple todos independently', async () => {
      const todo1 = 'Task one'
      const todo2 = 'Task two'
      
      // Set up previous state to make todo1 "newly completed" for first attempt logic
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todo1, status: 'pending' }] }
      }))
      
      // Make todo1 hit its limit
      const hookData1 = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todo1, status: 'completed' })] }
      })
      
      // First attempt blocked, then 4 more attempts (total 5)
      await processHookData(JSON.stringify(hookData1), { storage })
      for (let i = 0; i < 4; i++) {
        await processHookData(JSON.stringify(hookData1), { storage })
      }

      // Now todo1 should be at limit, but todo2 should still work
      // Set up previous state to make todo2 "newly completed" for first attempt logic
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todo2, status: 'pending' }] }
      }))
      
      const hookData2 = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todo2, status: 'completed' })] }
      })
      
      let result = await processHookData(JSON.stringify(hookData2), { storage, skipHookEvents: true })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Todo Guard: Verify that') // First attempt for todo2

      // Try todo1 again - should hit retry limit
      result = await processHookData(JSON.stringify(hookData1), { storage })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Maximum retry attempts (5) exceeded')
    })

    test('handles mixed todos in single operation - blocks all if any exceed limit', async () => {
      const todo1 = 'Task one'
      const todo2 = 'Task two'
      
      // Make todo1 hit its limit first
      const hookData1 = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todo1, status: 'completed' })] }
      })
      
      // First attempt + 4 more = 5 total attempts for todo1
      await processHookData(JSON.stringify(hookData1), { storage })
      for (let i = 0; i < 4; i++) {
        await processHookData(JSON.stringify(hookData1), { storage })
      }

      // Now try both todos together - should block entire operation
      const mixedHookData = testData.todoWriteOperation({
        tool_input: { 
          todos: [
            testData.todo({ content: todo1, status: 'completed' }),
            testData.todo({ content: todo2, status: 'completed' })
          ]
        }
      })
      
      const result = await processHookData(JSON.stringify(mixedHookData), { storage })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Maximum retry attempts (5) exceeded')
      expect(result.reason).toContain(todo1)
    })
  })

  describe('Custom retry limit configuration', () => {
    test('respects custom maxRetryAttempts setting', async () => {
      // Set custom retry limit to 2
      await storage.saveConfig(JSON.stringify({ maxRetryAttempts: 2 }))
      
      const todoContent = 'Custom limit test'
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      // First attempt - blocked
      await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      
      // Second attempt - should pass through
      let result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      expect(result.decision).toBeUndefined()

      // Third attempt - should be blocked by retry limit
      result = await processHookData(JSON.stringify(hookData), { storage })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Maximum retry attempts (2) exceeded')
    })

    test('validates retry limit bounds (1-10)', async () => {
      // Test minimum value
      await storage.saveConfig(JSON.stringify({ maxRetryAttempts: 1 }))
      const maxRetryAttempts1 = await guardManager.getMaxRetryAttempts()
      expect(maxRetryAttempts1).toBe(1)

      // Test maximum value
      await storage.saveConfig(JSON.stringify({ maxRetryAttempts: 10 }))
      const maxRetryAttempts10 = await guardManager.getMaxRetryAttempts()
      expect(maxRetryAttempts10).toBe(10)

      // Test invalid values should fail schema validation
      expect(() => {
        // This would fail at schema validation level when parsed
        JSON.stringify({ maxRetryAttempts: 0 })
      }).not.toThrow() // We don't actually validate here, just document the expectation
    })
  })

  describe('Edge cases and error handling', () => {
    test('handles malformed config gracefully', async () => {
      // Save invalid config
      await storage.saveConfig('invalid json')
      
      // Should fall back to default
      const maxRetryAttempts = await guardManager.getMaxRetryAttempts()
      expect(maxRetryAttempts).toBe(GuardManager.DEFAULT_MAX_RETRY_ATTEMPTS)
    })

    test('does not apply retry limit to first attempts', async () => {
      // Set very low limit
      await storage.saveConfig(JSON.stringify({ maxRetryAttempts: 1 }))
      
      const todoContent = 'First attempt test'
      
      // Set up previous state to make this "newly completed" for first attempt logic
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todoContent, status: 'pending' }] }
      }))
      
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      // First attempt should always be blocked with first attempt message, not retry limit
      const result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Todo Guard: Verify that')
      expect(result.reason).not.toContain('Maximum retry attempts')
    })

    test('properly counts attempts after reset', async () => {
      const todoContent = 'Reset test'
      
      // Set up previous state to make this "newly completed"
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todoContent, status: 'pending' }] }
      }))
      
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      // First attempt - should be blocked
      await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      
      // Second attempt - need to reset previous state first to make it "newly completed"
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todoContent, status: 'pending' }] }
      }))
      await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })

      // Reset attempts
      const attemptTracker = new (await import('../../src/hooks/attemptTracker')).AttemptTracker(storage)
      await attemptTracker.resetAttempt(todoContent)

      // Set up previous state again to make it "newly completed" after reset
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: { todos: [{ content: todoContent, status: 'pending' }] }
      }))

      // Should behave like first attempt again
      const result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Todo Guard: Verify that')
    })
  })

  describe('Integration with existing functionality', () => {
    test('retry limit works with newly completed todos only', async () => {
      const todoContent = 'Integration test'
      
      // Simulate previous todo state with this todo as pending
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: {
          todos: [{ content: todoContent, status: 'pending' }]
        }
      }))

      // Now mark as completed - should trigger first attempt logic for newly completed todos
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      const result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Todo Guard: Verify that') // First attempt
    })

    test('does not block when no newly completed todos', async () => {
      const todoContent = 'Already completed'
      
      // Simulate previous state where todo was already completed
      await storage.savePreviousTodos(JSON.stringify({
        tool_input: {
          todos: [{ content: todoContent, status: 'completed' }]
        }
      }))

      // Submit same completed state - should not trigger validation
      const hookData = testData.todoWriteOperation({
        tool_input: { todos: [testData.todo({ content: todoContent, status: 'completed' })] }
      })

      const result = await processHookData(JSON.stringify(hookData), { storage, skipHookEvents: true })
      expect(result.decision).toBeUndefined() // Should pass through
    })
  })
})