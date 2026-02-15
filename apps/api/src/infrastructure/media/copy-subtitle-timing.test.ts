import { describe, expect, it } from 'vitest'
import { distributeCopySubtitleTiming } from './copy-subtitle-timing.js'

describe('distributeCopySubtitleTiming', () => {
	it('returns empty list for blank lines', () => {
		const cues = distributeCopySubtitleTiming({
			lines: ['  ', ''],
			totalDurationSec: 20,
		})

		expect(cues).toEqual([])
	})

	it('distributes cues proportionally and fills whole timeline', () => {
		const cues = distributeCopySubtitleTiming({
			lines: ['짧은 문장', '조금 더 긴 문장입니다'],
			totalDurationSec: 10,
		})

		expect(cues).toHaveLength(2)
		expect(cues[0]?.startMs).toBe(0)
		expect(cues[1]?.endMs).toBe(10000)
		expect((cues[1]?.startMs ?? 0) > (cues[0]?.endMs ?? 0) - 1).toBe(true)
	})
})
