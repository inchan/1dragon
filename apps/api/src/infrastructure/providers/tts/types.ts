export type TtsVoiceId = 'FEMALE_BRIGHT' | 'MALE_CALM' | 'FEMALE_PRO'

export type TtsGenerationInput = {
	readonly text: string
	readonly voice: TtsVoiceId
	readonly speed: number
}

export type TtsGenerationOutput = {
	readonly provider: 'TYPECAST' | 'ELEVENLABS' | 'GOOGLE_CLOUD_TTS'
	readonly audioUrl: string
	readonly durationSec: number
	readonly voice: TtsVoiceId
	readonly speed: number
}
