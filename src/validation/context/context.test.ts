import { describe, test, expect } from 'vitest'
import { testData } from '@testUtils'
import { generateDynamicContext } from './context'
import { ROLE_AND_CONTEXT } from '../prompts/role-and-context'
import { TODO_CORE_PRINCIPLES } from '../prompts/todo-core-principles'
import { RESPONSE_FORMAT } from '../prompts/response-format'
import { TODO_ANALYSIS } from '../prompts/todo-analysis'

describe('generateDynamicContext', () => {
  describe('when TodoWrite operation', () => {
    test('should format TodoWrite operation with todo list', () => {
      const todoWriteOperation = testData.todoWriteOperation()
      const context = {
        modifications: JSON.stringify(todoWriteOperation),
      }

      const result = generateDynamicContext(context)

      // Check core sections are included
      expect(result).toContain(ROLE_AND_CONTEXT)
      expect(result).toContain(TODO_CORE_PRINCIPLES)
      expect(result).toContain(TODO_ANALYSIS)
      expect(result).toContain(RESPONSE_FORMAT)

      // Check modifications section
      expect(result).toContain('## Changes to Review')
      expect(result).toContain('### Current Todo List')
    })

    test('should include todo items with status, content, priority, and ID', () => {
      const todos = [
        testData.todo({
          content: 'Implement user authentication',
          status: 'completed',
          priority: 'high',
          id: 'auth-001',
        }),
        testData.todo({
          content: 'Add validation tests',
          status: 'in_progress',
          priority: 'medium',
          id: 'test-001',
        }),
      ]
      const todoWriteOperation = testData.todoWriteOperation({
        tool_input: testData.todoWrite({ todos }),
      })
      const context = {
        modifications: JSON.stringify(todoWriteOperation),
      }

      const result = generateDynamicContext(context)

      expect(result).toContain(
        '1. [completed] Implement user authentication (Priority: high, ID: auth-001)'
      )
      expect(result).toContain(
        '2. [in_progress] Add validation tests (Priority: medium, ID: test-001)'
      )
    })
  })

  describe('when previous todo state is provided', () => {
    test('should include previous todo state for comparison', () => {
      const todoWriteOperation = testData.todoWriteOperation()
      const previousTodos = testData.todoWriteOperation({
        tool_input: testData.todoWrite({
          todos: [
            testData.todo({
              content: 'Previous task',
              status: 'pending',
              id: 'prev-001',
            }),
          ],
        }),
      })

      const context = {
        modifications: JSON.stringify(todoWriteOperation),
        todo: JSON.stringify(previousTodos),
      }

      const result = generateDynamicContext(context)

      expect(result).toContain('### Previous Todo State')
      expect(result).toContain('Compare this with the current todo list')
      expect(result).toContain('[pending] Previous task')
    })
  })

  describe('when non-TodoWrite operations', () => {
    test('should not include operation-specific analysis for Edit operations', () => {
      const editOperation = testData.editOperation()
      const context = {
        modifications: JSON.stringify(editOperation),
      }

      const result = generateDynamicContext(context)

      // Should include core sections
      expect(result).toContain(ROLE_AND_CONTEXT)
      expect(result).toContain(TODO_CORE_PRINCIPLES)
      expect(result).toContain(RESPONSE_FORMAT)

      // Should NOT include todo analysis or operation formatting for non-TodoWrite
      expect(result).not.toContain(TODO_ANALYSIS)
      expect(result).not.toContain('### Current Todo List')
    })
  })

  describe('prompt ordering', () => {
    test('should assemble prompts in correct order', () => {
      const todoWriteOperation = testData.todoWriteOperation()
      const context = {
        modifications: JSON.stringify(todoWriteOperation),
      }

      const result = generateDynamicContext(context)

      const roleIndex = result.indexOf(ROLE_AND_CONTEXT)
      const principlesIndex = result.indexOf(TODO_CORE_PRINCIPLES)
      const analysisIndex = result.indexOf(TODO_ANALYSIS)
      const responseIndex = result.indexOf(RESPONSE_FORMAT)

      expect(roleIndex).toBeGreaterThan(-1)
      expect(principlesIndex).toBeGreaterThan(roleIndex)
      expect(analysisIndex).toBeGreaterThan(principlesIndex)
      expect(responseIndex).toBeGreaterThan(analysisIndex)
    })
  })
})
