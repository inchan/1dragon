import { describe, expect, it } from 'vitest'
import type { ReferenceBrief } from '@1dragon/shared'
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
		expect(normalized.queryHints.competitorQueries).toEqual([
			'TikTok fashion ads',
			'office look',
		])
		expect(normalized.missingSignals).toEqual([])
		expect(normalized.completenessScore).toBe(100)
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
		expect(normalized.missingSignals).toEqual([
			'price_band',
			'proof_points',
			'reference_examples',
			'success_metrics',
			'landing_page_text',
		])
		expect(normalized.completenessScore).toBe(40)
	})
})
