import { performance } from 'node:perf_hooks'
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

class BenchmarkPromptBuilder implements PromptBuilderPort {
	public async build() {
		return {
			runway: 'runway prompt',
			hailuo: 'hailuo prompt',
			geminiVeo: 'gemini prompt',
			minimax: 'minimax prompt',
		}
	}
}

class BenchmarkRouter {
	public async generateClip(): Promise<I2VGenerateOutput> {
		return {
			provider: 'RUNWAY',
			clipUrl: 'https://cdn.example.com/clip.mp4',
			durationSec: 10,
			metadata: {},
		}
	}
}

class BenchmarkComposer implements ComposerPort {
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

class BenchmarkRemoveBg implements RemoveBgPort {
	public async removeBackground() {
		return {
			imageUrl: 'https://cdn.example.com/foreground.png',
			transparentBackground: true,
		}
	}
}

describe('video generation benchmark', () => {
	it('keeps P95 generation time under 90 seconds', async () => {
		const useCase = new GenerateVideoUseCase(
			new BenchmarkPromptBuilder(),
			new BenchmarkRouter(),
			new BenchmarkComposer(),
			new BenchmarkRemoveBg(),
			new QualityControlService(0.95),
		)

		const durations: number[] = []

		for (let index = 0; index < 20; index += 1) {
			const start = performance.now()
			await useCase.execute({
				jobId: `job_${index}`,
				userId: 'user_1',
				planTier: PlanTier.STARTER,
				isFirstVideo: index === 0,
				inputImageUrl: 'https://cdn.example.com/input.png',
				stylePreset: 'TRENDY',
				productCategory: 'FASHION',
				moods: ['TRENDY'],
				keywords: ['dress'],
				copy: {
					hook: 'hook',
					description: 'description',
					cta: 'cta',
				},
				includeWatermark: false,
			})
			durations.push(performance.now() - start)
		}

		const sorted = [...durations].sort((a, b) => a - b)
		const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
		const p95 = sorted[p95Index] ?? 0

		expect(p95).toBeLessThanOrEqual(90_000)
	})
})
