import { afterEach, describe, expect, it, vi } from 'vitest'
import { ElevenLabsTtsAdapter } from './elevenlabs.adapter.js'

// S3 uploadImage mock
vi.mock('../../storage/s3-client.js', () => ({
	uploadImage: vi.fn().mockResolvedValue({
		key: 'tts/elevenlabs/123-female_bright.mp3',
		url: 'https://s3.example.com/tts/elevenlabs/123-female_bright.mp3',
	}),
}))

describe('ElevenLabsTtsAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('throws error when api key is not provided', async () => {
		const adapter = new ElevenLabsTtsAdapter()
		await expect(
			adapter.synthesize({ text: '안녕하세요', voice: 'FEMALE_BRIGHT', speed: 1 }),
		).rejects.toThrow('ElevenLabs API key is required')
	})

	it('calls elevenlabs api with correct voice id and returns s3 url', async () => {
		const mockArrayBuffer = new ArrayBuffer(1024)
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => mockArrayBuffer,
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({ apiKey: 'eleven-key' })
		const output = await adapter.synthesize({
			text: '테스트',
			voice: 'FEMALE_BRIGHT',
			speed: 1,
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [calledUrl, calledOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(calledUrl).toContain('/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM')
		expect((calledOptions.headers as Record<string, string>)['xi-api-key']).toBe('eleven-key')
		expect((calledOptions.headers as Record<string, string>).Accept).toBe('audio/mpeg')

		expect(output.provider).toBe('ELEVENLABS')
		expect(output.audioUrl).toContain('s3.example.com')
		expect(output.voice).toBe('FEMALE_BRIGHT')
		expect(output.speed).toBe(1)
		expect(output.durationSec).toBeGreaterThanOrEqual(2)
	})

	it('maps MALE_CALM to Josh voice id', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(512),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({ apiKey: 'eleven-key' })
		await adapter.synthesize({ text: '남성 차분한 목소리', voice: 'MALE_CALM', speed: 1 })

		const [calledUrl] = fetchMock.mock.calls[0] as [string]
		expect(calledUrl).toContain('/v1/text-to-speech/TxGEqnHWrfWFTfGW9XjX')
	})

	it('maps FEMALE_PRO to Bella voice id', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(512),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({ apiKey: 'eleven-key' })
		await adapter.synthesize({ text: '여성 전문가 목소리', voice: 'FEMALE_PRO', speed: 1 })

		const [calledUrl] = fetchMock.mock.calls[0] as [string]
		expect(calledUrl).toContain('/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL')
	})

	it('throws error when api responds with non-ok status', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
			text: async () => 'Invalid API key',
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({ apiKey: 'invalid-key' })
		await expect(
			adapter.synthesize({ text: '테스트', voice: 'FEMALE_BRIGHT', speed: 1 }),
		).rejects.toThrow('ElevenLabs API error: 401 Unauthorized')
	})

	it('uses custom baseUrl when provided', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(512),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({
			apiKey: 'eleven-key',
			baseUrl: 'https://custom.elevenlabs.io',
		})
		await adapter.synthesize({ text: '테스트', voice: 'FEMALE_BRIGHT', speed: 1 })

		const [calledUrl] = fetchMock.mock.calls[0] as [string]
		expect(calledUrl).toContain('https://custom.elevenlabs.io')
	})

	it('estimates duration based on text length and speed', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(512),
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ElevenLabsTtsAdapter({ apiKey: 'eleven-key' })

		// 400자 텍스트, speed 1 → 약 60초
		const longText = '가'.repeat(400)
		const output = await adapter.synthesize({ text: longText, voice: 'FEMALE_BRIGHT', speed: 1 })
		expect(output.durationSec).toBeGreaterThan(50)

		vi.clearAllMocks()
		fetchMock.mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(512),
		})

		// speed 2 → 절반 시간
		const output2 = await adapter.synthesize({ text: longText, voice: 'FEMALE_BRIGHT', speed: 2 })
		expect(output2.durationSec).toBeLessThan(output.durationSec)
	})
})
