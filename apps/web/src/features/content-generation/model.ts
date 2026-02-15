import type { MarketingCopyVariant } from './types'

export function createDefaultCopyVariants(productName: string): MarketingCopyVariant[] {
	const resolvedName = productName.trim() || '상품'

	return [
		{
			id: 'copy-1',
			label: '변형 1',
			hookCopy: `${resolvedName} 핵심 포인트를 3초 안에 보여주세요`,
			bodyCopy: `${resolvedName}의 특징을 짧고 명확하게 전달하는 설명입니다.`,
			ctaCopy: `${resolvedName} 지금 자세히 보기`,
			hashtags: ['#쇼츠', '#마케팅', '#스냅비드', '#제품소개', '#온라인판매'],
		},
		{
			id: 'copy-2',
			label: '변형 2',
			hookCopy: `${resolvedName}, 오늘 가장 반응 좋은 스타일`,
			bodyCopy: `${resolvedName}의 분위기와 장점을 감성 톤으로 전달하는 문장입니다.`,
			ctaCopy: `${resolvedName} 구매 링크 확인하기`,
			hashtags: ['#릴스', '#감성카피', '#스냅비드', '#브랜드영상', '#셀러툴'],
		},
		{
			id: 'copy-3',
			label: '변형 3',
			hookCopy: `${resolvedName}를 데이터 중심으로 비교해보세요`,
			bodyCopy: `${resolvedName}의 장점을 정보형 톤으로 정리해 신뢰를 높이는 문장입니다.`,
			ctaCopy: `${resolvedName} 혜택 보러 가기`,
			hashtags: ['#유튜브쇼츠', '#정보형카피', '#스냅비드', '#제품분석', '#광고영상'],
		},
	]
}

export function selectCopyVariantById(
	variants: ReadonlyArray<MarketingCopyVariant>,
	variantId: string,
): MarketingCopyVariant {
	return variants.find((variant) => variant.id === variantId) ?? variants[0]!
}

export function clampNarrationSpeed(speed: number): number {
	if (!Number.isFinite(speed)) {
		return 1
	}

	return Math.min(1.5, Math.max(0.8, speed))
}
