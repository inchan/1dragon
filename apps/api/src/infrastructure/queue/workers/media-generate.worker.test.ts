import { describe, expect, it, vi } from 'vitest'

vi.mock('../bullmq.config.js', () => ({
	QueueName: {
		MEDIA_GENERATE: 'media:generate',
	},
	redisConnection: {},
}))

import type { Job } from 'bullmq'
import type { MediaGenerateJobData } from '../bullmq.config.js'
import { processMediaGenerateJob } from './media-generate.worker.js'

describe('processMediaGenerateJob', () => {
	it('runs generation pipeline and returns summary', async () => {
		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				options: {
					duration: 15,
					stylePreset: 'SIMPLE',
				},
			},
		} as Job<MediaGenerateJobData>

		const result = await processMediaGenerateJob(job)
		expect(result.jobId).toBe('project_1')
		expect(['SUCCEEDED', 'DEGRADED_FAILED']).toContain(result.status as string)
	})
})
