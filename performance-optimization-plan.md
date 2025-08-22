# Performance Optimization Plan for Todo Guard

## Performance Issues Identified

### 1. **Dynamic Import Overhead** (PRIMARY BOTTLENECK)

- **Problem**: Each `logDebugInfo()` call does `await import('fs')` and `await import('path')`
- **Impact**: 4.35ms per import × 2 imports × 18 calls = **156ms overhead**
- **Solution**: Import once at module level or cache the imports

### 2. **Excessive File I/O**

- **Problem**: Every operation reads/writes attempt data multiple times
- **Impact**: ~7 file operations × 1-2ms = 7-14ms
- **Solution**: Cache attempt data in memory during single operation

### 3. **Unnecessary Directory Creation**

- **Problem**: `ensureDirectory()` called on every save operation
- **Impact**: 1-2ms per save × multiple saves = 5-10ms
- **Solution**: Create directory once at startup or on first use

### 4. **Debug Logging Always Active**

- **Problem**: Debug logs execute even when not needed
- **Impact**: 156ms+ even in production
- **Solution**: Make debug logging conditional based on environment

## Implementation Plan

### Quick Wins (Immediate Impact)

#### 1. Fix Dynamic Imports in Debug Logging

```typescript
// OLD: Dynamic import every time
async function logDebugInfo(message: string, data?: unknown): Promise<void> {
  const fs = await import('fs') // 4.35ms
  const path = await import('path') // 4.35ms
  // ...
}

// NEW: Import once at top
import * as fs from 'fs'
import * as path from 'path'

function logDebugInfo(message: string, data?: unknown): void {
  if (!DEBUG_ENABLED) return // Skip entirely if not debugging
  // ...
}
```

#### 2. Add Debug Flag

- Check environment variable `TODO_GUARD_DEBUG`
- Skip all debug operations when false
- Reduces overhead from 156ms to 0ms in production

#### 3. Cache Directory Creation

```typescript
class FileStorage {
  private directoryCreated = false

  private async ensureDirectory(): Promise<void> {
    if (this.directoryCreated) return
    await fs.mkdir(this.config.dataDir, { recursive: true })
    this.directoryCreated = true
  }
}
```

### Medium-Term Optimizations

#### 4. Cache Attempt Data During Operation

```typescript
class AttemptTracker {
  private cache: AttemptData | null = null

  async getAttemptCount(todoContent: string): Promise<number> {
    if (!this.cache) {
      this.cache = await this.getAttemptsData()
    }
    return this.cache[todoContent] ?? 0
  }

  async flush(): Promise<void> {
    if (this.cache) {
      await this.saveAttemptsData(this.cache)
      this.cache = null
    }
  }
}
```

#### 5. Batch File Operations

- Read all data once at start
- Keep in memory during operation
- Write all changes at end

### Long-Term Optimizations

#### 6. Use Synchronous File Operations

- CLI tools can use sync I/O without issues
- Eliminates async overhead
- Simplifies code significantly

#### 7. Consider Alternative Storage

- In-memory storage with periodic flush
- SQLite for better performance
- Redis for distributed systems

## Expected Performance Improvements

### Before Optimization:

- First attempt (no AI): ~200ms
- With AI validation: 2-5 seconds

### After Quick Wins:

- First attempt (no AI): **~20ms** (10x faster)
- With AI validation: Still 2-5 seconds (AI is the bottleneck)

### After All Optimizations:

- First attempt (no AI): **<10ms** (20x faster)
- With AI validation: 2-5 seconds (unchanged)

## Implementation Priority

1. **Fix dynamic imports** - Biggest impact, easiest fix
2. **Add debug flag** - Eliminates overhead in production
3. **Cache directory creation** - Simple one-line fix
4. **Cache attempt data** - Moderate complexity, good impact
5. **Batch operations** - More complex, diminishing returns

This will make the first-attempt blocking nearly instant, which is the most common user interaction!
