import { PlanTier } from '@snapvid/shared'
import type { BgmSelectionInput, BgmTrack } from './types.js'

function buildTracks(count: number, tier: PlanTier): BgmTrack[] {
	const moods = ['ENERGETIC', 'CALM', 'LUXURY', 'PLAYFUL', 'PROFESSIONAL']
	const styles = ['SIMPLE', 'DYNAMIC', 'EMOTIONAL', 'TRENDY', 'PREMIUM']

	return Array.from({ length: count }).map((_, index) => {
		const mood = moods[index % moods.length] ?? 'PROFESSIONAL'
		const style = styles[index % styles.length] ?? 'SIMPLE'
		return {
			id: `${tier.toLowerCase()}_bgm_${index + 1}`,
			title: `${tier} Track ${index + 1}`,
			mood,
			style,
			bpm: 90 + (index % 8) * 10,
			durationSec: 30,
			source: 'LIBRARY',
			tier,
			url: `https://cdn.snapvid.ai/bgm/${tier.toLowerCase()}/${index + 1}.mp3`,
		}
	})
}

const FREE_TRACKS = buildTracks(20, PlanTier.FREE)
const STARTER_TRACKS = buildTracks(220, PlanTier.STARTER)

function scoreTrack(track: BgmTrack, input: BgmSelectionInput): number {
	let score = 0
	if (track.mood === input.mood) {
		score += 3
	}
	if (track.style === input.style) {
		score += 3
	}
	const durationGap = Math.abs(track.durationSec - input.durationSec)
	score += Math.max(0, 2 - durationGap / 15)
	if (input.mood === 'ENERGETIC' && track.bpm >= 120) {
		score += 1
	}
	return score
}

export class RoyaltyFreeBgmLibrary {
	public listByTier(planTier: PlanTier): BgmTrack[] {
		return planTier === PlanTier.FREE ? [...FREE_TRACKS] : [...STARTER_TRACKS]
	}

	public selectBestMatch(input: BgmSelectionInput): BgmTrack {
		const tracks = this.listByTier(input.planTier)
		const sorted = [...tracks].sort((a, b) => scoreTrack(b, input) - scoreTrack(a, input))
		const selected = sorted[0]

		if (!selected) {
			throw new Error('No BGM tracks available')
		}

		return selected
	}
}
