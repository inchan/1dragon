import { Hono } from 'hono'
import { ErrorCode } from '@1dragon/shared'
import { logger } from '@/infrastructure/logging/index.js'
import { redisConnection } from '@/infrastructure/queue/bullmq.config.js'
import { config } from '@/shared/config.js'
import type { RedisSocialTokenRepository } from '@/infrastructure/social/redis-social-token.repository.js'
import type { MetaGraphAdapter, TikTokBusinessAdapter } from '@/infrastructure/providers/social/index.js'
import { generateOAuthState, saveOAuthState, verifyOAuthState } from './oauth-state.js'
import {
	UNAUTHORIZED_RESPONSE,
	connectPayloadSchema,
	mapFieldErrors,
	parseJsonBody,
	sharePayloadSchema,
	shareWithRetry,
} from './helpers.js'

const DEFAULT_WEB_URL = 'http://localhost:5173'

function oauthRedirectUri(platform: string): string {
	const baseUrl = config.WEB_URL ?? DEFAULT_WEB_URL
	return `${baseUrl}/oauth/${platform}/callback`
}

export function createSocialSubRouter(deps: {
	tiktokAdapter: TikTokBusinessAdapter
	metaAdapter: MetaGraphAdapter
	socialTokenRepository: RedisSocialTokenRepository
}): Hono {
	const app = new Hono()
	const { tiktokAdapter, metaAdapter, socialTokenRepository } = deps

	app.get('/shares/tiktok/connect-url', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const { state } = generateOAuthState(user.id)
		await saveOAuthState(redisConnection, state)
		return c.json({
			success: true,
			data: {
				url: tiktokAdapter.getAuthorizationUrl({
					redirectUri: oauthRedirectUri('tiktok'),
					state,
				}),
			},
		})
	})

	app.get('/shares/instagram/connect-url', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const { state } = generateOAuthState(user.id)
		await saveOAuthState(redisConnection, state)
		return c.json({
			success: true,
			data: {
				url: metaAdapter.getAuthorizationUrl({
					redirectUri: oauthRedirectUri('instagram'),
					state,
				}),
			},
		})
	})

	app.post('/shares/tiktok/connect', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/tiktok/connect')
		const parsed = connectPayloadSchema.safeParse(body)
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

		const tiktokStateResult = await verifyOAuthState(redisConnection, parsed.data.state, user.id)
		if (!tiktokStateResult.valid) {
			logger.warn({ reason: tiktokStateResult.reason, userId: user.id }, 'TikTok OAuth state verification failed')
			return c.json(
				{
					success: false,
					error: { code: 'INVALID_STATE', message: 'Invalid or expired OAuth state' },
				},
				400,
			)
		}

		const token = await tiktokAdapter.exchangeCodeForToken(parsed.data.code)
		await socialTokenRepository.set('tiktok', user.id, token.accessToken)

		return c.json({
			success: true,
			data: {
				platform: 'TIKTOK',
				connected: true,
				expiresInSec: token.expiresInSec,
			},
		})
	})

	app.post('/shares/instagram/connect', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/instagram/connect')
		const parsed = connectPayloadSchema.safeParse(body)
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

		const instagramStateResult = await verifyOAuthState(redisConnection, parsed.data.state, user.id)
		if (!instagramStateResult.valid) {
			logger.warn({ reason: instagramStateResult.reason, userId: user.id }, 'Instagram OAuth state verification failed')
			return c.json(
				{
					success: false,
					error: { code: 'INVALID_STATE', message: 'Invalid or expired OAuth state' },
				},
				400,
			)
		}

		const token = await metaAdapter.exchangeCodeForToken(parsed.data.code)
		await socialTokenRepository.set('instagram', user.id, token.accessToken)

		return c.json({
			success: true,
			data: {
				platform: 'INSTAGRAM',
				connected: true,
				expiresInSec: token.expiresInSec,
			},
		})
	})

	app.post('/shares/tiktok', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/tiktok')
		const parsed = sharePayloadSchema.safeParse(body)
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

		const token = await socialTokenRepository.get('tiktok', user.id)
		if (!token) {
			return c.json(
				{
					success: false,
					error: {
						code: 'ACCOUNT_NOT_CONNECTED',
						message: 'TikTok account is not connected',
					},
				},
				400,
			)
		}

		const shared = await shareWithRetry(
			() =>
				tiktokAdapter.uploadVideo({
					accessToken: token,
					videoUrl: parsed.data.variantUrl,
					caption: parsed.data.caption,
					hashtags: parsed.data.hashtags,
				}),
			{ platform: 'TIKTOK', userId: user.id },
		)

		if (!shared.success) {
			return c.json({
				success: false,
				error: {
					code: 'SOCIAL_UPLOAD_FAILED',
					message: '업로드에 실패했습니다. 다운로드 후 직접 업로드해주세요',
				},
				data: {
					platform: 'TIKTOK',
					fallbackDownloadUrl: parsed.data.variantUrl,
				},
			})
		}

		return c.json({
			success: true,
			data: {
				platform: 'TIKTOK',
				attempts: shared.attempts,
				remoteId: shared.output.remoteId,
				shareUrl: shared.output.shareUrl,
			},
		})
	})

	app.post('/shares/instagram', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/instagram')
		const parsed = sharePayloadSchema.safeParse(body)
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

		const token = await socialTokenRepository.get('instagram', user.id)
		if (!token) {
			return c.json(
				{
					success: false,
					error: {
						code: 'ACCOUNT_NOT_CONNECTED',
						message: 'Instagram account is not connected',
					},
				},
				400,
			)
		}

		const shared = await shareWithRetry(
			() =>
				metaAdapter.uploadVideo({
					accessToken: token,
					videoUrl: parsed.data.variantUrl,
					caption: parsed.data.caption,
					hashtags: parsed.data.hashtags,
				}),
			{ platform: 'INSTAGRAM', userId: user.id },
		)

		if (!shared.success) {
			return c.json({
				success: false,
				error: {
					code: 'SOCIAL_UPLOAD_FAILED',
					message: '업로드에 실패했습니다. 다운로드 후 직접 업로드해주세요',
				},
				data: {
					platform: 'INSTAGRAM',
					fallbackDownloadUrl: parsed.data.variantUrl,
				},
			})
		}

		return c.json({
			success: true,
			data: {
				platform: 'INSTAGRAM',
				attempts: shared.attempts,
				remoteId: shared.output.remoteId,
				shareUrl: shared.output.shareUrl,
			},
		})
	})

	return app
}
