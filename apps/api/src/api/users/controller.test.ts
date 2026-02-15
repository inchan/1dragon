import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
	scheduleAccountDeletion,
	cancelAccountDeletion,
	cleanupExpiredAccounts,
	DELETION_GRACE_PERIOD_MS,
} from './controller.js'
import { db } from '../../infrastructure/persistence/db.js'
import { isOk, isErr } from '@snapvid/shared'

// Mock the database
vi.mock('../../infrastructure/persistence/db.js', () => ({
	db: {
		query: {
			users: {
				findFirst: vi.fn(),
				findMany: vi.fn(),
			},
		},
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			}),
		}),
		delete: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(undefined),
		}),
	},
}))

// Mock logger
vi.mock('../../infrastructure/logging/index.js', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}))

describe('scheduleAccountDeletion', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should schedule account deletion for existing user', async () => {
		const userId = 'test-user-id'
		const mockUser = {
			id: userId,
			email: 'test@example.com',
			deletedAt: null,
		}

		vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as never)

		const result = await scheduleAccountDeletion(userId)

		expect(isOk(result)).toBe(true)
		if (isOk(result)) {
			expect(result.value.message).toBe('Account scheduled for deletion')
			expect(result.value.scheduledAt).toBeDefined()
		}
		expect(db.update).toHaveBeenCalled()
	})

	it('should return error for non-existent user', async () => {
		const userId = 'non-existent-id'

		vi.mocked(db.query.users.findFirst).mockResolvedValue(null as never)

		const result = await scheduleAccountDeletion(userId)

		expect(isErr(result)).toBe(true)
		if (isErr(result)) {
			expect(result.error.code).toBe('NOT_FOUND')
			expect(result.error.statusCode).toBe(404)
		}
	})

	it('should return error for already scheduled deletion', async () => {
		const userId = 'test-user-id'
		const mockUser = {
			id: userId,
			email: 'test@example.com',
			deletedAt: new Date(Date.now() + DELETION_GRACE_PERIOD_MS),
		}

		vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as never)

		const result = await scheduleAccountDeletion(userId)

		expect(isErr(result)).toBe(true)
		if (isErr(result)) {
			expect(result.error.code).toBe('CONFLICT')
			expect(result.error.statusCode).toBe(409)
		}
	})
})

describe('cancelAccountDeletion', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should cancel scheduled deletion', async () => {
		const userId = 'test-user-id'
		const mockUser = {
			id: userId,
			email: 'test@example.com',
			deletedAt: new Date(Date.now() + DELETION_GRACE_PERIOD_MS),
		}

		vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as never)

		const result = await cancelAccountDeletion(userId)

		expect(isOk(result)).toBe(true)
		if (isOk(result)) {
			expect(result.value.message).toBe('Account deletion cancelled successfully')
		}
		expect(db.update).toHaveBeenCalled()
	})

	it('should return error if account not scheduled for deletion', async () => {
		const userId = 'test-user-id'
		const mockUser = {
			id: userId,
			email: 'test@example.com',
			deletedAt: null,
		}

		vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as never)

		const result = await cancelAccountDeletion(userId)

		expect(isErr(result)).toBe(true)
		if (isErr(result)) {
			expect(result.error.code).toBe('CONFLICT')
			expect(result.error.statusCode).toBe(409)
		}
	})
})

describe('cleanupExpiredAccounts', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should delete expired accounts', async () => {
		const expiredUsers = [
			{ id: 'user-1', deletedAt: new Date(Date.now() - 1000) },
			{ id: 'user-2', deletedAt: new Date(Date.now() - 2000) },
		]

		vi.mocked(db.query.users.findMany).mockResolvedValue(expiredUsers as never)

		const result = await cleanupExpiredAccounts()

		expect(isOk(result)).toBe(true)
		if (isOk(result)) {
			expect(result.value).toHaveLength(2)
			const firstUser = result.value[0]
			const secondUser = result.value[1]
			expect(firstUser).toBeDefined()
			expect(secondUser).toBeDefined()
			if (firstUser) {
				expect(firstUser.userId).toBe('user-1')
			}
			if (secondUser) {
				expect(secondUser.userId).toBe('user-2')
			}
		}
		expect(db.delete).toHaveBeenCalledTimes(2)
	})

	it('should return empty array when no expired accounts', async () => {
		vi.mocked(db.query.users.findMany).mockResolvedValue([] as never)

		const result = await cleanupExpiredAccounts()

		expect(isOk(result)).toBe(true)
		if (isOk(result)) {
			expect(result.value).toHaveLength(0)
		}
	})
})
