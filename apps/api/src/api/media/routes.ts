import { Hono } from 'hono'
import { requireAuth } from '@/infrastructure/auth/hono-handler.js'
import { redisConnection } from '@/infrastructure/queue/bullmq.config.js'
import { VideoJobRepositoryImpl, VideoVariantRepositoryImpl } from '@/infrastructure/persistence/repositories/video-job.repository.js'
import { RedisSocialTokenRepository } from '@/infrastructure/social/redis-social-token.repository.js'
import { MetaGraphAdapter, TikTokBusinessAdapter } from '@/infrastructure/providers/social/index.js'
import { config } from '@/shared/config.js'
import { GeminiModelCompositeAdapter } from '@/infrastructure/providers/image-gen/gemini-model-composite.adapter.js'
import { GenerateModelImageUseCase } from '@/application/model-persona/generate-model-image.usecase.js'
import { ModelPersonaSelectionRepositoryImpl } from '@/infrastructure/persistence/repositories/model-persona-selection.repository.js'
import { createJobSubRouter } from './job-routes.js'
import { createStreamSubRouter } from './stream-routes.js'
import { createSocialSubRouter } from './social-routes.js'
import { createCompositeSubRouter } from './composite-routes.js'

export function createMediaRouter(): Hono {
	const app = new Hono()

	// ── Dependencies ───────────────────────────────────────────────────────────
	const jobRepository = new VideoJobRepositoryImpl()
	const variantRepository = new VideoVariantRepositoryImpl()
	const tiktokAdapter = new TikTokBusinessAdapter({
		...(config.TIKTOK_CLIENT_KEY ? { clientKey: config.TIKTOK_CLIENT_KEY } : {}),
		...(config.TIKTOK_CLIENT_SECRET ? { clientSecret: config.TIKTOK_CLIENT_SECRET } : {}),
	})
	const metaAdapter = new MetaGraphAdapter({
		...(config.META_APP_ID ? { appId: config.META_APP_ID } : {}),
		...(config.META_APP_SECRET ? { appSecret: config.META_APP_SECRET } : {}),
	})
	const socialTokenRepository = new RedisSocialTokenRepository(redisConnection)

	// C-2: 어댑터와 유스케이스를 라우터 생성 시 한 번만 인스턴스화
	const imagenApiKey = config.GEMINI_IMAGEN_API_KEY ?? config.GEMINI_VEO_API_KEY
	const compositeAdapter = new GeminiModelCompositeAdapter({
		...(imagenApiKey ? { apiKey: imagenApiKey } : {}),
	})
	const selectionRepository = new ModelPersonaSelectionRepositoryImpl()
	const generateModelImageUseCase = new GenerateModelImageUseCase(compositeAdapter, selectionRepository)

	// ── Middleware ──────────────────────────────────────────────────────────────
	app.use('*', requireAuth)

	// ── Sub-routers ────────────────────────────────────────────────────────────
	app.route('/', createStreamSubRouter({ jobRepository }))
	app.route('/', createJobSubRouter({ jobRepository, variantRepository }))
	app.route('/', createSocialSubRouter({ tiktokAdapter, metaAdapter, socialTokenRepository }))
	app.route('/', createCompositeSubRouter({ generateModelImageUseCase }))

	return app
}
