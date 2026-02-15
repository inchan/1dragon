import { describe, expect, it } from 'vitest'
import { buildAutoDuckingKeyframes } from './audio-ducking.js'

describe('buildAutoDuckingKeyframes', () => {
	it('applies -12dB ducking with 0.5s fade-in and 1s fade-out defaults', () => {
		const keyframes = buildAutoDuckingKeyframes({
			narrationSegments: [{ startMs: 1000, endMs: 2000 }],
		})

		expect(keyframes).toEqual([
			{ atMs: 0, gainDb: 0 },
			{ atMs: 500, gainDb: 0 },
			{ atMs: 1000, gainDb: -12 },
			{ atMs: 2000, gainDb: -12 },
			{ atMs: 3000, gainDb: 0 },
		])
	})

	it('keeps keyframes ordered for multiple narration segments', () => {
		const keyframes = buildAutoDuckingKeyframes({
			narrationSegments: [
				{ startMs: 1500, endMs: 2200 },
				{ startMs: 500, endMs: 900 },
			],
		})

		for (let index = 1; index < keyframes.length; index += 1) {
			expect((keyframes[index]?.atMs ?? 0) >= (keyframes[index - 1]?.atMs ?? 0)).toBe(true)
		}
	})
})
