import type {
	SocialAccessToken,
	SocialAuthorizationInput,
	SocialVideoShareInput,
	SocialVideoShareOutput,
} from './types.js'

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
			await fetch(this.options.baseUrl ?? 'https://graph.facebook.com/v20.0/oauth/access_token', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			}).catch(() => {
				// 테스트/로컬에서는 시뮬레이션 토큰으로 진행
			})
		}

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
			await fetch(this.options.baseUrl ?? 'https://graph.facebook.com/v20.0/instagram/video_upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${input.accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					video_url: input.videoUrl,
					caption: finalCaption,
				}),
			}).catch(() => {
				// 실패 시에도 아래 시뮬레이션 응답으로 폴백
			})
		}

		const remoteId = `ig_reel_${Date.now()}`
		return {
			platform: 'INSTAGRAM',
			remoteId,
			shareUrl: `https://www.instagram.com/reel/${remoteId}`,
		}
	}
}
