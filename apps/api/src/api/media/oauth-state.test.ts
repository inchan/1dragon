import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateOAuthState, saveOAuthState, verifyOAuthState } from './oauth-state.js'

// Redis mock
const mockRedis = {
	set: vi.fn().mockResolvedValue('OK'),
	get: vi.fn<(key: string) => Promise<string | null>>(),
	del: vi.fn().mockResolvedValue(1),
}

describe('OAuth state CSRF 보호', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('state 생성', () => {
		it('userId + hex nonce 형식으로 state를 생성한다', () => {
			const userId = 'user-123'
			const { state, nonce } = generateOAuthState(userId)

			expect(state).toBe(`${userId}:${nonce}`)
			expect(state.startsWith(`${userId}:`)).toBe(true)
		})

		it('nonce는 16바이트 hex (32자)이다', () => {
			const { nonce } = generateOAuthState('user-abc')

			expect(nonce).toHaveLength(32)
			expect(/^[0-9a-f]{32}$/.test(nonce)).toBe(true)
		})

		it('매 호출마다 고유한 nonce를 생성한다', () => {
			const nonces = Array.from({ length: 10 }, () => generateOAuthState('user-xyz').nonce)
			const uniqueNonces = new Set(nonces)

			expect(uniqueNonces.size).toBe(10)
		})
	})

	describe('state 저장', () => {
		it('Redis SET with EX 600 으로 state를 저장한다', async () => {
			const state = 'user-123:abcdef1234567890abcdef1234567890'

			await saveOAuthState(mockRedis, state)

			expect(mockRedis.set).toHaveBeenCalledWith(
				`oauth:state:${state}`,
				'1',
				'EX',
				600,
			)
			expect(mockRedis.set).toHaveBeenCalledTimes(1)
		})
	})

	describe('state 검증', () => {
		it('Redis에 존재하는 유효한 state는 성공한다', async () => {
			const userId = 'user-123'
			const state = `${userId}:abcdef1234567890abcdef1234567890`
			mockRedis.get.mockResolvedValueOnce('1')

			const result = await verifyOAuthState(mockRedis, state, userId)

			expect(result.valid).toBe(true)
			expect(mockRedis.get).toHaveBeenCalledWith(`oauth:state:${state}`)
		})

		it('Redis에 없는 (만료된) state는 NOT_FOUND를 반환한다', async () => {
			const userId = 'user-123'
			const state = `${userId}:expired1234567890abcdef12345678`
			mockRedis.get.mockResolvedValueOnce(null)

			const result = await verifyOAuthState(mockRedis, state, userId)

			expect(result.valid).toBe(false)
			if (!result.valid) {
				expect(result.reason).toBe('NOT_FOUND')
			}
		})

		it('유효한 state 검증 후 Redis에서 삭제한다 (일회성)', async () => {
			const userId = 'user-abc'
			const state = `${userId}:1234567890abcdef1234567890abcdef`
			mockRedis.get.mockResolvedValueOnce('1')

			await verifyOAuthState(mockRedis, state, userId)

			expect(mockRedis.del).toHaveBeenCalledWith(`oauth:state:${state}`)
			expect(mockRedis.del).toHaveBeenCalledTimes(1)
		})

		it('state의 userId가 현재 사용자와 다르면 USER_MISMATCH를 반환하고 state도 삭제한다', async () => {
			const stateUserId = 'attacker-user'
			const currentUserId = 'victim-user'
			const state = `${stateUserId}:abcdef1234567890abcdef1234567890`
			mockRedis.get.mockResolvedValueOnce('1')

			const result = await verifyOAuthState(mockRedis, state, currentUserId)

			expect(result).toMatchObject({ valid: false, reason: 'USER_MISMATCH' })
			// userId 불일치 시에도 state 삭제 (재사용 공격 방지)
			expect(mockRedis.del).toHaveBeenCalledWith(`oauth:state:${state}`)
		})

		it('콜론이 없는 조작된 state는 NOT_FOUND로 처리하고 삭제한다', async () => {
			const state = 'malformed-state-no-colon'
			mockRedis.get.mockResolvedValueOnce('1')

			const result = await verifyOAuthState(mockRedis, state, 'user-123')

			expect(result).toMatchObject({ valid: false, reason: 'NOT_FOUND' })
			expect(mockRedis.del).toHaveBeenCalledWith(`oauth:state:${state}`)
		})

		it('만료된 state에서는 DEL을 호출하지 않는다', async () => {
			const userId = 'user-123'
			const state = `${userId}:expired9999999999999999999999999`
			mockRedis.get.mockResolvedValueOnce(null)

			await verifyOAuthState(mockRedis, state, userId)

			expect(mockRedis.del).not.toHaveBeenCalled()
		})

		it('동일한 state를 두 번 사용할 수 없다 (일회성 검증 시뮬레이션)', async () => {
			const userId = 'user-123'
			const state = `${userId}:once00001234567890abcdef12345678`

			// 첫 번째 사용: 성공
			mockRedis.get.mockResolvedValueOnce('1')
			const first = await verifyOAuthState(mockRedis, state, userId)
			expect(first.valid).toBe(true)

			// 두 번째 사용: DEL 이후 get은 null 반환
			mockRedis.get.mockResolvedValueOnce(null)
			const second = await verifyOAuthState(mockRedis, state, userId)
			expect(second.valid).toBe(false)
			if (!second.valid) {
				expect(second.reason).toBe('NOT_FOUND')
			}
		})
	})
})
