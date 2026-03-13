import { describe, expect, it } from 'vitest'
import { planStory } from './story-planner.js'

describe('story planner', () => {
	it('creates a story brief, concept candidates, and shot cards', () => {
		const result = planStory({
			jobId: 'job-alpha',
			inputImageUrl: 'https://cdn.example.com/product.png',
			productCategory: 'FASHION',
			stylePreset: 'TRENDY',
			moods: ['TRENDY'],
			keywords: ['원피스', '봄룩'],
			copy: {
				hook: '첫 장면부터 핏이 다르다',
				description: '움직일 때 더 예쁜 실루엣',
				cta: '지금 코디 확인',
			},
			targetClipCount: 3,
		})

		expect(result.storyBrief.hook).toContain('첫 장면')
		expect(result.conceptCandidates.length).toBeGreaterThanOrEqual(4)
		expect(result.shotCards).toHaveLength(3)
		expect(result.shotCards[0]?.phase).toBe('HOOK')
		expect(result.shotCards[2]?.phase).toBe('PAYOFF')
	})

	it('selects a different concept family for the same image when recent families exclude the previous one', () => {
		const first = planStory({
			jobId: 'job-first',
			inputImageUrl: 'https://cdn.example.com/product.png',
			productCategory: 'FASHION',
			stylePreset: 'TRENDY',
			moods: ['TRENDY'],
			keywords: ['원피스'],
			copy: {
				hook: '핏부터 보세요',
				description: '움직임이 예쁜 원피스',
				cta: '지금 보기',
			},
			targetClipCount: 3,
		})

		const second = planStory({
			jobId: 'job-second',
			inputImageUrl: 'https://cdn.example.com/product.png',
			productCategory: 'FASHION',
			stylePreset: 'TRENDY',
			moods: ['TRENDY'],
			keywords: ['원피스'],
			copy: {
				hook: '핏부터 보세요',
				description: '움직임이 예쁜 원피스',
				cta: '지금 보기',
			},
			targetClipCount: 3,
			recentConceptFamilies: [first.selectedConcept.family],
		})

		expect(second.selectedConcept.family).not.toBe(first.selectedConcept.family)
		expect(second.selectedConcept.hook).not.toBe(first.selectedConcept.hook)
		expect(second.selectedConcept.proofBeat).not.toBe(first.selectedConcept.proofBeat)
		expect(second.selectedConcept.emotionalPayoff).not.toBe(
			first.selectedConcept.emotionalPayoff,
		)
	})

	it('honors an explicitly requested concept family for regeneration', () => {
		const result = planStory({
			jobId: 'job-third',
			inputImageUrl: 'https://cdn.example.com/product.png',
			productCategory: 'FASHION',
			stylePreset: 'TRENDY',
			moods: ['TRENDY'],
			keywords: ['원피스'],
			copy: {
				hook: '핏부터 보세요',
				description: '움직임이 예쁜 원피스',
				cta: '지금 보기',
			},
			targetClipCount: 3,
			requestedConceptFamily: 'COMMENT_CHALLENGE',
		})

		expect(result.selectedConcept.family).toBe('COMMENT_CHALLENGE')
		expect(result.shotCards[0]?.sceneIntent).toContain('먼저 물어봅니다')
	})
})
