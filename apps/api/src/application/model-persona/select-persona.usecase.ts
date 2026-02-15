import { ProductCategory, type ProductCategory as ProductCategoryType } from '@snapvid/shared'
import type {
	ModelPersonaPresetRepository,
	PersonaPresetRecord,
} from '@/domain/model-persona/ports.js'
import { PersonaCategoryMatcher } from '@/domain/model-persona/services.js'

export type SelectPersonaInput = {
	readonly detectedCategory: ProductCategoryType
	readonly overriddenCategory?: ProductCategoryType
	readonly targetAudience?: string | null
	readonly limit?: number
}

export type SelectPersonaOutput = {
	readonly showModelSelector: boolean
	readonly resolvedCategory: ProductCategoryType
	readonly presets: PersonaPresetRecord[]
	readonly recommendations: PersonaPresetRecord[]
}

function normalizeText(value: string | null | undefined): string {
	return (value ?? '').trim().toLowerCase()
}

function detectGenderHint(text: string): 'FEMALE' | 'MALE' | null {
	if (!text) {
		return null
	}

	if (/(여성|여자|female|woman|women|girl)/i.test(text)) {
		return 'FEMALE'
	}

	if (/(남성|남자|male|man|men|boy)/i.test(text)) {
		return 'MALE'
	}

	return null
}

function detectAgeHint(text: string): 'YOUNG_ADULT' | 'ADULT' | 'MIDDLE_AGED' | null {
	if (!text) {
		return null
	}

	if (/(10대|20대|teen|young)/i.test(text)) {
		return 'YOUNG_ADULT'
	}

	if (/(30대|adult|30s)/i.test(text)) {
		return 'ADULT'
	}

	if (/(40대|50대|middle|mature|40s|50s)/i.test(text)) {
		return 'MIDDLE_AGED'
	}

	return null
}

function detectStyleHints(text: string): ReadonlyArray<'CASUAL' | 'FORMAL' | 'STREET' | 'MINIMAL'> {
	if (!text) {
		return []
	}

	const hints: Array<'CASUAL' | 'FORMAL' | 'STREET' | 'MINIMAL'> = []
	if (/(캐주얼|casual|daily)/i.test(text)) {
		hints.push('CASUAL')
	}
	if (/(포멀|격식|formal|office|business)/i.test(text)) {
		hints.push('FORMAL')
	}
	if (/(스트리트|street|hip|urban)/i.test(text)) {
		hints.push('STREET')
	}
	if (/(미니멀|minimal|simple|clean)/i.test(text)) {
		hints.push('MINIMAL')
	}

	return hints
}

function getCategoryPreferredStyles(category: ProductCategoryType): ReadonlyArray<'CASUAL' | 'FORMAL' | 'STREET' | 'MINIMAL'> {
	switch (category) {
		case ProductCategory.FASHION:
			return ['CASUAL', 'MINIMAL', 'STREET']
		case ProductCategory.ACCESSORIES:
			return ['FORMAL', 'MINIMAL', 'CASUAL']
		case ProductCategory.BEAUTY:
			return ['MINIMAL', 'CASUAL', 'FORMAL']
		default:
			return []
	}
}

function scorePreset(input: {
	readonly preset: PersonaPresetRecord
	readonly targetAudienceText: string
	readonly resolvedCategory: ProductCategoryType
}): number {
	let score = 0
	const genderHint = detectGenderHint(input.targetAudienceText)
	const ageHint = detectAgeHint(input.targetAudienceText)
	const styleHints = detectStyleHints(input.targetAudienceText)
	const categoryStyles = getCategoryPreferredStyles(input.resolvedCategory)

	if (genderHint && input.preset.gender === genderHint) {
		score += 3
	}

	if (ageHint && input.preset.ageRange === ageHint) {
		score += 2
	}

	if (styleHints.includes(input.preset.style)) {
		score += 2
	}

	const categoryStyleRank = categoryStyles.indexOf(input.preset.style)
	if (categoryStyleRank >= 0) {
		score += Math.max(1, 3 - categoryStyleRank)
	}

	if (input.preset.bodyType === 'REGULAR') {
		score += 0.5
	}

	return score
}

export class SelectPersonaUseCase {
	private readonly categoryMatcher = new PersonaCategoryMatcher()

	public constructor(private readonly presetRepository: ModelPersonaPresetRepository) {}

	public async execute(input: SelectPersonaInput): Promise<SelectPersonaOutput> {
		const categoryInput = {
			detectedCategory: input.detectedCategory,
			...(input.overriddenCategory ? { overriddenCategory: input.overriddenCategory } : {}),
		}
		const resolvedCategory = this.categoryMatcher.resolveCategory(categoryInput)
		const showModelSelector = this.categoryMatcher.shouldShowModelSelector(categoryInput)
		const presets = await this.presetRepository.listActive(
			input.limit === undefined ? {} : { limit: input.limit },
		)

		if (!showModelSelector) {
			return {
				showModelSelector,
				resolvedCategory,
				presets,
				recommendations: [],
			}
		}

		const targetAudienceText = normalizeText(input.targetAudience)
		const recommendations = presets
			.map((preset) => ({
				preset,
				score: scorePreset({
					preset,
					targetAudienceText,
					resolvedCategory,
				}),
			}))
			.sort((a, b) => {
				if (a.score === b.score) {
					return a.preset.name.localeCompare(b.preset.name)
				}
				return b.score - a.score
			})
			.slice(0, 3)
			.map((entry) => entry.preset)

		return {
			showModelSelector,
			resolvedCategory,
			presets,
			recommendations,
		}
	}
}
