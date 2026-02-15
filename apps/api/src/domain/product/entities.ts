import { Mood, ProductCategory, StylePreset, type Mood as MoodType, type ProductCategory as ProductCategoryType, type StylePreset as StylePresetType } from '@snapvid/shared'

const validProductCategory = new Set<string>(Object.values(ProductCategory))
const validMood = new Set<string>(Object.values(Mood))
const validStylePreset = new Set<string>(Object.values(StylePreset))

export class ProductCategoryVO {
	public readonly value: ProductCategoryType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()

		if (!validProductCategory.has(normalized)) {
			throw new Error(`Invalid product category: ${value}`)
		}

		this.value = normalized as ProductCategoryType
	}

	public get code(): ProductCategoryType {
		return this.value
	}

	public equals(other: ProductCategoryVO): boolean {
		return this.value === other.value
	}
}

export class MoodVO {
	public readonly value: MoodType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()

		if (!validMood.has(normalized)) {
			throw new Error(`Invalid mood: ${value}`)
		}

		this.value = normalized as MoodType
	}

	public equals(other: MoodVO): boolean {
		return this.value === other.value
	}
}

export class KeywordVO {
	public readonly value: string

	public constructor(value: string) {
		this.value = value.trim()
	}

	public isEmpty(): boolean {
		return this.value.length === 0
	}
}

export class StylePresetVO {
	public readonly value: StylePresetType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()

		if (!validStylePreset.has(normalized)) {
			throw new Error(`Invalid style preset: ${value}`)
		}

		this.value = normalized as StylePresetType
	}

	public equals(other: StylePresetVO): boolean {
		return this.value === other.value
	}
}

type ProductAnalysisProps = {
	readonly userId: string
	readonly imageUrl: string
	readonly category?: ProductCategoryType
	readonly keywords: ReadonlyArray<KeywordVO>
	readonly moods: ReadonlyArray<MoodVO>
	readonly colors: ReadonlyArray<string>
	readonly targetAudience?: string
	readonly suggestedStyles: ReadonlyArray<StylePresetVO>
	readonly confidenceScore: number
	readonly isProductImage: boolean
}

export class ProductAnalysis {
	public readonly userId: string
	public readonly imageUrl: string
	public readonly category: ProductCategoryType | null
	public readonly keywords: ReadonlyArray<KeywordVO>
	public readonly moods: ReadonlyArray<MoodVO>
	public readonly colors: ReadonlyArray<string>
	public readonly targetAudience: string | null
	public readonly suggestedStyles: ReadonlyArray<StylePresetVO>
	public readonly confidenceScore: number
	public readonly isProductImage: boolean

	public constructor(props: ProductAnalysisProps) {
		this.userId = props.userId
		this.imageUrl = props.imageUrl
		this.category = props.category ?? null
		this.keywords = props.keywords.filter((keyword) => !keyword.isEmpty())
		this.moods = props.moods
		this.colors = props.colors
		this.targetAudience = props.targetAudience?.trim() ? props.targetAudience.trim() : null
		this.suggestedStyles = props.suggestedStyles
		this.confidenceScore = props.confidenceScore
		this.isProductImage = props.isProductImage
	}
}
