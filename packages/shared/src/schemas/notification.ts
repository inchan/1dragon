/**
 * Notification Domain Schemas
 * 실시간 이벤트 및 SSE 스키마
 */

import { z } from 'zod'
import { jobStatusSchema } from '../enums'

// ── Event Schemas ────────────────────────────────────────────────────────────

export const jobEventSchema = z.object({
	eventId: z.string().uuid(),
	jobId: z.string().uuid(),
	type: z.enum(['STATUS_CHANGED', 'PROGRESS_UPDATE', 'COMPLETED', 'FAILED']),
	status: jobStatusSchema,
	progress: z.number().int().min(0).max(100),
	message: z.string().optional(),
	timestamp: z.string().datetime(),
})

export const sseEventSchema = z.object({
	id: z.string(),
	event: z.string(),
	data: z.string(),
})

// ── Type Exports ─────────────────────────────────────────────────────────────

export type JobEvent = z.infer<typeof jobEventSchema>
export type SseEvent = z.infer<typeof sseEventSchema>
