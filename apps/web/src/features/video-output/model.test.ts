import { describe, expect, it } from 'vitest'
import { formatVideoFileName, resolvePlatformLabel, resolveSafeZone } from './model'

describe('video-output model', () => {
	it('formats mp4 file name as product_platform_yyyymmdd', () => {
		const fileName = formatVideoFileName('미니멀 원피스', 'tiktok', new Date('2026-02-13'))
		expect(fileName).toBe('미니멀_원피스_tiktok_20260213.mp4')
	})

	it('returns safe-zone pixels by platform', () => {
		expect(resolveSafeZone('tiktok')).toEqual({ top: 150, bottom: 270 })
		expect(resolveSafeZone('youtube_shorts')).toEqual({ top: 100, bottom: 200 })
		expect(resolveSafeZone('instagram_reels')).toEqual({ top: 120, bottom: 250 })
	})

	it('returns readable platform labels', () => {
		expect(resolvePlatformLabel('tiktok')).toBe('TikTok')
		expect(resolvePlatformLabel('youtube_shorts')).toBe('YouTube Shorts')
		expect(resolvePlatformLabel('instagram_reels')).toBe('Instagram Reels')
	})
})
