import type { Context, Hono } from 'hono'
import { auth } from './better-auth.js'

/**
 * Better Auth를 Hono 앱에 통합하는 핸들러
 * /auth/* 라우트에 마운트
 */
export function setupAuthRoutes(app: Hono): void {
	// Better Auth 핸들러 마운트 (basePath 기본값: /api/auth)
	app.all('/api/auth/*', async (c: Context) => {
		// Better Auth의 fetch 핸들러 호출
		const request = c.req.raw

		// Better Auth 핸들러 호출
		const response = await auth.handler(request)

		return response
	})
}

/**
 * 인증 미들웨어 - 세션 검증
 */
export async function authMiddleware(c: Context, next: () => Promise<void>): Promise<void> {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (!session) {
		c.set('user', null)
		c.set('session', null)
	} else {
		c.set('user', session.user)
		c.set('session', session.session)
	}

	await next()
}

/**
 * 인증이 필요한 라우트용 미들웨어
 */
export async function requireAuth(
	c: Context,
	next: () => Promise<void>,
): Promise<Response | undefined> {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (!session) {
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

	c.set('user', session.user)
	c.set('session', session.session)

	await next()
}

// Hono 컨텍스트 타입 확장
declare module 'hono' {
	interface ContextVariableMap {
		user: typeof auth.$Infer.Session.user | null
		session: typeof auth.$Infer.Session.session | null
	}
}
