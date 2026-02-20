import { uploadImage } from '../../storage/s3-client.js'
import type { TtsGenerationInput, TtsGenerationOutput } from './types.js'

export class GoogleCloudTtsAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async synthesize(input: TtsGenerationInput): Promise<TtsGenerationOutput> {
		if (!this.options.apiKey) {
			throw new Error('Google Cloud TTS API key is required')
		}

		const url = `${this.options.baseUrl ?? 'https://texttospeech.googleapis.com/v1/text:synthesize'}?key=${this.options.apiKey}`

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				input: { text: input.text },
				voice: { languageCode: 'ko-KR' },
				audioConfig: { audioEncoding: 'LINEAR16', speakingRate: input.speed },
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`Google Cloud TTS API error: ${response.status} ${response.statusText} - ${errorText}`,
			)
		}

		const result = (await response.json()) as { audioContent?: string }
		if (!result.audioContent) {
			throw new Error('Google Cloud TTS returned empty audio content')
		}

		const audioBuffer = Buffer.from(result.audioContent, 'base64')
		const key = `tts/google/${Date.now()}-${input.voice.toLowerCase()}.wav`
		const { url: audioUrl } = await uploadImage(audioBuffer, key, 'audio/wav')

		return {
			provider: 'GOOGLE_CLOUD_TTS',
			audioUrl,
			durationSec: Math.max(2, Math.round(input.text.length / 8)),
			voice: input.voice,
			speed: input.speed,
		}
	}
}
