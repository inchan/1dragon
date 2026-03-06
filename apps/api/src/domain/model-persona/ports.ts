import type {
	AgeRange,
	Gender,
	ProductCategory,
} from '@1dragon/shared'
import type { BodyType, PersonaStyle } from './entities.js'

export type { BodyType, PersonaStyle } from './entities.js'

export interface PersonaPresetRecord {
	readonly id: string
	readonly name: string
	readonly gender: Gender
	readonly ageRange: AgeRange
	readonly bodyType: BodyType
	readonly style: PersonaStyle
	readonly imagenPromptTemplate: string
	readonly previewImageUrl: string | null
	readonly isActive: boolean
	readonly createdAt: Date
	readonly updatedAt: Date
}

export interface PersonaSelectionRecord {
	readonly id: string
	readonly userId: string
	readonly jobId: string | null
	readonly presetId: string
	readonly generatedImageUrl: string | null
	readonly qualityScore: number | null
	readonly createdAt: Date
	readonly updatedAt: Date
}

export interface PersonaSelectionCreateInput {
	readonly userId: string
	readonly jobId?: string | null
	readonly presetId: string
	readonly generatedImageUrl?: string | null
	readonly qualityScore?: number | null
}

export interface PersonaPresetListQuery {
	readonly gender?: Gender
	readonly ageRange?: AgeRange
	readonly bodyType?: BodyType
	readonly style?: PersonaStyle
	readonly limit?: number
}

export interface ModelImageGenerationQualitySignals {
	readonly visibilityScore: number
	readonly naturalnessScore: number
	readonly artifactScore: number
}

export interface ModelImageGenerationInput {
	readonly productImageUrl: string
	readonly productName?: string
	readonly productCategory: ProductCategory
	readonly productKeywords: ReadonlyArray<string>
	readonly preset: {
		readonly id: string
		readonly gender: Gender
		readonly ageRange: AgeRange
		readonly bodyType: BodyType
		readonly style: PersonaStyle
		readonly imagenPromptTemplate: string
	}
	readonly userId: string
	readonly retryAttempt?: number
	readonly qualityHint?: string
}

export interface ModelImageGenerationOutput {
	readonly imageUrl: string
	readonly prompt: string
	readonly provider: 'GEMINI_IMAGEN'
	readonly qualitySignals: ModelImageGenerationQualitySignals
}

export interface ModelImageGeneratorPort {
	generateComposite(input: ModelImageGenerationInput): Promise<ModelImageGenerationOutput>
}

export interface ModelPersonaPresetRepository {
	listActive(query?: PersonaPresetListQuery): Promise<PersonaPresetRecord[]>
	findById(id: string): Promise<PersonaPresetRecord | null>
}

export interface ModelPersonaSelectionRepository {
	create(input: PersonaSelectionCreateInput): Promise<PersonaSelectionRecord>
	findByJobId(jobId: string): Promise<PersonaSelectionRecord | null>
	findByUserId(userId: string, limit: number, offset: number): Promise<{
		items: PersonaSelectionRecord[]
		total: number
	}>
}
