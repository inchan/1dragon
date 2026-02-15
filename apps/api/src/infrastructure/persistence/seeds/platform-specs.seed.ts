import { eq } from 'drizzle-orm'
import { closeConnection, db } from '../db.js'
import { platformSpecs } from '../schema.js'
import { logger } from '../../logging/index.js'

type PlatformSpecSeed = {
	platform: 'TIKTOK' | 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS'
	resolution: string
	aspectRatio: string
	optimalLength: number
	maxFileSize: number
	safeZone: {
		top: number
		bottom: number
		left: number
		right: number
	}
	recommendedFormats: string[]
}

const PLATFORM_SPEC_SEEDS: readonly PlatformSpecSeed[] = [
	{
		platform: 'TIKTOK',
		resolution: '1080x1920',
		aspectRatio: '9:16',
		optimalLength: 25,
		maxFileSize: 287,
		safeZone: {
			top: 240,
			bottom: 320,
			left: 80,
			right: 80,
		},
		recommendedFormats: ['mp4', 'mov'],
	},
	{
		platform: 'YOUTUBE_SHORTS',
		resolution: '1080x1920',
		aspectRatio: '9:16',
		optimalLength: 30,
		maxFileSize: 512,
		safeZone: {
			top: 220,
			bottom: 260,
			left: 72,
			right: 72,
		},
		recommendedFormats: ['mp4'],
	},
	{
		platform: 'INSTAGRAM_REELS',
		resolution: '1080x1920',
		aspectRatio: '9:16',
		optimalLength: 30,
		maxFileSize: 512,
		safeZone: {
			top: 250,
			bottom: 330,
			left: 90,
			right: 90,
		},
		recommendedFormats: ['mp4', 'mov'],
	},
]

export async function seedPlatformSpecs(): Promise<void> {
	for (const seed of PLATFORM_SPEC_SEEDS) {
		const existing = await db.query.platformSpecs.findFirst({
			where: eq(platformSpecs.platform, seed.platform),
		})

		if (existing) {
			await db
				.update(platformSpecs)
				.set({
					resolution: seed.resolution,
					aspectRatio: seed.aspectRatio,
					optimalLength: seed.optimalLength,
					maxFileSize: seed.maxFileSize,
					safeZone: seed.safeZone,
					recommendedFormats: seed.recommendedFormats,
					updatedAt: new Date(),
				})
				.where(eq(platformSpecs.id, existing.id))

			logger.info(
				{
					action: 'updated',
					entity: 'platform_spec',
					platform: seed.platform,
				},
				'updated platform spec',
			)
			continue
		}

		await db.insert(platformSpecs).values({
			platform: seed.platform,
			resolution: seed.resolution,
			aspectRatio: seed.aspectRatio,
			optimalLength: seed.optimalLength,
			maxFileSize: seed.maxFileSize,
			safeZone: seed.safeZone,
			recommendedFormats: seed.recommendedFormats,
		})

		logger.info(
			{
				action: 'inserted',
				entity: 'platform_spec',
				platform: seed.platform,
			},
			'inserted platform spec',
		)
	}
}

async function main(): Promise<void> {
	try {
		await seedPlatformSpecs()
		logger.info(
			{
				entity: 'platform_spec',
				total_records: PLATFORM_SPEC_SEEDS.length,
			},
			'platform spec seed complete',
		)
	} finally {
		await closeConnection()
	}
}

const entrypoint = process.argv[1] ?? ''
if (import.meta.url === `file://${entrypoint}`) {
	void main()
}
