import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiVeoI2VAdapter } from './gemini-veo.adapter.js'
import { HailuoI2VAdapter } from './hailuo.adapter.js'
import { MiniMaxI2VAdapter } from './minimax.adapter.js'
import { RunwayI2VAdapter } from './runway.adapter.js'

describe('i2v adapters', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns simulated clip when api key is missing', async () => {
		const adapter = new RunwayI2VAdapter()
		const output = await adapter.generate({
			provider: 'RUNWAY',
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'dynamic ad video',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
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
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16',
			fps: 30,
		})

		expect(output.clipUrl).toBe('https://cdn.example.com/runway.mp4')
		expect(output.durationSec).toBe(12)
	})

	it('normalizes hailuo, gemini, minimax responses', async () => {
		const hailuoBody = JSON.stringify({ task_id: 'h_1', result_url: 'https://cdn.example.com/hailuo.mp4', duration: 11 })
		const geminiBody = JSON.stringify({ name: 'g_1', videoUri: 'https://cdn.example.com/veo.mp4' })
		const minimaxBody = JSON.stringify({ request_id: 'm_1', output: { url: 'https://cdn.example.com/minimax.mp4' } })
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => hailuoBody })
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => geminiBody })
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => minimaxBody })
		vi.stubGlobal('fetch', fetchMock)

		const hailuo = new HailuoI2VAdapter({ apiKey: 'k1' })
		const veo = new GeminiVeoI2VAdapter({ apiKey: 'k2' })
		const minimax = new MiniMaxI2VAdapter({ apiKey: 'k3' })

		const commonInput = {
			imageUrl: 'https://cdn.example.com/product.png',
			prompt: 'ad',
			durationSec: 10,
			aspectRatio: '9:16' as const,
			fps: 30 as const,
		}

		const h = await hailuo.generate({ provider: 'HAILUO', ...commonInput })
		const g = await veo.generate({ provider: 'GEMINI_VEO', ...commonInput })
		const m = await minimax.generate({ provider: 'MINIMAX', ...commonInput })

		expect(h.clipUrl).toBe('https://cdn.example.com/hailuo.mp4')
		expect(g.clipUrl).toBe('https://cdn.example.com/veo.mp4')
		expect(m.clipUrl).toBe('https://cdn.example.com/minimax.mp4')
	})
})
