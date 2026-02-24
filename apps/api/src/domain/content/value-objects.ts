import {
	ContentFormat,
	HookPattern,
	Mood,
	StylePreset,
	type ContentFormat as ContentFormatType,
	type HookPattern as HookPatternType,
	type Mood as MoodType,
	type Platform as PlatformType,
	type StylePreset as StylePresetType,
} from '@snapvid/shared'

const VALID_CONTENT_FORMATS = new Set<string>(Object.values(ContentFormat))
const VALID_HOOK_PATTERNS = new Set<string>(Object.values(HookPattern))
const VALID_MOODS = new Set<string>(Object.values(Mood))
const VALID_STYLE_PRESETS = new Set<string>(Object.values(StylePreset))

function isContentFormat(value: string): value is ContentFormatType {
	return VALID_CONTENT_FORMATS.has(value)
}

function isHookPattern(value: string): value is HookPatternType {
	return VALID_HOOK_PATTERNS.has(value)
}

const MIN_SLIDE_DIMENSION = 320
const MIN_SLIDE_COUNT = 3
const MAX_SLIDE_COUNT = 10
const DEFAULT_SLIDE_COUNT = 6

function gcd(a: number, b: number): number {
	let x = Math.abs(a)
	let y = Math.abs(b)
	while (y !== 0) {
		const temp = y
		y = x % y
		x = temp
	}
	return x
}

export class ContentFormatVO {
	public readonly value: ContentFormatType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!isContentFormat(normalized)) {
			throw new Error(`Invalid content format: ${normalized}`)
		}
		this.value = normalized
	}

	public equals(other: ContentFormatVO): boolean {
		return this.value === other.value
	}
}

export class HookPatternVO {
	public readonly value: HookPatternType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!isHookPattern(normalized)) {
			throw new Error(`Invalid hook pattern: ${normalized}`)
		}
		this.value = normalized
	}

	public equals(other: HookPatternVO): boolean {
		return this.value === other.value
	}
}

type SlideSpecInput = {
	readonly width: number
	readonly height: number
	readonly slideCount?: number
}

export class SlideSpecVO {
	public readonly width: number
	public readonly height: number
	public readonly slideCount: number
	public readonly aspectRatio: string

	public constructor(input: SlideSpecInput) {
		const width = Math.round(input.width)
		const height = Math.round(input.height)

		if (width < MIN_SLIDE_DIMENSION || height < MIN_SLIDE_DIMENSION) {
			throw new Error(
				`Slide dimensions too small: ${width}x${height} (minimum ${MIN_SLIDE_DIMENSION})`,
			)
		}

		const slideCount = input.slideCount ?? DEFAULT_SLIDE_COUNT
		if (slideCount < MIN_SLIDE_COUNT || slideCount > MAX_SLIDE_COUNT) {
			throw new Error(
				`Slide count must be between ${MIN_SLIDE_COUNT} and ${MAX_SLIDE_COUNT}`,
			)
		}

		this.width = width
		this.height = height
		this.slideCount = slideCount
		this.aspectRatio = SlideSpecVO.computeAspectRatio(width, height)
	}

	private static computeAspectRatio(width: number, height: number): string {
		const divisor = gcd(width, height)
		return `${width / divisor}:${height / divisor}`
	}
}

type ContentToneInput = {
	readonly mood: MoodType
	readonly style: StylePresetType
	readonly targetAudience: string
}

export class ContentToneVO {
	public readonly mood: MoodType
	public readonly style: StylePresetType
	public readonly targetAudience: string

	public constructor(input: ContentToneInput) {
		if (!VALID_MOODS.has(input.mood)) {
			throw new Error(`Invalid mood: ${input.mood}`)
		}
		if (!VALID_STYLE_PRESETS.has(input.style)) {
			throw new Error(`Invalid style preset: ${input.style}`)
		}
		if (!input.targetAudience.trim()) {
			throw new Error('Target audience must not be empty')
		}

		this.mood = input.mood
		this.style = input.style
		this.targetAudience = input.targetAudience.trim()
	}
}

export const PLATFORM_SLIDE_SPECS: Record<PlatformType, SlideSpecVO> = {
	TIKTOK: new SlideSpecVO({ width: 1024, height: 1536 }),
	INSTAGRAM_REELS: new SlideSpecVO({ width: 1080, height: 1350 }),
	YOUTUBE_SHORTS: new SlideSpecVO({ width: 1080, height: 1920 }),
}
