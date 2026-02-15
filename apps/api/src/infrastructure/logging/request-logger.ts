import type { MiddlewareHandler } from 'hono'
import { logger, createChildLogger } from './logger.js'
import { getLogContext, updateLogContext, clearLogContext } from './context-logger.js'

interface RequestLoggerOptions {
	excludePaths?: string[]
}

export function requestLoggerMiddleware(options: RequestLoggerOptions = {}): MiddlewareHandler {
	const { excludePaths = ['/health'] } = options

	return async (c, next) => {
		const path = c.req.path

		// Skip logging for excluded paths
		if (excludePaths.some((exclude) => path.startsWith(exclude))) {
			return next()
		}

		// Generate or extract request ID
		const requestId = c.req.header('X-Request-ID') ?? crypto.randomUUID()
		c.header('X-Request-ID', requestId)

		// Extract user ID from context if available (set by auth middleware)
		const userId = c.get('user')?.id as string | undefined

		// Initialize context
		const contextUpdate: { request_id: string; user_id?: string } = {
			request_id: requestId,
		}
		if (userId !== undefined) {
			contextUpdate.user_id = userId
		}
		updateLogContext(contextUpdate)

		const requestLogger = createChildLogger(getLogContext())

		const startTime = performance.now()
		const method = c.req.method
		const url = c.req.url

		// Log request start
		requestLogger.debug({ method, url, path }, 'Request started')

		try {
			await next()
		} catch (error) {
			requestLogger.error(
				{
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				},
				'Request failed with error',
			)
			throw error
		} finally {
			const duration = Math.round(performance.now() - startTime)
			const status = c.res.status

			// Determine log level based on status code
			const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

			requestLogger[logLevel](
				{
					method,
					url,
					path,
					status,
					duration_ms: duration,
				},
				'Request completed',
			)

			// Clean up context
			clearLogContext()
		}
	}
}

export function honoLoggerMiddleware(): MiddlewareHandler {
	return async (c, next) => {
		const start = Date.now()
		const method = c.req.method
		const path = c.req.path

		logger.debug({ method, path }, '--> Request')

		await next()

		const duration = Date.now() - start
		const status = c.res.status

		const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
		logger[logLevel]({ method, path, status, duration_ms: duration }, '<-- Response')
	}
}
