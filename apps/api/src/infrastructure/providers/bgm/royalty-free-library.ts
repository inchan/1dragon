import { PlanTier } from '@snapvid/shared'
import type { BgmSelectionInput, BgmTrack } from './types.js'

/**
 * 공개 도메인 테스트용 오디오 URL 목록 (SoundHelix - CC0/개발용)
 * 실제 배포 시 환경 변수 BGM_CDN_BASE_URL 로 자체 CDN 교체 가능
 * 참고: https://www.soundhelix.com/audio-examples
 */
const SOUNDHELIX_BASE = 'https://www.soundhelix.com/examples/mp3'

/**
 * SoundHelix 16개 트랙의 메타데이터 (BPM, 재생시간 추정값 포함)
 * 파일 크기 기준 추정 재생시간 (128kbps: ~1MB = 62초)
 */
const SOUNDHELIX_TRACKS = [
	{ songNum: 1, bpm: 120, durationSec: 372 }, // ~8.9MB
	{ songNum: 2, bpm: 95, durationSec: 424 }, // ~10.2MB
	{ songNum: 3, bpm: 110, durationSec: 342 }, // ~8.3MB
	{ songNum: 4, bpm: 130, durationSec: 301 }, // ~7.3MB
	{ songNum: 5, bpm: 100, durationSec: 352 }, // ~8.5MB
	{ songNum: 6, bpm: 140, durationSec: 278 }, // ~6.7MB
	{ songNum: 7, bpm: 90, durationSec: 418 }, // ~10.1MB
	{ songNum: 8, bpm: 115, durationSec: 323 }, // ~7.8MB
	{ songNum: 9, bpm: 105, durationSec: 350 },
	{ songNum: 10, bpm: 125, durationSec: 290 },
	{ songNum: 11, bpm: 98, durationSec: 360 },
	{ songNum: 12, bpm: 135, durationSec: 310 },
	{ songNum: 13, bpm: 88, durationSec: 380 },
	{ songNum: 14, bpm: 118, durationSec: 330 },
	{ songNum: 15, bpm: 108, durationSec: 345 },
	{ songNum: 16, bpm: 145, durationSec: 270 },
] as const

const MOODS = ['ENERGETIC', 'CALM', 'LUXURY', 'PLAYFUL', 'PROFESSIONAL'] as const
const STYLES = ['SIMPLE', 'DYNAMIC', 'EMOTIONAL', 'TRENDY', 'PREMIUM'] as const

type Mood = (typeof MOODS)[number]
type Style = (typeof STYLES)[number]

function getMood(index: number): Mood {
	return MOODS[index % MOODS.length] ?? 'PROFESSIONAL'
}

function getStyle(index: number): Style {
	return STYLES[index % STYLES.length] ?? 'SIMPLE'
}

function getSoundHelixUrl(songNum: number): string {
	const base = process.env['BGM_CDN_BASE_URL'] ?? SOUNDHELIX_BASE
	return `${base}/SoundHelix-Song-${songNum}.mp3`
}

function buildTracks(count: number, tier: PlanTier): BgmTrack[] {
	return Array.from({ length: count }).map((_, index) => {
		const trackMeta = SOUNDHELIX_TRACKS[index % SOUNDHELIX_TRACKS.length]
		const songNum = trackMeta?.songNum ?? (index % 16) + 1
		const bpm = trackMeta?.bpm ?? 100
		const durationSec = trackMeta?.durationSec ?? 300

		return {
			id: `${tier.toLowerCase()}_bgm_${index + 1}`,
			title: `SoundHelix Song ${songNum} (${getMood(index)})`,
			mood: getMood(index),
			style: getStyle(index),
			bpm,
			durationSec,
			source: 'LIBRARY' as const,
			tier,
			url: getSoundHelixUrl(songNum),
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
