import { eq, lt, and, isNotNull } from 'drizzle-orm'
import { db } from '../../infrastructure/persistence/db.js'
import {
	users,
} from '../../infrastructure/persistence/schema.js'
import { AppError, ErrorCode, ok, err, type Result } from '@1dragon/shared'
import { logger } from '../../infrastructure/logging/index.js'

/**
 * 계정 삭제 예약 결과 타입
 */
export interface ScheduleDeletionResult {
	message: string
	scheduledAt: string
}

/**
 * 영구 삭제된 계정 정보 타입
 */
export interface DeletedAccountInfo {
	userId: string
	deletedAt: string
}

/**
 * 30일 유예 기간 (밀리초)
 */
export const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 계정 삭제 예약 (소프트 삭제)
 * @param userId - 삭제할 사용자 ID
 * @returns 삭제 예약 결과
 */
export async function scheduleAccountDeletion(
	userId: string,
): Promise<Result<ScheduleDeletionResult, AppError>> {
	try {
		// 사용자 존재 여부 확인
		const existingUser = await db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (!existingUser) {
			return err(new AppError(ErrorCode.NOT_FOUND, 'User not found', 404))
		}

		// 이미 삭제 예약된 계정인지 확인
		if (existingUser.deletedAt) {
			return err(new AppError(ErrorCode.CONFLICT, 'Account already scheduled for deletion', 409))
		}

		// 삭제 예정 시간 계산 (30일 후)
		const scheduledAt = new Date(Date.now() + DELETION_GRACE_PERIOD_MS)

		// 소프트 삭제 설정
		await db
			.update(users)
			.set({
				deletedAt: scheduledAt,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))

		logger.info(
			{ userId, scheduledAt: scheduledAt.toISOString() },
			'Account scheduled for deletion',
		)

		return ok({
			message: 'Account scheduled for deletion',
			scheduledAt: scheduledAt.toISOString(),
		})
	} catch (error) {
		logger.error({ error, userId }, 'Failed to schedule account deletion')
		return err(new AppError(ErrorCode.INTERNAL, 'Failed to schedule account deletion', 500))
	}
}

/**
 * 삭제 예정 시간이 지난 계정들을 영구 삭제
 * @returns 삭제된 계정 목록
 */
export async function cleanupExpiredAccounts(): Promise<Result<DeletedAccountInfo[], AppError>> {
	try {
		const now = new Date()

		// 삭제 예정 시간이 지난 계정 조회
		const expiredUsers = await db.query.users.findMany({
			where: and(isNotNull(users.deletedAt), lt(users.deletedAt, now)),
		})

		if (expiredUsers.length === 0) {
			logger.info('No expired accounts to cleanup')
			return ok([])
		}

		const deletedAccounts: DeletedAccountInfo[] = []

		// 각 사용자별로 연쇄 삭제 수행
		for (const user of expiredUsers) {
			await deleteUserDataCompletely(user.id)
			deletedAccounts.push({
				userId: user.id,
				deletedAt: now.toISOString(),
			})
			logger.info({ userId: user.id }, 'Account permanently deleted')
		}

		logger.info({ count: deletedAccounts.length }, 'Expired accounts cleanup completed')
		return ok(deletedAccounts)
	} catch (error) {
		logger.error({ error }, 'Failed to cleanup expired accounts')
		return err(new AppError(ErrorCode.INTERNAL, 'Failed to cleanup expired accounts', 500))
	}
}

/**
 * 사용자 관련 데이터를 완전히 삭제 (연쇄 삭제)
 * @param userId - 삭제할 사용자 ID
 */
async function deleteUserDataCompletely(userId: string): Promise<void> {
	// Drizzle ORM의 onDelete: 'cascade' 설정으로 인해
	// 관련 테이블의 데이터가 자동으로 삭제됩니다:
	// - subscriptions (cascade)
	// - videoJobs (cascade) -> videoVariants (cascade), jobEvents (cascade)
	// - productAnalyses (cascade)
	// - modelPersonaSelections (cascade)

	// 사용자 계정 영구 삭제
	await db.delete(users).where(eq(users.id, userId))
}

/**
 * 삭제 예약 취소 (복구)
 * @param userId - 복구할 사용자 ID
 * @returns 복구 결과
 */
export async function cancelAccountDeletion(
	userId: string,
): Promise<Result<{ message: string }, AppError>> {
	try {
		const existingUser = await db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (!existingUser) {
			return err(new AppError(ErrorCode.NOT_FOUND, 'User not found', 404))
		}

		if (!existingUser.deletedAt) {
			return err(new AppError(ErrorCode.CONFLICT, 'Account is not scheduled for deletion', 409))
		}

		// 삭제 예약 취소
		await db
			.update(users)
			.set({
				deletedAt: null,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))

		logger.info({ userId }, 'Account deletion cancelled')

		return ok({ message: 'Account deletion cancelled successfully' })
	} catch (error) {
		logger.error({ error, userId }, 'Failed to cancel account deletion')
		return err(new AppError(ErrorCode.INTERNAL, 'Failed to cancel account deletion', 500))
	}
}
