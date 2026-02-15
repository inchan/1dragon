import { afterEach, describe, expect, it, vi } from 'vitest'
import { ElevenLabsTtsAdapter } from './elevenlabs.adapter.js'

describe('ElevenLabsTtsAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns fallback tts output format', async () => {
		const adapter = new ElevenLabsTtsAdapter()
		const output = await adapter.synthesize({
			text: '안녕하세요',
			voice: 'FEMALE_BRIGHT',
			speed: 1,
		})

		expect(output.provider).toBe('ELEVENLABS')
		expect(output.audioUrl).toContain('/elevenlabs/')
	})

	it('calls elevenlabs api when api key exists', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({ apiKey: 'eleven-key' })
		await adapter.synthesize({
			text: '테스트',
			voice: 'MALE_CALM',
			speed: 1,
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
