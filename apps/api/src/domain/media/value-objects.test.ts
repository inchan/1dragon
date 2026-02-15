import { describe, expect, it } from 'vitest'
import { JobStatusVO, PlatformVO, QualityScoreVO, StylePresetVO } from './value-objects.js'

describe('media/value-objects', () => {
	it('creates platform and style preset value objects', () => {
		const platform = new PlatformVO('tiktok')
		const style = new StylePresetVO('trendy')

		expect(platform.value).toBe('TIKTOK')
		expect(style.value).toBe('TRENDY')
	})

	it('validates quality score range', () => {
		const quality = new QualityScoreVO(0.73)

		expect(quality.asPercent()).toBe(73)
		expect(quality.isBelow(0.8)).toBe(true)
	})

	it('throws for invalid job status', () => {
		expect(() => {
			new JobStatusVO('INVALID')
		}).toThrowError('Invalid job status: INVALID')
	})
})
