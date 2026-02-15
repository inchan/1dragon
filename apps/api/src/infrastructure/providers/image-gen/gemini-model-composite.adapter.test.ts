import { ProductCategory } from '@snapvid/shared'
import { describe, expect, it } from 'vitest'
import { GeminiModelCompositeAdapter } from './gemini-model-composite.adapter.js'

describe('providers/image-gen/gemini-model-composite.adapter', () => {
	it('interpolates prompt and returns deterministic image url', async () => {
		const adapter = new GeminiModelCompositeAdapter()
		const result = await adapter.generateComposite({
			productImageUrl: 'https://cdn.example.com/product.png',
			productName: '플로럴 원피스',
			productCategory: ProductCategory.FASHION,
			productKeywords: ['floral', 'dress'],
			preset: {
				id: 'preset_1',
				gender: 'FEMALE',
				ageRange: 'YOUNG_ADULT',
				bodyType: 'SLIM',
				style: 'CASUAL',
				imagenPromptTemplate:
					'{{gender}} {{age_range}} {{style}} model with {{product_name}} in {{product_category}}: {{product_keywords}}',
			},
		})

		expect(result.provider).toBe('GEMINI_IMAGEN')
		expect(result.prompt).toContain('플로럴 원피스')
		expect(result.imageUrl).toContain('persona=preset_1')
		expect(result.qualitySignals.visibilityScore).toBeGreaterThan(0)
	})
})
