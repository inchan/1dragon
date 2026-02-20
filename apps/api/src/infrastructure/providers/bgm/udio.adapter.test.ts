import { afterEach, describe, expect, it, vi } from 'vitest'
import { UdioBgmAdapter } from './udio.adapter.js'

describe('UdioBgmAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('throws when api key is missing', async () => {
		const adapter = new UdioBgmAdapter()
		await expect(
			adapter.generate({
				mood: 'ENERGETIC',
				style: 'DYNAMIC',
				durationSec: 30,
			}),
		).rejects.toThrow('Udio API key is required')
	})

	it('generates udio track from api response', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'udio_123',
				title: 'Energetic Dynamic',
				bpm: 130,
				url: 'https://cdn.test/bgm.mp3',
			}),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new UdioBgmAdapter({ apiKey: 'udio-key' })
		const track = await adapter.generate({
			mood: 'ENERGETIC',
			style: 'DYNAMIC',
			durationSec: 30,
		})

		expect(track.source).toBe('UDIO')
		expect(track.tier).toBe('STARTER')
		expect(track.bpm).toBe(130)
		expect(track.url).toBe('https://cdn.test/bgm.mp3')
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('throws on api failure', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 429,
			statusText: 'Too Many Requests',
			text: async () => 'rate limited',
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new UdioBgmAdapter({ apiKey: 'udio-key' })
		await expect(
			adapter.generate({
				mood: 'CALM',
				style: 'SIMPLE',
				durationSec: 20,
			}),
		).rejects.toThrow('Udio API error: 429')
	})
})
