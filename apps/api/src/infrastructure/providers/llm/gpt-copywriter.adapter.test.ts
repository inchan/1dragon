import { afterEach, describe, expect, it, vi } from 'vitest'
import { GptCopywriterAdapter } from './gpt-copywriter.adapter.js'

describe('GptCopywriterAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('generates three korean copy variants with provider metadata', async () => {
		const adapter = new GptCopywriterAdapter()
		const output = await adapter.generateCopy({
			productName: '여름 원피스',
			category: '패션',
			keywords: ['통기성', '가벼움', '데일리'],
			mood: '트렌디',
			style: 'TRENDY',
			platform: 'YOUTUBE_SHORTS',
		})

		expect(output.provider).toBe('GPT_4O')
		expect(output.variants).toHaveLength(3)
		expect(output.variants[0]?.hookCopy).toContain('정보형 톤')
		expect(output.variants[0]?.hashtags).toHaveLength(5)
	})

	it('sanitizes exaggerated expressions and records warnings', async () => {
		const adapter = new GptCopywriterAdapter()
		const output = await adapter.generateCopy({
			productName: '최고 원피스',
			category: '패션',
			keywords: ['핏'],
			mood: '활기찬',
			style: 'DYNAMIC',
			platform: 'TIKTOK',
		})

		const first = output.variants[0]
		expect(first?.hookCopy).not.toContain('최고')
		expect(first?.warnings.some((warning) => warning.includes('광고 표현 경고'))).toBe(true)
	})

	it('calls openai api when api key exists', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new GptCopywriterAdapter({ apiKey: 'test-key' })
		await adapter.generateCopy({
			productName: '셔츠',
			category: '패션',
			keywords: [],
			mood: '차분한',
			style: 'SIMPLE',
			platform: 'INSTAGRAM_REELS',
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
