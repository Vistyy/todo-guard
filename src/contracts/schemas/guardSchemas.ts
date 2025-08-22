import { z } from 'zod'

export const GuardConfigSchema = z.object({
  guardEnabled: z.boolean().optional(),
  ignorePatterns: z.array(z.string()).optional(),
  maxRetryAttempts: z.number().min(1).max(10).optional(),
})

export type GuardConfig = z.infer<typeof GuardConfigSchema>
