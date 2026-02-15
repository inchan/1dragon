import { afterEach, describe, expect, it, vi } from 'vitest'
import { UdioBgmAdapter } from './udio.adapter.js'

describe('UdioBgmAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('generates starter udio track matched to mood and style', async () => {
		const adapter = new UdioBgmAdapter()
		const track = await adapter.generate({
			mood: 'ENERGETIC',
			style: 'DYNAMIC',
			durationSec: 30,
		})

		expect(track.source).toBe('UDIO')
		expect(track.tier).toBe('STARTER')
		expect(track.bpm).toBeGreaterThanOrEqual(120)
		expect(track.title).toContain('ENERGETIC')
	})

	it('calls udio api when api key exists', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new UdioBgmAdapter({ apiKey: 'udio-key' })
		await adapter.generate({
			mood: 'CALM',
			style: 'SIMPLE',
			durationSec: 20,
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
