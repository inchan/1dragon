import { uploadImage } from '../../storage/s3-client.js'
import type { TtsGenerationInput, TtsGenerationOutput, TtsVoiceId } from './types.js'

/**
 * ElevenLabs TTS API voice ID 매핑
 * 무료 티어에서 기본 제공되는 voice ID
 */
const VOICE_ID_MAP: Record<TtsVoiceId, string> = {
	// biome-ignore lint/style/useNamingConvention: TtsVoiceId enum 키와 일치해야 함
	FEMALE_BRIGHT: '21m00Tcm4TlvDq8ikWAM', // Rachel
	// biome-ignore lint/style/useNamingConvention: TtsVoiceId enum 키와 일치해야 함
	MALE_CALM: 'TxGEqnHWrfWFTfGW9XjX', // Josh
	// biome-ignore lint/style/useNamingConvention: TtsVoiceId enum 키와 일치해야 함
	FEMALE_PRO: 'EXAVITQu4vr4xnSDxMaL', // Bella
}

/**
 * 텍스트 길이 기반 재생 시간 추정 (초)
 * 한국어 기준 약 분당 400자 발화 속도 적용
 */
function estimateDurationSec(text: string, speed: number): number {
	const charsPerSec = (400 / 60) * speed
	return Math.max(2, Math.round(text.length / charsPerSec))
}

export class ElevenLabsTtsAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async synthesize(input: TtsGenerationInput): Promise<TtsGenerationOutput> {
		if (!this.options.apiKey) {
			throw new Error('ElevenLabs API key is required')
		}

		const voiceId = VOICE_ID_MAP[input.voice]
		const baseUrl = this.options.baseUrl ?? 'https://api.elevenlabs.io'
		const url = `${baseUrl}/v1/text-to-speech/${voiceId}`

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'xi-api-key': this.options.apiKey,
				'Content-Type': 'application/json',
				// biome-ignore lint/style/useNamingConvention: HTTP 헤더 표준 대문자 형식
				Accept: 'audio/mpeg',
			},
			body: JSON.stringify({
				text: input.text,
				// biome-ignore lint/style/useNamingConvention: ElevenLabs API 필드명
				model_id: 'eleven_multilingual_v2',
				// biome-ignore lint/style/useNamingConvention: ElevenLabs API 필드명
				voice_settings: {
					stability: 0.5,
					// biome-ignore lint/style/useNamingConvention: ElevenLabs API 필드명
					similarity_boost: 0.75,
					speed: input.speed,
				},
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`,
			)
		}

		const audioBuffer = Buffer.from(await response.arrayBuffer())
		const key = `tts/elevenlabs/${Date.now()}-${input.voice.toLowerCase()}.mp3`

		const { url: audioUrl } = await uploadImage(audioBuffer, key, 'audio/mpeg')

		const durationSec = estimateDurationSec(input.text, input.speed)

		return {
			provider: 'ELEVENLABS',
			audioUrl,
			durationSec,
			voice: input.voice,
			speed: input.speed,
		}
	}
}
