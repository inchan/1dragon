import { describe, expect, it } from 'vitest'
import type { NormalizedReferenceBrief } from '@1dragon/shared'
import { buildOfficialReferenceDiscoveryBundle } from './reference-source-discovery.js'

const normalizedBrief: NormalizedReferenceBrief = {
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
		proofQueries: ['hands-free commute'],
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

describe('buildOfficialReferenceDiscoveryBundle', () => {
	it('maps query-plan items into discovery targets with official surfaces', () => {
		const bundle = buildOfficialReferenceDiscoveryBundle({
			jobId: '22222222-2222-4222-8222-222222222222',
			normalizedBrief,
		})

		expect(bundle.targets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'TIKTOK_CREATIVE_CENTER',
					adapter: 'open_url',
					entryUrl: 'https://ads.tiktok.com/business/creativecenter/',
					captureMode: 'structure_only',
				}),
				expect.objectContaining({
					source: 'META_AD_LIBRARY',
					adapter: 'open_url',
					entryUrl: 'https://www.facebook.com/ads/library/',
				}),
				expect.objectContaining({
					source: 'GOOGLE_TRENDS',
					captureMode: 'derived_metadata',
				}),
			]),
		)
	})

	it('keeps prompt-guide discovery in manual-search mode when no stable direct url is stored', () => {
		const bundle = buildOfficialReferenceDiscoveryBundle({
			jobId: '22222222-2222-4222-8222-222222222222',
			normalizedBrief,
		})

		const promptTarget = bundle.targets.find((target) => target.lane === 'OFFICIAL_PLATFORM_PROMPT')
		expect(promptTarget).toMatchObject({
			adapter: 'manual_search',
			captureMode: 'doc_library',
		})
	})
})
