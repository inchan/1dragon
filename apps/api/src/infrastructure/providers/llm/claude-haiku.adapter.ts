import type { CopyGenerationInput, CopyGenerationOutput, CopyVariant } from './types.js'

function fallbackVariant(input: CopyGenerationInput, index: number): CopyVariant {
	const productName = input.productName?.trim() || `${input.category} 상품`
	const keywords = input.keywords.length > 0 ? input.keywords.join(', ') : input.category

	return {
		hookCopy: `${productName} 핵심 포인트 ${index + 1}`,
		bodyCopy: `${keywords} 중심으로 짧고 명확한 설명을 제공합니다.`,
		ctaCopy: `${productName} 지금 확인하기`,
		hashtags: ['#제품소개', '#숏폼', '#마케팅', '#클로드폴백', '#스냅비드'],
		warnings: [],
	}
}

export class ClaudeHaikuCopywriterAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async generateCopy(input: CopyGenerationInput): Promise<CopyGenerationOutput> {
		if (this.options.apiKey) {
			await fetch(this.options.baseUrl ?? 'https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': this.options.apiKey,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'claude-3-haiku-20240307',
					max_tokens: 800,
					messages: [{ role: 'user', content: JSON.stringify(input) }],
				}),
			}).catch(() => {
				// 실패 시 로컬 폴백
			})
		}

		return {
			provider: 'CLAUDE_HAIKU',
			variants: [fallbackVariant(input, 0), fallbackVariant(input, 1), fallbackVariant(input, 2)],
		}
	}
}
