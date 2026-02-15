import { describe, expect, it } from 'vitest'
import { ClipAsset, VideoAsset, VideoJob, VideoResult, VideoVariant } from './entities.js'
import { QualityScoreVO, StylePresetVO } from './value-objects.js'

describe('media/entities', () => {
	it('creates video job and updates state', () => {
		const job = new VideoJob({
			id: 'job_1',
			userId: 'user_1',
			inputImageUrl: 'https://cdn.example.com/product.png',
			stylePreset: new StylePresetVO('SIMPLE'),
			status: 'QUEUED',
		})

		job.setStatus('ANALYZING')
		job.increaseRetry()

		expect(job.status.value).toBe('ANALYZING')
		expect(job.retryCount).toBe(1)
	})

	it('stores video result with variants', () => {
		const master = new VideoAsset({
			url: 'https://cdn.example.com/master.mp4',
			durationSec: 30,
			width: 1080,
			height: 1920,
		})
		const variant = new VideoVariant({
			id: 'variant_1',
			platform: 'TIKTOK',
			asset: master,
			hasWatermark: true,
		})
		const result = new VideoResult({
			masterAsset: master,
			variants: [variant],
			qualityScore: new QualityScoreVO(0.81),
		})

		const job = new VideoJob({
			id: 'job_2',
			userId: 'user_1',
			inputImageUrl: 'https://cdn.example.com/product.png',
			stylePreset: new StylePresetVO('TRENDY'),
			status: 'COMPOSING',
			clipAssets: [new ClipAsset({ id: 'clip_1', url: 'https://cdn.example.com/clip.mp4', durationSec: 10 })],
		})
		job.setResult(result)

		expect(job.result?.qualityScore.value).toBe(0.81)
		expect(job.result?.variants[0]?.platform).toBe('TIKTOK')
	})
})
