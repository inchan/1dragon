import { describe, expect, it } from 'vitest'
import type { StoryBrief } from '@/domain/media/planning.js'
import {
	buildPhotoConditionedConceptCandidates,
	deriveProductImageDiagnosis,
} from './photo-conditioned-matching.js'

function buildFashionBrief(
	overrides: Partial<StoryBrief> = {},
): StoryBrief {
	return {
		targetViewer: '짧은 시간 안에 핏과 분위기를 확인하고 싶은 숏폼 패션 소비자',
		corePromise: '사선 랩과 허리선이 실루엣을 정리하는 원피스',
		hook: '핏부터 보세요',
		proofStrategy: '허리선과 실루엣이 어떻게 정리되는지 증명한다.',
		emotionalPayoff: '입는 순간 분위기가 살아난다는 확신',
		cta: '지금 코디 확인',
		messageSpineId: 'DETAIL_SILHOUETTE_DECISION',
		hookLine: '사선 랩 디테일이 먼저 읽혀야 한다.',
		proofLine: '랩 구조가 허리선과 A라인 실루엣을 정리하는 순간을 보여준다.',
		payoffLine: '전신 실루엣이 완성된 순간의 자신감을 남긴다.',
		ctaLine: '지금 코디 확인',
		viewerTakeaway: '사선 랩과 허리선이 세련된 A라인 실루엣을 만든다.',
		editorialThesis: '디테일에서 실루엣으로 이어지는 절제된 에디토리얼',
		talentDirection: 'adult Korean editorial talent with restrained gaze',
		tone: '네이티브 숏폼 추천 톤',
		productCategory: 'FASHION',
		stylePreset: 'TRENDY',
		moods: ['TRENDY'],
		keywords: ['원피스', '랩', '허리선'],
		...overrides,
	}
}

describe('photo-conditioned matching', () => {
	it('derives detail-led diagnosis from wrap and silhouette signals', () => {
		const diagnosis = deriveProductImageDiagnosis({
			productCategory: 'FASHION',
			keywords: ['원피스', '체크', '랩', '허리선'],
			copy: {
				hook: '핏부터 보세요',
				description: '사선 랩과 허리선이 돋보이는 체크 원피스',
				cta: '지금 코디 확인',
			},
		})

		expect(diagnosis.heroDetail).toContain('랩')
		expect(diagnosis.patternDensity).toBe('HIGH')
		expect(diagnosis.recommendedScenarioWrappers).toContain('GRWM_FOR_OCCASION')
		expect(diagnosis.recommendedStorylineTypes).toContain('DETAIL_TO_SILHOUETTE_REVEAL')
		expect(diagnosis.recommendedMessageSpines).toContain('DETAIL_SILHOUETTE_DECISION')
	})

	it('prioritizes detail-to-silhouette candidates for detail-led fashion briefs', () => {
		const diagnosis = deriveProductImageDiagnosis({
			productCategory: 'FASHION',
			keywords: ['원피스', '체크', '랩', '허리선'],
			copy: {
				hook: '핏부터 보세요',
				description: '사선 랩과 허리선이 돋보이는 체크 원피스',
				cta: '지금 코디 확인',
			},
		})

		const candidates = buildPhotoConditionedConceptCandidates({
			brief: buildFashionBrief(),
			diagnosis,
		})

		expect(candidates[0]?.storylineType).toBe('DETAIL_TO_SILHOUETTE_REVEAL')
		expect(candidates[0]?.family).toBe('DETAIL_PROOF')
		expect(candidates[0]?.supportingSignals).toContain(diagnosis.heroDetail)
	})

	it('recommends lookbook and routine structures when versatility signals are strong', () => {
		const diagnosis = deriveProductImageDiagnosis({
			productCategory: 'FASHION',
			keywords: ['자켓', '출근', '데이트', '일상'],
			copy: {
				hook: '한 벌로 어디까지 갈까',
				description: '출근부터 저녁 약속까지 이어지는 자켓 룩',
				cta: '지금 룩 확인',
			},
		})

		expect(diagnosis.versatilitySignal).toBe('MULTI_OCCASION')
		expect(diagnosis.recommendedScenarioWrappers).toContain('TRANSITION_LOOK')
		expect(diagnosis.recommendedScenarioWrappers).toContain('WHAT_I_WORE_TO_X')
		expect(diagnosis.recommendedStorylineTypes).toContain('THREE_OCCASION_LOOKBOOK')
		expect(diagnosis.recommendedStorylineTypes).toContain('ROUTINE_TO_LOOK_PAYOFF')
	})
})
