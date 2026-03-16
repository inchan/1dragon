import type {
	ConceptCandidate,
	CreativeContext,
	FashionMessageSpineId,
	PhotoConditionedStorylineType,
	PhotoScenarioWrapper,
	ProductImageDiagnosis,
	StoryBrief,
	StoryConceptFamily,
} from '@/domain/media/planning.js'
import { PHOTO_CONDITIONED_STORYLINE_TYPES } from '@/domain/media/planning.js'
import { mapStorylineTypeToMessageSpine } from './photo-conditioned-storyline.js'

type StorylineMatchScore = {
	readonly storylineType: PhotoConditionedStorylineType
	readonly score: number
	readonly rationale: ReadonlyArray<string>
}

type ProductImageSignalInput = {
	readonly productCategory: string
	readonly keywords: ReadonlyArray<string>
	readonly copy: {
		readonly hook: string
		readonly description: string
		readonly cta: string
	}
	readonly creativeContext?: CreativeContext
	readonly seedDiagnosis?: Partial<ProductImageDiagnosis>
}

type ConceptBuilderInput = {
	readonly brief: StoryBrief
	readonly diagnosis: ProductImageDiagnosis
}

const WRAP_DETAIL_PATTERN = /(wrap|랩|드레이프|waist|허리선|사선)/i
const SILHOUETTE_PATTERN = /(silhouette|실루엣|a-line|에이라인|라인|핏|drape|플레어)/i
const PATTERN_PATTERN = /(pattern|plaid|check|체크|stripe|스트라이프|print|프린트)/i
const TEXTURE_PATTERN = /(texture|fabric|소재|재질|텍스처|stitch|스티치|마감)/i
const VERSATILITY_PATTERN = /(occasion|versatile|룩북|활용|출근|데이트|주말|일상|오피스|하객)/i
const ROUTINE_PATTERN = /(routine|grwm|준비|출근준비|외출준비|아침|night out|ready)/i
const PROBLEM_PATTERN =
	/(problem|solution|before|after|고민|해결|부해|답답|체형|보정|핏부터|왜|different|차이)/i
const MINIMAL_PATTERN = /(minimal|clean|심플|미니멀|basic|베이직)/i
const LAYERED_PATTERN = /(layer|layered|재킷|자켓|니트|셔츠|베스트|액세서리|belt|벨트)/i

function collectSignalText(input: ProductImageSignalInput): string {
	return [
		input.productCategory,
		input.copy.hook,
		input.copy.description,
		input.copy.cta,
		...input.keywords,
		input.creativeContext?.location ?? '',
		input.creativeContext?.identity ?? '',
		input.creativeContext?.profession ?? '',
		input.creativeContext?.visualStyle ?? '',
		...(input.creativeContext?.traits ?? []),
	].join(' ')
}

function unique<T>(values: ReadonlyArray<T>): T[] {
	return [...new Set(values)]
}

function pickVisibleGarmentType(signalText: string): string {
	if (/(dress|원피스)/i.test(signalText)) {
		return 'dress'
	}
	if (/(jacket|자켓|재킷)/i.test(signalText)) {
		return 'jacket'
	}
	if (/(shirt|셔츠|blouse|블라우스)/i.test(signalText)) {
		return 'shirt or blouse'
	}
	if (/(skirt|스커트)/i.test(signalText)) {
		return 'skirt'
	}
	if (/(coat|코트)/i.test(signalText)) {
		return 'coat'
	}

	return 'fashion garment'
}

function pickHeroDetail(signalText: string): string {
	if (WRAP_DETAIL_PATTERN.test(signalText)) {
		return '사선 랩과 허리선'
	}
	if (TEXTURE_PATTERN.test(signalText)) {
		return '소재 결감과 마감 디테일'
	}
	if (PATTERN_PATTERN.test(signalText)) {
		return '패턴 배열과 중심 디테일'
	}
	if (SILHOUETTE_PATTERN.test(signalText)) {
		return '실루엣 라인'
	}

	return '의상 핵심 디테일'
}

function pickPatternDensity(signalText: string): ProductImageDiagnosis['patternDensity'] {
	if (/(plaid|check|체크|pattern|print|프린트)/i.test(signalText)) {
		return 'HIGH'
	}
	if (/(stripe|스트라이프|texture|소재|stitch|마감)/i.test(signalText)) {
		return 'MEDIUM'
	}

	return 'LOW'
}

function pickStylingComplexity(signalText: string): ProductImageDiagnosis['stylingComplexity'] {
	if (LAYERED_PATTERN.test(signalText)) {
		return 'HIGH'
	}
	if (MINIMAL_PATTERN.test(signalText)) {
		return 'LOW'
	}

	return 'MEDIUM'
}

function pickVersatilitySignal(
	signalText: string,
): ProductImageDiagnosis['versatilitySignal'] {
	return VERSATILITY_PATTERN.test(signalText) || ROUTINE_PATTERN.test(signalText)
		? 'MULTI_OCCASION'
		: 'SINGLE_OCCASION'
}

function pickSilhouetteRead(signalText: string, heroDetail: string): string {
	if (SILHOUETTE_PATTERN.test(signalText) || WRAP_DETAIL_PATTERN.test(signalText)) {
		return `${heroDetail}이 전신 라인으로 이어지는 실루엣`
	}

	return '전신 핏과 핵심 디테일이 함께 읽히는 실루엣'
}

function pickPrimaryVisualClaim(
	signalText: string,
	heroDetail: string,
	versatilitySignal: ProductImageDiagnosis['versatilitySignal'],
	input: ProductImageSignalInput,
): string {
	if (versatilitySignal === 'MULTI_OCCASION') {
		return '같은 의상으로 여러 상황에 자연스럽게 이어지는 활용도가 핵심이다.'
	}
	if (WRAP_DETAIL_PATTERN.test(signalText) || SILHOUETTE_PATTERN.test(signalText)) {
		return `${heroDetail}이 실루엣을 또렷하게 정리하는 것이 핵심이다.`
	}

	return input.copy.description.trim() || `${heroDetail}이 제품의 주장을 만든다.`
}

function pickProofFocus(
	signalText: string,
	heroDetail: string,
	versatilitySignal: ProductImageDiagnosis['versatilitySignal'],
): string {
	if (versatilitySignal === 'MULTI_OCCASION') {
		return '같은 의상이 다른 상황에서도 유지하는 실루엣과 활용도'
	}
	if (TEXTURE_PATTERN.test(signalText)) {
		return `${heroDetail}과 실루엣이 같이 읽히는 근접 증거`
	}

	return `${heroDetail}이 움직임 안에서도 유지되는지 보여주는 온바디 증거`
}

function buildVisualRisks(
	signalText: string,
	patternDensity: ProductImageDiagnosis['patternDensity'],
	versatilitySignal: ProductImageDiagnosis['versatilitySignal'],
): ReadonlyArray<string> {
	const risks: string[] = []

	if (patternDensity === 'HIGH') {
		risks.push('패턴 밀도가 높아 프레임이 과밀해지면 핵심 디테일이 흐려질 수 있다.')
	}
	if (WRAP_DETAIL_PATTERN.test(signalText) || SILHOUETTE_PATTERN.test(signalText)) {
		risks.push('허리선이나 실루엣 리드를 가리는 팔 동작이 나오면 주장이 무너질 수 있다.')
	}
	if (versatilitySignal === 'MULTI_OCCASION') {
		risks.push('상황 전환이 많아지면 한 가지 메시지가 약해질 수 있다.')
	}

	return risks
}

function buildReasoning(
	signalText: string,
	heroDetail: string,
	versatilitySignal: ProductImageDiagnosis['versatilitySignal'],
): ReadonlyArray<string> {
	const reasoning = [`hero detail=${heroDetail}`]

	if (WRAP_DETAIL_PATTERN.test(signalText)) {
		reasoning.push('wrap or waist signals suggest a detail-led silhouette proof')
	}
	if (PATTERN_PATTERN.test(signalText)) {
		reasoning.push('pattern density requires tighter hierarchy control')
	}
	if (versatilitySignal === 'MULTI_OCCASION') {
		reasoning.push('occasion language suggests a versatility-led narrative')
	}
	if (PROBLEM_PATTERN.test(signalText)) {
		reasoning.push('problem or question phrasing suggests a question/solution framing')
	}

	return reasoning
}

function buildRecommendedStorylineTypes(
	signalText: string,
	versatilitySignal: ProductImageDiagnosis['versatilitySignal'],
): ReadonlyArray<PhotoConditionedStorylineType> {
	const recommended: PhotoConditionedStorylineType[] = []

	if (WRAP_DETAIL_PATTERN.test(signalText) || SILHOUETTE_PATTERN.test(signalText)) {
		recommended.push('DETAIL_TO_SILHOUETTE_REVEAL')
	}
	if (PROBLEM_PATTERN.test(signalText)) {
		recommended.push('QUESTION_PROOF_PAYOFF', 'PROBLEM_SOLUTION_TRYON')
	}
	if (versatilitySignal === 'MULTI_OCCASION') {
		recommended.push('THREE_OCCASION_LOOKBOOK', 'ROUTINE_TO_LOOK_PAYOFF')
	}

	recommended.push('QUESTION_PROOF_PAYOFF')

	return unique(recommended)
}

function buildRecommendedScenarioWrappers(
	signalText: string,
	versatilitySignal: ProductImageDiagnosis['versatilitySignal'],
): ReadonlyArray<PhotoScenarioWrapper> {
	const recommended: PhotoScenarioWrapper[] = []

	if (ROUTINE_PATTERN.test(signalText)) {
		recommended.push('GRWM_FOR_OCCASION')
	}
	if (/(what i wore|ootd|출근|일상|커피숍|coffee shop|laptop|office|work)/i.test(signalText)) {
		recommended.push('WHAT_I_WORE_TO_X')
	}
	if (versatilitySignal === 'MULTI_OCCASION') {
		recommended.push('TRANSITION_LOOK', 'ROTATION_SERIES')
	}
	if (/(airport|flight|travel|trip|commute|errand|출근길|공항|이동)/i.test(signalText)) {
		recommended.push('TASK_COMFORT_PROOF')
	}
	if (/(wedding|graduation|하객|면접|venue|행사)/i.test(signalText)) {
		recommended.push('VENUE_RULE_GUIDE')
	}
	if (/(choose|pick|골라|option|옵션)/i.test(signalText)) {
		recommended.push('OPTION_PICKER')
	}

	recommended.push('GRWM_FOR_OCCASION')

	return unique(recommended)
}

export function deriveProductImageDiagnosis(
	input: ProductImageSignalInput,
): ProductImageDiagnosis {
	const signalText = collectSignalText(input)
	const visibleGarmentType =
		input.seedDiagnosis?.visibleGarmentType ?? pickVisibleGarmentType(signalText)
	const heroDetail = input.seedDiagnosis?.heroDetail ?? pickHeroDetail(signalText)
	const patternDensity = input.seedDiagnosis?.patternDensity ?? pickPatternDensity(signalText)
	const stylingComplexity =
		input.seedDiagnosis?.stylingComplexity ?? pickStylingComplexity(signalText)
	const versatilitySignal =
		input.seedDiagnosis?.versatilitySignal ?? pickVersatilitySignal(signalText)
	const primaryVisualClaim =
		input.seedDiagnosis?.primaryVisualClaim ??
		pickPrimaryVisualClaim(signalText, heroDetail, versatilitySignal, input)
	const silhouetteRead =
		input.seedDiagnosis?.silhouetteRead ?? pickSilhouetteRead(signalText, heroDetail)
	const proofFocus =
		input.seedDiagnosis?.proofFocus ?? pickProofFocus(signalText, heroDetail, versatilitySignal)
	const recommendedScenarioWrappers =
		input.seedDiagnosis?.recommendedScenarioWrappers ??
		buildRecommendedScenarioWrappers(signalText, versatilitySignal)
	const recommendedStorylineTypes =
		input.seedDiagnosis?.recommendedStorylineTypes ??
		buildRecommendedStorylineTypes(signalText, versatilitySignal)
	const recommendedMessageSpines =
		input.seedDiagnosis?.recommendedMessageSpines ??
		unique(recommendedStorylineTypes.map(mapStorylineTypeToMessageSpine))
	const visualRisks =
		input.seedDiagnosis?.visualRisks ?? buildVisualRisks(signalText, patternDensity, versatilitySignal)
	const reasoning = input.seedDiagnosis?.reasoning ?? buildReasoning(signalText, heroDetail, versatilitySignal)

	return {
		visibleGarmentType,
		primaryVisualClaim,
		heroDetail,
		silhouetteRead,
		proofFocus,
		patternDensity,
		stylingComplexity,
		versatilitySignal,
		visualRisks,
		reasoning,
		confidence:
			input.seedDiagnosis?.confidence ??
			(reasoning.length >= 3 ? 'HIGH' : reasoning.length === 2 ? 'MEDIUM' : 'LOW'),
		recommendedScenarioWrappers,
		recommendedStorylineTypes,
		recommendedMessageSpines,
	}
}

function hasQuestionFrame(brief: StoryBrief): boolean {
	return /(\?|왜|어떻게|핏부터|차이|먼저)/i.test(
		[brief.hook, brief.corePromise, brief.proofStrategy].join(' '),
	)
}

function scoreStorylineType(
	type: PhotoConditionedStorylineType,
	input: ConceptBuilderInput,
): StorylineMatchScore {
	const rationale: string[] = []
	let score = 0

	if (input.diagnosis.recommendedStorylineTypes.includes(type)) {
		score += 5
		rationale.push('상품 신호 진단에서 추천된 storyline type과 일치한다.')
	}

	if (input.brief.messageSpineId === mapStorylineTypeToMessageSpine(type)) {
		score += 3
		rationale.push('현재 message spine과 구조적으로 정렬된다.')
	}

	switch (type) {
		case 'DETAIL_TO_SILHOUETTE_REVEAL':
			if (
				WRAP_DETAIL_PATTERN.test(input.diagnosis.heroDetail) ||
				SILHOUETTE_PATTERN.test(input.diagnosis.silhouetteRead)
			) {
				score += 4
				rationale.push('디테일과 실루엣이 동시에 읽혀야 하는 상품 신호다.')
			}
			if (input.diagnosis.patternDensity !== 'LOW') {
				score += 1
				rationale.push('패턴/디테일 중심 제품은 hierarchy가 강한 reveal 구조가 유리하다.')
			}
			break
		case 'QUESTION_PROOF_PAYOFF':
			if (hasQuestionFrame(input.brief)) {
				score += 3
				rationale.push('현재 훅이 질문형 또는 curiosity-gap 구조에 가깝다.')
			}
			if (input.diagnosis.versatilitySignal === 'SINGLE_OCCASION') {
				score += 1
				rationale.push('활용도보다 단일 주장 증명이 더 자연스럽다.')
			} else {
				score -= 2
				rationale.push('여러 상황 활용도가 강하면 단일 질문형 구조만으로는 상품 범위를 덜 설명한다.')
			}
			break
		case 'PROBLEM_SOLUTION_TRYON':
			if (PROBLEM_PATTERN.test([input.brief.hook, input.brief.corePromise].join(' '))) {
				score += 4
				rationale.push('문제 제기나 해결 뉘앙스가 이미 copy에 포함되어 있다.')
			}
			if (input.diagnosis.visualRisks.length > 0) {
				score += 1
				rationale.push('리스크를 해결 장면으로 전환하기 쉬운 상품이다.')
			}
			break
		case 'THREE_OCCASION_LOOKBOOK':
			if (input.diagnosis.versatilitySignal === 'MULTI_OCCASION') {
				score += 5
				rationale.push('여러 상황에서 통하는 활용도가 상품 신호로 잡힌다.')
				score += 3
				rationale.push('활용도형 상품은 occasion-change 자체가 proof가 된다.')
			}
			if (input.diagnosis.stylingComplexity !== 'LOW') {
				score += 1
				rationale.push('스타일 변주를 짧게 나누어 보여줄 여지가 있다.')
			}
			break
		case 'ROUTINE_TO_LOOK_PAYOFF':
			if (input.diagnosis.versatilitySignal === 'MULTI_OCCASION') {
				score += 4
				rationale.push('루틴에서 룩 payoff로 넘어가기 좋은 활용도 신호가 있다.')
			}
			if (ROUTINE_PATTERN.test(input.diagnosis.reasoning.join(' '))) {
				score += 2
			}
			break
	}

	return { storylineType: type, score, rationale }
}

function normalizeCandidateScore(score: number): number {
	return Number((0.78 + Math.min(score, 12) * 0.015).toFixed(2))
}

function mapStorylineTypeToConceptFamily(
	type: PhotoConditionedStorylineType,
	brief: StoryBrief,
): StoryConceptFamily {
	switch (type) {
		case 'DETAIL_TO_SILHOUETTE_REVEAL':
			return 'DETAIL_PROOF'
		case 'PROBLEM_SOLUTION_TRYON':
			return 'PROBLEM_SOLUTION'
		case 'THREE_OCCASION_LOOKBOOK':
			return 'LIFESTYLE_DEMO'
		case 'ROUTINE_TO_LOOK_PAYOFF':
			return 'ROUTINE_STORY'
		case 'QUESTION_PROOF_PAYOFF':
		default:
			return /댓글|취향|선택/i.test([brief.hook, brief.cta].join(' '))
				? 'COMMENT_CHALLENGE'
				: 'FIT_CHECK'
	}
}

function buildQuestionProofCandidate(input: ConceptBuilderInput): ConceptCandidate {
	return {
		id: 'storyline-question-proof-payoff',
		family: mapStorylineTypeToConceptFamily('QUESTION_PROOF_PAYOFF', input.brief),
		storylineType: 'QUESTION_PROOF_PAYOFF',
		angle: '질문으로 멈추게 한 뒤 한 가지 온바디 증거로 답하는 이야기',
		hook: input.brief.hookLine ?? `${input.diagnosis.primaryVisualClaim}를 질문형 훅으로 연다.`,
		proofBeat:
			input.brief.proofLine ??
			`${input.diagnosis.proofFocus}를 한 장면의 핵심 증거로 압축한다.`,
		emotionalPayoff: input.brief.payoffLine ?? input.brief.emotionalPayoff,
		cta: input.brief.ctaLine ?? input.brief.cta,
		rationale: [
			'가장 범용적인 short-form claim container다.',
			'질문 -> 증거 -> 결론 구조로 한 가지 주장만 잠그기 쉽다.',
		],
		supportingSignals: [
			input.diagnosis.primaryVisualClaim,
			input.diagnosis.proofFocus,
		],
		rejectionIf: ['질문만 있고 실질적인 온바디 proof zone이 보이지 않으면 기각한다.'],
		preferredEnergyClass: 'KINETIC',
		distinctivenessCue: '질문형 오프너 뒤에 한 번의 명확한 on-body proof move로 답해야 한다.',
		score: 0.84,
	}
}

function buildDetailRevealCandidate(input: ConceptBuilderInput): ConceptCandidate {
	return {
		id: 'storyline-detail-to-silhouette',
		family: 'DETAIL_PROOF',
		storylineType: 'DETAIL_TO_SILHOUETTE_REVEAL',
		angle: '시그니처 디테일에서 시작해 전신 실루엣으로 확장하는 에디토리얼 이야기',
		hook: input.brief.hookLine ?? `${input.diagnosis.heroDetail}이 먼저 읽혀야 한다.`,
		proofBeat:
			input.brief.proofLine ??
			`${input.diagnosis.heroDetail}이 ${input.diagnosis.silhouetteRead}으로 이어지는 순간을 증명한다.`,
		emotionalPayoff: input.brief.payoffLine ?? input.brief.emotionalPayoff,
		cta: input.brief.ctaLine ?? input.brief.cta,
		rationale: [
			'디테일과 실루엣이 동시에 보이는 상품에 가장 직접적이다.',
			'패턴/랩/허리선처럼 hierarchy가 필요한 제품에 강하다.',
		],
		supportingSignals: [
			input.diagnosis.heroDetail,
			input.diagnosis.silhouetteRead,
		],
		rejectionIf: ['디테일이 읽히지 않거나 전신 실루엣 reveal이 없으면 기각한다.'],
		preferredEnergyClass: 'RESTRAINED',
		distinctivenessCue: '디테일 crop이 먼저 오고, 그 디테일이 full silhouette로 이어져야 한다.',
		score: 0.9,
	}
}

function buildProblemSolutionCandidate(input: ConceptBuilderInput): ConceptCandidate {
	return {
		id: 'storyline-problem-solution-tryon',
		family: 'PROBLEM_SOLUTION',
		storylineType: 'PROBLEM_SOLUTION_TRYON',
		angle: '부담이나 고민 포인트를 먼저 던지고 착용 증거로 바로 해결하는 이야기',
		hook: input.brief.hookLine ?? `${input.diagnosis.primaryVisualClaim}를 해결형 문제 제기로 연다.`,
		proofBeat:
			input.brief.proofLine ??
			`${input.diagnosis.proofFocus}가 실제로 문제를 해소하는지 try-on으로 보여준다.`,
		emotionalPayoff: input.brief.payoffLine ?? input.brief.emotionalPayoff,
		cta: input.brief.ctaLine ?? input.brief.cta,
		rationale: [
			'명확한 pain point가 있는 상품에 짧은 설득력이 높다.',
			'문제 -> 해결 구조는 CTA로 닫기 쉽다.',
		],
		supportingSignals: [
			input.diagnosis.primaryVisualClaim,
			...input.diagnosis.visualRisks,
		],
		rejectionIf: ['문제 제기만 있고 해결 장면이 없으면 기각한다.'],
		preferredEnergyClass: 'KINETIC',
		distinctivenessCue: '문제 제기에서 해결 증거로 바로 넘어가야 하며 중간에 generic pose가 끼면 안 된다.',
		score: 0.82,
	}
}

function buildLookbookCandidate(input: ConceptBuilderInput): ConceptCandidate {
	return {
		id: 'storyline-three-occasion-lookbook',
		family: 'LIFESTYLE_DEMO',
		storylineType: 'THREE_OCCASION_LOOKBOOK',
		angle: '한 의상을 세 가지 상황으로 빠르게 전환해 활용도를 증명하는 이야기',
		hook: input.brief.hookLine ?? '이 한 벌이 어디까지 가는지 먼저 보여준다.',
		proofBeat:
			input.brief.proofLine ??
			'출근, 일상, 약속처럼 다른 상황에서도 실루엣과 분위기가 유지되는지 압축해 보여준다.',
		emotionalPayoff: input.brief.payoffLine ?? '한 벌로 충분하다는 확신을 남긴다.',
		cta: input.brief.ctaLine ?? input.brief.cta,
		rationale: [
			'다중 상황 활용도가 상품 신호로 잡힐 때만 의미가 있다.',
			'상황 전환 자체가 proof로 작동한다.',
		],
		supportingSignals: [input.diagnosis.proofFocus],
		rejectionIf: ['상황 전환만 있고 의상 주장이 흐려지면 기각한다.'],
		preferredEnergyClass: 'STREET_RUSH',
		distinctivenessCue: '도시 동선 전환이 룩북처럼 나열되지 말고 한 벌의 활용도로 묶여야 한다.',
		score: 0.81,
	}
}

function buildRoutineCandidate(input: ConceptBuilderInput): ConceptCandidate {
	return {
		id: 'storyline-routine-to-look-payoff',
		family: 'ROUTINE_STORY',
		storylineType: 'ROUTINE_TO_LOOK_PAYOFF',
		angle: '준비 루틴에서 완성 룩 payoff로 넘어가는 네이티브 숏폼 이야기',
		hook: input.brief.hookLine ?? '준비하는 장면에서 바로 시작한다.',
		proofBeat:
			input.brief.proofLine ??
			`${input.diagnosis.proofFocus}가 루틴 안에서도 자연스럽게 읽히는지 보여준다.`,
		emotionalPayoff: input.brief.payoffLine ?? '일상에 바로 넣고 싶다는 욕구를 남긴다.',
		cta: input.brief.ctaLine ?? input.brief.cta,
		rationale: [
			'GRWM/루틴 문법과 자연스럽게 연결된다.',
			'네이티브 숏폼 톤을 얻기 쉽다.',
		],
		supportingSignals: [input.diagnosis.primaryVisualClaim],
		rejectionIf: ['루틴 설명만 있고 완성 룩 payoff가 없으면 기각한다.'],
		preferredEnergyClass: 'KINETIC',
		distinctivenessCue: '준비 동선이 실제 룩 payoff로 닫혀야 하며 루틴 설명만 길어지면 안 된다.',
		score: 0.8,
	}
}

function buildCandidateTemplate(
	type: PhotoConditionedStorylineType,
	input: ConceptBuilderInput,
): ConceptCandidate {
	switch (type) {
		case 'DETAIL_TO_SILHOUETTE_REVEAL':
			return buildDetailRevealCandidate(input)
		case 'PROBLEM_SOLUTION_TRYON':
			return buildProblemSolutionCandidate(input)
		case 'THREE_OCCASION_LOOKBOOK':
			return buildLookbookCandidate(input)
		case 'ROUTINE_TO_LOOK_PAYOFF':
			return buildRoutineCandidate(input)
		case 'QUESTION_PROOF_PAYOFF':
		default:
			return buildQuestionProofCandidate(input)
	}
}

export function buildPhotoConditionedConceptCandidates(
	input: ConceptBuilderInput,
): ReadonlyArray<ConceptCandidate> {
	const scores = PHOTO_CONDITIONED_STORYLINE_TYPES.map((storylineType) =>
		scoreStorylineType(storylineType, input),
	).sort((left, right) => right.score - left.score)

	return scores.map(({ storylineType, score, rationale }) => {
		const candidate = buildCandidateTemplate(storylineType, input)

		return {
			...candidate,
			rationale: unique([...candidate.rationale, ...rationale]),
			score: normalizeCandidateScore(score),
		}
	})
}
