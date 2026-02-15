import type { VideoPlatform } from './types'

const PLATFORM_SUFFIX: Record<VideoPlatform, string> = {
	tiktok: 'tiktok',
	youtube_shorts: 'shorts',
	instagram_reels: 'reels',
}

const SAFE_ZONE_MAP: Record<VideoPlatform, { top: number; bottom: number }> = {
	tiktok: { top: 150, bottom: 270 },
	youtube_shorts: { top: 100, bottom: 200 },
	instagram_reels: { top: 120, bottom: 250 },
}

export function formatVideoFileName(
	productName: string,
	platform: VideoPlatform,
	date: Date = new Date(),
): string {
	const safeProductName = productName.trim().replace(/\s+/g, '_') || 'product'
	const yyyy = String(date.getFullYear())
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')

	return `${safeProductName}_${PLATFORM_SUFFIX[platform]}_${yyyy}${mm}${dd}.mp4`
}

export function resolveSafeZone(platform: VideoPlatform): { top: number; bottom: number } {
	return SAFE_ZONE_MAP[platform]
}

export function resolvePlatformLabel(platform: VideoPlatform): string {
	if (platform === 'youtube_shorts') {
		return 'YouTube Shorts'
	}
	if (platform === 'instagram_reels') {
		return 'Instagram Reels'
	}
	return 'TikTok'
}
