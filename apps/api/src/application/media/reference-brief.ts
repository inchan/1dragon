import {
	type NormalizedReferenceBrief,
	type Platform,
	ProductCategory,
	type ProductCategory as ProductCategoryType,
	type ReferenceBrief,
	type ReferenceBriefTaxonomy,
	type ReferenceTaxonomyUsageContext,
	normalizedReferenceBriefSchema,
} from '@1dragon/shared'
import type { ResolvedLandingPageTruth } from './landing-page-truth.js'

type ReferenceBriefProductAnalysisSignal = {
	readonly id: string
	readonly category?: ProductCategoryType | null
	readonly keywords?: ReadonlyArray<string>
	readonly targetAudience?: string | null
}

type NormalizeReferenceBriefInput = {
	readonly brief: ReferenceBrief
	readonly fallbackPlatforms?: ReadonlyArray<Platform>
	readonly resolvedLandingPage?: ResolvedLandingPageTruth
	readonly productAnalysis?: ReferenceBriefProductAnalysisSignal
}

const PRODUCT_CATEGORY_HINTS: ReadonlyArray<{
	readonly category: ProductCategoryType
	readonly hints: ReadonlyArray<string>
}> = [
	{ category: ProductCategory.FASHION, hints: ['fashion', 'apparel', 'dress', 'wear', 'clothing'] },
	{
		category: ProductCategory.BEAUTY,
		hints: ['beauty', 'cosmetic', 'skincare', 'makeup', 'haircare'],
	},
	{ category: ProductCategory.FOOD, hints: ['food', 'snack', 'beverage', 'drink', 'meal'] },
	{
		category: ProductCategory.ELECTRONICS,
		hints: ['electronics', 'device', 'gadget', 'tech', 'audio'],
	},
	{ category: ProductCategory.HOME, hints: ['home', 'kitchen', 'living', 'furniture', 'decor'] },
	{
		category: ProductCategory.ACCESSORIES,
		hints: ['accessory', 'accessories', 'bag', 'wallet', 'watch', 'jewelry'],
	},
	{
		category: ProductCategory.SPORTS,
		hints: ['sports', 'fitness', 'athletic', 'outdoor', 'training'],
	},
]

function normalizeText(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function normalizeList(values: ReadonlyArray<string>): string[] {
	const seen = new Set<string>()
	const normalized: string[] = []

	for (const value of values) {
		const trimmed = value.trim()
		if (trimmed.length === 0) {
			continue
		}

		const key = trimmed.toLowerCase()
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		normalized.push(trimmed)
	}

	return normalized
}

function normalizePlatforms(values: ReadonlyArray<Platform>): Platform[] {
	return [...new Set(values)]
}

function normalizeUsageContexts(
	values: ReadonlyArray<ReferenceTaxonomyUsageContext>,
): ReferenceTaxonomyUsageContext[] {
	return [...new Set(values)]
}

function resolveProductCategoryHint(value: string | undefined): ProductCategoryType | undefined {
	const normalized = normalizeText(value)?.toUpperCase()
	if (!normalized) {
		return undefined
	}

	const enumMatch = Object.values(ProductCategory).find((category) => category === normalized)
	if (enumMatch) {
		return enumMatch
	}

	const lowered = normalized.toLowerCase()
	for (const candidate of PRODUCT_CATEGORY_HINTS) {
		if (candidate.hints.some((hint) => lowered.includes(hint))) {
			return candidate.category
		}
	}

	return undefined
}

function includesAny(value: string, candidates: ReadonlyArray<string>): boolean {
	return candidates.some((candidate) => value.includes(candidate))
}

function buildLandingPageExcerpt(value: string | undefined): string | undefined {
	const normalized = normalizeText(value)?.replace(/\s+/g, ' ')
	if (!normalized) {
		return undefined
	}

	return normalized.slice(0, 240)
}

function buildLandingPageTitle(value: string | undefined): string | undefined {
	const normalized = normalizeText(value)?.replace(/\s+/g, ' ')
	if (!normalized) {
		return undefined
	}

	return normalized.slice(0, 160)
}

function buildQueryHints(input: {
	readonly productName: string
	readonly productCategoryHint: string | undefined
	readonly priceBand: string | undefined
	readonly coreBenefits: ReadonlyArray<string>
	readonly differentiators: ReadonlyArray<string>
	readonly proofPoints: ReadonlyArray<string>
	readonly audienceSummary: string
	readonly useCases: ReadonlyArray<string>
	readonly painPoints: ReadonlyArray<string>
	readonly competitorExamples: ReadonlyArray<string>
	readonly categoryExamples: ReadonlyArray<string>
}): NormalizedReferenceBrief['queryHints'] {
	return {
		productFacts: normalizeList([
			input.productName,
			...(input.productCategoryHint ? [input.productCategoryHint] : []),
			...(input.priceBand ? [input.priceBand] : []),
			...input.coreBenefits,
			...input.differentiators,
		]),
		marketLanguage: normalizeList([
			input.audienceSummary,
			...input.useCases,
			...input.painPoints,
			...input.coreBenefits,
		]),
		proofQueries: normalizeList([
			...input.coreBenefits,
			...input.differentiators,
			...input.proofPoints,
		]),
		competitorQueries: normalizeList([...input.competitorExamples, ...input.categoryExamples]),
	}
}

function buildMissingSignals(input: {
	readonly priceBand: string | undefined
	readonly proofPoints: ReadonlyArray<string>
	readonly competitorExamples: ReadonlyArray<string>
	readonly categoryExamples: ReadonlyArray<string>
	readonly successMetrics: ReadonlyArray<{ name: string; target?: string }>
	readonly landingPageExcerpt: string | undefined
}): string[] {
	const missing: string[] = []

	if (!input.priceBand) {
		missing.push('price_band')
	}
	if (input.proofPoints.length === 0) {
		missing.push('proof_points')
	}
	if (input.competitorExamples.length === 0 && input.categoryExamples.length === 0) {
		missing.push('reference_examples')
	}
	if (input.successMetrics.length === 0) {
		missing.push('success_metrics')
	}
	if (!input.landingPageExcerpt) {
		missing.push('landing_page_text')
	}

	return missing
}

function calculateCompletenessScore(input: {
	readonly priceBand: string | undefined
	readonly proofPoints: ReadonlyArray<string>
	readonly competitorExamples: ReadonlyArray<string>
	readonly categoryExamples: ReadonlyArray<string>
	readonly successMetrics: ReadonlyArray<{ name: string; target?: string }>
	readonly landingPageExcerpt: string | undefined
}): number {
	let score = 40

	if (input.priceBand) {
		score += 10
	}
	if (input.proofPoints.length > 0) {
		score += 15
	}
	if (input.competitorExamples.length > 0 || input.categoryExamples.length > 0) {
		score += 15
	}
	if (input.successMetrics.length > 0) {
		score += 10
	}
	if (input.landingPageExcerpt) {
		score += 10
	}

	return Math.max(0, Math.min(100, score))
}

function buildTaxonomy(input: {
	readonly productCategoryHint: string | undefined
	readonly useCases: ReadonlyArray<string>
	readonly categoryExamples: ReadonlyArray<string>
	readonly audienceSummary: string
	readonly productAnalysis?: ReferenceBriefProductAnalysisSignal
}): ReferenceBriefTaxonomy {
	const briefCategory = resolveProductCategoryHint(input.productCategoryHint)
	const analysisCategory = input.productAnalysis?.category ?? undefined
	const category = analysisCategory ?? briefCategory ?? ProductCategory.OTHER

	let source: ReferenceBriefTaxonomy['source']
	if (analysisCategory && briefCategory) {
		source = 'merged'
	} else if (analysisCategory) {
		source = 'product_analysis'
	} else {
		source = 'brief'
	}

	const contextCorpus = normalizeList([
		input.audienceSummary,
		...input.useCases,
		...input.categoryExamples,
		...(input.productAnalysis?.keywords ?? []),
		...(input.productAnalysis?.targetAudience ? [input.productAnalysis.targetAudience] : []),
	])
		.join(' ')
		.toLowerCase()

	const usageContexts: ReferenceTaxonomyUsageContext[] = []

	if (includesAny(contextCorpus, ['wear', 'outfit', 'fit', 'fabric', 'dress', 'bag', 'jewelry'])) {
		usageContexts.push('ON_BODY')
	}
	if (includesAny(contextCorpus, ['detail', 'texture', 'stitch', 'close', 'material'])) {
		usageContexts.push('DETAIL_CLOSEUP')
	}
	if (includesAny(contextCorpus, ['demo', 'show', 'how to', 'hand'])) {
		usageContexts.push('HANDS_ON_DEMO')
	}
	if (includesAny(contextCorpus, ['commute', 'office', 'workday', 'daily'])) {
		usageContexts.push('COMMUTE')
	}
	if (includesAny(contextCorpus, ['home', 'room', 'living', 'kitchen'])) {
		usageContexts.push('ROOM_CONTEXT')
	}
	if (includesAny(contextCorpus, ['desk', 'setup', 'workspace'])) {
		usageContexts.push('DESK_SETUP')
	}
	if (includesAny(contextCorpus, ['beauty', 'skincare', 'makeup', 'routine', 'face'])) {
		usageContexts.push('BEAUTY_ROUTINE')
	}
	if (includesAny(contextCorpus, ['workout', 'fitness', 'gym', 'training', 'sport'])) {
		usageContexts.push('WORKOUT')
	}
	if (includesAny(contextCorpus, ['meal', 'snack', 'drink', 'bite', 'sip', 'food'])) {
		usageContexts.push('MEALTIME')
	}
	if (includesAny(contextCorpus, ['before', 'after', 'transformation', 'comparison'])) {
		usageContexts.push('BEFORE_AFTER')
	}

	const normalizedUsageContexts = normalizeUsageContexts(usageContexts)
	if (normalizedUsageContexts.length === 0) {
		switch (category) {
			case ProductCategory.FASHION:
			case ProductCategory.ACCESSORIES:
				normalizedUsageContexts.push('ON_BODY')
				break
			case ProductCategory.BEAUTY:
				normalizedUsageContexts.push('BEAUTY_ROUTINE')
				break
			case ProductCategory.HOME:
				normalizedUsageContexts.push('ROOM_CONTEXT')
				break
			case ProductCategory.FOOD:
				normalizedUsageContexts.push('MEALTIME')
				break
			case ProductCategory.SPORTS:
				normalizedUsageContexts.push('WORKOUT')
				break
			case ProductCategory.ELECTRONICS:
				normalizedUsageContexts.push('HANDS_ON_DEMO')
				break
			default:
				normalizedUsageContexts.push('DETAIL_CLOSEUP')
				break
		}
	}

	return {
		category,
		source,
		usageContexts: normalizedUsageContexts.slice(0, 5),
	}
}

export type { NormalizeReferenceBriefInput }
export type { ReferenceBriefProductAnalysisSignal }

export function normalizeReferenceBriefInput(
	input: NormalizeReferenceBriefInput,
): NormalizedReferenceBrief {
	const productName = input.brief.productName.trim()
	const productCategoryHint = normalizeText(input.brief.productCategoryHint)
	const priceBand = normalizeText(input.brief.priceBand)
	const coreBenefits = normalizeList(input.brief.coreBenefits)
	const differentiators = normalizeList(input.brief.differentiators)
	const proofPoints = normalizeList(input.brief.proofPoints)
	const useCases = normalizeList(input.brief.targetAudience.useCases)
	const painPoints = normalizeList(input.brief.targetAudience.painPoints)
	const audienceSummary = input.brief.targetAudience.summary.trim()
	const competitorExamples = normalizeList(input.brief.competitorExamples)
	const categoryExamples = normalizeList(input.brief.categoryExamples)
	const successMetrics = input.brief.successMetrics.map((metric) => {
		const target = normalizeText(metric.target)
		return target ? { name: metric.name.trim(), target } : { name: metric.name.trim() }
	})
	const landingPageUrl = normalizeText(input.brief.landingPageUrl)
	const resolvedLandingPage = input.resolvedLandingPage ?? {
		source: input.brief.landingPageText ? ('provided_text' as const) : ('url_only' as const),
		...(input.brief.landingPageText ? { text: input.brief.landingPageText } : {}),
	}
	const landingPageTitle = buildLandingPageTitle(resolvedLandingPage.title)
	const landingPageDescription = buildLandingPageExcerpt(resolvedLandingPage.description)
	const landingPageExcerpt = buildLandingPageExcerpt(
		resolvedLandingPage.text ?? resolvedLandingPage.description ?? resolvedLandingPage.title,
	)
	const platformTargets = normalizePlatforms(
		input.brief.platformTargets && input.brief.platformTargets.length > 0
			? input.brief.platformTargets
			: (input.fallbackPlatforms ?? []),
	)

	if (platformTargets.length === 0) {
		throw new Error('Expected at least one platform target for reference brief normalization')
	}

	const queryHints = buildQueryHints({
		productName,
		productCategoryHint,
		priceBand,
		coreBenefits,
		differentiators,
		proofPoints,
		audienceSummary,
		useCases,
		painPoints,
		competitorExamples,
		categoryExamples,
	})
	const taxonomy = buildTaxonomy({
		productCategoryHint,
		useCases,
		categoryExamples,
		audienceSummary,
		...(input.productAnalysis ? { productAnalysis: input.productAnalysis } : {}),
	})

	const missingSignals = buildMissingSignals({
		priceBand,
		proofPoints,
		competitorExamples,
		categoryExamples,
		successMetrics,
		landingPageExcerpt,
	})

	return normalizedReferenceBriefSchema.parse({
		productName,
		...(productCategoryHint ? { productCategoryHint } : {}),
		...(input.productAnalysis ? { productAnalysisId: input.productAnalysis.id } : {}),
		...(priceBand ? { priceBand } : {}),
		coreBenefits,
		differentiators,
		proofPoints,
		targetAudienceSummary: audienceSummary,
		useCases,
		painPoints,
		...(landingPageUrl ? { landingPageUrl } : {}),
		...(landingPageExcerpt ? { landingPageExcerpt } : {}),
		...(landingPageTitle ? { landingPageTitle } : {}),
		...(landingPageDescription ? { landingPageDescription } : {}),
		landingPageSource: resolvedLandingPage.source,
		competitorExamples,
		categoryExamples,
		successMetrics,
		platformTargets,
		queryHints,
		taxonomy,
		missingSignals,
		completenessScore: calculateCompletenessScore({
			priceBand,
			proofPoints,
			competitorExamples,
			categoryExamples,
			successMetrics,
			landingPageExcerpt,
		}),
	})
}
