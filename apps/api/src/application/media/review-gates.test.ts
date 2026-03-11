import { describe, expect, it } from 'vitest'
import { reviewPromptCompilation, reviewShotPlan, reviewStoryBrief } from './review-gates.js'

describe('review gates', () => {
	it('rejects a weak story brief that repeats the promise as the hook', () => {
		const review = reviewStoryBrief({
			targetViewer: '숏폼 시청자',
			corePromise: '가볍고 시원한 원단',
			hook: '가볍고 시원한 원단',
			proofStrategy: '근접 샷으로 재질을 보여준다.',
			emotionalPayoff: '입고 싶다는 확신',
			cta: '지금 확인',
			tone: '네이티브 숏폼 추천 톤',
			productCategory: 'FASHION',
			stylePreset: 'TRENDY',
			moods: ['TRENDY'],
			keywords: ['원피스'],
		})

		expect(review.decision.outcome).toBe('REVISE')
		expect(review.selfCritique.length).toBeGreaterThan(0)
	})

	it('fails shot plans when only camera/background phrasing changes but the story stays the same', () => {
		const review = reviewShotPlan([
			{
				id: 'shot-1',
				phase: 'HOOK',
				order: 1,
				sceneIntent: '제품을 예쁘게 보여준다.',
				actorAction: '제품을 잡고 보여준다.',
				proofTarget: '핏이 좋다.',
				background: '배경 1',
				cameraDirection: '와이드에서 천천히 들어온다.',
				payoff: '좋아 보인다.',
				overlayText: '텍스트 1',
				durationWeight: 0.5,
			},
			{
				id: 'shot-2',
				phase: 'PAYOFF',
				order: 2,
				sceneIntent: '제품을 예쁘게 보여준다.',
				actorAction: '제품을 잡고 보여준다.',
				proofTarget: '핏이 좋다.',
				background: '배경 2',
				cameraDirection: '클로즈업으로 옆에서 훑는다.',
				payoff: '좋아 보인다.',
				overlayText: '텍스트 2',
				durationWeight: 0.5,
			},
		])

		expect(review.decision.outcome).toBe('REVISE')
		expect(review.risk[0]?.severity).toBe('HIGH')
	})

	it('fails prompt compilation when a shot card is missing from mapping', () => {
		const review = reviewPromptCompilation(
			[
				{
					id: 'shot-hook',
					phase: 'HOOK',
					order: 1,
					sceneIntent: '훅',
					actorAction: '액션',
					proofTarget: '증명',
					background: '배경',
					cameraDirection: '카메라',
					payoff: '보상',
					overlayText: '텍스트',
					durationWeight: 0.5,
				},
			],
			{
				runway: 'r',
				hailuo: 'h',
				geminiVeo: 'g',
				minimax: 'm',
				debug: {
					storySummary: 'summary',
					selectedConceptFamily: 'DETAIL_PROOF',
					shotMappings: [],
				},
			},
		)

		expect(review.decision.outcome).toBe('REVISE')
		expect(review.selfCritique[0]).toContain('매핑되지 않았다')
	})
})
