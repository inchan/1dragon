import { PlanTier } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import type {
	ComposerPort,
	I2VGenerateOutput,
	PromptBuilderPort,
	RemoveBgPort,
} from '@/domain/media/ports.js'
import { GenerateVideoUseCase } from './generate-video.usecase.js'
import { QualityControlService } from './quality-control.js'

class StubPromptBuilder implements PromptBuilderPort {
	public async build() {
		return {
			runway: 'runway prompt',
			hailuo: 'hailuo prompt',
			geminiVeo: 'gemini prompt',
			minimax: 'minimax prompt',
		}
	}
}

class StubRouter {
	public async generateClip(): Promise<I2VGenerateOutput> {
		return {
			provider: 'RUNWAY',
			clipUrl: 'https://cdn.example.com/clip.mp4',
			durationSec: 10,
			metadata: {},
		}
	}
}

class StubComposer implements ComposerPort {
	public async compose() {
		return {
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			durationSec: 30,
			width: 1080,
			height: 1920,
		}
	}

	public async renderVariant() {
		return { variantUrl: 'https://cdn.example.com/variant.mp4' }
	}
}

class StubRemoveBg implements RemoveBgPort {
	public async removeBackground() {
		return {
			imageUrl: 'https://cdn.example.com/foreground.png',
			transparentBackground: true,
		}
	}
}

describe('GenerateVideoUseCase', () => {
	it('orchestrates end-to-end generation pipeline', async () => {
		const useCase = new GenerateVideoUseCase(
			new StubPromptBuilder(),
			new StubRouter(),
			new StubComposer(),
			new StubRemoveBg(),
			new QualityControlService(0.5),
		)

		const result = await useCase.execute({
			jobId: 'job_1',
			userId: 'user_1',
			planTier: PlanTier.STARTER,
			isFirstVideo: true,
			inputImageUrl: 'https://cdn.example.com/input.png',
			stylePreset: 'TRENDY',
			productCategory: 'FASHION',
			moods: ['TRENDY'],
			keywords: ['dress'],
			copy: {
				hook: 'hook',
				description: 'desc',
				cta: 'cta',
			},
			includeWatermark: false,
		})

		expect(result.events.length).toBeGreaterThanOrEqual(5)
		expect(['SUCCEEDED', 'DEGRADED_FAILED']).toContain(result.status)
		expect(result.job.result?.masterAsset.url).toBe('https://cdn.example.com/master.mp4')
	})
})
