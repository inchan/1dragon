export type WordTimestamp = {
	readonly word: string
	readonly startMs: number
	readonly endMs: number
}

export type SttTranscriptionOutput = {
	readonly provider: 'DEEPGRAM'
	readonly transcript: string
	readonly words: WordTimestamp[]
	readonly wer: number
	readonly srt: string
	readonly vtt: string
}
