import { PlanTier } from '@snapvid/shared'
import { describe, expect, it } from 'vitest'
import type { ComposerPort } from '@/domain/media/ports.js'
import { RenderVariantsUseCase } from './render-variants.usecase.js'

class StubComposer implements ComposerPort {
	public async compose() {
		return {
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			durationSec: 30,
			width: 1080,
			height: 1920,
		}
	}

	public async renderVariant(input: {
		readonly masterVideoUrl: string
		readonly platform: 'TIKTOK' | 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS'
	}) {
		return { variantUrl: `${input.masterVideoUrl}?platform=${input.platform.toLowerCase()}` }
	}
}

describe('RenderVariantsUseCase', () => {
	it('renders one variant for free plan and three for starter', async () => {
		const useCase = new RenderVariantsUseCase(new StubComposer())

		const free = await useCase.execute({
			jobId: 'job_free',
			planTier: PlanTier.FREE,
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			durationSec: 15,
			width: 1080,
			height: 1920,
			includeWatermark: false,
		})
		expect(free.variants).toHaveLength(1)
		expect(free.variants[0]?.hasWatermark).toBe(true)

		const starter = await useCase.execute({
			jobId: 'job_starter',
			planTier: PlanTier.STARTER,
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			durationSec: 30,
			width: 1080,
			height: 1920,
			includeWatermark: false,
		})
		expect(starter.variants).toHaveLength(3)
		expect(starter.variants[0]?.hasWatermark).toBe(false)
	})
})
