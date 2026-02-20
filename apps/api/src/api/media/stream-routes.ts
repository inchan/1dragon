import { Hono } from 'hono'
import type { VideoJobRepositoryImpl } from '@/infrastructure/persistence/repositories/video-job.repository.js'
import {
	UNAUTHORIZED_RESPONSE,
	createJobEventStream,
} from './helpers.js'

export function createStreamSubRouter(deps: {
	jobRepository: VideoJobRepositoryImpl
}): Hono {
	const app = new Hono()
	const { jobRepository } = deps

	app.get('/jobs/stream', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const lastEventId = c.req.header('Last-Event-ID') ?? null
		const stream = createJobEventStream(user.id, null, lastEventId)
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
			},
		})
	})

	app.get('/jobs/:jobId/stream', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const jobId = c.req.param('jobId')
		const job = await jobRepository.findById(jobId, user.id)
		if (!job) {
			return c.json(
				{
					success: false,
					error: {
						code: 'JOB_NOT_FOUND',
						message: 'Job not found',
					},
				},
				404,
			)
		}

		const lastEventId = c.req.header('Last-Event-ID') ?? null
		const stream = createJobEventStream(user.id, job.id, lastEventId)
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
			},
		})
	})

	return app
}
