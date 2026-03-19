import { describe, expect, it, vi } from 'vitest'
import type { OfficialReferenceDiscoveryBundle } from '@1dragon/shared'
import { probeOfficialReferenceSources } from './reference-source-probe.js'

const bundle: OfficialReferenceDiscoveryBundle = {
	jobId: '22222222-2222-4222-8222-222222222222',
	taxonomy: {
		category: 'ACCESSORIES',
		source: 'merged',
		usageContexts: ['COMMUTE', 'ON_BODY'],
	},
	targets: [
		{
			lane: 'OFFICIAL_SNS_STRUCTURE',
			source: 'TIKTOK_CREATIVE_CENTER',
			intent: 'proof',
			query: 'accessories commute hands-free commute',
			platformTarget: 'TIKTOK',
			rights: 'STRUCTURE_ONLY',
			freshness: 'weekly',
			rationale: 'Use official TikTok structure references.',
			adapter: 'open_url',
			surfaceLabel: 'TikTok Creative Center',
			entryUrl: 'https://ads.tiktok.com/business/creativecenter/',
			captureMode: 'structure_only',
		},
		{
			lane: 'OFFICIAL_PLATFORM_PROMPT',
			source: 'RUNWAY_PROMPT_GUIDE',
			intent: 'prompt_recipe',
			query: 'Metro Sling Bag commute prompt recipe',
			rights: 'DOC_LIBRARY_USAGE',
			freshness: 'monthly',
			rationale: 'Use official prompt guides.',
			adapter: 'manual_search',
			surfaceLabel: 'Runway prompt guide',
			captureMode: 'doc_library',
		},
	],
}

describe('probeOfficialReferenceSources', () => {
	it('marks open-url targets reachable and extracts title when html responds', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response('<html><head><title>TikTok Creative Center</title></head><body></body></html>', {
				status: 200,
				headers: { 'content-type': 'text/html; charset=utf-8' },
			}),
		)

		const result = await probeOfficialReferenceSources({ bundle, fetchImpl })
		const tiktok = result.results[0]

		expect(tiktok).toMatchObject({
			status: 'reachable',
			httpStatus: 200,
			pageTitle: 'TikTok Creative Center',
		})
		expect(result.results[1]).toMatchObject({
			status: 'manual',
		})
	})

	it('marks open-url targets unreachable when fetch fails', async () => {
		const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
		const result = await probeOfficialReferenceSources({ bundle, fetchImpl })

		expect(result.results[0]).toMatchObject({
			status: 'unreachable',
			errorMessage: 'network down',
		})
	})
})
