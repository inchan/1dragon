import { Hono } from 'hono'
import { ErrorCode } from '@1dragon/shared'
import { logger } from '@/infrastructure/logging/index.js'
import type { GenerateModelImageUseCase } from '@/application/model-persona/generate-model-image.usecase.js'
import {
	UNAUTHORIZED_RESPONSE,
	buildDefaultImagenPromptTemplate,
	mapFieldErrors,
	modelCompositeBodySchema,
	parseJsonBody,
} from './helpers.js'

export function createCompositeSubRouter(deps: {
	generateModelImageUseCase: GenerateModelImageUseCase
}): Hono {
	const app = new Hono()
	const { generateModelImageUseCase } = deps

	app.post('/model-composite', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/model-composite')
		const parsed = modelCompositeBodySchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		try {
			const result = await generateModelImageUseCase.execute({
				userId: user.id,
				productImageUrl: parsed.data.productImageUrl,
				...(parsed.data.productName ? { productName: parsed.data.productName } : {}),
				productCategory: parsed.data.productCategory,
				productKeywords: parsed.data.productKeywords,
				preset: {
					id: parsed.data.persona.id,
					name: parsed.data.persona.id,
					gender: parsed.data.persona.gender,
					ageRange: parsed.data.persona.ageRange,
					bodyType: parsed.data.persona.bodyType,
					style: parsed.data.persona.style,
					imagenPromptTemplate:
					parsed.data.persona.imagenPromptTemplate?.trim() ||
					buildDefaultImagenPromptTemplate(parsed.data.persona),
					previewImageUrl: null,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			})

			return c.json({
				success: true,
				data: {
					compositeImageUrl: result.generatedImageUrl,
					qualityScore: result.qualityScore,
					accepted: result.accepted,
					fallbackToProductOnly: result.fallbackToProductOnly,
					message: result.message,
				},
			})
		} catch (error) {
			logger.error({ userId: user.id, error }, 'model-composite generation failed')
			return c.json(
				{
					success: false,
					error: {
						code: 'PROVIDER_ERROR',
						message: '모델 합성 이미지 생성에 실패했습니다',
					},
				},
				503,
			)
		}
	})

	return app
}
