import { describe, expect, it } from 'vitest'
import { PlatformVariantRenderer } from './platform-variant.renderer.js'

describe('PlatformVariantRenderer', () => {
	it('returns platform-specific render plan with safe zone', () => {
		const renderer = new PlatformVariantRenderer()
		const plan = renderer.buildRenderPlan({
			platform: 'INSTAGRAM_REELS',
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			subtitleEnabled: true,
			watermarkEnabled: true,
		})

		expect(plan.ffmpegArgs).toContain('scale=1080x1920:force_original_aspect_ratio=decrease')
		expect(plan.safeZone.bottom).toBeGreaterThan(0)
		expect(plan.outputFileName).toContain('instagram_reels-')
	})
})
