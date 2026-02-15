export type AudioSegment = {
	readonly startMs: number
	readonly endMs: number
}

export type VolumeKeyframe = {
	readonly atMs: number
	readonly gainDb: number
}

export function buildAutoDuckingKeyframes(input: {
	readonly narrationSegments: ReadonlyArray<AudioSegment>
	readonly baseGainDb?: number
	readonly duckGainDb?: number
	readonly fadeInMs?: number
	readonly fadeOutMs?: number
}): VolumeKeyframe[] {
	const baseGainDb = input.baseGainDb ?? 0
	const duckGainDb = input.duckGainDb ?? -12
	const fadeInMs = input.fadeInMs ?? 500
	const fadeOutMs = input.fadeOutMs ?? 1000

	const keyframes: VolumeKeyframe[] = [{ atMs: 0, gainDb: baseGainDb }]

	for (const segment of input.narrationSegments) {
		const start = Math.max(0, segment.startMs)
		const end = Math.max(start, segment.endMs)

		keyframes.push({ atMs: Math.max(0, start - fadeInMs), gainDb: baseGainDb })
		keyframes.push({ atMs: start, gainDb: duckGainDb })
		keyframes.push({ atMs: end, gainDb: duckGainDb })
		keyframes.push({ atMs: end + fadeOutMs, gainDb: baseGainDb })
	}

	return keyframes.sort((a, b) => a.atMs - b.atMs)
}
