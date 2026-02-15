import { PlanTier } from '@snapvid/shared'
import { describe, expect, it } from 'vitest'
import { RoyaltyFreeBgmLibrary } from './royalty-free-library.js'

describe('RoyaltyFreeBgmLibrary', () => {
	it('provides 20 tracks for free and 200+ for starter', () => {
		const library = new RoyaltyFreeBgmLibrary()

		expect(library.listByTier(PlanTier.FREE)).toHaveLength(20)
		expect(library.listByTier(PlanTier.STARTER).length).toBeGreaterThanOrEqual(200)
	})

	it('selects a best match track by mood/style', () => {
		const library = new RoyaltyFreeBgmLibrary()
		const selected = library.selectBestMatch({
			planTier: PlanTier.FREE,
			mood: 'ENERGETIC',
			style: 'DYNAMIC',
			durationSec: 30,
			allowUdio: false,
		})

		expect(selected.tier).toBe(PlanTier.FREE)
		expect(selected.source).toBe('LIBRARY')
	})
})
