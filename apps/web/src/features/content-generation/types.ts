export type MarketingCopyVariant = {
	readonly id: string
	readonly label: string
	readonly hookCopy: string
	readonly bodyCopy: string
	readonly ctaCopy: string
	readonly hashtags: string[]
}

export type NarrationVoice = 'FEMALE_BRIGHT' | 'MALE_CALM' | 'FEMALE_PRO'

export type SubtitleStyle = 'SIMPLE' | 'BOLD' | 'MOTION'
