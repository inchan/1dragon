import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../infrastructure/auth/hono-handler.js'
import { scheduleAccountDeletion, cancelAccountDeletion } from './controller.js'
import { isOk, isErr, ErrorCode } from '@snapvid/shared'
import { logger } from '../../infrastructure/logging/index.js'
import { db } from '../../infrastructure/persistence/db.js'
import { users } from '../../infrastructure/persistence/schema.js'
import { updateProfileRequestSchema, onboardingRequestSchema } from '@snapvid/shared'

/**
 * Users API 라우터
 * Base path: /api/v1/users
 */
export function createUsersRouter(): Hono {
	const router = new Hono()

	// 인증 미들웨어 적용
	router.use('*', requireAuth)

	/**
	 * GET /api/v1/users/me
	 * 현재 사용자 프로필 조회
	 */
	router.get('/me', async (c) => {
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

		try {
			// Drizzle ORM으로 사용자 조회
			const userRecord = await db.query.users.findFirst({
				where: eq(users.id, user.id),
			})

			if (!userRecord) {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.NOT_FOUND,
							message: 'User not found',
						},
					},
					404,
				)
			}

			return c.json({
				success: true,
				data: {
					id: userRecord.id,
					email: userRecord.email,
					name: userRecord.name,
					avatarUrl: userRecord.avatarUrl,
					isOnboardingCompleted: userRecord.isOnboardingCompleted,
					createdAt: userRecord.createdAt.toISOString(),
					updatedAt: userRecord.updatedAt.toISOString(),
				},
			})
		} catch (error) {
			logger.error({ error, userId: user.id }, 'Failed to get user profile')
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL,
						message: 'Failed to retrieve user profile',
					},
				},
				500,
			)
		}
	})

	/**
	 * PATCH /api/v1/users/me
	 * 프로필 수정 (name, avatarUrl)
	 */
	router.patch('/me', async (c) => {
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

		const body = await c.req.json().catch(() => null)

		if (!body) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Invalid request body',
					},
				},
				400,
			)
		}

		// Zod 스키마로 요청 검증
		const parseResult = updateProfileRequestSchema.safeParse(body)

		if (!parseResult.success) {
			const fieldErrors = parseResult.error.errors.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
			}))

			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors },
					},
				},
				400,
			)
		}

		const { name, avatarUrl } = parseResult.data

		try {
			// 사용자 존재 여부 확인
			const existingUser = await db.query.users.findFirst({
				where: eq(users.id, user.id),
			})

			if (!existingUser) {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.NOT_FOUND,
							message: 'User not found',
						},
					},
					404,
				)
			}

			// 프로필 업데이트
			const updateData: { name?: string; avatarUrl?: string; updatedAt: Date } = {
				updatedAt: new Date(),
			}

			if (name !== undefined) {
				updateData.name = name
			}

			if (avatarUrl !== undefined) {
				updateData.avatarUrl = avatarUrl
			}

			const updateResult = await db
				.update(users)
				.set(updateData)
				.where(eq(users.id, user.id))
				.returning()

			const updatedUser = updateResult[0]

			if (!updatedUser) {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.INTERNAL,
							message: 'Failed to update user profile',
						},
					},
					500,
				)
			}

			return c.json({
				success: true,
				data: {
					id: updatedUser.id,
					email: updatedUser.email,
					name: updatedUser.name,
					avatarUrl: updatedUser.avatarUrl,
					isOnboardingCompleted: updatedUser.isOnboardingCompleted,
					createdAt: updatedUser.createdAt.toISOString(),
					updatedAt: updatedUser.updatedAt.toISOString(),
				},
			})
		} catch (error) {
			logger.error({ error, userId: user.id }, 'Failed to update user profile')
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL,
						message: 'Failed to update user profile',
					},
				},
				500,
			)
		}
	})

	/**
	 * POST /api/v1/users/me/onboarding
	 * 온볼딩 설문 제출
	 */
	router.post('/me/onboarding', async (c) => {
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

		const body = await c.req.json().catch(() => null)

		if (!body) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Invalid request body',
					},
				},
				400,
			)
		}

		// Zod 스키마로 요청 검증
		const parseResult = onboardingRequestSchema.safeParse(body)

		if (!parseResult.success) {
			const fieldErrors = parseResult.error.errors.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
			}))

			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors },
					},
				},
				400,
			)
		}

		const { businessName, sellingPlatform, productCategory } = parseResult.data

		try {
			// 사용자 존재 여부 및 온볼딩 상태 확인
			const existingUser = await db.query.users.findFirst({
				where: eq(users.id, user.id),
			})

			if (!existingUser) {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.NOT_FOUND,
							message: 'User not found',
						},
					},
					404,
				)
			}

			// 이미 온볼딩을 완료한 경우 409 Conflict 반환
			if (existingUser.isOnboardingCompleted) {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.CONFLICT,
							message: 'Onboarding already completed',
						},
					},
					409,
				)
			}

			// 온볼딩 데이터 저장
			const onboardingData = {
				businessName,
				sellingPlatform,
				productCategory,
				completedAt: new Date().toISOString(),
			}

			const updateResult = await db
				.update(users)
				.set({
					onboardingData,
					isOnboardingCompleted: true,
					updatedAt: new Date(),
				})
				.where(eq(users.id, user.id))
				.returning()

			const updatedUser = updateResult[0]

			if (!updatedUser) {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.INTERNAL,
							message: 'Failed to complete onboarding',
						},
					},
					500,
				)
			}

			return c.json({
				success: true,
				data: {
					isOnboardingCompleted: updatedUser.isOnboardingCompleted,
					onboardingData: updatedUser.onboardingData as {
						businessName: string
						sellingPlatform: string
						productCategory: string
						completedAt: string
					},
				},
			})
		} catch (error) {
			logger.error({ error, userId: user.id }, 'Failed to complete onboarding')
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL,
						message: 'Failed to complete onboarding',
					},
				},
				500,
			)
		}
	})

	/**
	 * DELETE /api/v1/users/me
	 * 계정 삭제 예약 (소프트 삭제)
	 * 30일 유예 기간 후 영구 삭제됨
	 */
	router.delete('/me', async (c) => {
		const user = c.get('user')

		if (!user) {
			return c.json(
				{
					success: false,
					error: {
						code: 'UNAUTHORIZED',
						message: 'Authentication required',
					},
				},
				401,
			)
		}

		const result = await scheduleAccountDeletion(user.id)

		if (isErr(result)) {
			const error = result.error
			logger.error({ error: error.message, userId: user.id }, 'Account deletion request failed')
			return c.json(
				{
					success: false,
					error: {
						code: error.code,
						message: error.message,
					},
				},
				error.statusCode as 400 | 401 | 403 | 404 | 409 | 500,
			)
		}

		if (!isOk(result)) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL,
						message: 'Failed to schedule account deletion',
					},
				},
				500,
			)
		}

		const data = result.value
		return c.json(
			{
				success: true,
				data,
			},
			200,
		)
	})

	/**
	 * POST /api/v1/users/me/restore
	 * 계정 삭제 예약 취소 (복구)
	 */
	router.post('/me/restore', async (c) => {
		const user = c.get('user')

		if (!user) {
			return c.json(
				{
					success: false,
					error: {
						code: 'UNAUTHORIZED',
						message: 'Authentication required',
					},
				},
				401,
			)
		}

		const result = await cancelAccountDeletion(user.id)

		if (isErr(result)) {
			const error = result.error
			logger.error({ error: error.message, userId: user.id }, 'Account restoration request failed')
			return c.json(
				{
					success: false,
					error: {
						code: error.code,
						message: error.message,
					},
				},
				error.statusCode as 400 | 401 | 403 | 404 | 409 | 500,
			)
		}

		if (!isOk(result)) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL,
						message: 'Failed to cancel account deletion',
					},
				},
				500,
			)
		}

		const data = result.value
		return c.json(
			{
				success: true,
				data,
			},
			200,
		)
	})

	return router
}
