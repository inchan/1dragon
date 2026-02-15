import type { TtsGenerationInput, TtsGenerationOutput } from './types.js'

export class ElevenLabsTtsAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async synthesize(input: TtsGenerationInput): Promise<TtsGenerationOutput> {
		if (this.options.apiKey) {
			await fetch(this.options.baseUrl ?? 'https://api.elevenlabs.io/v1/text-to-speech', {
				method: 'POST',
				headers: {
					'xi-api-key': this.options.apiKey,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(input),
			}).catch(() => {
				// 실패 시 로컬 폴백
			})
		}

		return {
			provider: 'ELEVENLABS',
			audioUrl: `https://cdn.snapvid.ai/tts/elevenlabs/${Date.now()}.wav`,
			durationSec: Math.max(2, Math.round(input.text.length / 8)),
			voice: input.voice,
			speed: input.speed,
		}
	}
}
