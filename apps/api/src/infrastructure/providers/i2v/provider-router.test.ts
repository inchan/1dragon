import { PlanTier } from '@snapvid/shared'
import { describe, expect, it, vi } from 'vitest'
import type { I2VGenerateInput, I2VGenerateOutput, I2VPort } from '@/domain/media/ports.js'
import { I2VProviderError } from './base-provider.js'
import { AllI2VProvidersFailedError, ProviderRouter } from './provider-router.js'

class StubProvider implements I2VPort {
	public constructor(
		private readonly provider: I2VGenerateInput['provider'],
		private readonly fn: (input: I2VGenerateInput) => Promise<I2VGenerateOutput>,
	) {}

	public async generate(input: I2VGenerateInput): Promise<I2VGenerateOutput> {
		return this.fn({
			...input,
			provider: this.provider,
		})
	}
}

function buildSuccess(provider: I2VGenerateInput['provider']): I2VGenerateOutput {
	return {
		provider,
		clipUrl: `https://cdn.example.com/${provider.toLowerCase()}.mp4`,
		durationSec: 10,
		metadata: {},
	}
}

describe('ProviderRouter', () => {
	it('uses first-video best-foot-forward runway first', async () => {
		const runway = vi.fn(async () => buildSuccess('RUNWAY'))
		const router = new ProviderRouter({
			RUNWAY: new StubProvider('RUNWAY', runway),
			HAILUO: new StubProvider('HAILUO', async () => buildSuccess('HAILUO')),
			GEMINI_VEO: new StubProvider('GEMINI_VEO', async () => buildSuccess('GEMINI_VEO')),
			MINIMAX: new StubProvider('MINIMAX', async () => buildSuccess('MINIMAX')),
		})

		const result = await router.generateClip({
			planTier: PlanTier.FREE,
			isFirstVideo: true,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(result.provider).toBe('RUNWAY')
		expect(runway).toHaveBeenCalledTimes(1)
	})

	it('fails over to next provider when primary fails', async () => {
		// PAID_CHAIN order: RUNWAY → GEMINI_VEO → MINIMAX → HAILUO
		const runway = vi.fn(async () => {
			throw new I2VProviderError({ provider: 'RUNWAY', message: 'down', statusCode: 503 })
		})
		const gemini = vi.fn(async () => buildSuccess('GEMINI_VEO'))

		const router = new ProviderRouter({
			RUNWAY: new StubProvider('RUNWAY', runway),
			HAILUO: new StubProvider('HAILUO', async () => buildSuccess('HAILUO')),
			GEMINI_VEO: new StubProvider('GEMINI_VEO', gemini),
			MINIMAX: new StubProvider('MINIMAX', async () => buildSuccess('MINIMAX')),
		})

		const result = await router.generateClip({
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(result.provider).toBe('GEMINI_VEO')
		expect(router.getFailoverCount()).toBeGreaterThanOrEqual(1)
		expect(runway).toHaveBeenCalledTimes(1)
		expect(gemini).toHaveBeenCalledTimes(1)
	})

	it('uses provider-specific prompt map when fallback occurs', async () => {
		const runway = vi.fn(async () => {
			throw new I2VProviderError({ provider: 'RUNWAY', message: 'down', statusCode: 503 })
		})
		const gemini = vi.fn(async (input: I2VGenerateInput) => {
			expect(input.prompt).toBe('gemini prompt')
			return buildSuccess('GEMINI_VEO')
		})

		const router = new ProviderRouter({
			RUNWAY: new StubProvider('RUNWAY', runway),
			HAILUO: new StubProvider('HAILUO', async () => buildSuccess('HAILUO')),
			GEMINI_VEO: new StubProvider('GEMINI_VEO', gemini),
			MINIMAX: new StubProvider('MINIMAX', async () => buildSuccess('MINIMAX')),
		})

		const result = await router.generateClip({
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: {
				RUNWAY: 'runway prompt',
				HAILUO: 'hailuo prompt',
				GEMINI_VEO: 'gemini prompt',
				MINIMAX: 'minimax prompt',
			},
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(result.provider).toBe('GEMINI_VEO')
	})

	it('runs runway fail -> hailuo success integration path', async () => {
		const runway = vi.fn(async () => {
			throw new I2VProviderError({ provider: 'RUNWAY', message: 'down', statusCode: 503 })
		})
		const gemini = vi.fn(async () => {
			throw new I2VProviderError({ provider: 'GEMINI_VEO', message: 'down', statusCode: 503 })
		})
		const minimax = vi.fn(async () => {
			throw new I2VProviderError({ provider: 'MINIMAX', message: 'down', statusCode: 503 })
		})
		const hailuo = vi.fn(async () => buildSuccess('HAILUO'))

		const router = new ProviderRouter({
			RUNWAY: new StubProvider('RUNWAY', runway),
			HAILUO: new StubProvider('HAILUO', hailuo),
			GEMINI_VEO: new StubProvider('GEMINI_VEO', gemini),
			MINIMAX: new StubProvider('MINIMAX', minimax),
		})

		const result = await router.generateClip({
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(runway).toHaveBeenCalledTimes(1)
		expect(gemini).toHaveBeenCalledTimes(1)
		expect(minimax).toHaveBeenCalledTimes(1)
		expect(hailuo).toHaveBeenCalledTimes(1)
		expect(result.provider).toBe('HAILUO')
	})

	it('opens circuit breaker after threshold failures and recovers to half-open', async () => {
		// PAID_CHAIN order: RUNWAY is primary — test circuit breaker on the primary
		let failed = true
		const runway = vi.fn(async () => {
			if (failed) {
				throw new I2VProviderError({ provider: 'RUNWAY', message: 'down', statusCode: 503 })
			}
			return buildSuccess('RUNWAY')
		})

		const router = new ProviderRouter(
			{
				RUNWAY: new StubProvider('RUNWAY', runway),
				HAILUO: new StubProvider('HAILUO', async () => buildSuccess('HAILUO')),
				GEMINI_VEO: new StubProvider('GEMINI_VEO', async () => buildSuccess('GEMINI_VEO')),
				MINIMAX: new StubProvider('MINIMAX', async () => buildSuccess('MINIMAX')),
			},
			{ failureThreshold: 2, openDurationMs: 10 },
		)

		await router.generateClip({
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})
		await router.generateClip({
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(router.getCircuitStates().RUNWAY).toBe('OPEN')

		await new Promise((resolve) => setTimeout(resolve, 15))
		failed = false

		const result = await router.generateClip({
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(result.provider).toBe('RUNWAY')
		expect(router.getCircuitStates().RUNWAY).toBe('CLOSED')
	})

	it('throws all providers failed error when chain exhausted', async () => {
		const fail = async (provider: I2VGenerateInput['provider']) => {
			throw new I2VProviderError({ provider, message: 'down', statusCode: 503 })
		}

		const router = new ProviderRouter({
			RUNWAY: new StubProvider('RUNWAY', () => fail('RUNWAY')),
			HAILUO: new StubProvider('HAILUO', () => fail('HAILUO')),
			GEMINI_VEO: new StubProvider('GEMINI_VEO', () => fail('GEMINI_VEO')),
			MINIMAX: new StubProvider('MINIMAX', () => fail('MINIMAX')),
		})

		await expect(
			router.generateClip({
				planTier: PlanTier.STARTER,
				isFirstVideo: false,
				imageUrl: 'https://cdn.example.com/product.png',
				prompt: 'ad',
				durationSec: 10,
				aspectRatio: '9:16',
				fps: 30,
			}),
		).rejects.toBeInstanceOf(AllI2VProvidersFailedError)
	})
})
