import type { ModelImageGenerationQualitySignals } from '@/domain/model-persona/ports.js'

export type CompositeQualityEvaluation = {
	readonly score: number
	readonly passed: boolean
	readonly breakdown: {
		readonly visibilityScore: number
		readonly naturalnessScore: number
		readonly artifactScore: number
	}
}

function normalizeScore(score: number): number {
	if (!Number.isFinite(score)) {
		return 0
	}

	return Math.max(0, Math.min(1, score))
}

export class CompositeQualityValidator {
	public constructor(private readonly threshold = 0.6) {}

	public evaluate(signals: ModelImageGenerationQualitySignals): CompositeQualityEvaluation {
		const visibilityScore = normalizeScore(signals.visibilityScore)
		const naturalnessScore = normalizeScore(signals.naturalnessScore)
		const artifactScore = normalizeScore(signals.artifactScore)

		const score =
			visibilityScore * 0.45 +
			naturalnessScore * 0.35 +
			artifactScore * 0.2

		return {
			score,
			passed: score >= this.threshold,
			breakdown: {
				visibilityScore,
				naturalnessScore,
				artifactScore,
			},
		}
	}

	public buildAdjustmentHint(signals: ModelImageGenerationQualitySignals): string {
		const visibility = normalizeScore(signals.visibilityScore)
		const naturalness = normalizeScore(signals.naturalnessScore)
		const artifact = normalizeScore(signals.artifactScore)

		if (visibility < 0.6) {
			return 'Increase product visibility and front-facing composition.'
		}

		if (naturalness < 0.6) {
			return 'Improve pose and lighting realism for natural integration.'
		}

		if (artifact < 0.6) {
			return 'Reduce generation artifacts and keep clean edges.'
		}

		return 'Preserve product details and keep image photorealistic.'
	}
}
