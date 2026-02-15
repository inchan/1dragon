import type { Platform } from '@snapvid/shared'
import {
	JobStatusVO,
	QualityScoreVO,
	StylePresetVO,
	type JobStatus,
} from './value-objects.js'

type ClipAssetInput = {
	readonly id: string
	readonly url: string
	readonly durationSec: number
}

export class ClipAsset {
	public readonly id: string
	public readonly url: string
	public readonly durationSec: number

	public constructor(input: ClipAssetInput) {
		this.id = input.id
		this.url = input.url
		this.durationSec = Math.max(1, Math.round(input.durationSec))
	}
}

type VideoAssetInput = {
	readonly url: string
	readonly durationSec: number
	readonly width: number
	readonly height: number
	readonly mimeType?: string
}

export class VideoAsset {
	public readonly url: string
	public readonly durationSec: number
	public readonly width: number
	public readonly height: number
	public readonly mimeType: string

	public constructor(input: VideoAssetInput) {
		this.url = input.url
		this.durationSec = Math.max(1, Math.round(input.durationSec))
		this.width = Math.max(1, Math.round(input.width))
		this.height = Math.max(1, Math.round(input.height))
		this.mimeType = input.mimeType ?? 'video/mp4'
	}
}

type VideoVariantInput = {
	readonly id: string
	readonly platform: Platform
	readonly asset: VideoAsset
	readonly hasWatermark: boolean
}

export class VideoVariant {
	public readonly id: string
	public readonly platform: Platform
	public readonly asset: VideoAsset
	public readonly hasWatermark: boolean

	public constructor(input: VideoVariantInput) {
		this.id = input.id
		this.platform = input.platform
		this.asset = input.asset
		this.hasWatermark = input.hasWatermark
	}
}

type VideoResultInput = {
	readonly masterAsset: VideoAsset
	readonly variants: ReadonlyArray<VideoVariant>
	readonly qualityScore: QualityScoreVO
}

export class VideoResult {
	public readonly masterAsset: VideoAsset
	public readonly variants: ReadonlyArray<VideoVariant>
	public readonly qualityScore: QualityScoreVO

	public constructor(input: VideoResultInput) {
		this.masterAsset = input.masterAsset
		this.variants = input.variants
		this.qualityScore = input.qualityScore
	}
}

type VideoJobInput = {
	readonly id: string
	readonly userId: string
	readonly inputImageUrl: string
	readonly stylePreset: StylePresetVO
	readonly status: JobStatus
	readonly clipAssets?: ReadonlyArray<ClipAsset>
	readonly result?: VideoResult | null
	readonly retryCount?: number
}

export class VideoJob {
	public readonly id: string
	public readonly userId: string
	public readonly inputImageUrl: string
	public readonly stylePreset: StylePresetVO
	public status: JobStatusVO
	public clipAssets: ReadonlyArray<ClipAsset>
	public result: VideoResult | null
	public retryCount: number

	public constructor(input: VideoJobInput) {
		this.id = input.id
		this.userId = input.userId
		this.inputImageUrl = input.inputImageUrl
		this.stylePreset = input.stylePreset
		this.status = new JobStatusVO(input.status)
		this.clipAssets = input.clipAssets ?? []
		this.result = input.result ?? null
		this.retryCount = input.retryCount ?? 0
	}

	public setStatus(next: JobStatus): void {
		this.status = new JobStatusVO(next)
	}

	public setClipAssets(assets: ReadonlyArray<ClipAsset>): void {
		this.clipAssets = assets
	}

	public setResult(result: VideoResult): void {
		this.result = result
	}

	public increaseRetry(): void {
		this.retryCount += 1
	}
}
