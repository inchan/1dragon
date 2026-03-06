import type { PlanTier } from '@1dragon/shared'

export type BgmTrack = {
	readonly id: string
	readonly title: string
	readonly mood: string
	readonly style: string
	readonly bpm: number
	readonly durationSec: number
	readonly source: 'LIBRARY' | 'UDIO'
	readonly tier: PlanTier
	readonly url: string
}

export type BgmSelectionInput = {
	readonly planTier: PlanTier
	readonly mood: string
	readonly style: string
	readonly durationSec: number
	readonly allowUdio: boolean
}
