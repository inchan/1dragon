import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClaudeHaikuCopywriterAdapter } from './claude-haiku.adapter.js'

describe('ClaudeHaikuCopywriterAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns three fallback variants', async () => {
		const adapter = new ClaudeHaikuCopywriterAdapter()
		const output = await adapter.generateCopy({
			productName: '립스틱',
			category: '뷰티',
			keywords: ['보습', '발색'],
			mood: '감성',
			style: 'EMOTIONAL',
			platform: 'INSTAGRAM_REELS',
		})

		expect(output.provider).toBe('CLAUDE_HAIKU')
		expect(output.variants).toHaveLength(3)
		expect(output.variants[0]?.ctaCopy).toContain('지금 확인하기')
	})

	it('calls anthropic api when api key exists', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new ClaudeHaikuCopywriterAdapter({ apiKey: 'anthropic-key' })
		await adapter.generateCopy({
			productName: '가방',
			category: '액세서리',
			keywords: [],
			mood: '트렌디',
			style: 'TRENDY',
			platform: 'TIKTOK',
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
