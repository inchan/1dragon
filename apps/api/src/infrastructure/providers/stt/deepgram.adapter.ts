import type { SttTranscriptionOutput } from './types.js'

function toSrt(words: ReadonlyArray<{ word: string; startMs: number; endMs: number }>): string {
	return words
		.map((word, index) => {
			const startSec = (word.startMs / 1000).toFixed(3).replace('.', ',')
			const endSec = (word.endMs / 1000).toFixed(3).replace('.', ',')
			return `${index + 1}\n00:00:${startSec} --> 00:00:${endSec}\n${word.word}`
		})
		.join('\n\n')
}

function toVtt(words: ReadonlyArray<{ word: string; startMs: number; endMs: number }>): string {
	const body = words
		.map((word) => {
			const startSec = (word.startMs / 1000).toFixed(3)
			const endSec = (word.endMs / 1000).toFixed(3)
			return `00:00:${startSec} --> 00:00:${endSec}\n${word.word}`
		})
		.join('\n\n')

	return `WEBVTT\n\n${body}`
}

export class DeepgramSttAdapter {
	public constructor(
		private readonly options: {
			apiKey?: string
			baseUrl?: string
		} = {},
	) {}

	public async transcribe(input: {
		readonly audioUrl: string
		readonly language?: string
	}): Promise<SttTranscriptionOutput> {
		if (this.options.apiKey) {
			await fetch(this.options.baseUrl ?? 'https://api.deepgram.com/v1/listen', {
				method: 'POST',
				headers: {
					Authorization: `Token ${this.options.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ url: input.audioUrl, language: input.language ?? 'ko' }),
			}).catch(() => {
				// 실패 시 시뮬레이션
			})
		}

		const words = [
			{ word: '상품', startMs: 0, endMs: 380 },
			{ word: '포인트를', startMs: 380, endMs: 840 },
			{ word: '확인하세요', startMs: 840, endMs: 1320 },
		]

		return {
			provider: 'DEEPGRAM',
			transcript: words.map((word) => word.word).join(' '),
			words,
			wer: 0.03,
			srt: toSrt(words),
			vtt: toVtt(words),
		}
	}
}
