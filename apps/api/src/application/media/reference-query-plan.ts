import type {
	NormalizedReferenceBrief,
	OfficialReferenceQueryPlan,
	OfficialReferenceQueryPlanItem,
	Platform,
	ReferenceBriefTaxonomy,
} from '@1dragon/shared'

function uniqueQueries(items: ReadonlyArray<OfficialReferenceQueryPlanItem>): OfficialReferenceQueryPlanItem[] {
	const seen = new Set<string>()
	const result: OfficialReferenceQueryPlanItem[] = []

	for (const item of items) {
		const key = [item.lane, item.source, item.intent, item.platformTarget ?? '', item.query].join('::')
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		result.push(item)
	}

	return result
}

function pushIfPresent(
	items: OfficialReferenceQueryPlanItem[],
	item: OfficialReferenceQueryPlanItem | null,
): void {
	if (item) {
		items.push(item)
	}
}

function buildStructureLaneQuery(input: {
	taxonomy: ReferenceBriefTaxonomy
	platform: Platform
	normalizedBrief: NormalizedReferenceBrief
}): OfficialReferenceQueryPlanItem | null {
	const category = input.taxonomy.category.toLowerCase()
	const usageContext = input.taxonomy.usageContexts[0]?.toLowerCase().replaceAll('_', ' ') ?? 'product proof'
	const proof = input.normalizedBrief.queryHints.proofQueries[0] ?? input.normalizedBrief.coreBenefits[0]

	switch (input.platform) {
		case 'TIKTOK':
			return {
				lane: 'OFFICIAL_SNS_STRUCTURE',
				source: 'TIKTOK_CREATIVE_CENTER',
				intent: proof ? 'proof' : 'category',
				platformTarget: input.platform,
				query: proof
					? `${category} ${usageContext} ${proof}`.trim()
					: `${category} ${usageContext}`.trim(),
				rights: 'STRUCTURE_ONLY',
				freshness: 'weekly',
				rationale: 'Use TikTok official structure references that match category and first proof beat.',
			}
		case 'INSTAGRAM_REELS':
			return {
				lane: 'OFFICIAL_SNS_STRUCTURE',
				source: 'META_AD_LIBRARY',
				intent: proof ? 'proof' : 'category',
				platformTarget: input.platform,
				query: proof ? `${category} reels ${proof}`.trim() : `${category} reels ad`.trim(),
				rights: 'STRUCTURE_ONLY',
				freshness: 'weekly',
				rationale: 'Use Meta Ad Library to inspect rights-safe Reels ad structure and proof patterns.',
			}
		case 'YOUTUBE_SHORTS':
			return {
				lane: 'OFFICIAL_SNS_STRUCTURE',
				source: 'YOUTUBE_SHORTS_GUIDANCE',
				intent: 'category',
				platformTarget: input.platform,
				query: `${category} shorts hook proof`.trim(),
				rights: 'STRUCTURE_ONLY',
				freshness: 'monthly',
				rationale: 'Use YouTube Shorts guidance to map structure to the target platform grammar.',
			}
	}
}

function buildPromptGuideQuery(input: {
	taxonomy: ReferenceBriefTaxonomy
	platforms: ReadonlyArray<Platform>
	normalizedBrief: NormalizedReferenceBrief
}): OfficialReferenceQueryPlanItem {
	const usageContext = input.taxonomy.usageContexts[0]?.toLowerCase().replaceAll('_', ' ') ?? 'product proof'
	const productFact = input.normalizedBrief.queryHints.productFacts[0] ?? input.normalizedBrief.productName
	const source = input.platforms.includes('YOUTUBE_SHORTS')
		? 'VEO_PROMPT_GUIDE'
		: input.platforms.includes('INSTAGRAM_REELS')
			? 'RUNWAY_PROMPT_GUIDE'
			: 'SORA_PROMPT_GUIDE'

	return {
		lane: 'OFFICIAL_PLATFORM_PROMPT',
		source,
		intent: 'prompt_recipe',
		query: `${productFact} ${usageContext} prompt recipe`.trim(),
		rights: 'DOC_LIBRARY_USAGE',
		freshness: 'monthly',
		rationale: 'Use official prompt libraries to collect structure-safe prompt recipe patterns for the active taxonomy.',
	}
}

function buildSignalMiningQuery(input: {
	normalizedBrief: NormalizedReferenceBrief
}): OfficialReferenceQueryPlanItem | null {
	const marketSignal = input.normalizedBrief.queryHints.marketLanguage[0]
	const proof = input.normalizedBrief.queryHints.proofQueries[0]
	const query = [marketSignal, proof].filter(Boolean).join(' ').trim()
	if (!query) {
		return null
	}

	return {
		lane: 'SIGNAL_MINING',
		source: 'GOOGLE_TRENDS',
		intent: marketSignal ? 'market_language' : 'proof',
		query,
		rights: 'DERIVED_METADATA_ONLY',
		freshness: 'weekly',
		rationale: 'Use derived metadata signals to validate demand language and proof vocabulary before retrieval.',
	}
}

export function buildOfficialReferenceQueryPlan(input: {
	jobId: string
	normalizedBrief: NormalizedReferenceBrief
}): OfficialReferenceQueryPlan {
	const items: OfficialReferenceQueryPlanItem[] = []
	const taxonomy = input.normalizedBrief.taxonomy

	for (const platform of input.normalizedBrief.platformTargets) {
		pushIfPresent(
			items,
			buildStructureLaneQuery({
				taxonomy,
				platform,
				normalizedBrief: input.normalizedBrief,
			}),
		)
	}

	items.push(
		buildPromptGuideQuery({
			taxonomy,
			platforms: input.normalizedBrief.platformTargets,
			normalizedBrief: input.normalizedBrief,
		}),
	)
	pushIfPresent(items, buildSignalMiningQuery({ normalizedBrief: input.normalizedBrief }))

	return {
		jobId: input.jobId,
		taxonomy,
		items: uniqueQueries(items).slice(0, 12),
	}
}
