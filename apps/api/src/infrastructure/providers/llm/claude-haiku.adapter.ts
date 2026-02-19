import type { CopyGenerationInput, CopyGenerationOutput, CopyVariant } from './types.js'

const PLATFORM_TONE: Record<string, string> = {
	TIKTOK: '트렌디하고 캐주얼한 톤으로, Z세대가 공감하는 언어로',
	INSTAGRAM_REELS: '감성적이고 미적인 톤으로, 브랜드 무드를 강조하여',
	YOUTUBE_SHORTS: '정보 전달 위주의 톤으로, 기능과 장점을 명확하게',
}

function buildSystemPrompt(): string {
	return [
		'당신은 한국 이커머스 숏폼 광고 전문 카피라이터입니다.',
		'인플루언서 스타일의 광고 카피를 작성합니다.',
		'각 카피 세트는 반드시 JSON 배열 형식으로만 응답하세요.',
	].join(' ')
}

function buildUserPrompt(input: CopyGenerationInput): string {
	const tone = PLATFORM_TONE[input.platform] ?? '자연스러운 톤으로'
	const keywords = input.keywords.slice(0, 3).join(', ') || input.category
	const productName = input.productName?.trim() || `${input.category} 상품`

	return [
		`상품: ${productName}`,
		`카테고리: ${input.category}`,
		`키워드: ${keywords}`,
		`분위기: ${input.mood}`,
		`스타일: ${input.style}`,
		`플랫폼: ${input.platform} (${tone})`,
		'',
		`다음 형식으로 3가지 카피 세트를 JSON 배열로 작성하세요:`,
		`[`,
		`  {`,
		`    "hookCopy": "Hook 문구 (1~2문장, 0~3초, 시선을 사로잡는 문장)",`,
		`    "bodyCopy": "본문 (2~3문장, 상품 가치와 사용 맥락 설명)",`,
		`    "ctaCopy": "CTA (짧은 행동 유도 문구)",`,
		`    "hashtags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"]`,
		`  }`,
		`]`,
	].join('\n')
}

function parseApiResponse(text: string): CopyVariant[] | null {
	try {
		const jsonMatch = text.match(/\[[\s\S]*\]/)
		if (!jsonMatch) {
			return null
		}
		const parsed = JSON.parse(jsonMatch[0]) as unknown[]
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return null
		}

		return parsed
			.filter((item) => item !== null && typeof item === 'object')
			.map((item) => {
				const obj = item as Record<string, unknown>
				return {
					hookCopy: typeof obj.hookCopy === 'string' ? obj.hookCopy : '',
					bodyCopy: typeof obj.bodyCopy === 'string' ? obj.bodyCopy : '',
					ctaCopy: typeof obj.ctaCopy === 'string' ? obj.ctaCopy : '',
					hashtags: Array.isArray(obj.hashtags)
						? obj.hashtags.filter((h): h is string => typeof h === 'string')
						: [],
					warnings: [],
				}
			})
			.filter((v) => v.hookCopy.length > 0)
	} catch {
		return null
	}
}

function fallbackVariant(input: CopyGenerationInput, index: number): CopyVariant {
	const productName = input.productName?.trim() || `${input.category} 상품`
	const keywords = input.keywords.length > 0 ? input.keywords.slice(0, 3).join(', ') : input.category

	const hooks = [
		`${productName}, 지금 이 순간을 위해`,
		`${keywords} 포인트, ${productName}로 완성`,
		`${productName} 하나면 충분합니다`,
	]
	const bodies = [
		`${keywords} 특징을 살려 자연스럽게 어울립니다. 매일 입고 싶은 퀄리티.`,
		`짧은 숏폼에서도 바로 전달되는 핵심 포인트. 한 번 써보면 알아요.`,
		`상품의 핵심 장점을 중심으로, 구매 전환까지 연결되는 구성.`,
	]

	return {
		hookCopy: hooks[index % hooks.length] ?? `${productName} 핵심 포인트 ${index + 1}`,
		bodyCopy: bodies[index % bodies.length] ?? `${keywords} 중심으로 짧고 명확한 설명.`,
		ctaCopy: `${productName} 지금 확인하기`,
		hashtags: [`#${input.category}`, `#${input.style}`, `#${input.mood}`, '#숏폼마케팅', '#스냅비드'],
		warnings: [],
	}
}

type AnthropicMessage = {
	content: Array<{ type: string; text?: string }>
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
			try {
				const response = await fetch(
					this.options.baseUrl ?? 'https://api.anthropic.com/v1/messages',
					{
						method: 'POST',
						headers: {
							'x-api-key': this.options.apiKey,
							'anthropic-version': '2023-06-01',
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							model: 'claude-haiku-4-5-20251001',
							max_tokens: 1200,
							system: buildSystemPrompt(),
							messages: [{ role: 'user', content: buildUserPrompt(input) }],
						}),
					},
				)

				if (response.ok) {
					const data = (await response.json()) as AnthropicMessage
					const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
					const parsed = parseApiResponse(text)

					if (parsed && parsed.length > 0) {
						const variants = [
							parsed[0] ?? fallbackVariant(input, 0),
							parsed[1] ?? fallbackVariant(input, 1),
							parsed[2] ?? fallbackVariant(input, 2),
						]

						return { provider: 'CLAUDE_HAIKU', variants }
					}
				}
			} catch {
				// API 실패 시 폴백 사용
			}
		}

		return {
			provider: 'CLAUDE_HAIKU',
			variants: [fallbackVariant(input, 0), fallbackVariant(input, 1), fallbackVariant(input, 2)],
		}
	}
}
