import { describe, expect, it } from 'vitest'
import { PromptBuilder } from './prompt-builder.js'

describe('PromptBuilder', () => {
	it('builds provider-specific prompts from product/style/copy context', async () => {
		const builder = new PromptBuilder()
		const output = await builder.build({
			productCategory: 'FASHION',
			moods: ['TRENDY'],
			keywords: ['dress', 'summer'],
			stylePreset: 'TRENDY',
			copy: {
				hook: '올여름 필수 원피스',
				description: '가볍고 시원한 원단',
				cta: '지금 바로 구매하세요',
			},
		})

		expect(output.runway).toContain('RUNWAY_GEN4_TURBO')
		expect(output.hailuo).toContain('HAILUO_02')
		expect(output.geminiVeo).toContain('GEMINI_VEO')
		expect(output.minimax).toContain('MINIMAX_VIDEO')
		expect(output.runway).toContain('올여름 필수 원피스')
	})
})
