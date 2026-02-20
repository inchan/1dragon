import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TikTokBusinessAdapter } from './tiktok-business.adapter.js'

vi.mock('@/infrastructure/logging/index.js', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

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

	it('API 키 없을 때 시뮬레이션 토큰을 반환한다', async () => {
		const adapter = new TikTokBusinessAdapter()
		const token = await adapter.exchangeCodeForToken('auth-code-123')

		expect(token.accessToken).toContain('tt_access_auth-code-123')
		expect(token.expiresInSec).toBe(3600)
	})

	it('uploads video and returns share url (no API keys)', async () => {
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

	describe('API 키 있음 (실제 API 호출)', () => {
		const fetchMock = vi.fn()

		beforeEach(() => {
			vi.stubGlobal('fetch', fetchMock)
			fetchMock.mockReset()
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})

		it('토큰 교환 성공 시 실제 access_token을 반환한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: { access_token: 'real_tt_token_xyz', expires_in: 7200 },
				}),
				text: async () => '',
			})

			const adapter = new TikTokBusinessAdapter({ clientKey: 'key', clientSecret: 'secret' })
			const token = await adapter.exchangeCodeForToken('code-abc')

			expect(token.accessToken).toBe('real_tt_token_xyz')
			expect(token.expiresInSec).toBe(7200)
		})

		it('토큰 교환 API 실패 시 에러를 throw한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => 'Unauthorized',
			})

			const adapter = new TikTokBusinessAdapter({ clientKey: 'key', clientSecret: 'secret' })

			await expect(adapter.exchangeCodeForToken('bad-code')).rejects.toThrow(
				'TikTok 토큰 교환에 실패했습니다. (status: 401)',
			)
		})

		it('영상 업로드 성공 시 실제 video_id를 반환한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { video_id: 'vid_real_789' } }),
				text: async () => '',
			})

			const adapter = new TikTokBusinessAdapter({ clientKey: 'key', clientSecret: 'secret' })
			const result = await adapter.uploadVideo({
				accessToken: 'token',
				videoUrl: 'https://cdn.snapvid.ai/test.mp4',
				caption: '테스트',
				hashtags: [],
			})

			expect(result.remoteId).toBe('vid_real_789')
			expect(result.shareUrl).toContain('vid_real_789')
		})

		it('영상 업로드 API 실패 시 에러를 throw한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 429,
				text: async () => 'Rate limit',
			})

			const adapter = new TikTokBusinessAdapter({ clientKey: 'key', clientSecret: 'secret' })

			await expect(
				adapter.uploadVideo({
					accessToken: 'token',
					videoUrl: 'https://cdn.snapvid.ai/test.mp4',
					caption: '테스트',
					hashtags: [],
				}),
			).rejects.toThrow('TikTok 영상 업로드에 실패했습니다. (status: 429)')
		})
	})
})
