import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { config } from '../../shared/config.js'
import { db } from '../persistence/db.js'
import { logger } from '../logging/index.js'

/**
 * Apple OAuth Client Secret 생성
 * Apple은 JWT 형식의 client_secret을 요구함
 * https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */
function generateAppleClientSecret(): string {
	const { APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = config

	if (!APPLE_CLIENT_ID || !APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
		throw new Error('Apple OAuth configuration is incomplete')
	}

	// JWT 헤더
	const header = {
		alg: 'ES256',
		kid: APPLE_KEY_ID,
	}

	// 현재 시간과 만료 시간 (최대 6개월)
	const now = Math.floor(Date.now() / 1000)
	const expiresIn = 60 * 60 * 24 * 30 // 30일

	// JWT 페이로드
	const payload = {
		iss: APPLE_TEAM_ID,
		iat: now,
		exp: now + expiresIn,
		aud: 'https://appleid.apple.com',
		sub: APPLE_CLIENT_ID,
	}

	// Base64Url 인코딩 헬퍼
	const base64UrlEncode = (str: string): string => {
		return Buffer.from(str)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '')
	}

	// JWT 생성
	const encodedHeader = base64UrlEncode(JSON.stringify(header))
	const encodedPayload = base64UrlEncode(JSON.stringify(payload))
	const signingInput = `${encodedHeader}.${encodedPayload}`

	// 서명 생성 (ES256)
	const crypto = require('crypto')
	const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n')
	const signer = crypto.createSign('SHA256')
	signer.update(signingInput)
	signer.end()
	const signature = signer.sign(privateKey, 'base64')
	const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

	return `${signingInput}.${encodedSignature}`
}

/**
 * Better Auth 설정
 * - Drizzle ORM 어댑터 사용 (DB 세션 저장소)
 * - 카카오, Google, Apple OAuth 연동
 * - 세션 설정: 액세스 토큰 15분, 리프레시 토큰 30일
 * - 계정 연결: 동일 이메일로 여러 프로바이더 연결 지원
 */
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
	}),
	secret: config.DATABASE_URL,
	baseUrl: process.env.API_URL ?? 'http://localhost:3000',

	// 세션 설정
	session: {
		expiresIn: 60 * 15, // 15분 (액세스 토큰)
		updateAge: 60 * 15, // 15분마다 세션 갱신
		freshAge: 0,
	},

	// 리프레시 토큰 설정
	advanced: {
		defaultCookieAttributes: {
			sameSite: 'lax',
			httpOnly: true,
			secure: config.NODE_ENV === 'production',
			path: '/',
			maxAge: 60 * 60 * 24 * 30, // 30일 (리프레시 토큰)
		},
	},

	// 소셜 로그인 프로바이더
	socialProviders: {
		// Google OAuth
		...(config.GOOGLE_CLIENT_ID && {
			google: {
				clientId: config.GOOGLE_CLIENT_ID,
				clientSecret: '', // better-auth는 PKCE flow 사용으로 clientSecret 불필요
			},
		}),

		// 카카오 OAuth
		...(config.KAKAO_CLIENT_ID && {
			kakao: {
				clientId: config.KAKAO_CLIENT_ID,
				clientSecret: '', // Kakao는 clientSecret이 선택사항
			},
		}),

		// Apple OAuth
		...(config.APPLE_CLIENT_ID && {
			apple: {
				clientId: config.APPLE_CLIENT_ID,
				clientSecret: generateAppleClientSecret(),
			},
		}),
	},

	// 계정 연결 설정 - 이미 다른 프로바이더로 가입된 이메일 처리
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google', 'kakao', 'apple'],
			allowDifferentEmails: false, // 같은 이메일만 연결 허용
		},
	},

	// 데이터베이스 콜백 - 사용자 생성 후 처리
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					// 최초 로그인 시 Free 플랜 자동 할당
					const { db } = await import('../persistence/db.js')
					const { eq } = await import('drizzle-orm')
					const { plans, subscriptions } = await import('../persistence/schema.js')

					try {
						// Free 플랜 조회
						const freePlan = await db.query.plans.findFirst({
							where: eq(plans.tier, 'FREE'),
						})

						if (freePlan) {
							// Free 플랜 구독 생성
							const now = new Date()
							const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

							await db.insert(subscriptions).values({
								userId: user.id,
								planId: freePlan.id,
								status: 'ACTIVE',
								currentPeriodStart: now,
								currentPeriodEnd: thirtyDaysLater,
								cancelAtPeriodEnd: false,
							})
						}
					} catch (error) {
						logger.error(
							{
								error: error instanceof Error ? error.message : String(error),
								userId: user.id,
							},
							'Failed to assign free plan',
						)
						// 플랜 할당 실패필도 로그인은 성공하도록
					}
				},
			},
		},
	},
})

// Auth 타입 export
export type Auth = typeof auth
