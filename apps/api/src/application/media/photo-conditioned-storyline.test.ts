import { describe, expect, it } from 'vitest'
import {
	buildPhotoConditionedStorylineOutputSchema,
	buildPhotoConditionedStorylinePrompt,
	mapStorylineTypeToMessageSpine,
} from './photo-conditioned-storyline.js'

describe('photo-conditioned storyline prompt', () => {
	it('maps storyline types to the approved message spines', () => {
		expect(mapStorylineTypeToMessageSpine('DETAIL_TO_SILHOUETTE_REVEAL')).toBe(
			'DETAIL_SILHOUETTE_DECISION',
		)
		expect(mapStorylineTypeToMessageSpine('QUESTION_PROOF_PAYOFF')).toBe(
			'QUESTION_PROOF_CHOICE',
		)
	})

	it('builds a deterministic JSON schema for 16-second candidates', () => {
		const schema = buildPhotoConditionedStorylineOutputSchema(16)
		const candidate = Array.isArray(schema.candidates) ? schema.candidates[0] : null
		const beatPlan =
			candidate && typeof candidate === 'object' && Array.isArray(candidate.beatPlan)
				? candidate.beatPlan
				: []

		expect(schema.diagnosis).toBeDefined()
		expect(candidate).toBeTruthy()
		expect(beatPlan).toHaveLength(3)
		expect(beatPlan[0]).toMatchObject({ phase: 'HOOK', timeRangeSeconds: '0-3' })
		expect(beatPlan[1]).toMatchObject({ phase: 'PROOF', timeRangeSeconds: '3-11' })
		expect(beatPlan[2]).toMatchObject({ phase: 'PAYOFF', timeRangeSeconds: '11-16' })
	})

	it('renders a prompt that locks the schema and house rules', () => {
		const prompt = buildPhotoConditionedStorylinePrompt({
			inputImageUrl: 'https://cdn.example.com/fashion/plaid-dress.png',
			productCategory: 'FASHION',
			targetDurationSeconds: 16,
			candidateCount: 3,
			cta: '지금 코디 확인',
			brandTone: 'restrained editorial',
			creativeContext: 'KR women fashion short-form ad',
			bannedClaims: ['체형보정', '인생템'],
			seedDiagnosis: {
				primaryVisualClaim: '사선 랩 구조가 허리선을 또렷하게 정리한다',
				recommendedScenarioWrappers: ['TRANSITION_LOOK', 'WHAT_I_WORE_TO_X'],
				recommendedStorylineTypes: [
					'QUESTION_PROOF_PAYOFF',
					'DETAIL_TO_SILHOUETTE_REVEAL',
				],
			},
		})

		expect(prompt).toContain('Allowed scenario wrappers:')
		expect(prompt).toContain(
			'TRANSITION_LOOK -> default place DINNER, action TRANSITION, moment EVENING_TRANSITION, proofGoal VERSATILITY',
		)
		expect(prompt).toContain('Allowed action frames:')
		expect(prompt).toContain('Allowed proof goals:')
		expect(prompt).toContain('Allowed storyline types:')
		expect(prompt).toContain('QUESTION_PROOF_PAYOFF -> default spine QUESTION_PROOF_CHOICE')
		expect(prompt).toContain(
			'DETAIL_TO_SILHOUETTE_REVEAL -> default spine DETAIL_SILHOUETTE_DECISION',
		)
		expect(prompt).toContain('Every candidate must choose one scenarioWrapper')
		expect(prompt).toContain('Beat plans and shot hints must describe a concrete human action')
		expect(prompt).toContain('Static mannequin-like swaying, catalog posing, or empty arm movement is invalid.')
		expect(prompt).toContain('One candidate = one claim.')
		expect(prompt).toContain('Beat plan must fit these timing buckets exactly')
		expect(prompt).toContain('"diagnosis"')
		expect(prompt).toContain('"candidates"')
		expect(prompt).toContain('"selection"')
		expect(prompt).toContain('"primaryVisualClaim": "사선 랩 구조가 허리선을 또렷하게 정리한다"')
	})
})
