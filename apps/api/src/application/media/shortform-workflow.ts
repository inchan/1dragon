import { ProductCategory, type ProductCategory as ProductCategoryType } from '@1dragon/shared'

export const SHORTFORM_WORKFLOW_STAGES = [
	'리서치',
	'기획',
	'피드백',
	'재기획',
	'개발',
	'QA',
	'피드빅',
	'코드리뷰',
	'퀄리키 개발',
	'QA',
	'회고',
	'에이전트업데이트',
] as const

const TREND_SOURCE_LINKS = [
	'https://ads.tiktok.com/business/en-US/next',
	'https://newsroom.tiktok.com/tiktok-next-report-2026-latam',
	'https://ads.tiktok.com/business/creativecenter/hashtag/ootd/pc/en?countryCode=KR&period=120',
	'https://ads.tiktok.com/business/creativecenter/hashtag/outfit/pc/en?countryCode=KR&period=120',
	'https://blog.youtube/news-and-events/new-shorts-creation-tools-2025/',
] as const

const SHORTFORM_CATEGORY_SET = new Set<ProductCategoryType>([ProductCategory.FASHION])

type CopySpec = {
	readonly hook: string
	readonly description: string
	readonly cta: string
}

export type ShortformCreativeContext = {
	readonly location?: string
	readonly profession?: string
	readonly identity?: string
	readonly traits?: ReadonlyArray<string>
	readonly visualStyle?: string
}

export type ShortformWorkflowInput = {
	readonly enabled: boolean
	readonly productCategory: ProductCategoryType
	readonly moods: ReadonlyArray<string>
	readonly keywords: ReadonlyArray<string>
	readonly copy: CopySpec
	readonly context?: ShortformCreativeContext
}

export type ShortformWorkflowOutput = {
	readonly enabled: boolean
	readonly workflowStages: ReadonlyArray<string>
	readonly trendSources: ReadonlyArray<string>
	readonly trendSnapshotDate: string
	readonly moods: ReadonlyArray<string>
	readonly keywords: ReadonlyArray<string>
	readonly copy: CopySpec
	readonly promptDirectives: ReadonlyArray<string>
}

function cleanText(value: string | undefined): string {
	return value?.trim() ?? ''
}

function appendUnique(base: ReadonlyArray<string>, extras: ReadonlyArray<string>): string[] {
	const seen = new Set<string>()
	const output: string[] = []

	for (const raw of [...base, ...extras]) {
		const normalized = raw.trim()
		if (normalized.length === 0) {
			continue
		}
		const key = normalized.toLowerCase()
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		output.push(normalized)
	}

	return output
}

function withChallengeCta(cta: string): string {
	const normalized = cta.trim()
	if (normalized.length === 0) {
		return '댓글로 A/B 코디를 골라주세요.'
	}
	if (/(댓글|comment|A\/B|골라)/i.test(normalized)) {
		return normalized
	}
	return `${normalized} 댓글로 A/B 코디를 골라주세요.`
}

export function applyShortformWorkflow(input: ShortformWorkflowInput): ShortformWorkflowOutput {
	const shouldApply = input.enabled && SHORTFORM_CATEGORY_SET.has(input.productCategory)
	if (!shouldApply) {
		return {
			enabled: false,
			workflowStages: [],
			trendSources: [],
			trendSnapshotDate: '',
			moods: [...input.moods],
			keywords: [...input.keywords],
			copy: input.copy,
			promptDirectives: [],
		}
	}

	const location = cleanText(input.context?.location) || '성수동, 서울'
	const profession = cleanText(input.context?.profession) || '하이패션 모델'
	const identity = cleanText(input.context?.identity) || '한국인 성인 여성'
	const visualStyle = cleanText(input.context?.visualStyle) || '실사 하이패션 에디토리얼'
	const traits = appendUnique(input.context?.traits ?? [], ['개성이 뚜렷한 분위기', '아름다운 오리상 매력'])

	const moodSet = appendUnique(input.moods, ['ENERGETIC', 'PLAYFUL', 'WARM'])
	const keywordSet = appendUnique(input.keywords, [
		'ootd',
		'grwm',
		'fit-check',
		'댓글 챌린지',
		'성수 패션',
	])

	const hook = cleanText(input.copy.hook) || '성수 OOTD 핏체크 시작'
	const description = appendUnique(
		[cleanText(input.copy.description)],
		[`${location} 스트리트 무드`, `${profession} 워킹`, 'OOTD + GRWM 쇼츠 스토리텔링'],
	).join(' | ')
	const cta = withChallengeCta(cleanText(input.copy.cta))

	const promptDirectives = [
		`Workflow execution order: ${SHORTFORM_WORKFLOW_STAGES.join(' -> ')}.`,
		`Trend snapshot date: 2026-02-20. Official references: ${TREND_SOURCE_LINKS.join(' | ')}.`,
		`Location direction: ${location} urban fashion street vibe with trendy cafe/storefront background.`,
		`Talent direction: ${identity}, profession ${profession}, traits ${traits.join(', ')}.`,
		`Visual direction: ${visualStyle}; photorealistic live-action texture, natural handheld micro-motion, short-form social pacing.`,
		'Trend mix direction: OOTD fit-check + GRWM rhythm + comment challenge CTA.',
		'Scene timeline: 0-1.5s hook entrance, 1.5-3.5s walk and spin fit-check, 3.5-5.0s confident close-up with challenge CTA.',
		'Caption sticker direction: "성수 OOTD", "하이패션 무드", "오늘 코디 어때?" in upper safe zone.',
	].map((value) => value.trim())

	return {
		enabled: true,
		workflowStages: [...SHORTFORM_WORKFLOW_STAGES],
		trendSources: [...TREND_SOURCE_LINKS],
		trendSnapshotDate: '2026-02-20',
		moods: moodSet,
		keywords: keywordSet,
		copy: {
			hook,
			description,
			cta,
		},
		promptDirectives,
	}
}
