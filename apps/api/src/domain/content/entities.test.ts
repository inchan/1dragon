import { describe, expect, it } from 'vitest'
import { HookFormula, Slide, Slideshow } from './entities.js'

describe('content/entities', () => {
	describe('HookFormula', () => {
		it('creates a hook formula with required fields', () => {
			const hook = new HookFormula({
				id: 'hook-1',
				pattern: 'CONFLICT_RESOLUTION',
				template: '[person]이 [conflict]라고 해서 AI로 [solution]을 보여줬더니 [reaction]',
				category: 'HOME',
				exampleHook: '집주인이 못 바꾼다고 해서 AI로 어떻게 보일지 보여줬어',
			})

			expect(hook.id).toBe('hook-1')
			expect(hook.pattern).toBe('CONFLICT_RESOLUTION')
			expect(hook.category).toBe('HOME')
			expect(hook.successCount).toBe(0)
			expect(hook.totalUses).toBe(0)
			expect(hook.successRate).toBe(0)
		})

		it('calculates success rate correctly', () => {
			const hook = new HookFormula({
				id: 'hook-2',
				pattern: 'BEFORE_AFTER',
				template: '[before] vs [after]',
				category: 'FASHION',
				successCount: 4,
				totalUses: 10,
			})

			expect(hook.successRate).toBe(0.4)
		})

		it('records a success and updates metrics', () => {
			const hook = new HookFormula({
				id: 'hook-3',
				pattern: 'CURIOSITY_GAP',
				template: 'test',
				category: 'BEAUTY',
				successCount: 2,
				totalUses: 5,
			})

			const updated = hook.recordOutcome(true)

			expect(updated.successCount).toBe(3)
			expect(updated.totalUses).toBe(6)
			expect(updated.successRate).toBe(0.5)
		})

		it('records a failure and updates metrics', () => {
			const hook = new HookFormula({
				id: 'hook-4',
				pattern: 'SOCIAL_PROOF',
				template: 'test',
				category: 'ELECTRONICS',
				successCount: 3,
				totalUses: 5,
			})

			const updated = hook.recordOutcome(false)

			expect(updated.successCount).toBe(3)
			expect(updated.totalUses).toBe(6)
		})

		it('prevents negative metrics', () => {
			const hook = new HookFormula({
				id: 'hook-5',
				pattern: 'CHALLENGE',
				template: 'test',
				category: 'OTHER',
				successCount: -1,
				totalUses: -5,
			})

			expect(hook.successCount).toBe(0)
			expect(hook.totalUses).toBe(0)
		})
	})

	describe('Slide', () => {
		it('creates a slide with required fields', () => {
			const slide = new Slide({
				index: 0,
				role: 'HOOK',
				imagePrompt: 'A modern living room with natural light',
				overlayText: '집주인이 절대 안된다고 했는데...',
			})

			expect(slide.index).toBe(0)
			expect(slide.role).toBe('HOOK')
			expect(slide.imagePrompt).toBeDefined()
			expect(slide.overlayText).toBe('집주인이 절대 안된다고 했는데...')
			expect(slide.imageUrl).toBeNull()
		})

		it('creates a slide with image url', () => {
			const slide = new Slide({
				index: 1,
				role: 'PROBLEM',
				imagePrompt: 'test',
				imageUrl: 'https://example.com/image.png',
			})

			expect(slide.imageUrl).toBe('https://example.com/image.png')
			expect(slide.overlayText).toBeNull()
		})

		it('clamps index to non-negative', () => {
			const slide = new Slide({
				index: -1,
				role: 'CTA',
				imagePrompt: 'test',
			})

			expect(slide.index).toBe(0)
		})
	})

	describe('Slideshow', () => {
		const makeSlides = (count: number): Slide[] =>
			Array.from(
				{ length: count },
				(_, i) =>
					new Slide({
						index: i,
						role: i === 0 ? 'HOOK' : i === count - 1 ? 'CTA' : 'DISCOVERY',
						imagePrompt: `prompt-${i}`,
					}),
			)

		it('creates a slideshow with valid slides', () => {
			const slides = makeSlides(6)
			const slideshow = new Slideshow({
				id: 'ss-1',
				userId: 'user-1',
				productAnalysisId: 'pa-1',
				hookFormulaId: 'hook-1',
				platform: 'TIKTOK',
				slides,
				caption: '이 방이 이렇게 바뀔 수 있다니!',
				hashtags: ['인테리어', 'AI', '변신'],
			})

			expect(slideshow.id).toBe('ss-1')
			expect(slideshow.slides).toHaveLength(6)
			expect(slideshow.status).toBe('DRAFT')
			expect(slideshow.hashtags).toHaveLength(3)
		})

		it('enforces max 5 hashtags', () => {
			const slides = makeSlides(6)
			const slideshow = new Slideshow({
				id: 'ss-2',
				userId: 'user-1',
				productAnalysisId: 'pa-1',
				hookFormulaId: 'hook-1',
				platform: 'TIKTOK',
				slides,
				caption: 'test',
				hashtags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
			})

			expect(slideshow.hashtags).toHaveLength(5)
		})

		it('validates first slide must be HOOK role', () => {
			const slides = [
				new Slide({ index: 0, role: 'DISCOVERY', imagePrompt: 'test' }),
				...makeSlides(5).slice(1),
			]

			expect(
				() =>
					new Slideshow({
						id: 'ss-3',
						userId: 'user-1',
						productAnalysisId: 'pa-1',
						hookFormulaId: 'hook-1',
						platform: 'TIKTOK',
						slides,
						caption: 'test',
						hashtags: [],
					}),
			).toThrowError('First slide must have HOOK role')
		})

		it('validates last slide must be CTA role', () => {
			const slides = makeSlides(6).map(
				(s, i) =>
					new Slide({
						index: i,
						role: i === 0 ? 'HOOK' : 'DISCOVERY',
						imagePrompt: `prompt-${i}`,
					}),
			)

			expect(
				() =>
					new Slideshow({
						id: 'ss-4',
						userId: 'user-1',
						productAnalysisId: 'pa-1',
						hookFormulaId: 'hook-1',
						platform: 'TIKTOK',
						slides,
						caption: 'test',
						hashtags: [],
					}),
			).toThrowError('Last slide must have CTA role')
		})

		it('rejects empty slides array', () => {
			expect(
				() =>
					new Slideshow({
						id: 'ss-5',
						userId: 'user-1',
						productAnalysisId: 'pa-1',
						hookFormulaId: 'hook-1',
						platform: 'TIKTOK',
						slides: [],
						caption: 'test',
						hashtags: [],
					}),
			).toThrowError('Slideshow must have at least 3 slides')
		})

		it('transitions status: DRAFT → GENERATING → READY → PUBLISHED', () => {
			const slides = makeSlides(6)
			const slideshow = new Slideshow({
				id: 'ss-6',
				userId: 'user-1',
				productAnalysisId: 'pa-1',
				hookFormulaId: 'hook-1',
				platform: 'TIKTOK',
				slides,
				caption: 'test',
				hashtags: [],
			})

			expect(slideshow.status).toBe('DRAFT')

			slideshow.markGenerating()
			expect(slideshow.status).toBe('GENERATING')

			slideshow.markReady()
			expect(slideshow.status).toBe('READY')

			slideshow.markPublished()
			expect(slideshow.status).toBe('PUBLISHED')
		})

		it('rejects invalid status transitions', () => {
			const slides = makeSlides(6)
			const slideshow = new Slideshow({
				id: 'ss-7',
				userId: 'user-1',
				productAnalysisId: 'pa-1',
				hookFormulaId: 'hook-1',
				platform: 'TIKTOK',
				slides,
				caption: 'test',
				hashtags: [],
			})

			expect(() => slideshow.markReady()).toThrowError(
				'Cannot transition from DRAFT to READY',
			)
			expect(() => slideshow.markPublished()).toThrowError(
				'Cannot transition from DRAFT to PUBLISHED',
			)
		})

		it('calculates estimated cost', () => {
			const slides = makeSlides(6)
			const slideshow = new Slideshow({
				id: 'ss-8',
				userId: 'user-1',
				productAnalysisId: 'pa-1',
				hookFormulaId: 'hook-1',
				platform: 'TIKTOK',
				slides,
				caption: 'test',
				hashtags: [],
			})

			const cost = slideshow.estimatedCostUsd
			expect(cost).toBeGreaterThan(0)
			expect(cost).toBeLessThanOrEqual(1)
		})
	})
})
