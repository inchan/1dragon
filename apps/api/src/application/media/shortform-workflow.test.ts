import { describe, expect, it } from 'vitest'
import { applyShortformWorkflow, SHORTFORM_WORKFLOW_STAGES } from './shortform-workflow.js'

describe('applyShortformWorkflow', () => {
	it('패션 카테고리에서 워크플로우를 활성화하고 트렌드/디렉션을 확장한다', () => {
		const output = applyShortformWorkflow({
			enabled: true,
			productCategory: 'FASHION',
			moods: ['PROFESSIONAL'],
			keywords: ['dress'],
			copy: {
				hook: '오늘의 룩',
				description: '체크 패턴 원피스',
				cta: '지금 확인',
			},
			context: {
				location: '성수동',
				profession: '하이패션 모델',
				identity: '한국 여성',
				traits: ['개성이 뚜렷함'],
			},
		})

		expect(output.enabled).toBe(true)
		expect(output.workflowStages).toEqual([...SHORTFORM_WORKFLOW_STAGES])
		expect(output.keywords).toContain('ootd')
		expect(output.keywords).toContain('grwm')
		expect(output.copy.cta).toContain('댓글')
		expect(output.promptDirectives.join(' ')).toContain('성수동')
		expect(output.promptDirectives.join(' ')).toContain('하이패션 모델')
		expect(output.promptDirectives.join(' ')).toContain('critical reviewer')
		expect(output.trendSnapshotDate).toBe('2026-03-10')
	})

	it('비활성화 또는 비대상 카테고리면 입력을 그대로 유지한다', () => {
		const output = applyShortformWorkflow({
			enabled: false,
			productCategory: 'ELECTRONICS',
			moods: ['PROFESSIONAL'],
			keywords: ['earbuds'],
			copy: {
				hook: '몰입 사운드',
				description: '노이즈 캔슬링',
				cta: '지금 구매',
			},
		})

		expect(output.enabled).toBe(false)
		expect(output.workflowStages).toHaveLength(0)
		expect(output.moods).toEqual(['PROFESSIONAL'])
		expect(output.keywords).toEqual(['earbuds'])
		expect(output.copy).toEqual({
			hook: '몰입 사운드',
			description: '노이즈 캔슬링',
			cta: '지금 구매',
		})
	})
})
