import { describe, expect, it } from 'vitest'
import { auth } from './better-auth.js'

describe('Better Auth Configuration', () => {
	describe('auth instance', () => {
		it('should be defined', () => {
			expect(auth).toBeDefined()
		})

		it('should have api methods', () => {
			expect(auth.api).toBeDefined()
			expect(auth.api.getSession).toBeDefined()
		})

		it('should have handler method', () => {
			expect(auth.handler).toBeDefined()
			expect(typeof auth.handler).toBe('function')
		})
	})

	describe('social providers', () => {
		it('should have kakao provider configured when KAKAO_CLIENT_ID is set', () => {
			// 환경변수가 설정된 경우에만 테스트
			if (process.env.KAKAO_CLIENT_ID) {
				expect(auth.options.socialProviders).toBeDefined()
			}
		})
	})

	describe('session configuration', () => {
		it('should have session configuration', () => {
			expect(auth.options.session).toBeDefined()
		})

		it('should have 15 minute session expiration', () => {
			expect(auth.options.session?.expiresIn).toBe(60 * 15)
		})
	})
})
