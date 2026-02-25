import { describe, expect, it } from 'vitest'
import {
	ContentFormatVO,
	HookPatternVO,
	SlideSpecVO,
	ContentToneVO,
	PLATFORM_SLIDE_SPECS,
} from './value-objects.js'

describe('content/value-objects', () => {
	describe('ContentFormatVO', () => {
		it('accepts valid content formats', () => {
			const slideshow = new ContentFormatVO('slideshow')
			const video = new ContentFormatVO('VIDEO')

			expect(slideshow.value).toBe('SLIDESHOW')
			expect(video.value).toBe('VIDEO')
		})

		it('throws for invalid content format', () => {
			expect(() => new ContentFormatVO('PODCAST')).toThrowError(
				'Invalid content format: PODCAST',
			)
		})

		it('compares equality', () => {
			const a = new ContentFormatVO('SLIDESHOW')
			const b = new ContentFormatVO('slideshow')
			const c = new ContentFormatVO('VIDEO')

			expect(a.equals(b)).toBe(true)
			expect(a.equals(c)).toBe(false)
		})
	})

	describe('HookPatternVO', () => {
		it('accepts valid hook patterns', () => {
			const pattern = new HookPatternVO('conflict_resolution')
			expect(pattern.value).toBe('CONFLICT_RESOLUTION')
		})

		it('throws for invalid hook pattern', () => {
			expect(() => new HookPatternVO('RANDOM')).toThrowError('Invalid hook pattern: RANDOM')
		})
	})

	describe('SlideSpecVO', () => {
		it('creates valid slide spec with defaults', () => {
			const spec = new SlideSpecVO({ width: 1024, height: 1536 })

			expect(spec.width).toBe(1024)
			expect(spec.height).toBe(1536)
			expect(spec.slideCount).toBe(6)
			expect(spec.aspectRatio).toBe('2:3')
		})

		it('calculates aspect ratio correctly', () => {
			const portrait = new SlideSpecVO({ width: 1080, height: 1920 })
			expect(portrait.aspectRatio).toBe('9:16')

			const square = new SlideSpecVO({ width: 1080, height: 1350 })
			expect(square.aspectRatio).toBe('4:5')
		})

		it('rejects dimensions below minimum', () => {
			expect(() => new SlideSpecVO({ width: 100, height: 100 })).toThrowError(
				'Slide dimensions too small',
			)
		})

		it('rejects slide count outside 3-10 range', () => {
			expect(
				() => new SlideSpecVO({ width: 1024, height: 1536, slideCount: 2 }),
			).toThrowError('Slide count must be between 3 and 10')
			expect(
				() => new SlideSpecVO({ width: 1024, height: 1536, slideCount: 11 }),
			).toThrowError('Slide count must be between 3 and 10')
		})

		it('accepts custom slide count within range', () => {
			const spec = new SlideSpecVO({ width: 1024, height: 1536, slideCount: 8 })
			expect(spec.slideCount).toBe(8)
		})
	})

	describe('ContentToneVO', () => {
		it('creates with valid tone components', () => {
			const tone = new ContentToneVO({
				mood: 'ENERGETIC',
				style: 'TRENDY',
				targetAudience: '20-30대 여성',
			})

			expect(tone.mood).toBe('ENERGETIC')
			expect(tone.style).toBe('TRENDY')
			expect(tone.targetAudience).toBe('20-30대 여성')
		})

		it('throws for empty target audience', () => {
			expect(
				() =>
					new ContentToneVO({
						mood: 'CALM',
						style: 'SIMPLE',
						targetAudience: '',
					}),
			).toThrowError('Target audience must not be empty')
		})

		it('throws for invalid mood', () => {
			expect(
				() =>
					new ContentToneVO({
						mood: 'ANGRY' as never,
						style: 'SIMPLE',
						targetAudience: 'test',
					}),
			).toThrowError('Invalid mood: ANGRY')
		})

		it('throws for invalid style', () => {
			expect(
				() =>
					new ContentToneVO({
						mood: 'CALM',
						style: 'GOTHIC' as never,
						targetAudience: 'test',
					}),
			).toThrowError('Invalid style preset: GOTHIC')
		})
	})

	describe('PLATFORM_SLIDE_SPECS', () => {
		it('has correct TikTok spec', () => {
			const spec = PLATFORM_SLIDE_SPECS.TIKTOK
			expect(spec.width).toBe(1024)
			expect(spec.height).toBe(1536)
		})

		it('has correct Instagram spec', () => {
			const spec = PLATFORM_SLIDE_SPECS.INSTAGRAM_REELS
			expect(spec.width).toBe(1080)
			expect(spec.height).toBe(1350)
		})

		it('has correct YouTube spec', () => {
			const spec = PLATFORM_SLIDE_SPECS.YOUTUBE_SHORTS
			expect(spec.width).toBe(1080)
			expect(spec.height).toBe(1920)
		})
	})
})
