import { initSentry } from './sentry.js'

initSentry()

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { type Worker } from 'bullmq'
import { config } from './shared/config.js'
import { closeConnection, testConnection } from './infrastructure/persistence/db.js'
import { redisConnection } from './infrastructure/queue/bullmq.config.js'
import { closeQueues } from './infrastructure/queue/bullmq.config.js'
import { createMediaAnalyzeWorker } from './infrastructure/queue/workers/media-analyze.worker.js'
import { createMediaComposeWorker } from './infrastructure/queue/workers/media-compose.worker.js'
import { createMediaGenerateWorker } from './infrastructure/queue/workers/media-generate.worker.js'
import { createMediaRenderVariantWorker } from './infrastructure/queue/workers/media-render-variant.worker.js'
import { setupAuthRoutes, authMiddleware } from './infrastructure/auth/index.js'
import { requestLoggerMiddleware, logger } from './infrastructure/logging/index.js'
import { createUsersRouter } from './api/users/routes.js'
import { createPaymentsRouter } from './api/payments/routes.js'
import { createMediaRouter } from './api/media/routes.js'
import { createProductsRouter } from './api/products/routes.js'
import {
	initializeAccountCleanupScheduler,
	closeAccountCleanupScheduler,
} from './infrastructure/scheduler/account-cleanup.js'
import {
	initializeSubscriptionRetryScheduler,
	closeSubscriptionRetryScheduler,
} from './infrastructure/scheduler/subscription-retry.js'
import {
	initializeOutboxDispatcher,
	closeOutboxDispatcher,
} from './infrastructure/notification/outbox-dispatcher.js'

const app = new Hono()

// CORS middleware - allow web app communication
app.use(
	'*',
	cors({
		origin:
			config.NODE_ENV === 'development'
				? ['http://localhost:5173', 'http://localhost:3000']
				: process.env.WEB_URL
					? [process.env.WEB_URL]
					: [],
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
		credentials: true,
	}),
)

// Request/response logging with structured logging
app.use(requestLoggerMiddleware())

// Health check endpoint
app.get('/health', async (c) => {
	const checks = await Promise.allSettled([testConnection(), redisConnection.ping()])
	const databaseReady = checks[0].status === 'fulfilled' && checks[0].value === true
	const redisReady = checks[1].status === 'fulfilled' && checks[1].value === 'PONG'
	const healthy = databaseReady && redisReady

	return c.json(
		{
			success: healthy,
			status: healthy ? 'ok' : 'degraded',
			timestamp: new Date().toISOString(),
			environment: config.NODE_ENV,
			version: config.APP_VERSION,
			dependencies: {
				database: databaseReady ? 'up' : 'down',
				redis: redisReady ? 'up' : 'down',
			},
		},
		healthy ? 200 : 503,
	)
})

// Better Auth routes
setupAuthRoutes(app)

// Payment webhook routes must be public (provider callbacks)
app.route('/api/v1/payments', createPaymentsRouter())

// Global auth middleware - sets user/session in context
app.use('*', authMiddleware)

// API Routes
app.route('/api/v1/users', createUsersRouter())
app.route('/api/v1/media', createMediaRouter())
app.route('/api/v1/products', createProductsRouter())

// Global error handler
app.onError((err, c) => {
	logger.error({ error: err.message, stack: err.stack }, 'Unhandled error')

	// Send to Sentry in production
	if (config.NODE_ENV === 'production') {
		import('./sentry.js').then(() => {
			logger.error('Error captured by Sentry')
		})
	}

	return c.json(
		{
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
			},
		},
		500,
	)
})

// 404 handler
app.notFound((c) => {
	return c.json(
		{
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: `Route ${c.req.method} ${c.req.path} not found`,
			},
		},
		404,
	)
})

let workers: Worker[] = []

async function initializeWorkers(): Promise<void> {
	if (workers.length > 0) {
		return
	}

	const analyzeWorker = createMediaAnalyzeWorker()
	const generateWorker = createMediaGenerateWorker()
	const composeWorker = createMediaComposeWorker()
	const renderWorker = createMediaRenderVariantWorker()

	workers = [analyzeWorker, generateWorker, composeWorker, renderWorker]

	for (const worker of workers) {
		worker.on('error', (error) => {
			logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker error')
		})
		worker.on('failed', (job, error) => {
			logger.error(
				{
					jobId: job?.id,
					error: error instanceof Error ? error.message : String(error),
				},
				'Worker failed to process job',
			)
		})
	}
}

async function closeWorkers(): Promise<void> {
	if (workers.length === 0) {
		return
	}

	await Promise.all(workers.map((worker) => worker.close()))
	workers = []
}

async function bootstrapSchedulers(): Promise<void> {
	try {
		await initializeAccountCleanupScheduler()
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			'Failed to initialize account cleanup scheduler',
		)
	}

	try {
		await Promise.resolve(initializeSubscriptionRetryScheduler())
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			'Failed to initialize subscription retry scheduler',
		)
	}

	initializeOutboxDispatcher()
	await initializeWorkers()
}

async function shutdown(signal: string): Promise<void> {
	logger.info(`Received ${signal}. Starting graceful shutdown...`)

	try {
		await Promise.allSettled([
			closeOutboxDispatcher(),
			closeWorkers(),
			closeQueues(),
			closeAccountCleanupScheduler(),
			closeSubscriptionRetryScheduler(),
			closeConnection(),
		])
		logger.info('Application shutdown completed')
		process.exit(0)
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			'Error during graceful shutdown',
		)
		process.exit(1)
	}
}

process.on('SIGTERM', () => {
	void shutdown('SIGTERM')
})
process.on('SIGINT', () => {
	void shutdown('SIGINT')
})

const port = config.PORT
bootstrapSchedulers()
	.then(() => {
		serve({ fetch: app.fetch, port })
		logger.info(`Server is listening on port ${port} (${config.NODE_ENV})`)
	})
	.catch((error) => {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			'Failed to bootstrap API runtime',
		)
		process.exit(1)
	})

export default app
