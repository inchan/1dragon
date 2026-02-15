import type { ProductCategory, Gender } from '@snapvid/shared'

export const MODEL_PERSONA_AGE_RANGES = ['YOUNG_ADULT', 'ADULT', 'MIDDLE_AGED'] as const
export type ModelPersonaAgeRange = (typeof MODEL_PERSONA_AGE_RANGES)[number]

export const MODEL_PERSONA_BODY_TYPES = ['SLIM', 'REGULAR'] as const
export type ModelPersonaBodyType = (typeof MODEL_PERSONA_BODY_TYPES)[number]

export const MODEL_PERSONA_STYLES = ['CASUAL', 'FORMAL', 'STREET', 'MINIMAL'] as const
export type ModelPersonaStyle = (typeof MODEL_PERSONA_STYLES)[number]

export type ModelPersonaSelection = {
	readonly gender: Gender
	readonly ageRange: ModelPersonaAgeRange
	readonly bodyType: ModelPersonaBodyType
	readonly style: ModelPersonaStyle
}

export type ModelPersonaOption = ModelPersonaSelection & {
	readonly id: string
	readonly label: string
	readonly categoryHint: ProductCategory[]
}
