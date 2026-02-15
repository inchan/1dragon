import { describe, expect, it, vi } from 'vitest'

vi.mock('../bullmq.config.js', () => ({
	QueueName: {
		MEDIA_ANALYZE: 'media:analyze',
	},
	redisConnection: {},
}))

import type { Job } from 'bullmq'
import type { MediaAnalyzeJobData } from '../bullmq.config.js'
import { processMediaAnalyzeJob } from './media-analyze.worker.js'

describe('processMediaAnalyzeJob', () => {
	it('returns analyzed status payload', async () => {
		const job = {
			id: 'job_1',
			data: {
				mediaId: 'media_1',
				userId: 'user_1',
				fileUrl: 'https://cdn.example.com/file.png',
			},
		} as Job<MediaAnalyzeJobData>

		const result = await processMediaAnalyzeJob(job)
		expect(result.status).toBe('ANALYZED')
	})
})
