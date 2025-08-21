import { describe, test, expect, beforeEach } from 'vitest'
import { UserPromptHandler } from './userPromptHandler'
import { GuardManager } from '../guard/GuardManager'
import { MemoryStorage } from '../storage/MemoryStorage'
import { testData } from '@testUtils'

describe('UserPromptHandler', () => {
  let storage: MemoryStorage
  let guardManager: GuardManager
  let handler: UserPromptHandler

  beforeEach(() => {
    storage = new MemoryStorage()
    guardManager = new GuardManager(storage)
    handler = new UserPromptHandler(guardManager)
  })

  describe('constructor', () => {
    test('accepts a GuardManager instance', () => {
      expect(handler['guardManager']).toBe(guardManager)
    })

    test('creates a default GuardManager if none provided', () => {
      const customHandler = new UserPromptHandler()

      expect(customHandler['guardManager']).toBeInstanceOf(GuardManager)
    })
  })

  describe('processUserCommand', () => {
    test('only processes UserPromptSubmit events', async () => {
      await guardManager.disable() // Ensure guard starts disabled
      const hookData = {
        ...testData.userPromptSubmit({ prompt: 'todo-guard on' }),
        hook_event_name: 'PreToolUse' // Not UserPromptSubmit
      }

      await handler.processUserCommand(JSON.stringify(hookData))

      expect(await guardManager.isEnabled()).toBe(false) // Should not enable
    })

    test('enables guard when prompt is "todo-guard on"', async () => {
      await guardManager.disable() // Ensure guard starts disabled
      const hookData = testData.userPromptSubmit({ prompt: 'todo-guard on' })

      await handler.processUserCommand(JSON.stringify(hookData))

      expect(await guardManager.isEnabled()).toBe(true)
    })

    test('disables guard when prompt is "todo-guard off"', async () => {
      await guardManager.enable() // Ensure guard starts enabled
      const hookData = testData.userPromptSubmit({ prompt: 'todo-guard off' })

      await handler.processUserCommand(JSON.stringify(hookData))

      expect(await guardManager.isEnabled()).toBe(false)
    })

    test('enables guard when prompt is "Todo-Guard ON" (mixed case)', async () => {
      await guardManager.disable() // Ensure guard starts disabled
      const hookData = testData.userPromptSubmit({ prompt: 'todo-guard on' })

      await handler.processUserCommand(JSON.stringify(hookData))

      expect(await guardManager.isEnabled()).toBe(true)
    })

    test('disables guard when prompt is "Todo-Guard Off" (mixed case)', async () => {
      await guardManager.enable() // Ensure guard starts enabled
      const hookData = testData.userPromptSubmit({ prompt: 'todo-guard off' })

      await handler.processUserCommand(JSON.stringify(hookData))

      expect(await guardManager.isEnabled()).toBe(false)
    })

    test('stops operation and prevents "todo-guard on" command from reaching agent', async () => {
      const hookData = testData.userPromptSubmit({ prompt: 'todo-guard on' })

      const result = await handler.processUserCommand(JSON.stringify(hookData))

      expect(result).toEqual({
        decision: undefined,
        reason: 'Todo Guard enabled',
        continue: false,
        stopReason: 'Todo Guard enabled'
      })
    })

    test('stops operation and prevents "todo-guard off" command from reaching agent', async () => {
      const hookData = testData.userPromptSubmit({ prompt: 'todo-guard off' })

      const result = await handler.processUserCommand(JSON.stringify(hookData))

      expect(result).toEqual({
        decision: undefined,
        reason: 'Todo Guard disabled',
        continue: false,
        stopReason: 'Todo Guard disabled'
      })
    })

    test('returns undefined for non-guard commands', async () => {
      const hookData = testData.userPromptSubmit({ prompt: 'run tests please' })

      const result = await handler.processUserCommand(JSON.stringify(hookData))

      expect(result).toBeUndefined()
    })
  })

  describe('getDisabledResult', () => {
    test('returns defaultResult when guard is disabled', async () => {
      await guardManager.disable()

      const result = await handler.getDisabledResult()

      expect(result).toEqual({ decision: undefined, reason: '' })
    })

    test('returns undefined when guard is enabled', async () => {
      await guardManager.enable()

      const result = await handler.getDisabledResult()

      expect(result).toBeUndefined()
    })
  })
})