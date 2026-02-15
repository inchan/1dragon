export type CopyTone = 'CASUAL' | 'EMOTIONAL' | 'INFORMATIONAL'

export type CopyVariant = {
	readonly hookCopy: string
	readonly bodyCopy: string
	readonly ctaCopy: string
	readonly hashtags: string[]
	readonly warnings: string[]
}

export type CopyGenerationInput = {
	readonly productName?: string
	readonly category: string
	readonly keywords: ReadonlyArray<string>
	readonly mood: string
	readonly style: string
	readonly platform: 'TIKTOK' | 'INSTAGRAM_REELS' | 'YOUTUBE_SHORTS'
}

export type CopyGenerationOutput = {
	readonly provider: 'GPT_4O' | 'CLAUDE_HAIKU'
	readonly variants: CopyVariant[]
}
