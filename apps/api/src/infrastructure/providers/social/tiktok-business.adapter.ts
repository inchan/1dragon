import { logger } from '@/infrastructure/logging/index.js'
import type {
	SocialAccessToken,
	SocialAuthorizationInput,
	SocialVideoShareInput,
	SocialVideoShareOutput,
} from './types.js'

type TikTokTokenResponse = {
	data?: { access_token?: string; expires_in?: number }
	message?: string
}

type TikTokVideoUploadResponse = {
	data?: { video_id?: string }
	message?: string
}

export class TikTokBusinessAdapter {
	public constructor(
		private readonly options: {
			clientKey?: string
			clientSecret?: string
			baseUrl?: string
		} = {},
	) {}

	public getAuthorizationUrl(input: SocialAuthorizationInput): string {
		const baseUrl = this.options.baseUrl ?? 'https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/'
		const params = new URLSearchParams({
			client_key: this.options.clientKey ?? 'snapvid-demo-client',
			response_type: 'code',
			scope: 'video.upload',
			redirect_uri: input.redirectUri,
			state: input.state,
		})

		return `${baseUrl}?${params.toString()}`
	}

	public async exchangeCodeForToken(code: string): Promise<SocialAccessToken> {
		if (this.options.clientKey && this.options.clientSecret) {
			const response = await fetch(
				this.options.baseUrl ?? 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						client_key: this.options.clientKey,
						client_secret: this.options.clientSecret,
						code,
						grant_type: 'authorization_code',
					}),
				},
			)

			if (!response.ok) {
				const errorText = await response.text()
				logger.error({ status: response.status, errorText }, 'TikTok token exchange failed')
				throw new Error(`TikTok 토큰 교환에 실패했습니다. (status: ${response.status})`)
			}

			const data = (await response.json()) as TikTokTokenResponse
			const accessToken = data.data?.access_token
			if (!accessToken) {
				logger.error({ data }, 'TikTok token exchange returned no access_token')
				throw new Error('TikTok API가 액세스 토큰을 반환하지 않았습니다.')
			}

			return {
				accessToken,
				expiresInSec: data.data?.expires_in ?? 3600,
			}
		}

		// 개발/데모 모드: API 키 없을 때 시뮬레이션 토큰
		return {
			accessToken: `tt_access_${code}_${Date.now()}`,
			expiresInSec: 60 * 60,
		}
	}

	public async uploadVideo(input: SocialVideoShareInput): Promise<SocialVideoShareOutput> {
		const hashtags = input.hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
		const finalCaption = [input.caption, hashtags.join(' ')].filter(Boolean).join('\n')

		if (finalCaption.includes('#force_fail')) {
			throw new Error('Simulated TikTok upload failure')
		}

		if (this.options.clientKey && this.options.clientSecret) {
			const response = await fetch(
				this.options.baseUrl ?? 'https://business-api.tiktok.com/open_api/v1.3/video/upload/',
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
				logger.error({ status: response.status, errorText }, 'TikTok video upload failed')
				throw new Error(`TikTok 영상 업로드에 실패했습니다. (status: ${response.status})`)
			}

			const data = (await response.json()) as TikTokVideoUploadResponse
			const videoId = data.data?.video_id
			if (!videoId) {
				logger.error({ data }, 'TikTok video upload returned no video_id')
				throw new Error('TikTok API가 video_id를 반환하지 않았습니다.')
			}

			return {
				platform: 'TIKTOK',
				remoteId: videoId,
				shareUrl: `https://www.tiktok.com/@snapvid/video/${videoId}`,
			}
		}

		// 개발/데모 모드
		const remoteId = `tt_video_${Date.now()}`
		return {
			platform: 'TIKTOK',
			remoteId,
			shareUrl: `https://www.tiktok.com/@snapvid/video/${remoteId}`,
		}
	}
}
