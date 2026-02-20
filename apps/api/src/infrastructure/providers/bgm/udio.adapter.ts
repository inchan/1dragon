import type { BgmTrack } from './types.js'

export class UdioBgmAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async generate(input: {
		readonly mood: string
		readonly style: string
		readonly durationSec: number
	}): Promise<BgmTrack> {
		if (!this.options.apiKey) {
			throw new Error('Udio API key is required')
		}

		const response = await fetch(this.options.baseUrl ?? 'https://api.udio.com/v1/generate', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.options.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(input),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`Udio API error: ${response.status} ${response.statusText} - ${errorText}`,
			)
		}

		const result = (await response.json()) as {
			id?: string
			title?: string
			bpm?: number
			url?: string
		}

		return {
			id: result.id ?? `udio_${Date.now()}`,
			title: result.title ?? `Udio ${input.mood} ${input.style}`,
			mood: input.mood,
			style: input.style,
			bpm: result.bpm ?? (input.mood === 'ENERGETIC' ? 128 : 102),
			durationSec: input.durationSec,
			source: 'UDIO',
			tier: 'STARTER',
			url: result.url ?? '',
		}
	}
}
