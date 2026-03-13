import { describe, expect, it } from 'vitest'
import { planStory } from '@/application/media/story-planner.js'
import { PromptBuilder } from './prompt-builder.js'

describe('PromptBuilder', () => {
	it('builds provider-specific prompts from product/style/copy context', async () => {
		const builder = new PromptBuilder()
		const output = await builder.build({
			productCategory: 'FASHION',
			moods: ['TRENDY'],
			keywords: ['dress', 'summer'],
			stylePreset: 'TRENDY',
			copy: {
				hook: '올여름 필수 원피스',
				description: '가볍고 시원한 원단',
				cta: '지금 바로 구매하세요',
			},
		})

		expect(output.runway).toContain('RUNWAY_GEN4_TURBO')
		expect(output.hailuo).toContain('HAILUO_02')
		expect(output.geminiVeo).toContain('GEMINI_VEO')
		expect(output.minimax).toContain('MINIMAX_VIDEO')
		expect(output.runway).toContain('올여름 필수 원피스')
	})

	it('all provider prompts include cold-open in-motion instruction to prevent freeze frame', async () => {
		const builder = new PromptBuilder()
		const output = await builder.build({
			productCategory: 'BEAUTY',
			moods: ['PREMIUM'],
			keywords: ['serum', 'glow'],
			stylePreset: 'PREMIUM',
			copy: { hook: 'Perfect Skin', description: 'Premium serum', cta: 'Shop Now' },
		})

		for (const prompt of [output.runway, output.hailuo, output.geminiVeo, output.minimax]) {
			expect(prompt).toContain('no freeze frame')
		}
	})

	it('injects influencer-style timeline and UGC realism constraints', async () => {
		const builder = new PromptBuilder()
		const output = await builder.build({
			productCategory: 'ELECTRONICS',
			moods: ['ENERGETIC'],
			keywords: ['wireless earbuds', 'noise canceling'],
			stylePreset: 'DYNAMIC',
			copy: {
				hook: '지하철에서도 또렷한 사운드',
				description: '원터치 연결 + 강력한 노이즈 캔슬링',
				cta: '오늘만 특가로 만나보세요',
			},
		})

		for (const prompt of [output.runway, output.hailuo, output.geminiVeo, output.minimax]) {
			expect(prompt).toContain('real influencer advertisement')
			expect(prompt).toContain('Narrative timeline: 0-2s hook, 2-10s demonstration/social proof, 10-15s CTA close.')
			expect(prompt).toContain('Use authentic UGC language')
			expect(prompt).toContain('Text overlay rule')
		}
	})

	it('injects workflow stages and custom prompt directives when provided', async () => {
		const builder = new PromptBuilder()
		const output = await builder.build({
			productCategory: 'FASHION',
			moods: ['ENERGETIC'],
			keywords: ['dress'],
			stylePreset: 'TRENDY',
			copy: {
				hook: '성수 OOTD 시작',
				description: '체크 원피스 핏체크',
				cta: '댓글로 A/B 코디를 골라줘',
			},
			workflowStages: ['리서치', '기획', '개발', 'QA'],
			promptDirectives: ['Location direction: Seongsu-dong, Seoul.'],
		})

		for (const prompt of [output.runway, output.hailuo, output.geminiVeo, output.minimax]) {
			expect(prompt).toContain('Execution workflow: 리서치 -> 기획 -> 개발 -> QA.')
			expect(prompt).toContain('Location direction: Seongsu-dong, Seoul.')
		}
	})

	it('emits traceable shot-card debug mappings when story planning input is provided', async () => {
		const builder = new PromptBuilder()
		const planning = planStory({
			jobId: 'prompt-builder-story-1',
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
		const output = await builder.build({
			productCategory: 'FASHION',
			moods: ['TRENDY'],
			keywords: ['원피스', '봄룩'],
			stylePreset: 'TRENDY',
			copy: {
				hook: '첫 장면부터 핏이 다르다',
				description: '움직일 때 더 예쁜 실루엣',
				cta: '지금 코디 확인',
			},
			storyBrief: planning.storyBrief,
			selectedConcept: planning.selectedConcept,
			shotCards: planning.shotCards,
		})

		expect(output.debug?.selectedConceptFamily).toBe(planning.selectedConcept.family)
		expect(output.debug?.shotMappings).toHaveLength(3)
		expect(output.debug?.shotMappings[0]?.providerSegments.runway).toContain(
			planning.shotCards[0]!.sceneIntent,
		)
		expect(output.debug?.shotMappings[1]?.providerSegments.geminiVeo).toContain(
			planning.shotCards[1]!.proofTarget,
		)
	})
})
