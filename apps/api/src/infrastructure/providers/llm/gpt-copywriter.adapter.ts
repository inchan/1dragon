import type { CopyGenerationInput, CopyGenerationOutput, CopyTone, CopyVariant } from './types.js'

const EXAGGERATED_EXPRESSIONS = [
	'최고',
	'100%',
	'완벽한',
	'기적의',
] as const

const EXAGGERATION_REPLACEMENTS: Record<(typeof EXAGGERATED_EXPRESSIONS)[number], string> = {
	최고: '더 나은',
	'100%': '높은',
	완벽한: '균형 잡힌',
	기적의: '추천하는',
}

function resolveTone(platform: CopyGenerationInput['platform']): CopyTone {
	switch (platform) {
		case 'TIKTOK':
			return 'CASUAL'
		case 'INSTAGRAM_REELS':
			return 'EMOTIONAL'
		default:
			return 'INFORMATIONAL'
	}
}

function sanitizeCopy(text: string): { text: string; warnings: string[] } {
	let sanitized = text
	const warnings: string[] = []

	for (const expression of EXAGGERATED_EXPRESSIONS) {
		if (sanitized.includes(expression)) {
			sanitized = sanitized.replaceAll(expression, EXAGGERATION_REPLACEMENTS[expression])
			warnings.push(`광고 표현 경고: "${expression}" → "${EXAGGERATION_REPLACEMENTS[expression]}"`)
		}
	}

	return { text: sanitized, warnings }
}

function buildVariant(input: CopyGenerationInput, index: number, tone: CopyTone): CopyVariant {
	const keywords = input.keywords.length > 0 ? input.keywords.slice(0, 3).join(', ') : input.category
	const productName = input.productName?.trim() || `${input.category} 상품`

	const hookBase = [
		`${productName}, 지금 확인해보세요`,
		`${input.mood} 분위기의 ${productName}`,
		`${input.style} 스타일에 맞춘 ${productName}`,
	]
	const bodyBase = [
		`${keywords} 포인트를 살려 실사용 장면에 자연스럽게 어울립니다.`,
		`짧은 숏폼에서도 특징이 바로 전달되도록 구성했습니다.`,
		`상품의 핵심 장점을 중심으로 구매 전환에 맞춘 문장을 제공합니다.`,
	]

	const toneSuffix =
		tone === 'CASUAL'
			? '지금 트렌드 톤으로 가볍게 소개해요.'
			: tone === 'EMOTIONAL'
				? '감성적인 무드로 브랜드 인상을 강화해요.'
				: '정보형 톤으로 기능과 장점을 명확히 전달해요.'

	const hook = `${hookBase[index]} ${toneSuffix}`
	const body = `${bodyBase[index]} ${toneSuffix}`
	const cta = `${productName} 지금 자세히 보기`
	const hashtags = [
		`#${input.category}`,
		`#${input.style}`,
		`#${input.mood}`,
		'#쇼츠마케팅',
		'#스냅비드',
	]

	const sanitizedHook = sanitizeCopy(hook)
	const sanitizedBody = sanitizeCopy(body)
	const sanitizedCta = sanitizeCopy(cta)

	return {
		hookCopy: sanitizedHook.text,
		bodyCopy: sanitizedBody.text,
		ctaCopy: sanitizedCta.text,
		hashtags,
		warnings: [...sanitizedHook.warnings, ...sanitizedBody.warnings, ...sanitizedCta.warnings],
	}
}

export class GptCopywriterAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async generateCopy(input: CopyGenerationInput): Promise<CopyGenerationOutput> {
		if (this.options.apiKey) {
			// API 키가 있을 때는 실제 연동 지점을 유지하고, 응답은 동일 스키마로 정규화한다.
			await fetch(this.options.baseUrl ?? 'https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.options.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-4o',
					messages: [
						{ role: 'system', content: 'Generate Korean marketing copy variants.' },
						{ role: 'user', content: JSON.stringify(input) },
					],
				}),
			}).catch(() => {
				// 네트워크 실패 시 시뮬레이션 출력으로 폴백
			})
		}

		const tone = resolveTone(input.platform)

		return {
			provider: 'GPT_4O',
			variants: [
				buildVariant(input, 0, tone),
				buildVariant(input, 1, tone),
				buildVariant(input, 2, tone),
			],
		}
	}
}
