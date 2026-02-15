import { and, eq } from 'drizzle-orm'
import { closeConnection, db } from '../db.js'
import { modelPersonaPresets } from '../schema.js'
import { logger } from '../../logging/index.js'

const GENDERS = ['FEMALE', 'MALE'] as const
const AGE_RANGES = ['YOUNG_ADULT', 'ADULT', 'MIDDLE_AGED'] as const
const BODY_TYPES = ['SLIM', 'REGULAR'] as const
const STYLES = ['CASUAL', 'FORMAL', 'STREET', 'MINIMAL'] as const

const LABELS = {
	FEMALE: '여성',
	MALE: '남성',
	YOUNG_ADULT: '20대',
	ADULT: '30대',
	MIDDLE_AGED: '40대',
	SLIM: '슬림',
	REGULAR: '레귤러',
	CASUAL: '캐주얼',
	FORMAL: '포멀',
	STREET: '스트리트',
	MINIMAL: '미니멀',
} as const

type PersonaSeed = {
	name: string
	gender: 'FEMALE' | 'MALE'
	ageRange: 'YOUNG_ADULT' | 'ADULT' | 'MIDDLE_AGED'
	bodyType: 'SLIM' | 'REGULAR'
	style: 'CASUAL' | 'FORMAL' | 'STREET' | 'MINIMAL'
	imagenPromptTemplate: string
	previewImageUrl: string
}

function buildPromptTemplate(seed: Pick<PersonaSeed, 'gender' | 'ageRange' | 'bodyType' | 'style'>): string {
	return [
		`Create a photorealistic ${seed.gender.toLowerCase()} ${seed.ageRange.toLowerCase()} model`,
		`with ${seed.bodyType.toLowerCase()} body type and ${seed.style.toLowerCase()} styling`,
		'wearing or using {{product_name}} from {{product_category}} category.',
		'Preserve product details and textures. Product keywords: {{product_keywords}}.',
		'Studio lighting, clean background, marketing look, no visual artifacts.',
	].join(' ')
}

function buildSeeds(): PersonaSeed[] {
	const seeds: PersonaSeed[] = []

	for (const gender of GENDERS) {
		for (const ageRange of AGE_RANGES) {
			for (const bodyType of BODY_TYPES) {
				for (const style of STYLES) {
					seeds.push({
						name: `${LABELS[gender]} ${LABELS[ageRange]} ${LABELS[bodyType]} ${LABELS[style]}`,
						gender,
						ageRange,
						bodyType,
						style,
						imagenPromptTemplate: buildPromptTemplate({ gender, ageRange, bodyType, style }),
						previewImageUrl: `https://cdn.snapvid.ai/persona-presets/${gender.toLowerCase()}-${ageRange.toLowerCase()}-${bodyType.toLowerCase()}-${style.toLowerCase()}.jpg`,
					})
				}
			}
		}
	}

	return seeds
}

const PERSONA_PRESET_SEEDS = buildSeeds()

export async function seedModelPersonaPresets(): Promise<void> {
	for (const seed of PERSONA_PRESET_SEEDS) {
		const existing = await db.query.modelPersonaPresets.findFirst({
			where: and(
				eq(modelPersonaPresets.gender, seed.gender),
				eq(modelPersonaPresets.ageRange, seed.ageRange),
				eq(modelPersonaPresets.style, seed.style),
				eq(modelPersonaPresets.bodyType, seed.bodyType),
			),
		})

		if (existing) {
			await db
				.update(modelPersonaPresets)
				.set({
					name: seed.name,
					imagenPromptTemplate: seed.imagenPromptTemplate,
					previewImageUrl: seed.previewImageUrl,
					isActive: true,
					updatedAt: new Date(),
				})
				.where(eq(modelPersonaPresets.id, existing.id))

			logger.info(
				{
					action: 'updated',
					entity: 'model_persona_preset',
					seed_name: seed.name,
				},
				'updated model persona preset',
			)
			continue
		}

		await db.insert(modelPersonaPresets).values({
			name: seed.name,
			gender: seed.gender,
			ageRange: seed.ageRange,
			bodyType: seed.bodyType,
			style: seed.style,
			imagenPromptTemplate: seed.imagenPromptTemplate,
			previewImageUrl: seed.previewImageUrl,
			isActive: true,
		})

		logger.info(
			{
				action: 'inserted',
				entity: 'model_persona_preset',
				seed_name: seed.name,
			},
			'inserted model persona preset',
		)
	}
}

async function main(): Promise<void> {
	try {
		await seedModelPersonaPresets()
		logger.info(
			{
				entity: 'model_persona_preset',
				total_records: PERSONA_PRESET_SEEDS.length,
			},
			'model persona preset seed complete',
		)
	} finally {
		await closeConnection()
	}
}

const entrypoint = process.argv[1] ?? ''
if (import.meta.url === `file://${entrypoint}`) {
	void main()
}
