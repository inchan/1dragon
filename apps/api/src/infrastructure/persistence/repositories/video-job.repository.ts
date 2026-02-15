import { and, count, desc, eq } from 'drizzle-orm'
import { Platform } from '@snapvid/shared'
import type {
	VideoJobCreateInput,
	VideoJobRecord,
	VideoJobRepository,
	VideoVariantCreateInput,
	VideoVariantRecord,
	VideoVariantRepository,
	VideoJobHistoryQuery,
} from '@/domain/media/ports.js'
import { db } from '../db.js'
import { videoJobs, videoVariants } from '../schema.js'
import { logger } from '@/infrastructure/logging/logger.js'

const VALID_PLATFORMS = new Set<string>(Object.values(Platform))

function mapVideoJob(row: typeof videoJobs.$inferSelect): VideoJobRecord {
	return {
		id: row.id,
		userId: row.userId,
		status: row.status,
		inputImageUrl: row.inputImageUrl,
		productAnalysisId: row.productAnalysisId,
		modelPersonaSelectionId: row.modelPersonaSelectionId,
		progress: row.progress,
		retryCount: row.retryCount ?? 0,
		errorMessage: row.errorMessage,
		startedAt: row.startedAt,
		completedAt: row.completedAt,
		createdAt: row.createdAt ?? new Date(0),
		updatedAt: row.updatedAt ?? new Date(0),
	}
}

function parsePlatform(value: string): Platform {
	const normalized = value.trim().toUpperCase()
	if (VALID_PLATFORMS.has(normalized)) {
		return normalized as Platform
	}

	logger.warn({ platform: value }, 'Unknown platform value encountered in video variant mapping')
	return Platform.TIKTOK
}

function mapVideoVariant(row: typeof videoVariants.$inferSelect): VideoVariantRecord {
	return {
		id: row.id,
		jobId: row.jobId,
		platform: parsePlatform(row.platform),
		resolution: row.resolution,
		duration: row.duration,
		fileUrl: row.fileUrl,
		fileSize: row.fileSize,
		thumbnailUrl: row.thumbnailUrl,
		hasWatermark: row.hasWatermark,
		createdAt: row.createdAt ?? new Date(0),
		updatedAt: row.updatedAt ?? new Date(0),
	}
}

export class VideoJobRepositoryImpl implements VideoJobRepository {
	public async create(input: VideoJobCreateInput): Promise<VideoJobRecord> {
		const inserted = await db
			.insert(videoJobs)
			.values({
				userId: input.userId,
				inputImageUrl: input.inputImageUrl,
				productAnalysisId: input.productAnalysisId ?? null,
				modelPersonaSelectionId: input.modelPersonaSelectionId ?? null,
				status: (input.status ?? 'QUEUED') as typeof videoJobs.$inferInsert['status'],
				retryCount: input.retryCount ?? 0,
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw new Error('Failed to create video job')
		}

		return mapVideoJob(row)
	}

	public async findById(jobId: string, userId: string): Promise<VideoJobRecord | null> {
		const row = await db.query.videoJobs.findFirst({
			where: and(eq(videoJobs.id, jobId), eq(videoJobs.userId, userId)),
		})

		return row ? mapVideoJob(row) : null
	}

	public async updateStatus(input: {
		readonly jobId: string
		readonly status: string
		readonly progress?: number
		readonly errorMessage?: string | null
		readonly retryCount?: number
		readonly startedAt?: Date
		readonly completedAt?: Date
	}): Promise<VideoJobRecord | null> {
		const updates: Partial<typeof videoJobs.$inferInsert> = {
			status: input.status as typeof videoJobs.$inferInsert['status'],
			updatedAt: new Date(),
		}

		if (input.progress !== undefined) {
			updates.progress = Math.max(0, Math.min(100, Math.round(input.progress)))
		}
		if (input.retryCount !== undefined) {
			updates.retryCount = Math.max(0, Math.round(input.retryCount))
		}
		if (input.errorMessage !== undefined) {
			updates.errorMessage = input.errorMessage
		}
		if (input.startedAt !== undefined) {
			updates.startedAt = input.startedAt
		}
		if (input.completedAt !== undefined) {
			updates.completedAt = input.completedAt
		}

		const updated = await db
			.update(videoJobs)
			.set(updates)
			.where(eq(videoJobs.id, input.jobId))
			.returning()

		const row = updated[0]
		return row ? mapVideoJob(row) : null
	}

	public async findByUserId(
		userId: string,
		query: VideoJobHistoryQuery,
	): Promise<{ items: VideoJobRecord[]; total: number }> {
		const limit = Math.max(1, Math.min(100, query.limit))
		const offset = Math.max(0, query.offset)

		const rows = await db.query.videoJobs.findMany({
			where: eq(videoJobs.userId, userId),
			orderBy: [desc(videoJobs.createdAt)],
			limit,
			offset,
		})

		const totalResult = await db
			.select({ total: count() })
			.from(videoJobs)
			.where(eq(videoJobs.userId, userId))

		const totalValue = totalResult[0]?.total ?? 0
		const total = typeof totalValue === 'number' ? totalValue : Number(totalValue)

		return {
			items: rows.map(mapVideoJob),
			total,
		}
	}
}

export class VideoVariantRepositoryImpl implements VideoVariantRepository {
	public async create(input: VideoVariantCreateInput): Promise<VideoVariantRecord> {
		const inserted = await db
			.insert(videoVariants)
			.values({
				jobId: input.jobId,
				platform: input.platform,
				resolution: input.resolution,
				duration: Math.max(1, Math.round(input.duration)),
				fileUrl: input.fileUrl ?? null,
				fileSize: input.fileSize ?? null,
				thumbnailUrl: input.thumbnailUrl ?? null,
				hasWatermark: input.hasWatermark,
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw new Error('Failed to create video variant')
		}

		return mapVideoVariant(row)
	}

	public async findByJobId(jobId: string): Promise<VideoVariantRecord[]> {
		const rows = await db.query.videoVariants.findMany({
			where: eq(videoVariants.jobId, jobId),
			orderBy: [desc(videoVariants.createdAt)],
		})

		return rows.map(mapVideoVariant)
	}
}
