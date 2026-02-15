import { and, count, desc, eq } from 'drizzle-orm'
import {
	AgeRange,
	Gender,
	type AgeRange as AgeRangeType,
	type Gender as GenderType,
} from '@snapvid/shared'
import type {
	BodyType,
	ModelPersonaPresetRepository,
	ModelPersonaSelectionRepository,
	PersonaPresetListQuery,
	PersonaPresetRecord,
	PersonaSelectionCreateInput,
	PersonaSelectionRecord,
	PersonaStyle,
} from '@/domain/model-persona/ports.js'
import { db } from '../db.js'
import { modelPersonaPresets, modelPersonaSelections } from '../schema.js'

const VALID_GENDERS = new Set<string>(Object.values(Gender))
const VALID_AGE_RANGES = new Set<string>(Object.values(AgeRange))
const VALID_BODY_TYPES = new Set<string>(['SLIM', 'REGULAR'])
const VALID_STYLES = new Set<string>(['CASUAL', 'FORMAL', 'STREET', 'MINIMAL'])

function parseGender(value: string): GenderType {
	if (VALID_GENDERS.has(value)) {
		return value as GenderType
	}

	return Gender.FEMALE
}

function parseAgeRange(value: string): AgeRangeType {
	if (VALID_AGE_RANGES.has(value)) {
		return value as AgeRangeType
	}

	return AgeRange.YOUNG_ADULT
}

function parseBodyType(value: string | null): BodyType {
	if (value && VALID_BODY_TYPES.has(value)) {
		return value as BodyType
	}

	return 'REGULAR'
}

function parseStyle(value: string): PersonaStyle {
	if (VALID_STYLES.has(value)) {
		return value as PersonaStyle
	}

	return 'CASUAL'
}

function parseQualityScore(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return null
	}

	return Math.max(0, Math.min(1, value))
}

function mapPresetRecord(row: typeof modelPersonaPresets.$inferSelect): PersonaPresetRecord {
	return {
		id: row.id,
		name: row.name,
		gender: parseGender(row.gender),
		ageRange: parseAgeRange(row.ageRange),
		bodyType: parseBodyType(row.bodyType),
		style: parseStyle(row.style),
		imagenPromptTemplate: row.imagenPromptTemplate,
		previewImageUrl: row.previewImageUrl,
		isActive: row.isActive ?? true,
		createdAt: row.createdAt ?? new Date(0),
		updatedAt: row.updatedAt ?? new Date(0),
	}
}

function mapSelectionRecord(row: typeof modelPersonaSelections.$inferSelect): PersonaSelectionRecord {
	return {
		id: row.id,
		userId: row.userId,
		jobId: row.jobId,
		presetId: row.presetId,
		generatedImageUrl: row.generatedImageUrl,
		qualityScore: parseQualityScore((row as { qualityScore?: unknown }).qualityScore),
		createdAt: row.createdAt ?? new Date(0),
		updatedAt: row.updatedAt ?? new Date(0),
	}
}

export class ModelPersonaPresetRepositoryImpl implements ModelPersonaPresetRepository {
	public async listActive(query: PersonaPresetListQuery = {}): Promise<PersonaPresetRecord[]> {
		const rows = await db.query.modelPersonaPresets.findMany({
			where: eq(modelPersonaPresets.isActive, true),
			orderBy: [
				modelPersonaPresets.gender,
				modelPersonaPresets.ageRange,
				modelPersonaPresets.style,
			],
			limit: query.limit,
		})

		return rows
			.map(mapPresetRecord)
			.filter((preset) => (query.gender ? preset.gender === query.gender : true))
			.filter((preset) => (query.ageRange ? preset.ageRange === query.ageRange : true))
			.filter((preset) => (query.bodyType ? preset.bodyType === query.bodyType : true))
			.filter((preset) => (query.style ? preset.style === query.style : true))
	}

	public async findById(id: string): Promise<PersonaPresetRecord | null> {
		const row = await db.query.modelPersonaPresets.findFirst({
			where: and(eq(modelPersonaPresets.id, id), eq(modelPersonaPresets.isActive, true)),
		})

		if (!row) {
			return null
		}

		return mapPresetRecord(row)
	}
}

export class ModelPersonaSelectionRepositoryImpl implements ModelPersonaSelectionRepository {
	public async create(input: PersonaSelectionCreateInput): Promise<PersonaSelectionRecord> {
		const inserted = await db
			.insert(modelPersonaSelections)
			.values({
				userId: input.userId,
				jobId: input.jobId ?? null,
				presetId: input.presetId,
				generatedImageUrl: input.generatedImageUrl ?? null,
				qualityScore: parseQualityScore(input.qualityScore) ?? null,
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw new Error('Failed to create model persona selection')
		}

		return mapSelectionRecord(row)
	}

	public async findByJobId(jobId: string): Promise<PersonaSelectionRecord | null> {
		const row = await db.query.modelPersonaSelections.findFirst({
			where: eq(modelPersonaSelections.jobId, jobId),
			orderBy: [desc(modelPersonaSelections.createdAt)],
		})

		if (!row) {
			return null
		}

		return mapSelectionRecord(row)
	}

	public async findByUserId(
		userId: string,
		limit: number,
		offset: number,
	): Promise<{ items: PersonaSelectionRecord[]; total: number }> {
		const validatedLimit = Math.max(1, Math.min(100, limit))
		const validatedOffset = Math.max(0, offset)

		const rows = await db.query.modelPersonaSelections.findMany({
			where: eq(modelPersonaSelections.userId, userId),
			orderBy: [desc(modelPersonaSelections.createdAt)],
			limit: validatedLimit,
			offset: validatedOffset,
		})

		const totalResult = await db
			.select({ total: count() })
			.from(modelPersonaSelections)
			.where(eq(modelPersonaSelections.userId, userId))

		const totalValue = totalResult[0]?.total ?? 0
		const total = typeof totalValue === 'number' ? totalValue : Number(totalValue)

		return {
			items: rows.map(mapSelectionRecord),
			total,
		}
	}
}
