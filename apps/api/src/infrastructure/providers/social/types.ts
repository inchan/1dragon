export type SocialPlatform = 'TIKTOK' | 'INSTAGRAM'

export type SocialAuthorizationInput = {
	readonly redirectUri: string
	readonly state: string
}

export type SocialAccessToken = {
	readonly accessToken: string
	readonly expiresInSec: number
}

export type SocialVideoShareInput = {
	readonly accessToken: string
	readonly videoUrl: string
	readonly caption: string
	readonly hashtags: ReadonlyArray<string>
}

export type SocialVideoShareOutput = {
	readonly platform: SocialPlatform
	readonly remoteId: string
	readonly shareUrl: string
}
