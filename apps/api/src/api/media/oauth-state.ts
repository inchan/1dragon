import { randomBytes } from 'node:crypto'

export const OAUTH_STATE_TTL_SECONDS = 600

// IORedis와 테스트 mock 모두와 호환되는 최소 인터페이스
export interface OAuthStateRedis {
	get(key: string): Promise<string | null>
	set(key: string, value: string, ex: 'EX', ttl: number): Promise<string | null>
	del(key: string): Promise<number>
}

export function generateOAuthState(userId: string): { state: string; nonce: string } {
	const nonce = randomBytes(16).toString('hex')
	const state = `${userId}:${nonce}`
	return { state, nonce }
}

export async function saveOAuthState(redis: OAuthStateRedis, state: string): Promise<void> {
	await redis.set(`oauth:state:${state}`, '1', 'EX', OAUTH_STATE_TTL_SECONDS)
}

export async function verifyOAuthState(
	redis: OAuthStateRedis,
	state: string,
	currentUserId: string,
): Promise<{ valid: true } | { valid: false; reason: 'NOT_FOUND' | 'USER_MISMATCH' }> {
	const stored = await redis.get(`oauth:state:${state}`)
	if (!stored) {
		return { valid: false, reason: 'NOT_FOUND' }
	}

	const [stateUserId] = state.split(':')
	if (stateUserId !== currentUserId) {
		// userId 불일치: state를 유지하여 합법적 사용자가 재시도 가능하도록 함
		return { valid: false, reason: 'USER_MISMATCH' }
	}

	// 검증 성공 후 삭제 (일회성 CSRF 토큰)
	await redis.del(`oauth:state:${state}`)
	return { valid: true }
}
