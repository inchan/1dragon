import {
	AgeRange,
	Gender,
	type AgeRange as AgeRangeType,
	type Gender as GenderType,
} from '@1dragon/shared'

const VALID_GENDER = new Set<string>(Object.values(Gender))
const VALID_AGE_RANGE = new Set<string>(Object.values(AgeRange))

export const BODY_TYPES = ['SLIM', 'REGULAR'] as const
export type BodyType = (typeof BODY_TYPES)[number]

export const PERSONA_STYLES = ['CASUAL', 'FORMAL', 'STREET', 'MINIMAL'] as const
export type PersonaStyle = (typeof PERSONA_STYLES)[number]

const VALID_BODY_TYPE = new Set<string>(BODY_TYPES)
const VALID_PERSONA_STYLE = new Set<string>(PERSONA_STYLES)

export class GenderVO {
	public readonly value: GenderType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_GENDER.has(normalized)) {
			throw new Error(`Invalid gender: ${value}`)
		}

		this.value = normalized as GenderType
	}

	public equals(other: GenderVO): boolean {
		return this.value === other.value
	}
}

export class AgeRangeVO {
	public readonly value: AgeRangeType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_AGE_RANGE.has(normalized)) {
			throw new Error(`Invalid age range: ${value}`)
		}

		this.value = normalized as AgeRangeType
	}

	public equals(other: AgeRangeVO): boolean {
		return this.value === other.value
	}
}

export class BodyTypeVO {
	public readonly value: BodyType

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_BODY_TYPE.has(normalized)) {
			throw new Error(`Invalid body type: ${value}`)
		}

		this.value = normalized as BodyType
	}

	public equals(other: BodyTypeVO): boolean {
		return this.value === other.value
	}
}

export class StyleVO {
	public readonly value: PersonaStyle

	public constructor(value: string) {
		const normalized = value.trim().toUpperCase()
		if (!VALID_PERSONA_STYLE.has(normalized)) {
			throw new Error(`Invalid persona style: ${value}`)
		}

		this.value = normalized as PersonaStyle
	}

	public equals(other: StyleVO): boolean {
		return this.value === other.value
	}
}

type ModelPersonaInput = {
	readonly gender: GenderVO
	readonly ageRange: AgeRangeVO
	readonly bodyType: BodyTypeVO
	readonly style: StyleVO
}

export class ModelPersona {
	public readonly gender: GenderVO
	public readonly ageRange: AgeRangeVO
	public readonly bodyType: BodyTypeVO
	public readonly style: StyleVO

	public constructor(input: ModelPersonaInput) {
		this.gender = input.gender
		this.ageRange = input.ageRange
		this.bodyType = input.bodyType
		this.style = input.style
	}

	public toLabel(): string {
		return `${this.gender.value}/${this.ageRange.value}/${this.bodyType.value}/${this.style.value}`
	}
}

type PersonaPresetInput = {
	readonly id: string
	readonly name: string
	readonly modelPersona: ModelPersona
	readonly imagenPromptTemplate: string
	readonly thumbnailUrl?: string | null
	readonly isActive?: boolean
}

export class PersonaPreset {
	public readonly id: string
	public readonly name: string
	public readonly modelPersona: ModelPersona
	public readonly imagenPromptTemplate: string
	public readonly thumbnailUrl: string | null
	public readonly isActive: boolean

	public constructor(input: PersonaPresetInput) {
		this.id = input.id
		this.name = input.name.trim()
		this.modelPersona = input.modelPersona
		this.imagenPromptTemplate = input.imagenPromptTemplate.trim()
		this.thumbnailUrl = input.thumbnailUrl?.trim() ? input.thumbnailUrl.trim() : null
		this.isActive = input.isActive ?? true
	}

	public interpolatePrompt(payload: {
		readonly productName?: string
		readonly productCategory: string
		readonly productKeywords: ReadonlyArray<string>
	}): string {
		const keywords = payload.productKeywords.join(', ') || 'product'
		const name = payload.productName?.trim() || 'product'

		return this.imagenPromptTemplate
			.replaceAll('{{product_name}}', name)
			.replaceAll('{{product_category}}', payload.productCategory)
			.replaceAll('{{product_keywords}}', keywords)
			.replaceAll('{{gender}}', this.modelPersona.gender.value)
			.replaceAll('{{age_range}}', this.modelPersona.ageRange.value)
			.replaceAll('{{body_type}}', this.modelPersona.bodyType.value)
			.replaceAll('{{style}}', this.modelPersona.style.value)
	}
}
