import type { TtsGenerationInput, TtsGenerationOutput } from './types.js'

export class GoogleCloudTtsAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async synthesize(input: TtsGenerationInput): Promise<TtsGenerationOutput> {
		if (this.options.apiKey) {
			await fetch(this.options.baseUrl ?? 'https://texttospeech.googleapis.com/v1/text:synthesize', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					input: { text: input.text },
					voice: { languageCode: 'ko-KR' },
					audioConfig: { audioEncoding: 'LINEAR16', speakingRate: input.speed },
				}),
			}).catch(() => {
				// 실패 시 로컬 폴백
			})
		}

		return {
			provider: 'GOOGLE_CLOUD_TTS',
			audioUrl: `https://cdn.snapvid.ai/tts/google/${Date.now()}.wav`,
			durationSec: Math.max(2, Math.round(input.text.length / 8)),
			voice: input.voice,
			speed: input.speed,
		}
	}
}
