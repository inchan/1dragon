import { Worker, type Job } from 'bullmq'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import {
	QueueName,
	redisConnection,
	type MediaAnalyzeJobData,
} from '../bullmq.config.js'

const logger = createChildLogger({ provider: QueueName.MEDIA_ANALYZE })

export async function processMediaAnalyzeJob(job: Job<MediaAnalyzeJobData>): Promise<Record<string, unknown>> {
	logger.info({ jobId: job.id, mediaId: job.data.mediaId, userId: job.data.userId }, 'media analyze job started')

	return {
		mediaId: job.data.mediaId,
		userId: job.data.userId,
		status: 'ANALYZED',
		analyzedAt: new Date().toISOString(),
	}
}

export function createMediaAnalyzeWorker(): Worker<MediaAnalyzeJobData> {
	return new Worker(
		QueueName.MEDIA_ANALYZE,
		async (job) => processMediaAnalyzeJob(job),
		{ connection: redisConnection },
	)
}
