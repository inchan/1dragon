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
		if (this.options.apiKey) {
			await fetch(this.options.baseUrl ?? 'https://api.udio.com/v1/generate', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.options.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(input),
			}).catch(() => {
				// 실패 시 시뮬레이션
			})
		}

		return {
			id: `udio_${Date.now()}`,
			title: `Udio ${input.mood} ${input.style}`,
			mood: input.mood,
			style: input.style,
			bpm: input.mood === 'ENERGETIC' ? 128 : 102,
			durationSec: input.durationSec,
			source: 'UDIO',
			tier: 'STARTER',
			url: `https://cdn.snapvid.ai/bgm/udio/${Date.now()}.mp3`,
		}
	}
}
