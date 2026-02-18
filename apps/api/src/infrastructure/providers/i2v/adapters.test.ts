import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiVeoI2VAdapter } from './gemini-veo.adapter.js'
import { HailuoI2VAdapter } from './hailuo.adapter.js'
import { MiniMaxI2VAdapter } from './minimax.adapter.js'
import { RunwayI2VAdapter } from './runway.adapter.js'
import { I2VProviderError } from './base-provider.js'

const COMMON_INPUT = {
	imageUrl: 'https://cdn.example.com/product.png',
	prompt: 'dynamic ad video',
	durationSec: 10,
	aspectRatio: '9:16' as const,
	fps: 30 as const,
}

/** Gemini Veo는 generate() 오버라이드로 이미지 다운로드를 첫 번째 fetch 호출로 수행 */
function makeImageFetchMock() {
	return {
		ok: true,
		status: 200,
		headers: { get: (name: string) => (name === 'content-type' ? 'image/jpeg' : null) },
		arrayBuffer: async () => new ArrayBuffer(100),
	}
}

describe('i2v adapters', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns simulated clip when api key is missing', async () => {
		const adapter = new RunwayI2VAdapter()
		const output = await adapter.generate({
			provider: 'RUNWAY',
			...COMMON_INPUT,
		})

		expect(output.provider).toBe('RUNWAY')
		expect(output.clipUrl).toContain('/runway/')
		expect(output.metadata).toMatchObject({ simulated: true })
	})

	it('normalizes runway response format', async () => {
		const runwayBody = JSON.stringify({ id: 'rw_1', video_url: 'https://cdn.example.com/runway.mp4', duration_seconds: 12 })
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => runwayBody,
		})
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new RunwayI2VAdapter({ apiKey: 'test_key' })
		const output = await adapter.generate({
			provider: 'RUNWAY',
			...COMMON_INPUT,
		})

		expect(output.clipUrl).toBe('https://cdn.example.com/runway.mp4')
		expect(output.durationSec).toBe(12)
	})

	it('normalizes hailuo response', async () => {
		const hailuoBody = JSON.stringify({ task_id: 'h_1', result_url: 'https://cdn.example.com/hailuo.mp4', duration: 11 })
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => hailuoBody })
		vi.stubGlobal('fetch', fetchMock)

		const hailuo = new HailuoI2VAdapter({ apiKey: 'k1' })
		const h = await hailuo.generate({ provider: 'HAILUO', ...COMMON_INPUT })

		expect(h.clipUrl).toBe('https://cdn.example.com/hailuo.mp4')
	})

	it('normalizes minimax response', async () => {
		const minimaxBody = JSON.stringify({ request_id: 'm_1', output: { url: 'https://cdn.example.com/minimax.mp4' } })
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => minimaxBody })
		vi.stubGlobal('fetch', fetchMock)

		const minimax = new MiniMaxI2VAdapter({ apiKey: 'k3' })
		const m = await minimax.generate({ provider: 'MINIMAX', ...COMMON_INPUT })

		expect(m.clipUrl).toBe('https://cdn.example.com/minimax.mp4')
	})

	describe('GeminiVeoI2VAdapter LRO polling', () => {
		it('normalizes gemini response (videoUri already in response)', async () => {
			const geminiBody = JSON.stringify({ name: 'g_1', videoUri: 'https://cdn.example.com/veo.mp4' })
			const fetchMock = vi
				.fn()
				// 1. 이미지 다운로드
				.mockResolvedValueOnce(makeImageFetchMock())
				// 2. Gemini Veo POST (videoUri 즉시 반환 시나리오)
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => geminiBody })
			vi.stubGlobal('fetch', fetchMock)

			const veo = new GeminiVeoI2VAdapter({ apiKey: 'k2' })
			const g = await veo.generate({ provider: 'GEMINI_VEO', ...COMMON_INPUT })

			expect(g.clipUrl).toBe('https://cdn.example.com/veo.mp4')
		})

		it('polls LRO until done and returns videoUri (videos format)', async () => {
			const lroName = 'operations/abc123'
			const initialBody = JSON.stringify({ name: lroName })
			const pendingBody = JSON.stringify({ name: lroName, done: false })
			const doneBody = JSON.stringify({
				name: lroName,
				done: true,
				response: {
					videos: [{ videoUri: 'https://cdn.example.com/veo-lro.mp4' }],
				},
			})

			const fetchMock = vi
				.fn()
				// 1. 이미지 다운로드
				.mockResolvedValueOnce(makeImageFetchMock())
				// 2. LRO 시작 POST
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => initialBody })
				// 3. 첫 번째 폴링 (pending)
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => pendingBody })
				// 4. 두 번째 폴링 (done)
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => doneBody })
			vi.stubGlobal('fetch', fetchMock)
			vi.useFakeTimers()

			const adapter = new GeminiVeoI2VAdapter({ apiKey: 'test_key' })
			const generatePromise = adapter.generate({ provider: 'GEMINI_VEO', ...COMMON_INPUT })

			// Advance past the initial request timeout + 2 poll intervals
			await vi.advanceTimersByTimeAsync(4_500)
			vi.useRealTimers()

			const output = await generatePromise
			expect(output.clipUrl).toBe('https://cdn.example.com/veo-lro.mp4')
			expect(output.provider).toBe('GEMINI_VEO')
			expect(fetchMock).toHaveBeenCalledTimes(4)
		})

		it('polls LRO until done and returns uri (generatedSamples format)', async () => {
			const lroName = 'operations/xyz789'
			const initialBody = JSON.stringify({ name: lroName })
			const doneBody = JSON.stringify({
				name: lroName,
				done: true,
				response: {
					generatedSamples: [{ video: { uri: 'https://cdn.example.com/veo-sample.mp4' } }],
				},
			})

			const fetchMock = vi
				.fn()
				// 1. 이미지 다운로드
				.mockResolvedValueOnce(makeImageFetchMock())
				// 2. LRO 시작 POST
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => initialBody })
				// 3. 폴링 (done)
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => doneBody })
			vi.stubGlobal('fetch', fetchMock)
			vi.useFakeTimers()

			const adapter = new GeminiVeoI2VAdapter({ apiKey: 'test_key' })
			const generatePromise = adapter.generate({ provider: 'GEMINI_VEO', ...COMMON_INPUT })

			await vi.advanceTimersByTimeAsync(2_500)
			vi.useRealTimers()

			const output = await generatePromise
			expect(output.clipUrl).toBe('https://cdn.example.com/veo-sample.mp4')
		})

		it('throws I2VProviderError with retryable=true when LRO times out', async () => {
			vi.useFakeTimers()

			const lroName = 'operations/slow'
			const initialBody = JSON.stringify({ name: lroName })
			const pendingBody = JSON.stringify({ name: lroName, done: false })

			const fetchMock = vi
				.fn()
				// 1. 이미지 다운로드
				.mockResolvedValueOnce(makeImageFetchMock())
				// 2. LRO 시작 POST
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => initialBody })
				// 나머지: 폴링 (always pending)
				.mockResolvedValue({ ok: true, status: 200, text: async () => pendingBody })
			vi.stubGlobal('fetch', fetchMock)

			const adapter = new GeminiVeoI2VAdapter({ apiKey: 'test_key' })
			const generatePromise = adapter.generate({ provider: 'GEMINI_VEO', ...COMMON_INPUT })
			// Attach early noop handler to prevent "unhandledRejection" warning during timer advance
			void generatePromise.catch(() => {})

			// Advance past 5 minute timeout
			await vi.advanceTimersByTimeAsync(5 * 60 * 1_000 + 10_000)
			vi.useRealTimers()

			await expect(generatePromise).rejects.toSatisfy(
				(err: unknown) =>
					err instanceof I2VProviderError &&
					err.message.includes('timed out') &&
					err.retryable === true,
			)
		})

		it('throws I2VProviderError with retryable=false when LRO returns error', async () => {
			const lroName = 'operations/fail'
			const initialBody = JSON.stringify({ name: lroName })
			const errorBody = JSON.stringify({
				name: lroName,
				error: { message: 'Video generation failed: content policy violation' },
			})

			const fetchMock = vi
				.fn()
				// 1. 이미지 다운로드
				.mockResolvedValueOnce(makeImageFetchMock())
				// 2. LRO 시작 POST
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => initialBody })
				// 3. 폴링 (error)
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => errorBody })
			vi.stubGlobal('fetch', fetchMock)
			vi.useFakeTimers()

			const adapter = new GeminiVeoI2VAdapter({ apiKey: 'test_key' })
			const generatePromise = adapter.generate({ provider: 'GEMINI_VEO', ...COMMON_INPUT })
			// Attach early noop handler to prevent "unhandledRejection" warning during timer advance
			void generatePromise.catch(() => {})

			await vi.advanceTimersByTimeAsync(2_500)
			vi.useRealTimers()

			await expect(generatePromise).rejects.toSatisfy(
				(err: unknown) =>
					err instanceof I2VProviderError &&
					err.message.includes('content policy violation') &&
					err.retryable === false,
			)
		})

		it('returns simulated clip when api key is missing (no LRO)', async () => {
			const adapter = new GeminiVeoI2VAdapter()
			const output = await adapter.generate({ provider: 'GEMINI_VEO', ...COMMON_INPUT })

			expect(output.provider).toBe('GEMINI_VEO')
			expect(output.clipUrl).toContain('/gemini_veo/')
			expect(output.metadata).toMatchObject({ simulated: true })
		})
	})
})
