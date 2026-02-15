import type { Context, Next } from 'hono'
import { auth } from './better-auth.js'

/**
 * 세션 메타데이터 타입
 */
interface SessionMetadata {
	user: typeof auth.$Infer.Session.user
	session: typeof auth.$Infer.Session.session
}

/**
 * 세션 만료 임박 여부 확인 (5분 이내)
 */
function isSessionExpiringSoon(expiresAt: Date): boolean {
	const fiveMinutesInMs = 5 * 60 * 1000
	const now = Date.now()
	const expirationTime = new Date(expiresAt).getTime()

	return expirationTime - now < fiveMinutesInMs
}

/**
 * 세션 자동 갱신 미들웨어
 *
 * 요구사항:
 * 1. Better Auth의 세션 만료 정책 활용 (access token 15분, refresh token 30일)
 * 2. 세션 만료 임박 시 자동 갱신 로직
 * 3. requireAuth 미들웨어와 통합
 *
 * Better Auth는 세션 updateAge 설정에 따라 자동으로 세션을 갱신합니다.
 * 이 미들웨어는 세션 상태를 확인하고 만료 임박 시 클라이언트에 알리는 역할을 합니다.
 *
 * @param c Hono Context
 * @param next Next middleware
 */
export async function sessionMiddleware(c: Context, next: Next): Promise<void> {
	// Better Auth에서 세션 조회
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (!session) {
		c.set('user', null)
		c.set('session', null)
		await next()
		return
	}

	const { user, session: sessionData } = session

	// 세션 만료 임박 여부 확인 (5분 이내)
	const isExpiringSoon = isSessionExpiringSoon(sessionData.expiresAt)

	// 세션 정보를 컨텍스트에 저장
	c.set('user', user)
	c.set('session', sessionData)

	// 세션 만료 임박 시 헤더에 표시 (클이언트에서 갱신 요청 트리거용)
	if (isExpiringSoon) {
		c.header('X-Session-Expiring-Soon', 'true')
		c.header('X-Session-Expires-At', sessionData.expiresAt.toISOString())
	}

	await next()
}

/**
 * 인증이 필요한 라우트용 미들웨어
 * 세션 자동 갱신 기능 포함
 *
 * @param c Hono Context
 * @param next Next middleware
 * @returns 401 응답 또는 void
 */
export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
	// Better Auth에서 세션 조회
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

	const { user, session: sessionData } = session

	// 세션 만료 임박 여부 확인 (5분 이내)
	const isExpiringSoon = isSessionExpiringSoon(sessionData.expiresAt)

	// 세션 정보를 컨텍스트에 저장
	c.set('user', user)
	c.set('session', sessionData)

	// 세션 만료 임박 시 헤더에 표시
	if (isExpiringSoon) {
		c.header('X-Session-Expiring-Soon', 'true')
		c.header('X-Session-Expires-At', sessionData.expiresAt.toISOString())
	}

	await next()
}

/**
 * 선택적 인증 미들웨어
 * 로그인된 사용자가 있으면 세션 정보 설정, 없으면 null 설정
 *
 * @param c Hono Context
 * @param next Next middleware
 */
export async function optionalAuth(c: Context, next: Next): Promise<void> {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (session) {
		c.set('user', session.user)
		c.set('session', session.session)

		// 세션 만료 임박 여부 확인
		if (isSessionExpiringSoon(session.session.expiresAt)) {
			c.header('X-Session-Expiring-Soon', 'true')
			c.header('X-Session-Expires-At', session.session.expiresAt.toISOString())
		}
	} else {
		c.set('user', null)
		c.set('session', null)
	}

	await next()
}

/**
 * 세션 정보를 반환하는 헬퍼 함수
 *
 * @param c Hono Context
 * @returns SessionMetadata 또는 null
 */
export function getSession(c: Context): SessionMetadata | null {
	const user = c.get('user')
	const session = c.get('session')

	if (!user || !session) {
		return null
	}

	return { user, session }
}

/**
 * 현재 사용자 ID를 반환하는 헬퍼 함수
 *
 * @param c Hono Context
 * @returns 사용자 ID 또는 null
 */
export function getCurrentUserId(c: Context): string | null {
	const session = getSession(c)
	return session?.user?.id ?? null
}

// Hono 컨텍스트 타입 확장
declare module 'hono' {
	interface ContextVariableMap {
		user: typeof auth.$Infer.Session.user | null
		session: typeof auth.$Infer.Session.session | null
	}
}
