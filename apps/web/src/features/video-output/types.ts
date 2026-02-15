export type VideoPlatform = 'tiktok' | 'youtube_shorts' | 'instagram_reels'

export type VideoVariantItem = {
	readonly platform: VideoPlatform
	readonly videoUrl: string
	readonly thumbnailUrl?: string
}
