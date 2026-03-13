import { createHash } from 'node:crypto'
import type { StylePreset } from '@1dragon/shared'
import type {
	ConceptCandidate,
	CreativeContext,
	ReviewArtifact,
	ShotCard,
	StoryBrief,
	StoryConceptFamily,
} from '@/domain/media/planning.js'
import { STORY_CONCEPT_FAMILIES } from '@/domain/media/planning.js'

type StoryPlannerInput = {
	readonly jobId: string
	readonly inputImageUrl: string
	readonly productCategory: string
	readonly stylePreset: StylePreset
	readonly moods: ReadonlyArray<string>
	readonly keywords: ReadonlyArray<string>
	readonly copy: {
		readonly hook: string
		readonly description: string
		readonly cta: string
	}
	readonly creativeContext?: CreativeContext
	readonly targetClipCount: number
	readonly recentConceptFamilies?: ReadonlyArray<StoryConceptFamily>
	readonly requestedConceptFamily?: StoryConceptFamily
}

type StoryPlannerOutput = {
	readonly storyBrief: StoryBrief
	readonly conceptCandidates: ReadonlyArray<ConceptCandidate>
	readonly selectedConcept: ConceptCandidate
	readonly shotCards: ReadonlyArray<ShotCard>
}

function cleanText(value: string | undefined): string {
	return value?.trim() ?? ''
}

function unique(values: ReadonlyArray<string>): string[] {
	const seen = new Set<string>()
	const output: string[] = []

	for (const value of values) {
		const normalized = value.trim()
		if (!normalized) {
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

function hashIndex(seed: string, modulo: number): number {
	if (modulo <= 1) {
		return 0
	}

	const hex = createHash('sha1').update(seed).digest('hex').slice(0, 8)
	return Number.parseInt(hex, 16) % modulo
}

function buildTargetViewer(input: { productCategory: string; moods: ReadonlyArray<string> }): string {
	switch (input.productCategory.trim().toUpperCase()) {
		case 'FASHION':
			return '짧은 시간 안에 핏과 분위기를 확인하고 싶은 숏폼 패션 소비자'
		case 'BEAUTY':
			return '텍스처와 사용감이 실제로 어떤지 빠르게 판단하려는 뷰티 소비자'
		case 'ACCESSORIES':
			return '소재감과 스타일링 활용도를 짧게 확인하려는 액세서리 구매자'
		default:
			return input.moods.length > 0
				? `${input.moods.join(', ')} 무드에 반응하는 숏폼 시청자`
				: '짧은 시간 안에 제품 가치를 판단하려는 숏폼 시청자'
	}
}

function buildCorePromise(productCategory: string, description: string): string {
	switch (productCategory.trim().toUpperCase()) {
		case 'FASHION':
			return cleanText(description) || '핏, 실루엣, 움직임이 실제로 예쁘게 보이는 패션 아이템'
		case 'BEAUTY':
			return cleanText(description) || '텍스처와 결과감이 신뢰되게 전달되는 뷰티 제품'
		default:
			return cleanText(description) || '짧은 시청 안에 제품 장점이 이해되는 상품'
	}
}

function buildProofStrategy(input: {
	productCategory: string
	keywords: ReadonlyArray<string>
	creativeContext?: CreativeContext
}): string {
	const location = cleanText(input.creativeContext?.location)
	switch (input.productCategory.trim().toUpperCase()) {
		case 'FASHION':
			return `${location || '도시 일상'}에서 움직임과 핏을 동시에 보여주며 소재 디테일까지 증명한다.`
		case 'BEAUTY':
			return '손동작과 근접 샷으로 텍스처, 발림성, 마무리감을 증명한다.'
		default:
			return `실사용 맥락과 ${input.keywords[0] ?? '핵심 특징'}을 같이 보여주며 구매 이유를 증명한다.`
	}
}

function buildEmotionalPayoff(productCategory: string): string {
	switch (productCategory.trim().toUpperCase()) {
		case 'FASHION':
			return '입었을 때 바로 분위기가 살아난다는 확신'
		case 'BEAUTY':
			return '바르자마자 달라 보인다는 즉각적 만족감'
		default:
			return '짧은 시간 안에 이 제품을 써보고 싶다는 감정적 확신'
	}
}

function buildTone(stylePreset: StylePreset): string {
	switch (stylePreset) {
		case 'PREMIUM':
			return '신뢰감 있는 럭셔리 크리에이터 톤'
		case 'DYNAMIC':
			return '빠르고 직관적인 숏폼 세일즈 톤'
		case 'EMOTIONAL':
			return '감정적 몰입을 유도하는 공감형 톤'
		default:
			return '네이티브 숏폼 추천 톤'
	}
}

function buildStoryBrief(input: StoryPlannerInput): StoryBrief {
	return {
		targetViewer: buildTargetViewer({
			productCategory: input.productCategory,
			moods: input.moods,
		}),
		corePromise: buildCorePromise(input.productCategory, input.copy.description),
		hook: cleanText(input.copy.hook) || '첫 2초 안에 멈추게 하는 숏폼 훅',
		proofStrategy: buildProofStrategy({
			productCategory: input.productCategory,
			keywords: input.keywords,
			...(input.creativeContext ? { creativeContext: input.creativeContext } : {}),
		}),
		emotionalPayoff: buildEmotionalPayoff(input.productCategory),
		cta: cleanText(input.copy.cta) || '지금 확인해 보세요.',
		tone: buildTone(input.stylePreset),
		productCategory: input.productCategory,
		stylePreset: input.stylePreset,
		moods: [...input.moods],
		keywords: [...input.keywords],
		...(input.creativeContext ? { creativeContext: input.creativeContext } : {}),
	}
}

function getFamilyPool(productCategory: string): ReadonlyArray<StoryConceptFamily> {
	switch (productCategory.trim().toUpperCase()) {
		case 'FASHION':
			return ['FIT_CHECK', 'DETAIL_PROOF', 'COMMENT_CHALLENGE', 'ROUTINE_STORY']
		case 'BEAUTY':
			return ['DETAIL_PROOF', 'ROUTINE_STORY', 'SOCIAL_PROOF', 'PROBLEM_SOLUTION']
		default:
			return ['PROBLEM_SOLUTION', 'LIFESTYLE_DEMO', 'SOCIAL_PROOF', 'DETAIL_PROOF']
	}
}

function createCandidate(
	family: StoryConceptFamily,
	brief: StoryBrief,
	index: number,
): ConceptCandidate {
	switch (family) {
		case 'FIT_CHECK':
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '착용/활용 순간에서 핏과 움직임을 먼저 증명하는 이야기',
				hook: `${brief.hook} 지금 핏부터 보세요.`,
				proofBeat: '걷기, 턴, 소재 터치로 실루엣과 움직임을 증명한다.',
				emotionalPayoff: '입는 순간 자신감이 올라가는 느낌을 준다.',
				cta: brief.cta,
				rationale: ['핏 중심 카테고리에서 즉시성 높은 증명', '움직임 기반 social proof'],
				score: 0.92,
			}
		case 'DETAIL_PROOF':
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '디테일 클로즈업으로 제품 진실성을 증명하는 이야기',
				hook: `${brief.hook} 가까이 보면 차이가 더 보입니다.`,
				proofBeat: '텍스처, 마감, 재질감을 근접 샷으로 증명한다.',
				emotionalPayoff: '디테일이 주는 신뢰감과 프리미엄 인상을 만든다.',
				cta: brief.cta,
				rationale: ['제품 정체성 보존과 궁합이 좋음', '근접 증거 제공'],
				score: 0.9,
			}
		case 'COMMENT_CHALLENGE':
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '의견을 유도하는 참여형 훅으로 여는 이야기',
				hook: `${brief.hook} 이 느낌 괜찮은지 먼저 물어봅니다.`,
				proofBeat: '한 제품을 두 분위기 중 하나처럼 보이게 연출해 선택을 유도한다.',
				emotionalPayoff: '시청자가 자기 취향을 즉시 투사하게 만든다.',
				cta: `${brief.cta} 댓글로 취향을 남기게 만든다.`,
				rationale: ['댓글 CTA 강화', '반응형 숏폼 구조'],
				score: 0.88,
			}
		case 'ROUTINE_STORY':
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '짧은 루틴 안에서 제품이 분위기를 바꾸는 이야기',
				hook: `${brief.hook} 준비 과정의 첫 장면으로 시작합니다.`,
				proofBeat: '준비, 적용, 외출 직전까지의 짧은 루틴에서 효과를 증명한다.',
				emotionalPayoff: '곧바로 일상에 쓰고 싶다는 상상력을 만든다.',
				cta: brief.cta,
				rationale: ['UGC/GRWM 문법과 잘 맞음', '짧은 서사 구성에 유리'],
				score: 0.87,
			}
		case 'SOCIAL_PROOF':
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '다른 사람의 반응처럼 느껴지는 신뢰 장면 중심 이야기',
				hook: `${brief.hook} 반응이 먼저 나오는 구조로 엽니다.`,
				proofBeat: '사용 직후 표정 변화나 즉각적 반응으로 제품 가치를 증명한다.',
				emotionalPayoff: '검증된 느낌과 따라 하고 싶은 욕구를 만든다.',
				cta: brief.cta,
				rationale: ['초반 반응 훅에 강함', '감정적 ROI와 연결'],
				score: 0.86,
			}
		case 'LIFESTYLE_DEMO':
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '실생활 장면 속 사용성을 보여주는 이야기',
				hook: `${brief.hook} 실제 쓰는 장면부터 보여줍니다.`,
				proofBeat: '생활 맥락 안에서 기능과 인상을 동시에 증명한다.',
				emotionalPayoff: '내 일상에도 바로 들어올 수 있다는 느낌을 만든다.',
				cta: brief.cta,
				rationale: ['범용 카테고리에 적합', '기능과 감정의 균형'],
				score: 0.85,
			}
		case 'PROBLEM_SOLUTION':
		default:
			return {
				id: `${family.toLowerCase()}-${index + 1}`,
				family,
				angle: '문제 제기 후 즉시 해결을 보여주는 이야기',
				hook: `${brief.hook} 해결 전후 차이를 바로 보여줍니다.`,
				proofBeat: '문제 상황과 해결 결과를 한 번에 압축해 증명한다.',
				emotionalPayoff: '문제가 바로 풀린다는 명확한 만족감을 준다.',
				cta: brief.cta,
				rationale: ['기능 설명과 행동 유도 연결', '짧은 길이에서 명확한 payoff'],
				score: 0.84,
			}
	}
}

function buildConceptCandidates(brief: StoryBrief): ReadonlyArray<ConceptCandidate> {
	return getFamilyPool(brief.productCategory).map((family, index) =>
		createCandidate(family, brief, index),
	)
}

function selectConceptCandidate(
	candidates: ReadonlyArray<ConceptCandidate>,
	input: StoryPlannerInput,
): ConceptCandidate {
	if (input.requestedConceptFamily) {
		const requested = candidates.find(
			(candidate) => candidate.family === input.requestedConceptFamily,
		)
		if (requested) {
			return requested
		}
	}

	const recentFamilies = new Set(input.recentConceptFamilies ?? [])
	const available = candidates.filter((candidate) => !recentFamilies.has(candidate.family))
	const pool = available.length > 0 ? available : candidates
	const index = hashIndex(`${input.jobId}:${input.inputImageUrl}:${input.copy.hook}`, pool.length)
	return pool[index] ?? candidates[0]!
}

function buildShotCards(input: {
	brief: StoryBrief
	selectedConcept: ConceptCandidate
	targetClipCount: number
}): ReadonlyArray<ShotCard> {
	const location = cleanText(input.brief.creativeContext?.location) || '숏폼 피드 친화적인 일상 공간'
	const visualStyle = cleanText(input.brief.creativeContext?.visualStyle) || input.brief.tone
	const hookCard: ShotCard = {
		id: 'shot-hook',
		phase: 'HOOK',
		order: 1,
		sceneIntent: input.selectedConcept.hook,
		actorAction: '첫 프레임부터 움직임이 시작된 상태로 제품 또는 착용 상태를 드러낸다.',
		proofTarget: input.brief.corePromise,
		background: `${location}, ${visualStyle}`,
		cameraDirection: '짧은 훅이 바로 읽히는 인입 중심 카메라',
		payoff: '시청자가 바로 멈춰서 다음 장면을 보게 만든다.',
		overlayText: input.brief.hook,
		durationWeight: input.targetClipCount <= 2 ? 0.45 : 0.3,
	}
	const proofCard: ShotCard = {
		id: 'shot-proof',
		phase: 'PROOF',
		order: 2,
		sceneIntent: input.selectedConcept.proofBeat,
		actorAction: '실제 사용 또는 근접 확인 행동으로 제품의 진실성을 증명한다.',
		proofTarget: input.brief.proofStrategy,
		background: `${location} 안에서 제품 장점이 가장 잘 보이는 맥락`,
		cameraDirection: '증거가 잘 읽히는 근접 또는 움직임 추적 샷',
		payoff: input.selectedConcept.emotionalPayoff,
		overlayText: input.brief.corePromise,
		durationWeight: input.targetClipCount <= 2 ? 0.55 : 0.4,
	}
	const payoffCard: ShotCard = {
		id: 'shot-payoff',
		phase: 'PAYOFF',
		order: input.targetClipCount <= 2 ? 2 : 3,
		sceneIntent: '감정적 payoff와 CTA를 동시에 회수한다.',
		actorAction: '확신이 드는 마무리 자세 또는 제품 클로징 장면으로 끝낸다.',
		proofTarget: input.selectedConcept.cta,
		background: '브랜드 세이프한 클로징 공간',
		cameraDirection: '정리된 히어로 샷과 짧은 푸시인',
		payoff: input.brief.emotionalPayoff,
		overlayText: input.brief.cta,
		durationWeight: input.targetClipCount <= 2 ? 0.55 : 0.3,
	}

	return input.targetClipCount <= 2 ? [hookCard, payoffCard] : [hookCard, proofCard, payoffCard]
}

export function planStory(input: StoryPlannerInput): StoryPlannerOutput {
	const storyBrief = buildStoryBrief(input)
	const conceptCandidates = buildConceptCandidates(storyBrief)
	const selectedConcept = selectConceptCandidate(conceptCandidates, input)
	const shotCards = buildShotCards({
		brief: storyBrief,
		selectedConcept,
		targetClipCount: input.targetClipCount,
	})

	return {
		storyBrief,
		conceptCandidates,
		selectedConcept,
		shotCards,
	}
}

export function listRecentConceptFamilies(
	currentFamily: StoryConceptFamily,
): ReadonlyArray<StoryConceptFamily> {
	return unique(
		STORY_CONCEPT_FAMILIES.filter((family) => family !== currentFamily),
	) as StoryConceptFamily[]
}
