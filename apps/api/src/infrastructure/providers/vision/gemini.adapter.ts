import { ProductCategory, Mood, StylePreset } from '@snapvid/shared'
import type { VisionAnalysisOutput, VisionAnalyzerInput, VisionAnalyzerPort } from '@/domain/product/ports.js'

export class GeminiVisionAdapter implements VisionAnalyzerPort {
	public async analyze(input: VisionAnalyzerInput): Promise<VisionAnalysisOutput> {
		return {
			category: input.categoryHint ?? ProductCategory.OTHER,
			keywords: ['fallback', 'vision'],
			moods: [Mood.CALM],
			colors: ['#ffffff'],
			targetAudience: 'general',
			suggestedStyles: [StylePreset.DYNAMIC],
			isProductImage: true,
			confidence: 0.68,
		}
	}
}
