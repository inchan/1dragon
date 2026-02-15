import { describe, expect, it, vi } from 'vitest'

vi.mock('../bullmq.config.js', () => ({
	QueueName: {
		MEDIA_COMPOSE: 'media:compose',
	},
	redisConnection: {},
}))

import type { Job } from 'bullmq'
import type { MediaComposeJobData } from '../bullmq.config.js'
import { processMediaComposeJob } from './media-compose.worker.js'

describe('processMediaComposeJob', () => {
	it('returns composed output metadata', async () => {
		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				segments: [
					{ url: 'https://cdn.example.com/clip1.mp4', startTime: 0, duration: 10 },
					{ url: 'https://cdn.example.com/clip2.mp4', startTime: 10, duration: 10 },
				],
				outputFormat: 'mp4',
			},
		} as Job<MediaComposeJobData>

		const result = await processMediaComposeJob(job)
		expect(result.masterVideoUrl).toContain('https://cdn.snapvid.ai/rendered/')
	})
})
