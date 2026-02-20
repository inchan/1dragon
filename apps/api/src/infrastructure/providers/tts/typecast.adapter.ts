import type { TtsGenerationInput, TtsGenerationOutput } from './types.js'

function normalizeSpeed(speed: number): number {
	if (!Number.isFinite(speed)) {
		return 1
	}

	return Math.min(1.5, Math.max(0.8, speed))
}

function normalizeKoreanNumbers(text: string): string {
	return text.replace(/15,000원/g, '만 오천 원')
}

export class TypecastTtsAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async synthesize(input: TtsGenerationInput): Promise<TtsGenerationOutput> {
		if (!this.options.apiKey) {
			throw new Error('Typecast API key is required')
		}

		const speed = normalizeSpeed(input.speed)
		const text = normalizeKoreanNumbers(input.text)

		const response = await fetch(this.options.baseUrl ?? 'https://api.typecast.ai/v1/tts', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.options.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text,
				voice: input.voice,
				speed,
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`Typecast API error: ${response.status} ${response.statusText} - ${errorText}`,
			)
		}

		const result = (await response.json()) as { audioUrl?: string }

		return {
			provider: 'TYPECAST',
			audioUrl: result.audioUrl ?? '',
			durationSec: Math.max(2, Math.round(text.length / (8 * speed))),
			voice: input.voice,
			speed,
		}
	}
}
