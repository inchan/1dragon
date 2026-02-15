import type { JobStatus } from '@/domain/media'

export type RetryGenerationInput = {
	readonly currentStatus: JobStatus
	readonly currentRetryCount: number
	readonly similarityScore?: number | null
	readonly maxRetries?: number
	readonly baseDelaySec?: number
}

export type RetryGenerationOutput = {
	readonly shouldRetry: boolean
	readonly nextRetryCount: number
	readonly nextDelaySec: number | null
	readonly nextRetryAt: Date | null
	readonly reason: string
}

export class RetryGenerationUseCase {
	public execute(input: RetryGenerationInput): RetryGenerationOutput {
		const maxRetries = input.maxRetries ?? 2
		const baseDelaySec = input.baseDelaySec ?? 30
		const score = input.similarityScore ?? null

		const retryableStatus =
			input.currentStatus === 'FAILED' || input.currentStatus === 'DEGRADED_FAILED'
		const needsQualityRetry = score !== null && score < 0.7

		if (!retryableStatus && !needsQualityRetry) {
			return {
				shouldRetry: false,
				nextRetryCount: input.currentRetryCount,
				nextDelaySec: null,
				nextRetryAt: null,
				reason: 'retry 조건이 아닙니다',
			}
		}

		if (input.currentRetryCount >= maxRetries) {
			return {
				shouldRetry: false,
				nextRetryCount: input.currentRetryCount,
				nextDelaySec: null,
				nextRetryAt: null,
				reason: '최대 재시도 횟수에 도달했습니다',
			}
		}

		const nextRetryCount = input.currentRetryCount + 1
		const nextDelaySec = baseDelaySec * 2 ** input.currentRetryCount
		const nextRetryAt = new Date(Date.now() + nextDelaySec * 1000)

		return {
			shouldRetry: true,
			nextRetryCount,
			nextDelaySec,
			nextRetryAt,
			reason: needsQualityRetry
				? '품질 점수 미달로 재시도합니다'
				: '실패 상태로 재시도합니다',
		}
	}
}
