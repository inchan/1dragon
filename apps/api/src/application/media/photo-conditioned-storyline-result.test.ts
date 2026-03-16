import { describe, expect, it } from 'vitest'
import {
	buildDerivedShortformFromPhotoStorylineCandidate,
	buildPhotoConditionedStorylineJsonSchema,
	buildPhotoConditionedStorylineMarkdown,
	extractGeminiText,
	extractResponseText,
	parsePhotoConditionedStorylineResponse,
	selectRecommendedStorylineCandidate,
	type GeminiGenerateContentResponse,
	type PhotoConditionedStorylineResponse,
	type ResponsesApiBody,
} from './photo-conditioned-storyline-result.js'

const responseFixture: PhotoConditionedStorylineResponse = {
	diagnosis: {
		visibleGarmentType: 'wrap dress',
		primaryVisualClaim: '랩 디테일이 허리선을 정리한다',
		heroDetail: '사선 랩 구조',
		silhouetteRead: '허리선이 또렷한 3/4 실루엣',
		proofFocus: '랩 구조가 움직임 안에서도 유지되는지',
		patternDensity: 'MEDIUM',
		stylingComplexity: 'LOW',
		versatilitySignal: 'MULTI_OCCASION',
		visualRisks: ['팔 동작이 허리선을 가릴 수 있음'],
		reasoning: ['랩 구조와 허리선이 첫 메시지로 읽힌다'],
		confidence: 'HIGH',
		recommendedScenarioWrappers: ['TRANSITION_LOOK', 'WHAT_I_WORE_TO_X'],
		recommendedStorylineTypes: [
			'DETAIL_TO_SILHOUETTE_REVEAL',
			'THREE_OCCASION_LOOKBOOK',
		],
		recommendedMessageSpines: [
			'DETAIL_SILHOUETTE_DECISION',
			'QUESTION_PROOF_CHOICE',
		],
	},
	candidates: [
		{
			id: 'candidate-1',
			scenarioWrapper: 'TRANSITION_LOOK',
			placeFrame: 'DINNER',
			actionFrame: 'TRANSITION',
			momentFrame: 'EVENING_TRANSITION',
			proofGoal: 'VERSATILITY',
			storylineType: 'DETAIL_TO_SILHOUETTE_REVEAL',
			messageSpineId: 'DETAIL_SILHOUETTE_DECISION',
			oneSentenceClaim: '디테일이 전체 실루엣을 설득한다',
			whyThisFitsImage: '랩 구조가 전체 라인으로 자연스럽게 이어진다',
			hook: '디테일부터 보세요',
			proof: '랩 구조에서 전신 실루엣으로 넓힌다',
			payoff: '전체 핏이 정리되는 느낌으로 닫는다',
			cta: '지금 코디 확인',
			viewerTakeaway: '랩 디테일과 전체 핏이 동시에 읽힌다',
			editorialThesis: '디테일에서 실루엣으로 이어지는 정제된 에디토리얼',
			talentDirection: '절제된 시선과 가먼트 우선 포즈',
			supportingSignals: ['랩 구조', '허리선'],
			beatPlan: [
				{
					phase: 'HOOK',
					timeRangeSeconds: '0-3',
					narrativeGoal: '디테일 인입',
					garmentReadGoal: '랩 구조를 먼저 읽힌다',
					shotHint: '근접 크롭',
					mustShow: ['랩 구조'],
					mustAvoid: ['전신 카탈로그 오프닝'],
				},
				{
					phase: 'PROOF',
					timeRangeSeconds: '3-11',
					narrativeGoal: '실루엣 확장',
					garmentReadGoal: '허리선과 밑단 라인을 보여준다',
					shotHint: 'motivated widen',
					mustShow: ['허리선', '전신 3/4 라인'],
					mustAvoid: ['팔로 허리 가리기'],
				},
				{
					phase: 'PAYOFF',
					timeRangeSeconds: '11-16',
					narrativeGoal: '결정적 마감',
					garmentReadGoal: '전체 핏을 안정적으로 보여준다',
					shotHint: '정돈된 히어로 프레임',
					mustShow: ['전신 실루엣'],
					mustAvoid: ['과한 포즈'],
				},
			],
			rejectionIf: ['허리선이 끝까지 읽히지 않음'],
		},
		{
			id: 'candidate-2',
			scenarioWrapper: 'WHAT_I_WORE_TO_X',
			placeFrame: 'COFFEE_SHOP_WORK',
			actionFrame: 'WORK_ON_LAPTOP',
			momentFrame: 'REMOTE_WORK',
			proofGoal: 'REALISTIC_REPEAT_USE',
			storylineType: 'THREE_OCCASION_LOOKBOOK',
			messageSpineId: 'QUESTION_PROOF_CHOICE',
			oneSentenceClaim: '한 벌로 세 상황을 커버한다',
			whyThisFitsImage: '멀티 오케이전 신호가 있다',
			hook: '한 벌로 어디까지 갈까',
			proof: '세 가지 상황으로 나눠 보여준다',
			payoff: '가장 강한 상황으로 닫는다',
			cta: '지금 룩 확인',
			viewerTakeaway: '활용도가 넓은 드레스다',
			editorialThesis: '상황 전환형 룩북',
			talentDirection: '상황별 리듬만 바꾸는 절제된 연기',
			supportingSignals: ['출근', '일상'],
			beatPlan: [
				{
					phase: 'HOOK',
					timeRangeSeconds: '0-3',
					narrativeGoal: '질문 인입',
					garmentReadGoal: '첫 상황 코드를 읽힌다',
					shotHint: '중경 샷',
					mustShow: ['첫 상황 단서'],
					mustAvoid: ['맥락 없는 포즈'],
				},
				{
					phase: 'PROOF',
					timeRangeSeconds: '3-11',
					narrativeGoal: '상황 확장',
					garmentReadGoal: '활용도 증명',
					shotHint: '세 구간 분절',
					mustShow: ['두 번째 상황', '세 번째 상황'],
					mustAvoid: ['과한 소품'],
				},
				{
					phase: 'PAYOFF',
					timeRangeSeconds: '11-16',
					narrativeGoal: '결정',
					garmentReadGoal: '가장 좋은 실루엣 고정',
					shotHint: '클린 클로즈',
					mustShow: ['가장 강한 최종 룩'],
					mustAvoid: ['혼잡한 배경'],
				},
			],
			rejectionIf: ['상황 구분이 애매함'],
		},
	],
	selection: {
		recommendedCandidateId: 'candidate-1',
		rationale: '디테일 신호가 가장 강하고 16초 안에 설득력이 높다',
		rejectedCandidateIds: ['candidate-2'],
	},
}

describe('photo-conditioned storyline result helpers', () => {
	it('extracts text from a responses-style payload', () => {
		const body: ResponsesApiBody = {
			output: [
				{
					content: [
						{
							text: JSON.stringify(responseFixture),
						},
					],
				},
			],
		}

		expect(extractResponseText(body)).toContain('"recommendedCandidateId":"candidate-1"')
	})

	it('extracts text from a gemini generateContent payload', () => {
		const body: GeminiGenerateContentResponse = {
			candidates: [
				{
					content: {
						parts: [
							{
								text: JSON.stringify(responseFixture),
							},
						],
					},
				},
			],
		}

		expect(extractGeminiText(body)).toContain('"recommendedCandidateId":"candidate-1"')
	})

	it('parses the structured storyline payload and returns the selected candidate', () => {
		const parsed = parsePhotoConditionedStorylineResponse(
			`Model output:\n${JSON.stringify(responseFixture, null, 2)}\n`,
		)

		expect(parsed.diagnosis.primaryVisualClaim).toBe('랩 디테일이 허리선을 정리한다')
		expect(parsed.candidates).toHaveLength(2)
		expect(selectRecommendedStorylineCandidate(parsed).storylineType).toBe(
			'DETAIL_TO_SILHOUETTE_REVEAL',
		)
	})

	it('renders a markdown summary with diagnosis and beat plan details', () => {
		const markdown = buildPhotoConditionedStorylineMarkdown({
			imagePath: '/tmp/look.png',
			productCategory: 'FASHION',
			model: 'gpt-4.1-mini',
			response: responseFixture,
		})

		expect(markdown).toContain('# Photo Storyline Plan')
		expect(markdown).toContain('primary visual claim: 랩 디테일이 허리선을 정리한다')
		expect(markdown).toContain('recommended scenario wrappers: TRANSITION_LOOK, WHAT_I_WORE_TO_X')
		expect(markdown).toContain('scenario wrapper: TRANSITION_LOOK')
		expect(markdown).toContain('storyline type: DETAIL_TO_SILHOUETTE_REVEAL')
		expect(markdown).toContain('HOOK 0-3s: 디테일 인입')
		expect(markdown).toContain('Alternate Candidates')
	})

	it('builds a JSON schema that requires diagnosis, candidates, and selection', () => {
		const schema = buildPhotoConditionedStorylineJsonSchema()
		expect(schema).toMatchObject({
			type: 'object',
			required: ['diagnosis', 'candidates', 'selection'],
		})
	})

	it('derives full-flow shortform fields from the selected candidate', () => {
		const derived = buildDerivedShortformFromPhotoStorylineCandidate(
			responseFixture.candidates[0]!,
		)

		expect(derived).toMatchObject({
			messageSpineId: 'DETAIL_SILHOUETTE_DECISION',
			hook: '디테일부터 보세요',
			message: '디테일이 전체 실루엣을 설득한다',
			proofDetail: '랩 구조에서 전신 실루엣으로 넓힌다',
			scenarioSituation: 'during the transition from work to dinner',
			visibleAction:
				'She resets the waist line once, lets the skirt settle, and takes one evening-ready step forward.',
			hookDirection:
				'Open in a poised transitional stance so the shift from daytime polish to evening presence is already implied.',
			scenarioWrapper: 'TRANSITION_LOOK',
			placeFrame: 'DINNER',
			actionFrame: 'TRANSITION',
			momentFrame: 'EVENING_TRANSITION',
			proofGoal: 'VERSATILITY',
		})
		expect(derived.referenceDirective).toContain('Scenario wrapper: TRANSITION_LOOK')
		expect(derived.referenceDirective).toContain(
			'Situation: during the transition from work to dinner',
		)
		expect(derived.referenceDirective).toContain(
			'PROOF -> Use one deliberate adjustment at the waist or side seam to make the structure feel purposeful rather than pose-like.',
		)
		expect(derived.referenceDirective).toContain(
			'Use a believable human action in context rather than mannequin-like swaying.',
		)
	})
})
