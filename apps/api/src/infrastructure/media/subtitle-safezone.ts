import type { Platform } from '@snapvid/shared'

type SafeZone = {
	top: number
	bottom: number
	left: number
	right: number
}

type Placement = {
	x: number
	y: number
	anchor: 'LOWER_CENTER' | 'CENTER' | 'UPPER_CENTER'
}

const PLATFORM_SAFE_ZONES: Record<Platform, SafeZone> = {
	TIKTOK: { top: 150, bottom: 270, left: 40, right: 40 },
	YOUTUBE_SHORTS: { top: 140, bottom: 240, left: 36, right: 36 },
	INSTAGRAM_REELS: { top: 170, bottom: 290, left: 44, right: 44 },
}

export function resolveSubtitlePlacement(input: {
	readonly platform: Platform
	readonly videoWidth: number
	readonly videoHeight: number
	readonly overlapsUi: boolean
}): Placement {
	const safeZone = PLATFORM_SAFE_ZONES[input.platform]
	const centerX = Math.round(input.videoWidth / 2)
	const lowerY = input.videoHeight - safeZone.bottom - 80

	if (!input.overlapsUi) {
		return {
			x: centerX,
			y: lowerY,
			anchor: 'LOWER_CENTER',
		}
	}

	if (safeZone.top + 160 < lowerY) {
		return {
			x: centerX,
			y: safeZone.top + 120,
			anchor: 'UPPER_CENTER',
		}
	}

	return {
		x: centerX,
		y: Math.round(input.videoHeight / 2),
		anchor: 'CENTER',
	}
}
