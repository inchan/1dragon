import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockServe,
	mockTestConnection,
	mockRedisPing,
	mockLoggerInfo,
	mockLoggerError,
	mockWorkerOn,
	mockWorkerClose,
} = vi.hoisted(() => ({
	mockServe: vi.fn(),
	mockTestConnection: vi.fn(),
	mockRedisPing: vi.fn(),
	mockLoggerInfo: vi.fn(),
	mockLoggerError: vi.fn(),
	mockWorkerOn: vi.fn(),
	mockWorkerClose: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./sentry.js', () => ({
	captureException: vi.fn(),
	initSentry: vi.fn(),
}))

vi.mock('@hono/node-server', () => ({
	serve: mockServe,
}))

vi.mock('./infrastructure/persistence/db.js', () => ({
	closeConnection: vi.fn().mockResolvedValue(undefined),
	testConnection: mockTestConnection,
}))

vi.mock('./infrastructure/queue/bullmq.config.js', () => ({
	redisConnection: {
		ping: mockRedisPing,
	},
	closeQueues: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./infrastructure/queue/workers/media-analyze.worker.js', () => ({
	createMediaAnalyzeWorker: vi.fn(() => ({
		on: mockWorkerOn,
		close: mockWorkerClose,
	})),
}))

vi.mock('./infrastructure/queue/workers/media-generate.worker.js', () => ({
	createMediaGenerateWorker: vi.fn(() => ({
		on: mockWorkerOn,
		close: mockWorkerClose,
	})),
}))

vi.mock('./infrastructure/queue/workers/media-compose.worker.js', () => ({
	createMediaComposeWorker: vi.fn(() => ({
		on: mockWorkerOn,
		close: mockWorkerClose,
	})),
}))

vi.mock('./infrastructure/queue/workers/media-render-variant.worker.js', () => ({
	createMediaRenderVariantWorker: vi.fn(() => ({
		on: mockWorkerOn,
		close: mockWorkerClose,
	})),
}))

vi.mock('./infrastructure/auth/index.js', () => ({
	setupAuthRoutes: vi.fn(),
	authMiddleware: async (_c: unknown, next: () => Promise<void>) => {
		await next()
	},
}))

vi.mock('./infrastructure/logging/index.js', () => ({
	requestLoggerMiddleware: () => async (_c: unknown, next: () => Promise<void>) => {
		await next()
	},
	logger: {
		info: mockLoggerInfo,
		error: mockLoggerError,
	},
}))

vi.mock('./api/users/routes.js', async () => {
	const { Hono } = await vi.importActual<typeof import('hono')>('hono')
	return {
		createUsersRouter: vi.fn(() => new Hono()),
	}
})

vi.mock('./api/payments/routes.js', async () => {
	const { Hono } = await vi.importActual<typeof import('hono')>('hono')
	return {
		createPaymentsRouter: vi.fn(() => new Hono()),
	}
})

vi.mock('./api/media/routes.js', async () => {
	const { Hono } = await vi.importActual<typeof import('hono')>('hono')
	return {
		createMediaRouter: vi.fn(() => new Hono()),
	}
})

vi.mock('./api/products/routes.js', async () => {
	const { Hono } = await vi.importActual<typeof import('hono')>('hono')
	return {
		createProductsRouter: vi.fn(() => new Hono()),
	}
})

vi.mock('./infrastructure/scheduler/account-cleanup.js', () => ({
	initializeAccountCleanupScheduler: vi.fn().mockResolvedValue(undefined),
	closeAccountCleanupScheduler: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./infrastructure/scheduler/subscription-retry.js', () => ({
	initializeSubscriptionRetryScheduler: vi.fn().mockResolvedValue(undefined),
	closeSubscriptionRetryScheduler: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./infrastructure/notification/outbox-dispatcher.js', () => ({
	initializeOutboxDispatcher: vi.fn(),
	closeOutboxDispatcher: vi.fn().mockResolvedValue(undefined),
}))

type MainModule = typeof import('./main.js')

describe('/health runtime bootstrap', () => {
	let app: MainModule['default']

	beforeAll(async () => {
		const module = await import('./main.js')
		app = module.default
	})

	beforeEach(() => {
		vi.clearAllMocks()
		mockTestConnection.mockResolvedValue(true)
		mockRedisPing.mockResolvedValue('PONG')
	})

	it('returns HTTP 200 with ok readiness when dependencies are available', async () => {
		const response = await app.fetch(new Request('http://localhost/health'))
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body).toMatchObject({
			success: true,
			status: 'ok',
			dependencies: {
				database: 'up',
				redis: 'up',
			},
		})
	})

	it('returns HTTP 200 with degraded dependency flags when database or redis is unavailable', async () => {
		mockTestConnection.mockResolvedValue(false)
		mockRedisPing.mockRejectedValue(new Error('redis unavailable'))

		const response = await app.fetch(new Request('http://localhost/health'))
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body).toMatchObject({
			success: false,
			status: 'degraded',
			dependencies: {
				database: 'down',
				redis: 'down',
			},
		})
	})
})
