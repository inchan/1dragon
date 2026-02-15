import { Worker, Queue, type Job, type QueueOptions } from 'bullmq'
import { redisConnection } from '../queue/bullmq.config.js'
import { cleanupExpiredAccounts } from '../../api/users/controller.js'
import { isOk, isErr } from '@snapvid/shared'
import { logger } from '../logging/index.js'

/**
 * 계정 정리 스케줄러 큐 이름
 */
export const ACCOUNT_CLEANUP_QUEUE_NAME = 'scheduler:account-cleanup'

/**
 * 계정 정리 작업 데이터 타입
 */
export interface AccountCleanupJobData {
	type: 'cleanup-expired-accounts'
	executedAt: string
}

/**
 * 계정 정리 작업 결과 타입
 */
export interface AccountCleanupJobResult {
	deletedCount: number
	deletedAccounts: Array<{
		userId: string
		deletedAt: string
	}>
}

/**
 * 기본 큐 옵션
 */
const queueOptions: QueueOptions = {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
		removeOnComplete: {
			age: 7 * 24 * 3600, // 7일
			count: 100,
		},
		removeOnFail: {
			age: 30 * 24 * 3600, // 30일
			count: 500,
		},
	},
}

/**
 * 계정 정리 큐 인스턴스
 */
export const accountCleanupQueue = new Queue(ACCOUNT_CLEANUP_QUEUE_NAME, queueOptions)

/**
 * 계정 정리 워커 인스턴스
 */
export const accountCleanupWorker = new Worker<AccountCleanupJobData, AccountCleanupJobResult>(
	ACCOUNT_CLEANUP_QUEUE_NAME,
	async (job: Job<AccountCleanupJobData>): Promise<AccountCleanupJobResult> => {
		logger.info({ jobId: job.id, type: job.data.type }, 'Starting account cleanup job')

		const result = await cleanupExpiredAccounts()

		if (isErr(result)) {
			const error = result.error
			logger.error({ error: error.message, jobId: job.id }, 'Account cleanup job failed')
			throw new Error(`Account cleanup failed: ${error.message}`)
		}

		// Type guard ensures result.ok is true here
		const deletedAccounts = isOk(result) ? result.value : []

		logger.info(
			{ jobId: job.id, deletedCount: deletedAccounts.length },
			'Account cleanup job completed successfully',
		)

		return {
			deletedCount: deletedAccounts.length,
			deletedAccounts,
		}
	},
	{
		connection: redisConnection,
		concurrency: 1,
	},
)

/**
 * 워커 이벤트 핸들러
 */
accountCleanupWorker.on('completed', (job) => {
	logger.info({ jobId: job?.id }, 'Account cleanup worker completed job')
})

accountCleanupWorker.on('failed', (job, err) => {
	logger.error({ jobId: job?.id, error: err.message }, 'Account cleanup worker failed job')
})

/**
 * 매일 자정에 실행되도록 작업 예약
 * @returns 예약된 작업
 */
export async function scheduleDailyCleanup(): Promise<Job<AccountCleanupJobData>> {
	// 기존 반복 작업 제거
	const existingJobs = await accountCleanupQueue.getRepeatableJobs()
	for (const job of existingJobs) {
		await accountCleanupQueue.removeRepeatableByKey(job.key)
	}

	// 매일 자정에 실행되는 작업 추가 (cron: 0 0 * * *)
	const job = await accountCleanupQueue.add(
		'cleanup-expired-accounts',
		{
			type: 'cleanup-expired-accounts',
			executedAt: new Date().toISOString(),
		},
		{
			repeat: {
				pattern: '0 0 * * *', // 매일 자정 (UTC)
			},
			jobId: 'daily-account-cleanup',
		},
	)

	logger.info('Daily account cleanup scheduled (every day at 00:00 UTC)')
	return job
}

/**
 * 즉시 계정 정리 작업 실행 (수동 트리거용)
 * @returns 작업 결과
 */
export async function triggerImmediateCleanup(): Promise<Job<AccountCleanupJobData>> {
	const job = await accountCleanupQueue.add(
		'cleanup-expired-accounts',
		{
			type: 'cleanup-expired-accounts',
			executedAt: new Date().toISOString(),
		},
		{
			jobId: `manual-cleanup-${Date.now()}`,
		},
	)

	logger.info({ jobId: job.id }, 'Manual account cleanup triggered')
	return job
}

/**
 * 스케줄러 초기화
 * 애플리케이션 시작 시 호출
 */
export async function initializeAccountCleanupScheduler(): Promise<void> {
	logger.info('Initializing account cleanup scheduler...')

	// 큐 정리 (오래된 작업 제거)
	await accountCleanupQueue.clean(24 * 3600 * 1000, 100, 'completed')
	await accountCleanupQueue.clean(7 * 24 * 3600 * 1000, 500, 'failed')

	// 매일 자정 스케줄 등록
	await scheduleDailyCleanup()

	logger.info('Account cleanup scheduler initialized')
}

/**
 * 스케줄러 종료 (graceful shutdown)
 */
export async function closeAccountCleanupScheduler(): Promise<void> {
	logger.info('Closing account cleanup scheduler...')

	await accountCleanupWorker.close()
	await accountCleanupQueue.close()

	logger.info('Account cleanup scheduler closed')
}
