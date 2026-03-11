export const SHORTFORM_EXPERIMENT_TEAM = [
	{
		role: 'product_analyst',
		title: '상품 분석가',
		responsibility: '샘플 이미지와 상품 맥락에서 핵심 판매 포인트를 추출한다.',
	},
	{
		role: 'trend_researcher',
		title: '트렌드 리서처',
		responsibility: '공식 플랫폼 소스 기반 최신 숏폼 신호를 압축해 전달한다.',
	},
	{
		role: 'message_strategist',
		title: '메시지 전략가',
		responsibility: '타깃 연령대가 멈추고 클릭할 문장을 설계한다.',
	},
	{
		role: 'creative_producer',
		title: '크리에이티브 프로듀서',
		responsibility: '컷 구조, 비주얼 페이싱, CTA를 조합해 프로토타입을 만든다.',
	},
	{
		role: 'critical_reviewer',
		title: '비판적 리뷰어',
		responsibility:
			'냉정하게 클릭 가능성, 메시지 밀도, 과장 여부, 타깃 적합도를 공격적으로 비판한다.',
	},
	{
		role: 'vision_evaluator',
		title: '비전 평가관',
		responsibility: '완성 영상 프레임을 보고 임팩트, 클릭 유인, 메시지 명확성을 판정한다.',
	},
] as const

export const SHORTFORM_TREND_SNAPSHOT = {
	snapshotDate: '2026-03-10',
	officialSources: [
		{
			title: 'TikTok Next 2026 Trend Report',
			url: 'https://ads.tiktok.com/business/en-US/next',
			note: '2026 theme "Irreplaceable Instinct" and trend signals Reali-Tea, Curiosity Detours, Emotional ROI.',
		},
		{
			title: 'TikTok Creative Center OOTD',
			url: 'https://ads.tiktok.com/business/creativecenter/hashtag/ootd/pc/en?countryCode=KR&period=120',
			note: 'Fashion proof, OOTD language, and social-native styling references.',
		},
		{
			title: 'TikTok Creative Center Outfit',
			url: 'https://ads.tiktok.com/business/creativecenter/hashtag/outfit/pc/en?countryCode=KR&period=120',
			note: 'Outfit and fit-check behavior references for KR social commerce context.',
		},
		{
			title: 'YouTube Shorts creation tools 2025',
			url: 'https://blog.youtube/news-and-events/new-creation-tools-youtube-shorts-2025/',
			note: 'Sound syncing, templates, image stickers, and AI stickers point to edit-friendly, beat-aware creative.',
		},
	] as const,
	trendSignals: [
		{
			key: 'reali-tea',
			title: 'Reali-Tea',
			summary: 'Overproduced polish loses trust; clear product truth and believable texture win.',
			directives: [
				'Use authentic proof beats instead of abstract brand claims.',
				'Keep motion believable and product-led.',
			],
		},
		{
			key: 'curiosity-detours',
			title: 'Curiosity Detours',
			summary: 'A hook should open a small curiosity gap that the next beat resolves quickly.',
			directives: [
				'Lead with a short unresolved question or surprising claim.',
				'Pay the curiosity off within the first proof beat.',
			],
		},
		{
			key: 'emotional-roi',
			title: 'Emotional ROI',
			summary: 'Clicks improve when the outcome feels emotionally useful, not merely technically described.',
			directives: [
				'Translate features into a feeling payoff.',
				'Make the viewer imagine themselves wearing or using the product.',
			],
		},
		{
			key: 'shorts-creation-tools',
			title: 'Shorts Creation Tools',
			summary: 'Editable, beat-aware text moments and sticker-friendly layouts are becoming table stakes.',
			directives: [
				'Keep hook text short enough to survive templates and stickers.',
				'Design cuts that can align with sound-sync rhythms and remix surfaces.',
			],
		},
		{
			key: 'ootd-fit-check',
			title: 'OOTD / Fit-check',
			summary: 'Fashion shortform still overperforms when the product is proven in motion and made commentable.',
			directives: [
				'Show movement, fit, and texture instead of static admiration only.',
				'Use a comment-driving CTA that invites opinion or choice.',
			],
		},
	] as const,
	messagePatterns: [
		'2-5 word hook first',
		'proof beat before CTA',
		'feeling payoff plus functional proof',
		'commentable CTA over passive CTA',
	] as const,
	criticalReviewChecklist: [
		'타깃 연령대가 첫 2초 안에 멈출 이유가 있는가?',
		'메시지가 한 문장으로 요약 가능한가?',
		'상품 정체성이 과장 없이 보이는가?',
		'CTA가 반응을 유도하는가, 아니면 설명으로 끝나는가?',
	] as const,
	visionRubric: [
		'click_likelihood',
		'impact',
		'message_clarity',
		'target_age_fit',
	] as const,
} as const
