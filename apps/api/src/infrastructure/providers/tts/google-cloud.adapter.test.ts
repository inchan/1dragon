import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoogleCloudTtsAdapter } from './google-cloud.adapter.js'

describe('GoogleCloudTtsAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns second fallback tts output format', async () => {
		const adapter = new GoogleCloudTtsAdapter()
		const output = await adapter.synthesize({
			text: '안녕하세요',
			voice: 'FEMALE_BRIGHT',
			speed: 1,
		})

		expect(output.provider).toBe('GOOGLE_CLOUD_TTS')
		expect(output.audioUrl).toContain('/google/')
	})

	it('calls google cloud tts api with speakingRate', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new GoogleCloudTtsAdapter({ apiKey: 'google-key' })
		await adapter.synthesize({
			text: '테스트',
			voice: 'FEMALE_PRO',
			speed: 1.2,
		})

		const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
			audioConfig: { speakingRate: number }
		}
		expect(payload.audioConfig.speakingRate).toBe(1.2)
	})
})
