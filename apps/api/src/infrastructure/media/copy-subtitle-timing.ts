export type SubtitleCue = {
	readonly text: string
	readonly startMs: number
	readonly endMs: number
}

export function distributeCopySubtitleTiming(input: {
	readonly lines: ReadonlyArray<string>
	readonly totalDurationSec: number
}): SubtitleCue[] {
	const normalizedLines = input.lines.map((line) => line.trim()).filter(Boolean)
	if (normalizedLines.length === 0) {
		return []
	}

	const totalChars = normalizedLines.reduce((sum, line) => sum + line.length, 0)
	const totalDurationMs = Math.max(1000, Math.round(input.totalDurationSec * 1000))

	let cursor = 0
	return normalizedLines.map((line, index) => {
		const ratio = totalChars > 0 ? line.length / totalChars : 1 / normalizedLines.length
		const allocated =
			index === normalizedLines.length - 1
				? totalDurationMs - cursor
				: Math.max(500, Math.round(totalDurationMs * ratio))
		const cue = {
			text: line,
			startMs: cursor,
			endMs: Math.min(totalDurationMs, cursor + allocated),
		}
		cursor = cue.endMs
		return cue
	})
}
