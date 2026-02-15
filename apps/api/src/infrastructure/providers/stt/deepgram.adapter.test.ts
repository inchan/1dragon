import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeepgramSttAdapter } from './deepgram.adapter.js'

describe('DeepgramSttAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns word-level timestamps and subtitle formats', async () => {
		const adapter = new DeepgramSttAdapter()
		const output = await adapter.transcribe({
			audioUrl: 'https://cdn.example.com/tts.wav',
		})

		expect(output.provider).toBe('DEEPGRAM')
		expect(output.words.length).toBeGreaterThan(0)
		expect(output.wer).toBeLessThanOrEqual(0.04)
		expect(output.srt).toContain('-->')
		expect(output.vtt.startsWith('WEBVTT')).toBe(true)
	})

	it('calls deepgram api when api key exists', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new DeepgramSttAdapter({ apiKey: 'deepgram-key' })
		await adapter.transcribe({
			audioUrl: 'https://cdn.example.com/input.wav',
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
