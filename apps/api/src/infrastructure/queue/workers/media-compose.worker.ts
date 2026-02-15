import { Worker, type Job } from 'bullmq'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import { FFmpegComposer } from '@/infrastructure/media/ffmpeg-composer.js'
import {
	QueueName,
	redisConnection,
	type MediaComposeJobData,
} from '../bullmq.config.js'

const logger = createChildLogger({ provider: QueueName.MEDIA_COMPOSE })

export async function processMediaComposeJob(job: Job<MediaComposeJobData>): Promise<Record<string, unknown>> {
	const composer = new FFmpegComposer()
	logger.info({ jobId: job.id, projectId: job.data.projectId, segmentCount: job.data.segments.length }, 'media compose job started')

	const composed = await composer.compose({
		foregroundImageUrl: job.data.segments[0]?.url ?? '',
		backgroundClipUrls: job.data.segments.map((segment) => segment.url),
		watermarkEnabled: true,
	})

	return {
		projectId: job.data.projectId,
		masterVideoUrl: composed.masterVideoUrl,
		durationSec: composed.durationSec,
	}
}

export function createMediaComposeWorker(): Worker<MediaComposeJobData> {
	return new Worker(
		QueueName.MEDIA_COMPOSE,
		async (job) => processMediaComposeJob(job),
		{ connection: redisConnection },
	)
}
