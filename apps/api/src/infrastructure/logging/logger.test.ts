import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger, createChildLogger, type LogContext } from './logger.js'

describe('logger', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('createChildLogger', () => {
		it('should create child logger with context', () => {
			const context: LogContext = {
				job_id: 'job-123',
				user_id: 'user-456',
				provider: 'test-provider',
				request_id: 'req-789',
			}

			const childLogger = createChildLogger(context)

			expect(childLogger).toBeDefined()
			expect(childLogger.bindings()).toMatchObject(context)
		})

		it('should create child logger with partial context', () => {
			const context: LogContext = {
				user_id: 'user-123',
			}

			const childLogger = createChildLogger(context)

			expect(childLogger.bindings()).toMatchObject({
				user_id: 'user-123',
			})
		})

		it('should include custom fields in context', () => {
			const context: LogContext = {
				user_id: 'user-123',
				custom_field: 'custom-value',
				nested: { key: 'value' },
			}

			const childLogger = createChildLogger(context)

			expect(childLogger.bindings()).toMatchObject(context)
		})
	})

	describe('logger', () => {
		it('should have log methods available', () => {
			expect(logger.debug).toBeDefined()
			expect(logger.info).toBeDefined()
			expect(logger.warn).toBeDefined()
			expect(logger.error).toBeDefined()
		})

		it('should have level configuration', () => {
			expect(logger.level).toBeDefined()
		})
	})
})
