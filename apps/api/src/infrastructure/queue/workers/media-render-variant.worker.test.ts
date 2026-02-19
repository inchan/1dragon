import { describe, expect, it, vi } from 'vitest'

vi.mock('../bullmq.config.js', () => ({
	QueueName: {
		MEDIA_RENDER_VARIANT: 'media-render-variant',
	},
	redisConnection: {},
}))

import type { Job } from 'bullmq'
import type { MediaRenderVariantJobData } from '../bullmq.config.js'
import { processMediaRenderVariantJob } from './media-render-variant.worker.js'

describe('processMediaRenderVariantJob', () => {
	it('maps platform and returns variant url', async () => {
		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				platform: 'instagram',
				baseVideoUrl: 'https://cdn.example.com/master.mp4',
			},
		} as Job<MediaRenderVariantJobData>

		const result = await processMediaRenderVariantJob(job)
		expect(result.platform).toBe('INSTAGRAM_REELS')
		expect(result.variantUrl).toBe('https://cdn.example.com/master.mp4')
	})
})
