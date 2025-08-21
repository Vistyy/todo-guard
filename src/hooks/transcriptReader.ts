import { readFileSync } from 'fs'

export interface TranscriptEntry {
  type: string
  message?: {
    role: string
    content: Array<{ type: string; text?: string; tool_uses?: Array<{ name: string }> }>
  }
  content?: string
  toolUseResult?: {
    oldTodos: Array<{ content: string; status: string }>
    newTodos: Array<{ content: string; status: string }>
  }
  timestamp: string
  uuid: string
}

export interface CompletedTodo {
  content: string
  previousStatus: string
}

export class TranscriptReader {
  /**
   * Read recent conversation context from transcript file
   * @param transcriptPath Path to the JSONL transcript file
   * @param maxEntries Maximum number of entries to read from the end
   * @returns Array of transcript entries
   */
  // eslint-disable-next-line no-magic-numbers -- Reasonable default for transcript context window
  private static readonly DEFAULT_MAX_ENTRIES = 30

  readRecentContext(transcriptPath: string, maxEntries = TranscriptReader.DEFAULT_MAX_ENTRIES): TranscriptEntry[] {
    try {
      const content = readFileSync(transcriptPath, 'utf-8')
      const lines = content.trim().split('\n')
      
      // Get the last N lines and parse them
      const recentLines = lines.slice(-maxEntries)
      const entries: TranscriptEntry[] = []
      
      for (const line of recentLines) {
        try {
          const entry = JSON.parse(line) as TranscriptEntry
          entries.push(entry)
        } catch {
          // Skip malformed lines
          continue
        }
      }
      
      return entries
    } catch {
      // If we can't read the transcript, return empty array
      return []
    }
  }

  /**
   * Extract conversation text from transcript entries for validation
   * @param entries Array of transcript entries
   * @returns Formatted conversation text
   */
  extractConversationText(entries: TranscriptEntry[]): string {
    const conversationParts: string[] = []
    
    for (const entry of entries) {
      try {
        if (entry.type === 'user') {
          const userContent = this.extractUserContent(entry)
          if (userContent.trim()) {
            conversationParts.push(`**User:** ${userContent.trim()}`)
          }
        } else if (entry.type === 'assistant') {
          const assistantContent = this.extractAssistantContent(entry)
          if (assistantContent.trim()) {
            conversationParts.push(`**Assistant:** ${assistantContent.trim()}`)
          }
        }
      } catch {
        // Skip problematic entries
        continue
      }
    }
    
    return conversationParts.join('\n\n')
  }

  private extractUserContent(entry: TranscriptEntry): string {
    return this.extractContentFromEntry(entry)
  }

  private extractAssistantContent(entry: TranscriptEntry): string {
    return this.extractContentFromEntry(entry)
  }

  private extractContentFromEntry(entry: TranscriptEntry): string {
    if (entry.message?.content) {
      return this.extractMessageContent(entry.message.content)
    }
    return entry.content ?? ''
  }

  private extractMessageContent(content: Array<{ type: string; text?: string }> | string): string {
    if (Array.isArray(content)) {
      return content
        .map(c => (typeof c === 'string' ? c : c.text ?? ''))
        .filter(Boolean)
        .join('\n')
    }
    return typeof content === 'string' ? content : ''
  }

  /**
   * Detect todos that were marked as completed by comparing old vs new states
   * @param currentTodos Current todo list from hook data
   * @param entries Recent transcript entries
   * @returns Array of completed todos with their previous status
   */
  detectCompletedTodos(
    _currentTodos: Array<{ content: string; status: string }>,
    entries: TranscriptEntry[]
  ): CompletedTodo[] {
    const completedTodos: CompletedTodo[] = []
    
    // Find the most recent TodoWrite result that has oldTodos/newTodos
    const todoWriteEntry = entries
      .slice()
      .reverse()
      .find(entry => {
        const result = entry.toolUseResult
        return result?.oldTodos && result.newTodos
      })
    
    if (!todoWriteEntry?.toolUseResult) {
      return completedTodos
    }
    
    const { oldTodos, newTodos } = todoWriteEntry.toolUseResult
    
    // Compare old vs new to find todos that changed to completed
    for (const newTodo of newTodos) {
      if (newTodo.status === 'completed') {
        const oldTodo = oldTodos.find(old => old.content === newTodo.content)
        
        if (oldTodo && oldTodo.status !== 'completed') {
          completedTodos.push({
            content: newTodo.content,
            previousStatus: oldTodo.status
          })
        } else if (!oldTodo) {
          // Todo was created and immediately marked complete
          completedTodos.push({
            content: newTodo.content,
            previousStatus: 'new'
          })
        }
      }
    }
    
    return completedTodos
  }
}