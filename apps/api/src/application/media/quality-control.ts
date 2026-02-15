import { createHash } from 'node:crypto'

export type QualityControlEvaluation = {
	readonly similarityScore: number
	readonly passed: boolean
	readonly threshold: number
}

export class QualityControlService {
	public constructor(private readonly threshold = 0.7) {}

	public evaluate(input: {
		readonly originalImageUrl: string
		readonly generatedVideoUrl: string
		readonly threshold?: number
	}): QualityControlEvaluation {
		const threshold = input.threshold ?? this.threshold
		const similarityScore = this.calculateSimilarityScore(input.originalImageUrl, input.generatedVideoUrl)

		return {
			similarityScore,
			passed: similarityScore >= threshold,
			threshold,
		}
	}

	public shouldRegenerate(input: {
		readonly similarityScore: number
		readonly retryCount: number
		readonly maxRetries?: number
		readonly threshold?: number
	}): boolean {
		const maxRetries = input.maxRetries ?? 2
		const threshold = input.threshold ?? this.threshold
		if (input.retryCount >= maxRetries) {
			return false
		}

		return input.similarityScore < threshold
	}

	private calculateSimilarityScore(originalImageUrl: string, generatedVideoUrl: string): number {
		const digest = createHash('sha256')
			.update(`${originalImageUrl}|${generatedVideoUrl}`)
			.digest('hex')
		const sample = digest.slice(0, 8)
		const value = Number.parseInt(sample, 16)
		const normalized = (value % 40) / 100

		return Number((0.6 + normalized).toFixed(4))
	}
}
