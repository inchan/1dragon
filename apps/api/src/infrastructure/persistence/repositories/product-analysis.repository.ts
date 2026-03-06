import { and, count, desc, eq } from 'drizzle-orm'
import { Mood, StylePreset } from '@1dragon/shared'
import type {
	ProductAnalysisCreateInput,
	ProductAnalysisRecord,
	ProductAnalysisRepository,
	ProductAnalysisListQuery,
} from '@/domain/product/ports.js'
import { db } from '../db.js'
import { productAnalyses } from '../schema.js'

type ProductAnalysisRow = typeof productAnalyses.$inferSelect

type ResolutionShape = {
	readonly width: number
	readonly height: number
}

function parseJsonStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string')
	}

	return []
}

function parseNullableString(value: string | null | undefined): string | null {
	if (typeof value !== 'string') {
		return null
	}

	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

const VALID_MOODS = new Set<string>(Object.values(Mood))
const VALID_STYLES = new Set<string>(Object.values(StylePreset))

function parseMood(value: string | null | undefined): Mood | null {
	if (typeof value !== 'string') {
		return null
	}

	return VALID_MOODS.has(value) ? (value as Mood) : null
}

function parseStyleArray(value: unknown): readonly StylePreset[] {
	return parseJsonStringArray(value).filter((style): style is StylePreset => VALID_STYLES.has(style))
}

function parseBoolean(value: boolean | null | undefined): boolean | null {
	return typeof value === 'boolean' ? value : null
}

function parseResolution(value: unknown): ResolutionShape | null {
	if (!value || typeof value !== 'object') {
		return null
	}

	if (Array.isArray(value)) {
		return null
	}

	const parsed = value as Partial<ResolutionShape>
	const width = Number(parsed.width)
	const height = Number(parsed.height)

	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return null
	}

	return { width: Math.round(width), height: Math.round(height) }
}

function parseResolutionForCreate(value: { width: number; height: number }): ResolutionShape {
	return {
		width: Math.max(1, Math.round(value.width)),
		height: Math.max(1, Math.round(value.height)),
	}
}

function mapRecord(row: ProductAnalysisRow): ProductAnalysisRecord {
	return {
		id: row.id,
		userId: row.userId,
		imageUrl: row.imageUrl,
		category: row.category,
		keywords: parseJsonStringArray(row.keywords as unknown),
		mood: parseMood(row.mood as string | null | undefined),
		colors: parseJsonStringArray(row.colors as unknown),
		targetAudience: parseNullableString(row.targetAudience),
		suggestedStyles: parseStyleArray(row.suggestedStyles),
		confidenceScore: row.confidenceScore,
		isProductImage: row.isProductImage,
		createdAt: row.createdAt ?? new Date(0),
		updatedAt: row.updatedAt ?? new Date(0),
		resolution: parseResolution((row as { resolution?: unknown }).resolution),
		hasTransparentBg: parseBoolean((row as { hasTransparentBg?: unknown }).hasTransparentBg as boolean | null | undefined),
		enhancedImageUrl: parseNullableString((row as { enhancedImageUrl?: string | null }).enhancedImageUrl),
		backgroundRemovedImageUrl: parseNullableString(
			(row as { backgroundRemovedImageUrl?: string | null }).backgroundRemovedImageUrl,
		),
	}
}

function sanitizeInput(input: ProductAnalysisCreateInput): ProductAnalysisCreateInput {
	return {
		...input,
		keywords: input.keywords.map((keyword) => keyword.trim()).filter(Boolean),
		targetAudience: parseNullableString(input.targetAudience),
		colors: input.colors.map((color) => color.trim()).filter(Boolean),
		suggestedStyles: input.suggestedStyles.filter((style) => VALID_STYLES.has(style)),
		mood: parseMood(input.mood),
		confidenceScore:
			typeof input.confidenceScore === 'number'
				? Math.max(0, Math.min(1, input.confidenceScore))
				: null,
		resolution: parseResolutionForCreate(input.resolution),
	}
}

export class ProductAnalysisRepositoryImpl implements ProductAnalysisRepository {
	public async create(input: ProductAnalysisCreateInput): Promise<ProductAnalysisRecord> {
		const sanitized = sanitizeInput(input)
		const inserted = await db
			.insert(productAnalyses)
			.values({
				userId: sanitized.userId,
				imageUrl: sanitized.imageUrl,
				category: sanitized.category,
				keywords: sanitized.keywords,
				mood: sanitized.mood,
				colors: sanitized.colors,
				targetAudience: sanitized.targetAudience,
				suggestedStyles: sanitized.suggestedStyles,
				confidenceScore: sanitized.confidenceScore,
				isProductImage: sanitized.isProductImage,
				resolution: sanitized.resolution,
				hasTransparentBg: sanitized.hasTransparentBg,
				enhancedImageUrl: sanitized.enhancedImageUrl,
				backgroundRemovedImageUrl: sanitized.backgroundRemovedImageUrl,
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw new Error('Failed to create product analysis')
		}

		return mapRecord(row)
	}

	public async findById(id: string, userId: string): Promise<ProductAnalysisRecord | null> {
		const row = await db.query.productAnalyses.findFirst({
			where: and(eq(productAnalyses.id, id), eq(productAnalyses.userId, userId)),
		})

		if (!row) {
			return null
		}

		return mapRecord(row)
	}

	public async findByUserId(
		userId: string,
		query: ProductAnalysisListQuery,
	): Promise<{
		items: ProductAnalysisRecord[]
		total: number
	}> {
		const validatedLimit = Math.max(1, Math.min(100, query.limit))
		const validatedOffset = Math.max(0, query.offset)

		const rows = await db.query.productAnalyses.findMany({
			where: eq(productAnalyses.userId, userId),
			orderBy: [desc(productAnalyses.createdAt)],
			limit: validatedLimit,
			offset: validatedOffset,
		})

		const totalResult = await db
			.select({ total: count() })
			.from(productAnalyses)
			.where(eq(productAnalyses.userId, userId))

		const totalValue = totalResult[0]?.total ?? 0
		const total = typeof totalValue === 'number' ? totalValue : Number(totalValue)

		return {
			items: rows.map(mapRecord),
			total,
		}
	}

	public async deleteById(id: string, userId: string): Promise<boolean> {
		const deleted = await db.delete(productAnalyses).where(and(eq(productAnalyses.id, id), eq(productAnalyses.userId, userId)))
		return deleted.rowCount === 1
	}
}
