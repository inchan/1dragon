import { describe, expect, it } from 'vitest'
import { FADE_IN_DURATION_SEC, FFmpegComposer, WATERMARK_POSITION_EXPRESSION, buildFilterGraph } from './ffmpeg-composer.js'

describe('FFmpegComposer', () => {
	it('composes master video output metadata', async () => {
		const composer = new FFmpegComposer()
		const output = await composer.compose({
			foregroundImageUrl: 'https://cdn.example.com/foreground.png',
			backgroundClipUrls: [
				'https://cdn.example.com/clip-1.mp4',
				'https://cdn.example.com/clip-2.mp4',
				'https://cdn.example.com/clip-3.mp4',
			],
			subtitleFileUrl: 'https://cdn.example.com/subtitles.srt',
			narrationAudioUrl: 'https://cdn.example.com/narration.mp3',
			bgmAudioUrl: 'https://cdn.example.com/bgm.mp3',
			watermarkEnabled: true,
		})

		expect(output.masterVideoUrl).toBe('https://cdn.example.com/clip-1.mp4')
		expect(output.durationSec).toBe(30)
		expect(output.width).toBe(1080)
		expect(output.height).toBe(1920)
	})

	it('renders platform variant output', async () => {
		const composer = new FFmpegComposer()
		const output = await composer.renderVariant({
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			platform: 'TIKTOK',
		})

		expect(output.variantUrl).toBe('https://cdn.example.com/master.mp4')
	})

	it('uses bottom-right watermark placement expression', () => {
		expect(WATERMARK_POSITION_EXPRESSION).toBe('x=W-tw-40:y=H-th-60')
	})

	it('filter graph includes fade-in to mask first-frame stall', () => {
		const graph = buildFilterGraph({
			foregroundImageUrl: 'https://cdn.example.com/fg.png',
			backgroundClipUrls: ['https://cdn.example.com/clip.mp4'],
			watermarkEnabled: false,
		})

		expect(graph).toContain('fade=t=in:st=0:d=0.5')
	})

	it('FADE_IN_DURATION_SEC is 0.5 seconds', () => {
		expect(FADE_IN_DURATION_SEC).toBe(0.5)
	})
})
