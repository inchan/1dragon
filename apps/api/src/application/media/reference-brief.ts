import {
	normalizedReferenceBriefSchema,
	type NormalizedReferenceBrief,
	type Platform,
	type ReferenceBrief,
} from '@1dragon/shared'

type NormalizeReferenceBriefInput = {
	readonly brief: ReferenceBrief
	readonly fallbackPlatforms?: ReadonlyArray<Platform>
}

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

function buildLandingPageExcerpt(value: string | undefined): string | undefined {
	const normalized = normalizeText(value)?.replace(/\s+/g, ' ')
	if (!normalized) {
		return undefined
	}

	return normalized.slice(0, 240)
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
		proofQueries: normalizeList([...input.coreBenefits, ...input.differentiators, ...input.proofPoints]),
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

export type { NormalizeReferenceBriefInput }

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
	const landingPageExcerpt = buildLandingPageExcerpt(input.brief.landingPageText)
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
		...(priceBand ? { priceBand } : {}),
		coreBenefits,
		differentiators,
		proofPoints,
		targetAudienceSummary: audienceSummary,
		useCases,
		painPoints,
		...(landingPageUrl ? { landingPageUrl } : {}),
		...(landingPageExcerpt ? { landingPageExcerpt } : {}),
		competitorExamples,
		categoryExamples,
		successMetrics,
		platformTargets,
		queryHints,
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
