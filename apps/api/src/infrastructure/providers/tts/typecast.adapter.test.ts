import { afterEach, describe, expect, it, vi } from 'vitest'
import { TypecastTtsAdapter } from './typecast.adapter.js'

describe('TypecastTtsAdapter', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('normalizes speed into 0.8~1.5 range', async () => {
		const adapter = new TypecastTtsAdapter()
		const slow = await adapter.synthesize({
			text: '테스트 문장',
			voice: 'FEMALE_BRIGHT',
			speed: 0.2,
		})
		const fast = await adapter.synthesize({
			text: '테스트 문장',
			voice: 'MALE_CALM',
			speed: 2.5,
		})

		expect(slow.speed).toBe(0.8)
		expect(fast.speed).toBe(1.5)
	})

	it('normalizes korean currency text before api call', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		vi.stubGlobal('fetch', fetchMock)

		const adapter = new TypecastTtsAdapter({ apiKey: 'typecast-key' })
		await adapter.synthesize({
			text: '가격은 15,000원 입니다',
			voice: 'FEMALE_PRO',
			speed: 1,
		})

		const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
			text: string
			speed: number
		}
		expect(payload.text).toContain('만 오천 원')
		expect(payload.speed).toBe(1)
	})
})
