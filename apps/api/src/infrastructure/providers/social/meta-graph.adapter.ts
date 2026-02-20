import { logger } from '@/infrastructure/logging/index.js'
import type {
	SocialAccessToken,
	SocialAuthorizationInput,
	SocialVideoShareInput,
	SocialVideoShareOutput,
} from './types.js'

type MetaTokenResponse = {
	access_token?: string
	expires_in?: number
	error?: { message?: string }
}

type MetaVideoUploadResponse = {
	id?: string
	error?: { message?: string }
}

export class MetaGraphAdapter {
	public constructor(
		private readonly options: {
			appId?: string
			appSecret?: string
			baseUrl?: string
		} = {},
	) {}

	public getAuthorizationUrl(input: SocialAuthorizationInput): string {
		const baseUrl = this.options.baseUrl ?? 'https://www.facebook.com/v20.0/dialog/oauth'
		const params = new URLSearchParams({
			client_id: this.options.appId ?? 'snapvid-demo-app',
			response_type: 'code',
			scope: 'instagram_content_publish,pages_show_list',
			redirect_uri: input.redirectUri,
			state: input.state,
		})

		return `${baseUrl}?${params.toString()}`
	}

	public async exchangeCodeForToken(code: string): Promise<SocialAccessToken> {
		if (this.options.appId && this.options.appSecret) {
			const params = new URLSearchParams({
				client_id: this.options.appId,
				client_secret: this.options.appSecret,
				code,
				grant_type: 'authorization_code',
			})

			const response = await fetch(
				`${this.options.baseUrl ?? 'https://graph.facebook.com/v20.0/oauth/access_token'}?${params.toString()}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (!response.ok) {
				const errorText = await response.text()
				logger.error({ status: response.status, errorText }, 'Meta token exchange failed')
				throw new Error(`Instagram 토큰 교환에 실패했습니다. (status: ${response.status})`)
			}

			const data = (await response.json()) as MetaTokenResponse
			if (!data.access_token) {
				logger.error({ data }, 'Meta token exchange returned no access_token')
				throw new Error('Meta API가 액세스 토큰을 반환하지 않았습니다.')
			}

			return {
				accessToken: data.access_token,
				expiresInSec: data.expires_in ?? 3600,
			}
		}

		// 개발/데모 모드: API 키 없을 때 시뮬레이션 토큰
		return {
			accessToken: `ig_access_${code}_${Date.now()}`,
			expiresInSec: 60 * 60,
		}
	}

	public async uploadVideo(input: SocialVideoShareInput): Promise<SocialVideoShareOutput> {
		const hashtags = input.hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
		const finalCaption = [input.caption, hashtags.join(' ')].filter(Boolean).join('\n')

		if (finalCaption.includes('#force_fail')) {
			throw new Error('Simulated Instagram upload failure')
		}

		if (this.options.appId && this.options.appSecret) {
			const response = await fetch(
				this.options.baseUrl ?? 'https://graph.facebook.com/v20.0/instagram/video_upload',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${input.accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						video_url: input.videoUrl,
						caption: finalCaption,
					}),
				},
			)

			if (!response.ok) {
				const errorText = await response.text()
				logger.error({ status: response.status, errorText }, 'Meta Instagram video upload failed')
				throw new Error(`Instagram 영상 업로드에 실패했습니다. (status: ${response.status})`)
			}

			const data = (await response.json()) as MetaVideoUploadResponse
			if (!data.id) {
				logger.error({ data }, 'Meta Instagram video upload returned no id')
				throw new Error('Meta API가 영상 ID를 반환하지 않았습니다.')
			}

			return {
				platform: 'INSTAGRAM',
				remoteId: data.id,
				shareUrl: `https://www.instagram.com/reel/${data.id}`,
			}
		}

		// 개발/데모 모드
		const remoteId = `ig_reel_${Date.now()}`
		return {
			platform: 'INSTAGRAM',
			remoteId,
			shareUrl: `https://www.instagram.com/reel/${remoteId}`,
		}
	}
}
