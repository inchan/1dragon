import { describe, it, expect, beforeEach } from 'vitest'
import {
	getLogContext,
	setLogContext,
	updateLogContext,
	removeLogContextKeys,
	clearLogContext,
	withLogContext,
	withLogContextAsync,
} from './context-logger.js'

describe('context-logger', () => {
	beforeEach(() => {
		clearLogContext()
	})

	describe('getLogContext', () => {
		it('should return empty object when no context is set', () => {
			const context = getLogContext()
			expect(context).toEqual({})
		})

		it('should return current context', () => {
			setLogContext({ user_id: 'user-123', job_id: 'job-456' })
			const context = getLogContext()
			expect(context).toEqual({ user_id: 'user-123', job_id: 'job-456' })
		})
	})

	describe('setLogContext', () => {
		it('should set context', () => {
			setLogContext({ user_id: 'user-123' })
			expect(getLogContext()).toEqual({ user_id: 'user-123' })
		})

		it('should replace existing context', () => {
			setLogContext({ user_id: 'user-123' })
			setLogContext({ job_id: 'job-456' })
			expect(getLogContext()).toEqual({ job_id: 'job-456' })
		})
	})

	describe('updateLogContext', () => {
		it('should update existing context', () => {
			setLogContext({ user_id: 'user-123' })
			updateLogContext({ job_id: 'job-456' })
			expect(getLogContext()).toEqual({
				user_id: 'user-123',
				job_id: 'job-456',
			})
		})

		it('should override existing keys', () => {
			setLogContext({ user_id: 'user-123', job_id: 'job-456' })
			updateLogContext({ user_id: 'user-999' })
			expect(getLogContext()).toEqual({
				user_id: 'user-999',
				job_id: 'job-456',
			})
		})

		it('should return updated context', () => {
			const result = updateLogContext({ user_id: 'user-123' })
			expect(result).toEqual({ user_id: 'user-123' })
		})
	})

	describe('removeLogContextKeys', () => {
		it('should remove specified keys', () => {
			setLogContext({
				user_id: 'user-123',
				job_id: 'job-456',
				provider: 'test',
			})
			removeLogContextKeys(['job_id', 'provider'])
			expect(getLogContext()).toEqual({ user_id: 'user-123' })
		})

		it('should return updated context', () => {
			setLogContext({ user_id: 'user-123', job_id: 'job-456' })
			const result = removeLogContextKeys(['job_id'])
			expect(result).toEqual({ user_id: 'user-123' })
		})
	})

	describe('clearLogContext', () => {
		it('should clear all context', () => {
			setLogContext({ user_id: 'user-123', job_id: 'job-456' })
			clearLogContext()
			expect(getLogContext()).toEqual({})
		})
	})

	describe('withLogContext', () => {
		it('should set context during function execution', () => {
			setLogContext({ user_id: 'user-123' })

			withLogContext({ job_id: 'job-456' }, () => {
				expect(getLogContext()).toEqual({
					user_id: 'user-123',
					job_id: 'job-456',
				})
			})

			// Context should be restored after function
			expect(getLogContext()).toEqual({ user_id: 'user-123' })
		})

		it('should restore context even if function throws', () => {
			setLogContext({ user_id: 'user-123' })

			expect(() => {
				withLogContext({ job_id: 'job-456' }, () => {
					expect(getLogContext()).toEqual({
						user_id: 'user-123',
						job_id: 'job-456',
					})
					throw new Error('Test error')
				})
			}).toThrow('Test error')

			expect(getLogContext()).toEqual({ user_id: 'user-123' })
		})

		it('should return function result', () => {
			const result = withLogContext({ job_id: 'job-456' }, () => {
				return 'success'
			})
			expect(result).toBe('success')
		})
	})

	describe('withLogContextAsync', () => {
		it('should set context during async function execution', async () => {
			setLogContext({ user_id: 'user-123' })

			await withLogContextAsync({ job_id: 'job-456' }, async () => {
				expect(getLogContext()).toEqual({
					user_id: 'user-123',
					job_id: 'job-456',
				})
			})

			expect(getLogContext()).toEqual({ user_id: 'user-123' })
		})

		it('should restore context even if async function throws', async () => {
			setLogContext({ user_id: 'user-123' })

			await expect(
				withLogContextAsync({ job_id: 'job-456' }, async () => {
					expect(getLogContext()).toEqual({
						user_id: 'user-123',
						job_id: 'job-456',
					})
					throw new Error('Test error')
				}),
			).rejects.toThrow('Test error')

			expect(getLogContext()).toEqual({ user_id: 'user-123' })
		})

		it('should return async function result', async () => {
			const result = await withLogContextAsync({ job_id: 'job-456' }, async () => {
				return Promise.resolve('success')
			})
			expect(result).toBe('success')
		})
	})
})
