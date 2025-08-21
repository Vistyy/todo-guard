import { describe, test } from 'vitest'
import { validator } from '../../src/validation/validator'
import { Context } from '../../src/contracts/types/Context'
import { Config } from '../../src/config/Config'
import { ModelClientProvider } from '../../src/providers/ModelClientProvider'
import { testData } from '@testUtils'
import { expectDecision } from '../utils/factories/scenarios'

describe('Core Todo Validator Scenarios', () => {
  const config = new Config({ mode: 'test' })
  const provider = new ModelClientProvider()
  const model = provider.getModelClient(config)

  describe('todo completion validation', () => {
    test('should block completion without progression on complex task', async () => {
      // Create a TodoWrite operation marking a complex task as completed
      const currentTodos = [
        testData.todo({
          content: 'Add user authentication',
          status: 'completed',
          id: 'auth-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: currentTodos }),
      })

      // Previous state where the todo was pending (no in_progress phase)
      const previousTodos = [
        testData.todo({
          content: 'Add user authentication',
          status: 'pending',
          id: 'auth-001',
        }),
      ]
      const previousTodoOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: previousTodos }),
      })

      const context: Context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodoOperation),
      }

      const result = await validator(context, model)
      // Should block when complex task has no progression
      expectDecision(result, 'block')
    })

    test('should block false completion claims without evidence', async () => {
      // Create a TodoWrite operation marking a task as completed
      const currentTodos = [
        testData.todo({
          content: 'Implement complex payment processing system',
          status: 'completed',
          id: 'payment-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: currentTodos }),
      })

      // Previous state where the todo was pending
      const previousTodos = [
        testData.todo({
          content: 'Implement complex payment processing system',
          status: 'pending',
          id: 'payment-001',
        }),
      ]
      const previousTodoOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: previousTodos }),
      })

      const context: Context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodoOperation),
      }

      const result = await validator(context, model)
      // Should block when there's no evidence of the claimed work
      expectDecision(result, 'block')
    })

    test('should approve partial progress marked as in_progress', async () => {
      // Create a TodoWrite operation marking a task as in_progress (not completed)
      const currentTodos = [
        testData.todo({
          content: 'Refactor user service for better maintainability',
          status: 'in_progress',
          id: 'refactor-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: currentTodos }),
      })

      // Previous state where the todo was pending
      const previousTodos = [
        testData.todo({
          content: 'Refactor user service for better maintainability',
          status: 'pending',
          id: 'refactor-001',
        }),
      ]
      const previousTodoOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: previousTodos }),
      })

      const context: Context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodoOperation),
      }

      const result = await validator(context, model)
      // Should approve progress updates (not completion claims)
      expectDecision(result, undefined)
    })

    test('should approve completion with proper progression', async () => {
      // Create a TodoWrite operation marking a task as completed after progression
      const currentTodos = [
        testData.todo({
          content: 'Implement user profile feature',
          status: 'completed',
          id: 'profile-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: currentTodos }),
      })

      // Previous state where the todo was in_progress (showing progression)
      const previousTodos = [
        testData.todo({
          content: 'Implement user profile feature',
          status: 'in_progress',
          id: 'profile-001',
        }),
      ]
      const previousTodoOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: previousTodos }),
      })

      const context: Context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodoOperation),
      }

      const result = await validator(context, model)
      // Should approve when there's proper progression
      expectDecision(result, undefined)
    })

    test('should approve direct completion of simple tasks', async () => {
      // Create a TodoWrite operation marking a simple task as completed
      const currentTodos = [
        testData.todo({
          content: 'Fix typo in README',
          status: 'completed',
          id: 'typo-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: currentTodos }),
      })

      // Previous state where the simple todo was pending
      const previousTodos = [
        testData.todo({
          content: 'Fix typo in README',
          status: 'pending',
          id: 'typo-001',
        }),
      ]
      const previousTodoOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: previousTodos }),
      })

      const context: Context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodoOperation),
      }

      const result = await validator(context, model)
      // Should approve simple tasks completing directly
      expectDecision(result, undefined)
    })

    test('should approve new todo additions', async () => {
      // Create a TodoWrite operation adding new todos
      const currentTodos = [
        testData.todo({
          content: 'Existing task',
          status: 'pending',
          id: 'existing-001',
        }),
        testData.todo({
          content: 'New task to implement',
          status: 'pending',
          id: 'new-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: currentTodos }),
      })

      // Previous state with only the existing todo
      const previousTodos = [
        testData.todo({
          content: 'Existing task',
          status: 'pending',
          id: 'existing-001',
        }),
      ]
      const previousTodoOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos: previousTodos }),
      })

      const context: Context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodoOperation),
      }

      const result = await validator(context, model)
      // Should approve adding new todos
      expectDecision(result, undefined)
    })
  })
})
