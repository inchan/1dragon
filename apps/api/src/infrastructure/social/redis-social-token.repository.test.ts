import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RedisSocialTokenRepository } from './redis-social-token.repository.js'
import type { SocialTokenRepository } from './redis-social-token.repository.js'

// ioredis 인스턴스 mock
function createRedisMock() {
  return {
    get: vi.fn<(key: string) => Promise<string | null>>(),
    set: vi.fn<(key: string, value: string, mode: string, ttl: number) => Promise<'OK'>>(),
    del: vi.fn<(key: string) => Promise<number>>(),
  }
}

describe('RedisSocialTokenRepository', () => {
  let redisMock: ReturnType<typeof createRedisMock>
  let repo: SocialTokenRepository

  beforeEach(() => {
    redisMock = createRedisMock()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new RedisSocialTokenRepository(redisMock as any)
  })

  describe('get', () => {
    it('저장된 토큰을 반환한다', async () => {
      redisMock.get.mockResolvedValue('access-token-123')

      const result = await repo.get('tiktok', 'user-1')

      expect(redisMock.get).toHaveBeenCalledWith('social:tiktok:user-1')
      expect(result).toBe('access-token-123')
    })

    it('토큰이 없으면 null을 반환한다', async () => {
      redisMock.get.mockResolvedValue(null)

      const result = await repo.get('instagram', 'user-2')

      expect(redisMock.get).toHaveBeenCalledWith('social:instagram:user-2')
      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('기본 TTL(1시간)로 토큰을 저장한다', async () => {
      redisMock.set.mockResolvedValue('OK')

      await repo.set('tiktok', 'user-1', 'access-token-xyz')

      expect(redisMock.set).toHaveBeenCalledWith(
        'social:tiktok:user-1',
        'access-token-xyz',
        'EX',
        3600,
      )
    })

    it('커스텀 TTL로 토큰을 저장한다', async () => {
      redisMock.set.mockResolvedValue('OK')

      await repo.set('instagram', 'user-2', 'ig-token', 7200)

      expect(redisMock.set).toHaveBeenCalledWith(
        'social:instagram:user-2',
        'ig-token',
        'EX',
        7200,
      )
    })
  })

  describe('delete', () => {
    it('플랫폼과 사용자 ID에 해당하는 키를 삭제한다', async () => {
      redisMock.del.mockResolvedValue(1)

      await repo.delete('tiktok', 'user-1')

      expect(redisMock.del).toHaveBeenCalledWith('social:tiktok:user-1')
    })
  })

  describe('키 패턴 격리', () => {
    it('tiktok과 instagram은 서로 다른 키를 사용한다', async () => {
      redisMock.get.mockResolvedValue(null)

      await repo.get('tiktok', 'user-1')
      await repo.get('instagram', 'user-1')

      const calls = redisMock.get.mock.calls
      expect(calls[0]?.[0]).toBe('social:tiktok:user-1')
      expect(calls[1]?.[0]).toBe('social:instagram:user-1')
    })

    it('같은 플랫폼이라도 사용자 ID가 다르면 다른 키를 사용한다', async () => {
      redisMock.get.mockResolvedValue(null)

      await repo.get('tiktok', 'user-1')
      await repo.get('tiktok', 'user-2')

      const calls = redisMock.get.mock.calls
      expect(calls[0]?.[0]).toBe('social:tiktok:user-1')
      expect(calls[1]?.[0]).toBe('social:tiktok:user-2')
    })
  })
})
