import { ProductCategory, Mood, StylePreset } from '@snapvid/shared'
import type { VisionAnalysisOutput, VisionAnalyzerInput, VisionAnalyzerPort } from '@/domain/product/ports.js'

export class ClaudeVisionAdapter implements VisionAnalyzerPort {
	public async analyze(input: VisionAnalyzerInput): Promise<VisionAnalysisOutput> {
		return {
			category: input.categoryHint ?? ProductCategory.OTHER,
			keywords: ['pending', 'analysis'],
			moods: [Mood.PROFESSIONAL],
			colors: ['#ffffff'],
			targetAudience: 'general',
			suggestedStyles: [StylePreset.SIMPLE],
			isProductImage: true,
			confidence: 0.75,
		}
	}
}
