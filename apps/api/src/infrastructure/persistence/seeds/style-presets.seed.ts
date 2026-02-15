import { eq } from 'drizzle-orm'
import { closeConnection, db } from '../db.js'
import { stylePresets } from '../schema.js'
import { logger } from '../../logging/index.js'

type StylePresetSeed = {
	name: string
	description: string
	styleParameters: {
		cameraMovement: string
		transition: string
		speed: string
		colorGrading: string
	}
	previewVideoUrl: string
}

const STYLE_PRESET_SEEDS: readonly StylePresetSeed[] = [
	{
		name: 'SIMPLE',
		description: '제품 중심의 안정적인 쇼트와 깔끔한 전환',
		styleParameters: {
			cameraMovement: 'static-slow-zoom',
			transition: 'crossfade',
			speed: 'normal',
			colorGrading: 'neutral-clean',
		},
		previewVideoUrl: 'https://cdn.snapvid.ai/style-presets/simple-preview.mp4',
	},
	{
		name: 'DYNAMIC',
		description: '빠른 컷 전환과 에너지 있는 카메라 무브',
		styleParameters: {
			cameraMovement: 'push-pan-handheld',
			transition: 'hard-cut-whip-pan',
			speed: 'fast',
			colorGrading: 'vivid-contrast',
		},
		previewVideoUrl: 'https://cdn.snapvid.ai/style-presets/dynamic-preview.mp4',
	},
	{
		name: 'EMOTIONAL',
		description: '부드러운 무드와 감성적인 톤',
		styleParameters: {
			cameraMovement: 'slow-dolly',
			transition: 'film-dissolve',
			speed: 'slow',
			colorGrading: 'warm-film',
		},
		previewVideoUrl: 'https://cdn.snapvid.ai/style-presets/emotional-preview.mp4',
	},
	{
		name: 'TRENDY',
		description: '숏폼 트렌드에 맞춘 빠른 템포와 강한 임팩트',
		styleParameters: {
			cameraMovement: 'quick-zoom-spin',
			transition: 'glitch-pop',
			speed: 'very-fast',
			colorGrading: 'teal-orange-pop',
		},
		previewVideoUrl: 'https://cdn.snapvid.ai/style-presets/trendy-preview.mp4',
	},
	{
		name: 'PREMIUM',
		description: '광고 영상 수준의 고급스러운 조명과 무드',
		styleParameters: {
			cameraMovement: 'cinematic-slider',
			transition: 'elegant-fade',
			speed: 'normal-slow',
			colorGrading: 'luxury-gold',
		},
		previewVideoUrl: 'https://cdn.snapvid.ai/style-presets/premium-preview.mp4',
	},
]

export async function seedStylePresets(): Promise<void> {
	for (const seed of STYLE_PRESET_SEEDS) {
		const existing = await db.query.stylePresets.findFirst({
			where: eq(stylePresets.name, seed.name),
		})

		if (existing) {
			await db
				.update(stylePresets)
				.set({
					description: seed.description,
					styleParameters: seed.styleParameters,
					previewVideoUrl: seed.previewVideoUrl,
					isActive: true,
					updatedAt: new Date(),
				})
				.where(eq(stylePresets.id, existing.id))

			logger.info(
				{
					action: 'updated',
					entity: 'style_preset',
					seed_name: seed.name,
				},
				'updated style preset',
			)
			continue
		}

		await db.insert(stylePresets).values({
			name: seed.name,
			description: seed.description,
			styleParameters: seed.styleParameters,
			previewVideoUrl: seed.previewVideoUrl,
			isActive: true,
		})

		logger.info(
			{
				action: 'inserted',
				entity: 'style_preset',
				seed_name: seed.name,
			},
			'inserted style preset',
		)
	}
}

async function main(): Promise<void> {
	try {
		await seedStylePresets()
		logger.info(
			{
				entity: 'style_preset',
				total_records: STYLE_PRESET_SEEDS.length,
			},
			'style preset seed complete',
		)
	} finally {
		await closeConnection()
	}
}

const entrypoint = process.argv[1] ?? ''
if (import.meta.url === `file://${entrypoint}`) {
	void main()
}
