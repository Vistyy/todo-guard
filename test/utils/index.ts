import * as todoFactory from './factories/todoFactory'
import * as editFactory from './factories/editFactory'
import * as multiEditFactory from './factories/multiEditFactory'
import * as writeFactory from './factories/writeFactory'
import { TEST_DEFAULTS } from './factories/testDefaults'
import * as contextFactory from './factories/contextFactory'
import * as modelClientProviderFactory from './factories/modelClientProviderFactory'
import * as operations from './factories/operations'
import { typescript, python, languages } from './factories/scenarios/index'
import * as userPromptSubmitFactory from './factories/userPromptSubmitFactory'
import * as sessionStartFactory from './factories/sessionStartFactory'

/**
 * Unified test data factory that combines all individual factories
 * Provides a single import point for all test data creation needs
 */
export const testData = {
  // Todo, TodoWrite, and TodoWriteOperation factories
  todo: todoFactory.todo,
  todoWithout: todoFactory.todoWithout,
  todoWrite: todoFactory.todoWrite,
  todoWriteWithout: todoFactory.todoWriteWithout,
  todoWriteOperation: todoFactory.todoWriteOperation,
  todoWriteOperationWithout: todoFactory.todoWriteOperationWithout,
  invalidTodoWriteOperation: todoFactory.invalidTodoWriteOperation,

  // Edit and EditOperation factories
  edit: editFactory.edit,
  editWithout: editFactory.editWithout,
  editOperation: editFactory.editOperation,
  editOperationWithout: editFactory.editOperationWithout,
  invalidEditOperation: editFactory.invalidEditOperation,

  // MultiEdit and MultiEditOperation factories
  multiEdit: multiEditFactory.multiEdit,
  multiEditWithout: multiEditFactory.multiEditWithout,
  multiEditOperation: multiEditFactory.multiEditOperation,
  multiEditOperationWithout: multiEditFactory.multiEditOperationWithout,
  invalidMultiEditOperation: multiEditFactory.invalidMultiEditOperation,

  // Write and WriteOperation factories
  write: writeFactory.write,
  writeWithout: writeFactory.writeWithout,
  writeOperation: writeFactory.writeOperation,
  writeOperationWithout: writeFactory.writeOperationWithout,
  invalidWriteOperation: writeFactory.invalidWriteOperation,

  // ModelClientProvider factories
  modelClientProvider: modelClientProviderFactory.modelClientProvider,

  // Context factories
  context: contextFactory.context,
  contextWithout: contextFactory.contextWithout,

  // Operations - type-safe operation helpers
  createWriteOperation: operations.createWriteOperation,
  createEditOperation: operations.createEditOperation,
  createMultiEditOperation: operations.createMultiEditOperation,

  // Scenarios - test data for integration tests
  testResults: typescript.testResults,
  testModifications: typescript.testModifications,
  implementationModifications: typescript.implementationModifications,
  refactoringImplementation: typescript.refactoringImplementation,
  refactoringTestResults: typescript.refactoringTestResults,
  refactoringTests: typescript.refactoringTests,
  todos: typescript.todos,

  // Language-specific scenarios
  typescript,
  python,
  languages,

  // UserPromptSubmit factories
  userPromptSubmit: userPromptSubmitFactory.userPromptSubmit,
  userPromptSubmitWithout: userPromptSubmitFactory.userPromptSubmitWithout,

  // SessionStart factories
  sessionStart: sessionStartFactory.sessionStart,
  sessionStartWithout: sessionStartFactory.sessionStartWithout,

  // Default test data values
  defaults: TEST_DEFAULTS,
}
