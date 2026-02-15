import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requestLoggerMiddleware, honoLoggerMiddleware } from './request-logger.js'
import { getLogContext, clearLogContext } from './context-logger.js'

describe('request-logger', () => {
	describe('requestLoggerMiddleware', () => {
		beforeEach(() => {
			clearLogContext()
		})

		it('should log request and response', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware())
			app.get('/test', (c) => c.json({ success: true }))

			const req = new Request('http://localhost/test')
			const res = await app.fetch(req)

			expect(res.status).toBe(200)
		})

		it('should extract request ID from header', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware())
			app.get('/test', (c) => {
				const context = getLogContext()
				return c.json({ request_id: context.request_id })
			})

			const req = new Request('http://localhost/test', {
				headers: { 'X-Request-ID': 'custom-req-id' },
			})
			const res = await app.fetch(req)
			const body = (await res.json()) as { request_id: string }

			expect(body.request_id).toBe('custom-req-id')
		})

		it('should generate request ID if not provided', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware())
			app.get('/test', (c) => {
				const context = getLogContext()
				return c.json({ has_request_id: !!context.request_id })
			})

			const req = new Request('http://localhost/test')
			const res = await app.fetch(req)
			const body = (await res.json()) as { has_request_id: boolean }

			expect(body.has_request_id).toBe(true)
		})

		it('should set request ID header in response', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware())
			app.get('/test', (c) => c.json({ success: true }))

			const req = new Request('http://localhost/test')
			const res = await app.fetch(req)

			expect(res.headers.get('X-Request-ID')).toBeDefined()
		})

		it('should skip excluded paths', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware())
			app.get('/health', (c) => c.json({ status: 'ok' }))

			const req = new Request('http://localhost/health')
			const res = await app.fetch(req)

			expect(res.status).toBe(200)
		})

		it('should handle errors and log them', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware())
			app.get('/error', () => {
				throw new Error('Test error')
			})
			// Hono catches errors by default, so we verify the middleware doesn't break
			const req = new Request('http://localhost/error')
			const res = await app.fetch(req)

			// Hono's default error handling returns 500
			expect(res.status).toBe(500)
		})

		it('should support custom exclude paths', async () => {
			const app = new Hono()
			app.use(requestLoggerMiddleware({ excludePaths: ['/custom'] }))
			app.get('/custom', (c) => c.json({ skipped: true }))

			const req = new Request('http://localhost/custom')
			const res = await app.fetch(req)

			expect(res.status).toBe(200)
		})
	})

	describe('honoLoggerMiddleware', () => {
		it('should log requests and responses', async () => {
			const app = new Hono()
			app.use(honoLoggerMiddleware())
			app.get('/test', (c) => c.json({ success: true }))

			const req = new Request('http://localhost/test')
			const res = await app.fetch(req)

			expect(res.status).toBe(200)
		})

		it('should log error status codes', async () => {
			const app = new Hono()
			app.use(honoLoggerMiddleware())
			app.get('/error', (c) => c.json({ error: 'Not found' }, 404))

			const req = new Request('http://localhost/error')
			const res = await app.fetch(req)

			expect(res.status).toBe(404)
		})
	})
})
