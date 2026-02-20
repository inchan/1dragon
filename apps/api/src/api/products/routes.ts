import { randomUUID } from 'node:crypto'

import sharp from 'sharp'
import { Hono } from 'hono'
import {
	ErrorCode,
	Mood,
	ProductCategory,
	StylePreset,
	analyzeProductRequestSchema,
	type ProductAnalysisResponse,
} from '@snapvid/shared'
import { logger } from '@/infrastructure/logging/index.js'
import { config } from '@/shared/config.js'
import { safeErrorMessage } from '@/shared/error-utils.js'
import { AnalyzeImageUseCase } from '@/application/product/analyze-image.usecase.js'
import { ClaudeVisionAdapter } from '@/infrastructure/providers/vision/claude.adapter.js'
import { GeminiVisionAdapter } from '@/infrastructure/providers/vision/gemini.adapter.js'
import { GeminiImagenAdapter } from '@/infrastructure/providers/image-gen/gemini-imagen.adapter.js'
import { RealEsganUpscalerAdapter } from '@/infrastructure/providers/image-gen/real-esrgan.adapter.js'
import { RemoveBgAdapter } from '@/infrastructure/providers/remove-bg/remove-bg.adapter.js'
import { uploadImage } from '@/infrastructure/storage/s3-client.js'
import { requireAuth } from '@/infrastructure/auth/hono-handler.js'
import { ProductAnalysisRepositoryImpl } from '@/infrastructure/persistence/repositories/product-analysis.repository.js'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MIN_IMAGE_DIMENSION = 720
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function extensionFromMimeType(mimeType: string): string {
	switch (mimeType) {
		case 'image/jpeg':
			return '.jpg'
		case 'image/png':
			return '.png'
		case 'image/webp':
			return '.webp'
		default:
			return ''
	}
}

function mapFieldError(path: (string | number)[], message: string) {
	return {
		field: path.join('.'),
		message,
	}
}

function toPositiveInt(value: string | undefined, fallback: number, min: number): number {
	const parsed = Number.parseInt(value ?? '', 10)
	if (Number.isNaN(parsed) || parsed < min) {
		return fallback
	}

	return parsed
}

async function parseImageBuffer(file: File): Promise<{
	buffer: Buffer
	width: number
	height: number
}> {
	const originalBuffer = Buffer.from(await file.arrayBuffer())
	const metadata = await sharp(originalBuffer).rotate().metadata()

	if (!metadata.width || !metadata.height) {
		throw new Error('Unable to read image dimensions')
	}

	const normalizedBuffer = await sharp(originalBuffer).rotate().toBuffer()

	return {
		buffer: normalizedBuffer,
		width: metadata.width,
		height: metadata.height,
	}
}

function normalizeStyleValues(styles: ReadonlyArray<string>): StylePreset[] {
	const allowed = new Set(Object.values(StylePreset))

	const normalized = styles
		.map((style) => style.trim())
		.filter((style) => style.length > 0 && allowed.has(style as StylePreset))

	if (normalized.length === 0) {
		return ['SIMPLE']
	}

	return normalized.map((style) => style as StylePreset)
}

function toMoodValue(input: string | null): Mood {
	const moods = new Set(Object.values(Mood))
	return input !== null && moods.has(input as Mood) ? (input as Mood) : Mood.PROFESSIONAL
}

function getUpscaleMessage(resolution: { width: number; height: number }): string {
	return resolution.width < MIN_IMAGE_DIMENSION || resolution.height < MIN_IMAGE_DIMENSION
		? '더 좋은 사진으로 더 좋은 영상을 만들 수 있어요'
		: 'Image uploaded successfully and waiting for analysis'
}

function buildResponseFromRecord(record: {
	readonly id: string
	readonly category: ProductCategory | null
	readonly keywords: ReadonlyArray<string>
	readonly mood: string | null
	readonly colors: ReadonlyArray<string>
	readonly targetAudience: string | null
	readonly suggestedStyles: ReadonlyArray<string>
	readonly hasTransparentBg: boolean | null
	readonly resolution: { readonly width: number; readonly height: number } | null
	readonly imageUrl: string
	readonly enhancedImageUrl: string | null
	readonly backgroundRemovedImageUrl: string | null
	readonly isProductImage: boolean | null
	readonly confidenceScore: number | null
}): ProductAnalysisResponse {
	return {
		id: record.id,
		category: record.category ?? ProductCategory.OTHER,
		keywords: [...record.keywords],
		moods: record.mood ? [toMoodValue(record.mood)] : [],
		colors: [...record.colors],
		targetAudience: record.targetAudience ?? '',
		suggestedStyles: normalizeStyleValues(record.suggestedStyles),
		hasTransparentBg: record.hasTransparentBg ?? false,
		resolution: record.resolution ?? { width: 0, height: 0 },
		originalImageUrl: record.imageUrl,
		processedImageUrl: record.enhancedImageUrl ?? undefined,
		isProductImage: record.isProductImage ?? false,
		confidence: record.confidenceScore ?? 0,
	}
}

export function createProductsRouter(): Hono {
	const app = new Hono()
	const repository = new ProductAnalysisRepositoryImpl()
	const useCase = new AnalyzeImageUseCase(
		new ClaudeVisionAdapter(),
		new GeminiVisionAdapter(),
		new RemoveBgAdapter(),
		new RealEsganUpscalerAdapter(),
		new GeminiImagenAdapter(),
	)

	app.use('*', requireAuth)

	app.post('/analyze', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.UNAUTHORIZED,
						message: 'Authentication required',
					},
				},
				401,
			)
		}

		const formData = await c.req.formData().catch(() => null)
		if (!formData) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Invalid multipart payload',
					},
				},
				400,
			)
		}

		const parsedBody = analyzeProductRequestSchema.safeParse({
			productName:
				typeof formData.get('productName') === 'string' ? String(formData.get('productName')) : undefined,
			category: typeof formData.get('category') === 'string' ? String(formData.get('category')) : undefined,
		})

		if (!parsedBody.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: {
							fieldErrors: parsedBody.error.errors.map((error) =>
								mapFieldError(error.path, error.message),
							),
						},
					},
				},
				400,
			)
		}

		const uploadFile = formData.get('image')
		if (!(uploadFile instanceof File)) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'image field must be a valid image file',
					},
				},
				400,
			)
		}

		if (!ALLOWED_MIME_TYPES.has(uploadFile.type)) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: '지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP 형식을 사용해주세요',
					},
				},
				400,
			)
		}

		if (uploadFile.size > MAX_IMAGE_BYTES) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: '이미지가 너무 큽니다 (최대 20MB)',
						details: {
							suggestedAction: '클라이언트에서 이미지 압축을 적용해 20MB 이하로 다시 업로드해 주세요.',
						},
					},
				},
				413,
			)
		}

		try {
			const image = await parseImageBuffer(uploadFile)
			const resolution = { width: image.width, height: image.height }

			if (resolution.width < MIN_IMAGE_DIMENSION || resolution.height < MIN_IMAGE_DIMENSION) {
				logger.info(
					{
						userId: user.id,
						width: resolution.width,
						height: resolution.height,
					},
					'low-resolution image detected',
				)
			}

			const extension = extensionFromMimeType(uploadFile.type)
			const objectKey = `product-analyses/${user.id}/${Date.now()}-${randomUUID()}${extension}`
			const uploaded = await uploadImage(image.buffer, objectKey, uploadFile.type)

			const analysisResult = await useCase.execute({
				userId: user.id,
				imageUrl: uploaded.url,
				resolution,
				...(parsedBody.data.category ? { categoryHint: parsedBody.data.category } : {}),
				...(parsedBody.data.productName ? { productName: parsedBody.data.productName } : {}),
			})

			const created = await repository.create({
				userId: user.id,
				imageUrl: analysisResult.analysis.imageUrl,
				category: analysisResult.analysis.category,
				keywords: analysisResult.analysis.keywords.map((keyword) => keyword.value),
				mood: analysisResult.analysis.moods[0]?.value ?? null,
				colors: analysisResult.analysis.colors,
				targetAudience: analysisResult.analysis.targetAudience,
				suggestedStyles: analysisResult.analysis.suggestedStyles.map((style) => style.value),
				confidenceScore: analysisResult.analysis.confidenceScore,
				isProductImage: analysisResult.analysis.isProductImage,
				resolution,
				hasTransparentBg: analysisResult.hasTransparentBg,
				enhancedImageUrl: analysisResult.enhancedImageUrl,
				backgroundRemovedImageUrl: analysisResult.backgroundRemovedImageUrl,
			})

			const response = buildResponseFromRecord({
				id: created.id,
				category: created.category,
				keywords: created.keywords,
				mood: created.mood,
				colors: created.colors,
				targetAudience: created.targetAudience,
				suggestedStyles: created.suggestedStyles,
				hasTransparentBg: created.hasTransparentBg,
				resolution: created.resolution,
				imageUrl: created.imageUrl,
				enhancedImageUrl: created.enhancedImageUrl,
				backgroundRemovedImageUrl: created.backgroundRemovedImageUrl,
				isProductImage: created.isProductImage,
				confidenceScore: created.confidenceScore,
			})

			return c.json(
				{
					success: true,
					data: {
						...response,
						queue: {
							status: 'QUEUED',
							message: analysisResult.queueMessage,
							info: getUpscaleMessage(resolution),
						},
					},
				},
				200,
			)
		} catch (error) {
			logger.error({ userId: user.id, error }, 'Product analysis failed')
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL,
						message: safeErrorMessage(error, config.NODE_ENV),
					},
				},
				500,
			)
		}
	})

	app.get('/analyses', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.UNAUTHORIZED,
						message: 'Authentication required',
					},
				},
				401,
			)
		}

		const limit = toPositiveInt(c.req.query('limit'), 20, 1)
		const offset = toPositiveInt(c.req.query('offset'), 0, 0)

		const result = await repository.findByUserId(user.id, { limit, offset })

		return c.json({
			success: true,
			data: {
				total: result.total,
				limit,
				offset,
				items: result.items.map((item) =>
					buildResponseFromRecord({
						id: item.id,
						category: item.category,
						keywords: item.keywords,
						mood: item.mood,
						colors: item.colors,
						targetAudience: item.targetAudience,
						suggestedStyles: item.suggestedStyles,
						hasTransparentBg: item.hasTransparentBg,
						resolution: item.resolution,
						imageUrl: item.imageUrl,
						enhancedImageUrl: item.enhancedImageUrl,
						backgroundRemovedImageUrl: item.backgroundRemovedImageUrl,
						isProductImage: item.isProductImage,
						confidenceScore: item.confidenceScore,
					}),
				),
			},
		})
	})

	app.get('/analyses/:id', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.UNAUTHORIZED,
						message: 'Authentication required',
					},
				},
				401,
			)
		}

		const id = c.req.param('id')
		const record = await repository.findById(id, user.id)
		if (!record) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.NOT_FOUND,
						message: 'Product analysis not found',
					},
				},
				404,
			)
		}

		return c.json({
			success: true,
			data: buildResponseFromRecord({
				id: record.id,
				category: record.category,
				keywords: record.keywords,
				mood: record.mood,
				colors: record.colors,
				targetAudience: record.targetAudience,
				suggestedStyles: record.suggestedStyles,
				hasTransparentBg: record.hasTransparentBg,
				resolution: record.resolution,
				imageUrl: record.imageUrl,
				enhancedImageUrl: record.enhancedImageUrl,
				backgroundRemovedImageUrl: record.backgroundRemovedImageUrl,
				isProductImage: record.isProductImage,
				confidenceScore: record.confidenceScore,
			}),
		})
	})

	app.delete('/analyses/:id', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.UNAUTHORIZED,
						message: 'Authentication required',
					},
				},
				401,
			)
		}

		const id = c.req.param('id')
		const deleted = await repository.deleteById(id, user.id)
		if (!deleted) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.NOT_FOUND,
						message: 'Product analysis not found',
					},
				},
				404,
			)
		}

		return c.json({
			success: true,
			data: {
				deleted: true,
			},
		})
	})

	return app
}
