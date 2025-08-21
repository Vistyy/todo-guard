import { describe, it, expect, beforeEach } from 'vitest'
import { buildContext } from './buildContext'
import { MemoryStorage } from '../storage/MemoryStorage'

describe('buildContext', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('should return a context with empty strings when storage is empty', async () => {
    const context = await buildContext(storage)

    expect(context).toEqual({
      modifications: '',
      todo: '',
    })
  })

  it('should return context with values from storage', async () => {
    await storage.saveModifications('some modifications content')
    await storage.saveTodo('pending: implement feature')

    const context = await buildContext(storage)

    expect(context).toEqual({
      modifications: 'some modifications content',
      todo: 'pending: implement feature',
    })
  })

  it('should parse modifications JSON data when valid JSON is stored', async () => {
    const modificationsData = {
      file_path: '/src/example.ts',
      content: 'new file content',
    }
    await storage.saveModifications(JSON.stringify(modificationsData))
    await storage.saveTodo('pending: implement feature')

    const context = await buildContext(storage)

    expect(context).toEqual({
      modifications: JSON.stringify(modificationsData, null, 2),
      todo: 'pending: implement feature',
    })
  })

  it('should pretty-print modifications JSON for better readability', async () => {
    const modificationsData = { key: 'value', nested: { data: 'example' } }
    await storage.saveModifications(JSON.stringify(modificationsData))

    const context = await buildContext(storage)

    expect(context.modifications).toEqual(
      JSON.stringify(modificationsData, null, 2)
    )
  })
})
