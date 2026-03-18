import type { ReferenceBrief } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import { normalizeReferenceBriefInput } from './reference-brief.js'

describe('reference brief normalization', () => {
	it('deduplicates noisy input and derives query hints', () => {
		const brief: ReferenceBrief = {
			productName: '  Cloud Wrap Dress  ',
			productCategoryHint: ' apparel / dresses ',
			priceBand: ' premium ',
			coreBenefits: ['Waist definition', ' waist definition ', 'office-ready silhouette'],
			differentiators: ['Seoul editorial mood', 'seoul editorial mood'],
			proofPoints: [
				'customer reviews mention the wrap line',
				'customer reviews mention the wrap line',
			],
			targetAudience: {
				summary: '  office-first women in their late 20s to 30s ',
				useCases: ['commute', ' commute ', 'day-to-night'],
				painPoints: ['unstyled mornings', 'unstyled mornings'],
			},
			landingPageText:
				'  A wrap dress that keeps the waistline clear, works for commute days, and still feels polished after work.  ',
			competitorExamples: ['TikTok fashion ads', 'tiktok fashion ads'],
			categoryExamples: ['office look', ' office look '],
			successMetrics: [{ name: 'CTR', target: '1.5%+' }],
			platformTargets: ['TIKTOK'],
		}

		const normalized = normalizeReferenceBriefInput({ brief })

		expect(normalized.coreBenefits).toEqual(['Waist definition', 'office-ready silhouette'])
		expect(normalized.differentiators).toEqual(['Seoul editorial mood'])
		expect(normalized.proofPoints).toEqual(['customer reviews mention the wrap line'])
		expect(normalized.useCases).toEqual(['commute', 'day-to-night'])
		expect(normalized.queryHints.productFacts).toEqual(
			expect.arrayContaining([
				'Cloud Wrap Dress',
				'apparel / dresses',
				'premium',
				'Waist definition',
			]),
		)
		expect(normalized.queryHints.competitorQueries).toEqual(['TikTok fashion ads', 'office look'])
		expect(normalized.taxonomy).toEqual({
			category: 'FASHION',
			source: 'brief',
			usageContexts: ['COMMUTE'],
		})
		expect(normalized.missingSignals).toEqual([])
		expect(normalized.completenessScore).toBe(100)
		expect(normalized.landingPageSource).toBe('provided_text')
	})

	it('falls back to request platforms and surfaces missing signals', () => {
		const brief: ReferenceBrief = {
			productName: 'Commuter Sling Bag',
			coreBenefits: ['lightweight carry'],
			targetAudience: {
				summary: 'urban commuters',
				useCases: [],
				painPoints: [],
			},
			landingPageUrl: 'https://example.com/products/commuter-sling-bag',
			differentiators: [],
			proofPoints: [],
			competitorExamples: [],
			categoryExamples: [],
			successMetrics: [],
		}

		const normalized = normalizeReferenceBriefInput({
			brief,
			fallbackPlatforms: ['INSTAGRAM_REELS'],
		})

		expect(normalized.platformTargets).toEqual(['INSTAGRAM_REELS'])
		expect(normalized.taxonomy).toEqual({
			category: 'OTHER',
			source: 'brief',
			usageContexts: ['COMMUTE'],
		})
		expect(normalized.missingSignals).toEqual([
			'price_band',
			'proof_points',
			'reference_examples',
			'success_metrics',
			'landing_page_text',
		])
		expect(normalized.completenessScore).toBe(40)
	})

	it('propagates fetched landing-page metadata into the normalized brief', () => {
		const brief: ReferenceBrief = {
			productName: 'Cloud Wrap Dress',
			coreBenefits: ['Waist definition'],
			targetAudience: {
				summary: 'office-first women',
				useCases: ['commute'],
				painPoints: [],
			},
			landingPageUrl: 'https://example.com/products/cloud-wrap-dress',
			differentiators: [],
			proofPoints: [],
			competitorExamples: [],
			categoryExamples: [],
			successMetrics: [],
		}

		const normalized = normalizeReferenceBriefInput({
			brief,
			fallbackPlatforms: ['TIKTOK'],
			resolvedLandingPage: {
				source: 'fetched_url',
				title: 'Cloud Wrap Dress | 1Dragon',
				description: 'Polished wrap silhouette for commute days.',
				text: 'Cloud Wrap Dress made for office mornings and after-work dinners.',
			},
		})

		expect(normalized.landingPageSource).toBe('fetched_url')
		expect(normalized.landingPageTitle).toBe('Cloud Wrap Dress | 1Dragon')
		expect(normalized.landingPageDescription).toBe('Polished wrap silhouette for commute days.')
		expect(normalized.landingPageExcerpt).toContain('Cloud Wrap Dress made for office mornings')
		expect(normalized.missingSignals).not.toContain('landing_page_text')
		expect(normalized.taxonomy).toEqual({
			category: 'OTHER',
			source: 'brief',
			usageContexts: ['COMMUTE'],
		})
	})

	it('merges product-analysis signals into taxonomy when present', () => {
		const brief: ReferenceBrief = {
			productName: 'Metro Sling Bag',
			productCategoryHint: 'accessories',
			coreBenefits: ['hands-free commute'],
			targetAudience: {
				summary: 'city commuters',
				useCases: ['commute'],
				painPoints: [],
			},
			landingPageText: 'A slim sling bag built for urban commutes and quick access essentials.',
			differentiators: ['water-resistant finish'],
			proofPoints: [],
			competitorExamples: [],
			categoryExamples: ['everyday carry'],
			successMetrics: [],
		}

		const normalized = normalizeReferenceBriefInput({
			brief,
			fallbackPlatforms: ['TIKTOK'],
			productAnalysis: {
				id: '123e4567-e89b-12d3-a456-426614174000',
				category: 'ACCESSORIES',
				keywords: ['crossbody', 'minimal carry'],
				targetAudience: 'minimalist commuters',
			},
		})

		expect(normalized.productAnalysisId).toBe('123e4567-e89b-12d3-a456-426614174000')
		expect(normalized.taxonomy).toEqual({
			category: 'ACCESSORIES',
			source: 'merged',
			usageContexts: ['COMMUTE'],
		})
	})

	it('uses product-analysis-only taxonomy when the brief has no stable category hint', () => {
		const brief: ReferenceBrief = {
			productName: 'Hydra Barrier Serum',
			coreBenefits: ['fast hydration'],
			targetAudience: {
				summary: 'people rebuilding a nightly skincare routine',
				useCases: ['night routine'],
				painPoints: ['dry patches'],
			},
			landingPageText: 'Fast hydration serum for barrier care after cleansing.',
			differentiators: [],
			proofPoints: [],
			competitorExamples: [],
			categoryExamples: [],
			successMetrics: [],
		}

		const normalized = normalizeReferenceBriefInput({
			brief,
			fallbackPlatforms: ['INSTAGRAM_REELS'],
			productAnalysis: {
				id: '0d7b2f7f-012f-4d2a-bdbf-b8e3000f1111',
				category: 'BEAUTY',
				keywords: ['skincare', 'serum'],
				targetAudience: 'night skincare users',
			},
		})

		expect(normalized.taxonomy).toEqual({
			category: 'BEAUTY',
			source: 'product_analysis',
			usageContexts: ['BEAUTY_ROUTINE'],
		})
	})

	it('bounds fetched landing-page metadata to schema-safe lengths', () => {
		const brief: ReferenceBrief = {
			productName: 'Cloud Wrap Dress',
			coreBenefits: ['Waist definition'],
			targetAudience: {
				summary: 'office-first women',
				useCases: ['commute'],
				painPoints: [],
			},
			landingPageUrl: 'https://example.com/products/cloud-wrap-dress',
			differentiators: [],
			proofPoints: [],
			competitorExamples: [],
			categoryExamples: [],
			successMetrics: [],
		}

		const normalized = normalizeReferenceBriefInput({
			brief,
			fallbackPlatforms: ['TIKTOK'],
			resolvedLandingPage: {
				source: 'fetched_url',
				title: 'T'.repeat(220),
				description: 'D'.repeat(300),
				text: 'X'.repeat(400),
			},
		})

		expect(normalized.landingPageTitle).toHaveLength(160)
		expect(normalized.landingPageDescription).toHaveLength(240)
		expect(normalized.landingPageExcerpt).toHaveLength(240)
	})
})
