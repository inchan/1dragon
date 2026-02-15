import { describe, expect, it } from 'vitest'
import { RetryGenerationUseCase } from './retry-generation.usecase.js'

describe('RetryGenerationUseCase', () => {
	it('schedules retry when failed and below max retry', () => {
		const useCase = new RetryGenerationUseCase()
		const result = useCase.execute({
			currentStatus: 'FAILED',
			currentRetryCount: 1,
			maxRetries: 3,
			baseDelaySec: 10,
		})

		expect(result.shouldRetry).toBe(true)
		expect(result.nextRetryCount).toBe(2)
		expect(result.nextDelaySec).toBe(20)
		expect(result.nextRetryAt).not.toBeNull()
	})

	it('stops retry when max retry is reached', () => {
		const useCase = new RetryGenerationUseCase()
		const result = useCase.execute({
			currentStatus: 'DEGRADED_FAILED',
			currentRetryCount: 2,
			maxRetries: 2,
			similarityScore: 0.5,
		})

		expect(result.shouldRetry).toBe(false)
		expect(result.reason).toContain('최대 재시도')
	})
})
