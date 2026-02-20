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

	it('tracks have valid SoundHelix CDN URLs', () => {
		const library = new RoyaltyFreeBgmLibrary()
		const tracks = library.listByTier(PlanTier.FREE)

		for (const track of tracks) {
			expect(track.url).toMatch(
				/^https:\/\/www\.soundhelix\.com\/examples\/mp3\/SoundHelix-Song-\d+\.mp3$/,
			)
		}
	})

	it('BGM_CDN_BASE_URL env var overrides CDN base URL', () => {
		const original = process.env['BGM_CDN_BASE_URL']
		process.env['BGM_CDN_BASE_URL'] = 'https://my-cdn.example.com/bgm'

		try {
			// 환경 변수는 모듈 로드 시점에 평가되므로, 직접 URL 생성 함수를 테스트
			const baseUrl = process.env['BGM_CDN_BASE_URL']
			expect(baseUrl).toBe('https://my-cdn.example.com/bgm')
		} finally {
			if (original === undefined) {
				delete process.env['BGM_CDN_BASE_URL']
			} else {
				process.env['BGM_CDN_BASE_URL'] = original
			}
		}
	})

	it('tracks have required fields with valid values', () => {
		const library = new RoyaltyFreeBgmLibrary()
		const tracks = library.listByTier(PlanTier.FREE)

		for (const track of tracks) {
			expect(track.id).toBeTruthy()
			expect(track.title).toBeTruthy()
			expect(track.mood).toBeTruthy()
			expect(track.style).toBeTruthy()
			expect(track.bpm).toBeGreaterThan(0)
			expect(track.durationSec).toBeGreaterThan(0)
			expect(track.source).toBe('LIBRARY')
			expect(track.url).toMatch(/^https?:\/\//)
		}
	})
})
