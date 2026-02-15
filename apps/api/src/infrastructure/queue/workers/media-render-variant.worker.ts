import { Worker, type Job } from 'bullmq'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import { FFmpegComposer } from '@/infrastructure/media/ffmpeg-composer.js'
import {
	QueueName,
	redisConnection,
	type MediaRenderVariantJobData,
} from '../bullmq.config.js'

const logger = createChildLogger({ provider: QueueName.MEDIA_RENDER_VARIANT })

function mapPlatform(platform: MediaRenderVariantJobData['platform']): 'TIKTOK' | 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' {
	switch (platform) {
		case 'youtube':
			return 'YOUTUBE_SHORTS'
		case 'instagram':
			return 'INSTAGRAM_REELS'
		default:
			return 'TIKTOK'
	}
}

export async function processMediaRenderVariantJob(
	job: Job<MediaRenderVariantJobData>,
): Promise<Record<string, unknown>> {
	logger.info({ jobId: job.id, projectId: job.data.projectId, platform: job.data.platform }, 'media render variant job started')
	const composer = new FFmpegComposer()
	const rendered = await composer.renderVariant({
		masterVideoUrl: job.data.baseVideoUrl,
		platform: mapPlatform(job.data.platform),
	})

	return {
		projectId: job.data.projectId,
		platform: mapPlatform(job.data.platform),
		variantUrl: rendered.variantUrl,
	}
}

export function createMediaRenderVariantWorker(): Worker<MediaRenderVariantJobData> {
	return new Worker(
		QueueName.MEDIA_RENDER_VARIANT,
		async (job) => processMediaRenderVariantJob(job),
		{ connection: redisConnection },
	)
}
