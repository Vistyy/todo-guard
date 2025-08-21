import { Storage } from '../storage/Storage'
import { Context } from '../contracts/types/Context'

export async function buildContext(storage: Storage): Promise<Context> {
  const [modifications, todo] = await Promise.all([
    storage.getModifications(),
    storage.getTodo(),
  ])

  return {
    modifications: formatModifications(modifications ?? ''),
    todo: todo ?? '',
  }
}

function formatModifications(modifications: string): string {
  if (!modifications) {
    return ''
  }

  try {
    const parsed = JSON.parse(modifications)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // If it's not valid JSON, leave it as is
    return modifications
  }
}
