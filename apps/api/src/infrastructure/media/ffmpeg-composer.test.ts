import { describe, expect, it } from 'vitest'
import { FFmpegComposer, WATERMARK_POSITION_EXPRESSION } from './ffmpeg-composer.js'

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

		expect(output.masterVideoUrl).toContain('https://cdn.snapvid.ai/rendered/')
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

		expect(output.variantUrl).toContain('https://cdn.snapvid.ai/rendered/')
	})

	it('uses bottom-right watermark placement expression', () => {
		expect(WATERMARK_POSITION_EXPRESSION).toBe('x=W-tw-40:y=H-th-60')
	})
})
