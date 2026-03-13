import type { BuildPromptOutput } from '@/domain/media/ports.js'
import type {
	ReviewArtifact,
	ReviewDecisionOutcome,
	ReviewPoint,
	ReviewRisk,
	ShotCard,
	StoryBrief,
} from '@/domain/media/planning.js'

function createReviewArtifact(input: {
	stage: ReviewArtifact['stage']
	selfCritique: ReadonlyArray<string>
	fact: ReadonlyArray<ReviewPoint>
	inference: ReadonlyArray<ReviewPoint>
	risk: ReadonlyArray<ReviewRisk>
	decision: ReviewArtifact['decision']
	nextStep: string
}): ReviewArtifact {
	return {
		stage: input.stage,
		selfCritique: [...input.selfCritique],
		fact: [...input.fact],
		inference: [...input.inference],
		risk: [...input.risk],
		decision: input.decision,
		nextStep: input.nextStep,
	}
}

function decide(
	outcome: ReviewDecisionOutcome,
	rationale: string,
): ReviewArtifact['decision'] {
	return { outcome, rationale }
}

export function reviewStoryBrief(brief: StoryBrief): ReviewArtifact {
	const fact: ReviewPoint[] = [
		{
			statement: '스토리 브리프에 hook, proofStrategy, emotionalPayoff, cta가 모두 존재한다.',
			evidence: [brief.hook, brief.proofStrategy, brief.emotionalPayoff, brief.cta].filter(Boolean),
		},
		{
			statement: '브리프가 targetViewer와 corePromise를 명시한다.',
			evidence: [brief.targetViewer, brief.corePromise].filter(Boolean),
		},
	]

	const selfCritique: string[] = []
	const inference: ReviewPoint[] = []
	const risk: ReviewRisk[] = []

	if (!brief.hook.trim()) {
		selfCritique.push('훅이 비어 있어 첫 장면에서 멈추게 할 근거가 없다.')
		risk.push({
			statement: 'hook 부재로 숏폼 인입력이 약해질 수 있다.',
			severity: 'HIGH',
			mitigation: '첫 2초 안에 읽히는 짧은 훅을 다시 설계한다.',
		})
	}

	if (!brief.proofStrategy.trim()) {
		selfCritique.push('증명 전략이 없어 장면이 제품 찬양으로만 끝날 가능성이 높다.')
	}

	if (brief.hook.trim() === brief.corePromise.trim()) {
		selfCritique.push('hook이 corePromise를 그대로 반복하고 있어 호기심 격차가 약하다.')
		inference.push({
			statement: '브리프가 기능 요약에 머무를 가능성이 있다.',
			evidence: [brief.hook, brief.corePromise],
		})
	}

	if (brief.emotionalPayoff.trim() === brief.cta.trim()) {
		selfCritique.push('감정 payoff와 CTA가 분리되지 않아 마지막 장면이 설명으로만 끝날 수 있다.')
		inference.push({
			statement: 'payoff와 CTA가 같은 문구라 클로징 회수력이 약하다.',
			evidence: [brief.emotionalPayoff, brief.cta],
		})
	}

	const approved =
		brief.hook.trim().length > 0 &&
		brief.proofStrategy.trim().length > 0 &&
		brief.emotionalPayoff.trim().length > 0 &&
		brief.cta.trim().length > 0 &&
		brief.hook.trim() !== brief.corePromise.trim()

	return createReviewArtifact({
		stage: 'STORY_BRIEF',
		selfCritique,
		fact,
		inference,
		risk,
		decision: decide(
			approved ? 'APPROVED' : 'REVISE',
			approved ? '브리프가 훅/증명/payoff/CTA 구조를 갖췄다.' : '브리프가 아직 이야기 구조를 충분히 증명하지 못했다.',
		),
		nextStep: approved ? 'SHOT_PLAN' : '브리프를 수정해 hook/proof/payoff 분리를 강화한다.',
	})
}

export function reviewShotPlan(shotCards: ReadonlyArray<ShotCard>): ReviewArtifact {
	const fact: ReviewPoint[] = [
		{
			statement: 'shot plan에 최소 2개의 장면 카드가 있다.',
			evidence: [String(shotCards.length)],
		},
		{
			statement: '장면 카드가 order와 phase를 가진다.',
			evidence: shotCards.map((card) => `${card.order}:${card.phase}`),
		},
	]

	const selfCritique: string[] = []
	const inference: ReviewPoint[] = []
	const risk: ReviewRisk[] = []

	const sceneIntentCount = new Set(shotCards.map((card) => card.sceneIntent.trim().toLowerCase())).size
	const proofTargetCount = new Set(shotCards.map((card) => card.proofTarget.trim().toLowerCase())).size
	const hasHook = shotCards.some((card) => card.phase === 'HOOK')
	const hasPayoff = shotCards.some((card) => card.phase === 'PAYOFF')

	if (sceneIntentCount < Math.min(2, shotCards.length)) {
		selfCritique.push('장면 의도가 충분히 분리되지 않아 같은 스토리의 문구 변형일 수 있다.')
		risk.push({
			statement: 'scene intent 중복으로 결과가 카메라 변화만 다른 영상으로 수렴할 수 있다.',
			severity: 'HIGH',
			mitigation: 'hook/proof/payoff 역할이 다른 장면으로 다시 분리한다.',
		})
	}

	if (proofTargetCount < Math.min(2, shotCards.length)) {
		inference.push({
			statement: 'proof target이 지나치게 반복되어 시청자가 새로운 증거를 못 느낄 수 있다.',
			evidence: shotCards.map((card) => card.proofTarget),
		})
	}

	if (!hasHook || !hasPayoff) {
		selfCritique.push('HOOK과 PAYOFF 축이 모두 존재하지 않는다.')
	}

	const approved =
		shotCards.length >= 2 &&
		hasHook &&
		hasPayoff &&
		sceneIntentCount >= Math.min(2, shotCards.length)

	return createReviewArtifact({
		stage: 'SHOT_PLAN',
		selfCritique,
		fact,
		inference,
		risk,
		decision: decide(
			approved ? 'APPROVED' : 'REVISE',
			approved ? '장면 카드가 역할별로 분리되어 있다.' : '장면 카드가 서로 다른 이야기 역할을 충분히 갖지 못했다.',
		),
		nextStep: approved ? 'PROMPT_COMPILATION' : 'scene intent와 proof target을 다시 분리한다.',
	})
}

export function reviewPromptCompilation(
	shotCards: ReadonlyArray<ShotCard>,
	output: BuildPromptOutput,
): ReviewArtifact {
	const mappings = output.debug?.shotMappings ?? []
	const fact: ReviewPoint[] = [
		{
			statement: 'prompt compilation debug가 shot card 매핑을 제공한다.',
			evidence: [String(mappings.length)],
		},
	]
	const selfCritique: string[] = []
	const inference: ReviewPoint[] = []
	const risk: ReviewRisk[] = []

	for (const shotCard of shotCards) {
		const mapping = mappings.find((item) => item.shotCardId === shotCard.id)
		if (!mapping) {
			selfCritique.push(`shot card ${shotCard.id} 가 provider prompt에 매핑되지 않았다.`)
			risk.push({
				statement: `shot card ${shotCard.id} 누락으로 planned story가 provider 실행에 반영되지 않을 수 있다.`,
				severity: 'HIGH',
				mitigation: 'prompt debug mapping을 다시 생성하고 누락 카드를 포함한다.',
			})
			continue
		}

		const providerSegments = Object.values(mapping.providerSegments)
		const providerContainsStory = providerSegments.every(
			(segment) =>
				segment.includes(shotCard.sceneIntent) &&
				segment.includes(shotCard.proofTarget) &&
				segment.includes(shotCard.payoff),
		)

		if (!providerContainsStory) {
			selfCritique.push(`shot card ${shotCard.id} 의 scene/proof/payoff가 provider segment에 완전히 반영되지 않았다.`)
			inference.push({
				statement: `shot card ${shotCard.id} 가 프롬프트 컴파일 과정에서 축약되거나 모순되었을 가능성이 있다.`,
				evidence: providerSegments,
			})
		}
	}

	const approved =
		mappings.length === shotCards.length &&
		selfCritique.length === 0

	return createReviewArtifact({
		stage: 'PROMPT_COMPILATION',
		selfCritique,
		fact,
		inference,
		risk,
		decision: decide(
			approved ? 'APPROVED' : 'REVISE',
			approved ? '모든 shot card가 provider prompt와 추적 가능하게 연결되었다.' : 'shot card와 provider prompt 사이의 사실검증이 실패했다.',
		),
		nextStep: approved ? 'PROVIDER_EXECUTION' : 'prompt compilation을 다시 수행해 누락/모순을 수정한다.',
	})
}
