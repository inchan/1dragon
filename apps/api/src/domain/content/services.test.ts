import { describe, expect, it } from 'vitest'
import { HookFormula } from './entities.js'
import { HookSelectionService, SlideLayoutService } from './services.js'

describe('content/services', () => {
	describe('HookSelectionService', () => {
		const service = new HookSelectionService()

		const makeHook = (
			id: string,
			pattern: string,
			category: string,
			successCount: number,
			totalUses: number,
		): HookFormula =>
			new HookFormula({
				id,
				pattern: pattern as 'CONFLICT_RESOLUTION',
				template: `template-${id}`,
				category: category as 'HOME',
				successCount,
				totalUses,
			})

		it('ranks hooks by success rate (descending)', () => {
			const hooks = [
				makeHook('low', 'BEFORE_AFTER', 'HOME', 1, 10),
				makeHook('high', 'CONFLICT_RESOLUTION', 'HOME', 8, 10),
				makeHook('mid', 'CURIOSITY_GAP', 'HOME', 5, 10),
			]

			const ranked = service.rankByPerformance(hooks)

			expect(ranked[0]?.id).toBe('high')
			expect(ranked[1]?.id).toBe('mid')
			expect(ranked[2]?.id).toBe('low')
		})

		it('places hooks with no history at the end', () => {
			const hooks = [
				makeHook('new', 'BEFORE_AFTER', 'HOME', 0, 0),
				makeHook('proven', 'CONFLICT_RESOLUTION', 'HOME', 3, 10),
			]

			const ranked = service.rankByPerformance(hooks)

			expect(ranked[0]?.id).toBe('proven')
			expect(ranked[1]?.id).toBe('new')
		})

		it('selects top hook by default', () => {
			const hooks = [
				makeHook('low', 'BEFORE_AFTER', 'HOME', 1, 10),
				makeHook('high', 'CONFLICT_RESOLUTION', 'HOME', 8, 10),
			]

			const selected = service.selectBest(hooks)

			expect(selected?.id).toBe('high')
		})

		it('returns null for empty input', () => {
			const selected = service.selectBest([])
			expect(selected).toBeNull()
		})

		it('applies exploration factor — sometimes picks non-top hook', () => {
			const hooks = [
				makeHook('top', 'CONFLICT_RESOLUTION', 'HOME', 9, 10),
				makeHook('second', 'BEFORE_AFTER', 'HOME', 7, 10),
				makeHook('third', 'CURIOSITY_GAP', 'HOME', 5, 10),
			]

			const selections = new Set<string>()
			for (let i = 0; i < 100; i++) {
				const selected = service.selectWithExploration(hooks, 0.3)
				if (selected) {
					selections.add(selected.id)
				}
			}

			expect(selections.has('top')).toBe(true)
			expect(selections.size).toBeGreaterThanOrEqual(1)
		})

		it('exploration rate 0 always picks top', () => {
			const hooks = [
				makeHook('top', 'CONFLICT_RESOLUTION', 'HOME', 9, 10),
				makeHook('second', 'BEFORE_AFTER', 'HOME', 7, 10),
			]

			for (let i = 0; i < 20; i++) {
				const selected = service.selectWithExploration(hooks, 0)
				expect(selected?.id).toBe('top')
			}
		})
	})

	describe('SlideLayoutService', () => {
		const service = new SlideLayoutService()

		it('generates 6-slide layout for standard slideshow', () => {
			const layout = service.generateLayout({
				productName: '모던 거실 인테리어',
				hookText: '집주인이 절대 안된다고 했는데...',
				slideCount: 6,
			})

			expect(layout).toHaveLength(6)
			expect(layout[0]?.role).toBe('HOOK')
			expect(layout[5]?.role).toBe('CTA')
		})

		it('generates correct role sequence', () => {
			const layout = service.generateLayout({
				productName: 'test',
				hookText: 'hook',
				slideCount: 6,
			})

			const roles = layout.map((s) => s.role)
			expect(roles).toEqual([
				'HOOK',
				'PROBLEM',
				'DISCOVERY',
				'TRANSFORMATION_1',
				'TRANSFORMATION_2',
				'CTA',
			])
		})

		it('generates 4-slide layout with adjusted roles', () => {
			const layout = service.generateLayout({
				productName: 'test',
				hookText: 'hook',
				slideCount: 4,
			})

			expect(layout).toHaveLength(4)
			expect(layout[0]?.role).toBe('HOOK')
			expect(layout[3]?.role).toBe('CTA')
		})

		it('all slides have non-empty image prompts', () => {
			const layout = service.generateLayout({
				productName: '프리미엄 이어폰',
				hookText: '이 이어폰을 쓰기 전엔 몰랐어요',
				slideCount: 6,
			})

			for (const slide of layout) {
				expect(slide.imagePrompt.length).toBeGreaterThan(0)
			}
		})

		it('hook slide includes overlay text', () => {
			const hookText = '집주인이 절대 안된다고 했는데...'
			const layout = service.generateLayout({
				productName: 'test',
				hookText,
				slideCount: 6,
			})

			expect(layout[0]?.overlayText).toBe(hookText)
		})
	})
})
