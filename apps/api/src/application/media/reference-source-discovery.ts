import type {
	NormalizedReferenceBrief,
	OfficialReferenceDiscoveryBundle,
	OfficialReferenceDiscoveryTarget,
	OfficialReferenceQueryPlanItem,
} from '@1dragon/shared'
import { buildOfficialReferenceQueryPlan } from './reference-query-plan.js'

function toDiscoveryTarget(item: OfficialReferenceQueryPlanItem): OfficialReferenceDiscoveryTarget {
	switch (item.source) {
		case 'TIKTOK_CREATIVE_CENTER':
			return {
				...item,
				adapter: 'open_url',
				surfaceLabel: 'TikTok Creative Center',
				entryUrl: 'https://ads.tiktok.com/business/creativecenter/',
				captureMode: 'structure_only',
			}
		case 'META_AD_LIBRARY':
			return {
				...item,
				adapter: 'open_url',
				surfaceLabel: 'Meta Ad Library',
				entryUrl: 'https://www.facebook.com/ads/library/',
				captureMode: 'structure_only',
			}
		case 'YOUTUBE_SHORTS_GUIDANCE':
			return {
				...item,
				adapter: 'open_url',
				surfaceLabel: 'YouTube Shorts official guidance',
				entryUrl: 'https://blog.youtube/news-and-events/new-creation-tools-youtube-shorts-2025/',
				captureMode: 'structure_only',
			}
		case 'RUNWAY_PROMPT_GUIDE':
			return {
				...item,
				adapter: 'manual_search',
				surfaceLabel: 'Runway prompt guide',
				captureMode: 'doc_library',
			}
		case 'SORA_PROMPT_GUIDE':
			return {
				...item,
				adapter: 'manual_search',
				surfaceLabel: 'Sora official prompt tips',
				captureMode: 'doc_library',
			}
		case 'VEO_PROMPT_GUIDE':
			return {
				...item,
				adapter: 'manual_search',
				surfaceLabel: 'Veo prompt best practices',
				captureMode: 'doc_library',
			}
		case 'GOOGLE_TRENDS':
			return {
				...item,
				adapter: 'open_url',
				surfaceLabel: 'Google Trends',
				entryUrl: 'https://trends.google.com/trends/',
				captureMode: 'derived_metadata',
			}
	}
}

export function buildOfficialReferenceDiscoveryBundle(input: {
	jobId: string
	normalizedBrief: NormalizedReferenceBrief
}): OfficialReferenceDiscoveryBundle {
	const plan = buildOfficialReferenceQueryPlan(input)
	return {
		jobId: plan.jobId,
		taxonomy: plan.taxonomy,
		targets: plan.items.map(toDiscoveryTarget),
	}
}
