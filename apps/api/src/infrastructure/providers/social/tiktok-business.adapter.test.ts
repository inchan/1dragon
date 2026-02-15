import { describe, expect, it } from 'vitest'
import { TikTokBusinessAdapter } from './tiktok-business.adapter.js'

describe('TikTokBusinessAdapter', () => {
	it('builds oauth authorization url', () => {
		const adapter = new TikTokBusinessAdapter()
		const url = adapter.getAuthorizationUrl({
			redirectUri: 'https://snapvid.ai/callback/tiktok',
			state: 'state-123',
		})

		expect(url).toContain('response_type=code')
		expect(url).toContain('state=state-123')
	})

	it('uploads video and returns share url', async () => {
		const adapter = new TikTokBusinessAdapter()
		const shared = await adapter.uploadVideo({
			accessToken: 'token',
			videoUrl: 'https://cdn.snapvid.ai/videos/tiktok.mp4',
			caption: '신상품 오픈',
			hashtags: ['#스냅비드', '#마케팅'],
		})

		expect(shared.platform).toBe('TIKTOK')
		expect(shared.shareUrl).toContain('tiktok.com')
	})
})
