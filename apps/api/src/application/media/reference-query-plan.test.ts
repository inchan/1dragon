import { describe, expect, it } from 'vitest'
import type { NormalizedReferenceBrief } from '@1dragon/shared'
import { buildOfficialReferenceQueryPlan } from './reference-query-plan.js'

const baseBrief: NormalizedReferenceBrief = {
	productName: 'Metro Sling Bag',
	productCategoryHint: 'accessories',
	productAnalysisId: '11111111-1111-4111-8111-111111111111',
	priceBand: 'mid-premium',
	coreBenefits: ['hands-free commute'],
	differentiators: ['water-resistant finish'],
	proofPoints: ['fits daily essentials'],
	targetAudienceSummary: 'city commuters',
	useCases: ['commute'],
	painPoints: ['bulky tote'],
	landingPageExcerpt: 'A slim sling bag built for urban commutes and quick access essentials.',
	landingPageSource: 'provided_text',
	competitorExamples: [],
	categoryExamples: ['everyday carry'],
	successMetrics: [],
	platformTargets: ['TIKTOK', 'INSTAGRAM_REELS'],
	queryHints: {
		productFacts: ['Metro Sling Bag', 'accessories', 'hands-free commute'],
		marketLanguage: ['city commuters', 'commute'],
		proofQueries: ['hands-free commute', 'fits daily essentials'],
		competitorQueries: ['everyday carry'],
	},
	taxonomy: {
		category: 'ACCESSORIES',
		source: 'merged',
		usageContexts: ['COMMUTE', 'ON_BODY'],
	},
	missingSignals: [],
	completenessScore: 80,
}

describe('buildOfficialReferenceQueryPlan', () => {
	it('creates official-source queries across structure, prompt, and signal lanes', () => {
		const plan = buildOfficialReferenceQueryPlan({
			jobId: '22222222-2222-4222-8222-222222222222',
			normalizedBrief: baseBrief,
		})

		expect(plan.taxonomy).toEqual(baseBrief.taxonomy)
		expect(plan.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					lane: 'OFFICIAL_SNS_STRUCTURE',
					source: 'TIKTOK_CREATIVE_CENTER',
					platformTarget: 'TIKTOK',
					rights: 'STRUCTURE_ONLY',
				}),
				expect.objectContaining({
					lane: 'OFFICIAL_SNS_STRUCTURE',
					source: 'META_AD_LIBRARY',
					platformTarget: 'INSTAGRAM_REELS',
				}),
				expect.objectContaining({
					lane: 'OFFICIAL_PLATFORM_PROMPT',
					intent: 'prompt_recipe',
					rights: 'DOC_LIBRARY_USAGE',
				}),
				expect.objectContaining({
					lane: 'SIGNAL_MINING',
					source: 'GOOGLE_TRENDS',
					rights: 'DERIVED_METADATA_ONLY',
				}),
			]),
		)
	})

	it('deduplicates repeated queries and caps the plan size', () => {
		const plan = buildOfficialReferenceQueryPlan({
			jobId: '22222222-2222-4222-8222-222222222222',
			normalizedBrief: {
				...baseBrief,
				platformTargets: ['TIKTOK', 'TIKTOK'],
			},
		})

		const tiktokItems = plan.items.filter((item) => item.source === 'TIKTOK_CREATIVE_CENTER')
		expect(tiktokItems).toHaveLength(1)
		expect(plan.items.length).toBeLessThanOrEqual(12)
	})
})
