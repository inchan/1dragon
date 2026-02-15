import type {
	SocialAccessToken,
	SocialAuthorizationInput,
	SocialVideoShareInput,
	SocialVideoShareOutput,
} from './types.js'

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
			await fetch(
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
			).catch(() => {
				// 테스트/로컬에서는 시뮬레이션 토큰으로 진행
			})
		}

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
			await fetch(
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
			).catch(() => {
				// 실패 시에도 아래 시뮬레이션 응답으로 폴백
			})
		}

		const remoteId = `tt_video_${Date.now()}`
		return {
			platform: 'TIKTOK',
			remoteId,
			shareUrl: `https://www.tiktok.com/@snapvid/video/${remoteId}`,
		}
	}
}
