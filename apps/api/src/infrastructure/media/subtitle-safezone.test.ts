import { describe, expect, it } from 'vitest'
import { resolveSubtitlePlacement } from './subtitle-safezone.js'

describe('resolveSubtitlePlacement', () => {
	it('defaults to lower-center when there is no overlap', () => {
		const placement = resolveSubtitlePlacement({
			platform: 'TIKTOK',
			videoWidth: 1080,
			videoHeight: 1920,
			overlapsUi: false,
		})

		expect(placement.anchor).toBe('LOWER_CENTER')
		expect(placement.x).toBe(540)
	})

	it('moves subtitles upward when overlap is detected', () => {
		const placement = resolveSubtitlePlacement({
			platform: 'TIKTOK',
			videoWidth: 1080,
			videoHeight: 1920,
			overlapsUi: true,
		})

		expect(['UPPER_CENTER', 'CENTER']).toContain(placement.anchor)
	})
})
