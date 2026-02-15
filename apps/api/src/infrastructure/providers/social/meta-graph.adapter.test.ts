import { describe, expect, it } from 'vitest'
import { MetaGraphAdapter } from './meta-graph.adapter.js'

describe('MetaGraphAdapter', () => {
	it('builds instagram oauth authorization url', () => {
		const adapter = new MetaGraphAdapter()
		const url = adapter.getAuthorizationUrl({
			redirectUri: 'https://snapvid.ai/callback/instagram',
			state: 'state-ig',
		})

		expect(url).toContain('response_type=code')
		expect(url).toContain('state=state-ig')
	})

	it('uploads instagram reel and returns share url', async () => {
		const adapter = new MetaGraphAdapter()
		const shared = await adapter.uploadVideo({
			accessToken: 'token',
			videoUrl: 'https://cdn.snapvid.ai/videos/reels.mp4',
			caption: '신상품 오픈',
			hashtags: ['#스냅비드', '#릴스'],
		})

		expect(shared.platform).toBe('INSTAGRAM')
		expect(shared.shareUrl).toContain('instagram.com')
	})
})
