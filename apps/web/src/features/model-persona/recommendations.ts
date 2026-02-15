import { ProductCategory } from '@snapvid/shared'
import type {
	ModelPersonaAgeRange,
	ModelPersonaBodyType,
	ModelPersonaOption,
	ModelPersonaSelection,
	ModelPersonaStyle,
} from './types'

const ELIGIBLE_CATEGORIES: Set<ProductCategory> = new Set([
	ProductCategory.FASHION,
	ProductCategory.ACCESSORIES,
	ProductCategory.BEAUTY,
])

const AGE_LABELS: Record<ModelPersonaAgeRange, string> = {
	YOUNG_ADULT: '20대',
	ADULT: '30대',
	MIDDLE_AGED: '40대',
}

const BODY_TYPE_LABELS: Record<ModelPersonaBodyType, string> = {
	SLIM: '슬림',
	REGULAR: '레귤러',
}

const STYLE_LABELS: Record<ModelPersonaStyle, string> = {
	CASUAL: '캐주얼',
	FORMAL: '포멀',
	STREET: '스트리트',
	MINIMAL: '미니멀',
}

const GENDERS = ['FEMALE', 'MALE'] as const
const AGE_RANGES = ['YOUNG_ADULT', 'ADULT', 'MIDDLE_AGED'] as const
const BODY_TYPES = ['SLIM', 'REGULAR'] as const
const STYLES = ['CASUAL', 'FORMAL', 'STREET', 'MINIMAL'] as const

function createLabel(selection: ModelPersonaSelection): string {
	const genderLabel = selection.gender === 'FEMALE' ? '여성' : '남성'

	return `${genderLabel} ${AGE_LABELS[selection.ageRange]} ${BODY_TYPE_LABELS[selection.bodyType]} ${STYLE_LABELS[selection.style]}`
}

export function buildPersonaCatalog(): ModelPersonaOption[] {
	const options: ModelPersonaOption[] = []

	for (const gender of GENDERS) {
		for (const ageRange of AGE_RANGES) {
			for (const bodyType of BODY_TYPES) {
				for (const style of STYLES) {
					const selection: ModelPersonaSelection = {
						gender,
						ageRange,
						bodyType,
						style,
					}

					options.push({
						id: `${gender}-${ageRange}-${bodyType}-${style}`,
						...selection,
						label: createLabel(selection),
						categoryHint: [
							ProductCategory.FASHION,
							ProductCategory.BEAUTY,
							ProductCategory.ACCESSORIES,
						],
					})
				}
			}
		}
	}

	return options
}

export function isModelEligibleCategory(category: ProductCategory): boolean {
	return ELIGIBLE_CATEGORIES.has(category)
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

function detectAgeHint(text: string): ModelPersonaAgeRange | null {
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

function detectStyleHints(text: string): ModelPersonaStyle[] {
	const hints: ModelPersonaStyle[] = []
	if (/(캐주얼|casual|daily)/i.test(text)) {
		hints.push('CASUAL')
	}
	if (/(포멀|격식|formal|office|business)/i.test(text)) {
		hints.push('FORMAL')
	}
	if (/(스트리트|street|urban|hip)/i.test(text)) {
		hints.push('STREET')
	}
	if (/(미니멀|minimal|clean|simple)/i.test(text)) {
		hints.push('MINIMAL')
	}

	return hints
}

function getCategoryStylePreference(category: ProductCategory): ModelPersonaStyle[] {
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

function scorePersona(option: ModelPersonaOption, category: ProductCategory, targetAudience: string): number {
	const normalized = targetAudience.trim().toLowerCase()
	const genderHint = detectGenderHint(normalized)
	const ageHint = detectAgeHint(normalized)
	const styleHints = detectStyleHints(normalized)
	const categoryStyle = getCategoryStylePreference(category)
	let score = 0

	if (genderHint && option.gender === genderHint) {
		score += 3
	}

	if (ageHint && option.ageRange === ageHint) {
		score += 2
	}

	if (styleHints.includes(option.style)) {
		score += 2
	}

	const categoryRank = categoryStyle.indexOf(option.style)
	if (categoryRank >= 0) {
		score += Math.max(1, 3 - categoryRank)
	}

	if (option.bodyType === 'REGULAR') {
		score += 0.5
	}

	return score
}

export function recommendPersonaOptions(input: {
	readonly category: ProductCategory
	readonly targetAudience: string
	readonly catalog: ReadonlyArray<ModelPersonaOption>
}): ModelPersonaOption[] {
	return [...input.catalog]
		.sort((a, b) => {
			const scoreA = scorePersona(a, input.category, input.targetAudience)
			const scoreB = scorePersona(b, input.category, input.targetAudience)
			if (scoreA === scoreB) {
				return a.label.localeCompare(b.label)
			}
			return scoreB - scoreA
		})
		.slice(0, 3)
}

export function resolvePersonaSelection(
	catalog: ReadonlyArray<ModelPersonaOption>,
	selection: ModelPersonaSelection,
): ModelPersonaOption {
	const found = catalog.find((item) =>
		item.gender === selection.gender &&
		item.ageRange === selection.ageRange &&
		item.bodyType === selection.bodyType &&
		item.style === selection.style,
	)

	if (found) {
		return found
	}

	const fallback = catalog[0]
	if (!fallback) {
		throw new Error('Persona catalog is empty')
	}

	return fallback
}
