import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaGraphAdapter } from './meta-graph.adapter.js'

vi.mock('@/infrastructure/logging/index.js', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

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

	it('API 키 없을 때 시뮬레이션 토큰을 반환한다', async () => {
		const adapter = new MetaGraphAdapter()
		const token = await adapter.exchangeCodeForToken('auth-code-ig')

		expect(token.accessToken).toContain('ig_access_auth-code-ig')
		expect(token.expiresInSec).toBe(3600)
	})

	it('uploads instagram reel and returns share url (no API keys)', async () => {
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

	describe('API 키 있음 (실제 API 호출)', () => {
		const fetchMock = vi.fn()

		beforeEach(() => {
			vi.stubGlobal('fetch', fetchMock)
			fetchMock.mockReset()
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})

		it('토큰 교환 성공 시 POST body로 전송하고 실제 access_token을 반환한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ access_token: 'real_ig_token_abc', expires_in: 5183944 }),
				text: async () => '',
			})

			const adapter = new MetaGraphAdapter({ appId: 'app-id', appSecret: 'app-secret' })
			const token = await adapter.exchangeCodeForToken('code-ig')

			expect(fetchMock).toHaveBeenCalledOnce()
			const [calledUrl, calledOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
			// client_secret이 URL에 노출되지 않음을 검증 (POST body로 전송)
			expect(calledUrl).not.toContain('client_secret')
			expect(calledOptions.method).toBe('POST')
			expect(calledOptions.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' })
			expect(calledOptions.body).toContain('client_secret=app-secret')

			expect(token.accessToken).toBe('real_ig_token_abc')
			expect(token.expiresInSec).toBe(5183944)
		})

		it('토큰 교환 API 실패 시 에러를 throw한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: async () => 'Bad Request',
			})

			const adapter = new MetaGraphAdapter({ appId: 'app-id', appSecret: 'app-secret' })

			await expect(adapter.exchangeCodeForToken('bad-code')).rejects.toThrow(
				'Instagram 토큰 교환에 실패했습니다. (status: 400)',
			)
		})

		it('영상 업로드 성공 시 실제 id를 반환한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 'reel_real_456' }),
				text: async () => '',
			})

			const adapter = new MetaGraphAdapter({ appId: 'app-id', appSecret: 'app-secret' })
			const result = await adapter.uploadVideo({
				accessToken: 'token',
				videoUrl: 'https://cdn.snapvid.ai/test.mp4',
				caption: '테스트',
				hashtags: [],
			})

			expect(result.remoteId).toBe('reel_real_456')
			expect(result.shareUrl).toContain('reel_real_456')
		})

		it('영상 업로드 API 실패 시 에러를 throw한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 403,
				text: async () => 'Forbidden',
			})

			const adapter = new MetaGraphAdapter({ appId: 'app-id', appSecret: 'app-secret' })

			await expect(
				adapter.uploadVideo({
					accessToken: 'token',
					videoUrl: 'https://cdn.snapvid.ai/test.mp4',
					caption: '테스트',
					hashtags: [],
				}),
			).rejects.toThrow('Instagram 영상 업로드에 실패했습니다. (status: 403)')
		})
	})
})
