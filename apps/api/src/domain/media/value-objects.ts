import {
	Platform,
	StylePreset,
	type Platform as PlatformType,
	type StylePreset as StylePresetType,
} from '@1dragon/shared'

const VALID_PLATFORMS = new Set<string>(Object.values(Platform))
const VALID_STYLE_PRESETS = new Set<string>(Object.values(StylePreset))

export const JOB_STATUSES = {
	QUEUED: 'QUEUED',
	ANALYZING: 'ANALYZING',
	GENERATING: 'GENERATING',
	COMPOSING: 'COMPOSING',
	RENDERING_VARIANTS: 'RENDERING_VARIANTS',
	SUCCEEDED: 'SUCCEEDED',
	FAILED: 'FAILED',
	DEGRADED_FAILED: 'DEGRADED_FAILED',
} as const

export type JobStatus = (typeof JOB_STATUSES)[keyof typeof JOB_STATUSES]

const VALID_JOB_STATUSES = new Set<string>(Object.values(JOB_STATUSES))

export class PlatformVO {
	public readonly value: PlatformType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_PLATFORMS.has(normalized)) {
			throw new Error(`Invalid platform: ${value}`)
		}

		this.value = normalized as PlatformType
	}

	public equals(other: PlatformVO): boolean {
		return this.value === other.value
	}
}

export class StylePresetVO {
	public readonly value: StylePresetType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_STYLE_PRESETS.has(normalized)) {
			throw new Error(`Invalid style preset: ${value}`)
		}

		this.value = normalized as StylePresetType
	}

	public equals(other: StylePresetVO): boolean {
		return this.value === other.value
	}
}

export class QualityScoreVO {
	public readonly value: number

	public constructor(value: number) {
		if (!Number.isFinite(value) || value < 0 || value > 1) {
			throw new Error(`Invalid quality score: ${value}`)
		}

		this.value = value
	}

	public asPercent(): number {
		return Math.round(this.value * 100)
	}

	public isBelow(threshold: number): boolean {
		return this.value < threshold
	}
}

export class JobStatusVO {
	public readonly value: JobStatus

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_JOB_STATUSES.has(normalized)) {
			throw new Error(`Invalid job status: ${value}`)
		}

		this.value = normalized as JobStatus
	}

	public equals(other: JobStatusVO): boolean {
		return this.value === other.value
	}
}
