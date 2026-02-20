import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoogleCloudTtsAdapter } from './google-cloud.adapter.js'

vi.mock('../../storage/s3-client.js', () => ({
	uploadImage: vi.fn().mockResolvedValue({ url: 'https://s3.test/tts/google/audio.wav' }),
}))

describe('GoogleCloudTtsAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('throws when api key is missing', async () => {
		const adapter = new GoogleCloudTtsAdapter()
		await expect(
			adapter.synthesize({
				text: '안녕하세요',
				voice: 'FEMALE_BRIGHT',
				speed: 1,
			}),
		).rejects.toThrow('Google Cloud TTS API key is required')
	})

	it('calls google cloud tts api and uploads audio to s3', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ audioContent: 'base64audio' }),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new GoogleCloudTtsAdapter({ apiKey: 'google-key' })
		const output = await adapter.synthesize({
			text: '테스트',
			voice: 'FEMALE_PRO',
			speed: 1.2,
		})

		expect(output.provider).toBe('GOOGLE_CLOUD_TTS')
		expect(output.audioUrl).toBe('https://s3.test/tts/google/audio.wav')
		expect(output.voice).toBe('FEMALE_PRO')
		expect(output.speed).toBe(1.2)

		const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
			audioConfig: { speakingRate: number }
		}
		expect(payload.audioConfig.speakingRate).toBe(1.2)

		const url = String(fetchMock.mock.calls[0]?.[0])
		expect(url).toContain('key=google-key')
	})

	it('throws on empty audio content', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ audioContent: '' }),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new GoogleCloudTtsAdapter({ apiKey: 'google-key' })
		await expect(
			adapter.synthesize({
				text: '테스트',
				voice: 'FEMALE_BRIGHT',
				speed: 1,
			}),
		).rejects.toThrow('Google Cloud TTS returned empty audio content')
	})

	it('throws on api failure', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			statusText: 'Forbidden',
			text: async () => 'quota exceeded',
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new GoogleCloudTtsAdapter({ apiKey: 'google-key' })
		await expect(
			adapter.synthesize({
				text: '테스트',
				voice: 'FEMALE_BRIGHT',
				speed: 1,
			}),
		).rejects.toThrow('Google Cloud TTS API error: 403')
	})
})
