import type IORedis from 'ioredis'

export type SocialPlatform = 'tiktok' | 'instagram'

export interface SocialTokenRepository {
  get(platform: SocialPlatform, userId: string): Promise<string | null>
  set(platform: SocialPlatform, userId: string, token: string, ttlSec?: number): Promise<void>
  delete(platform: SocialPlatform, userId: string): Promise<void>
}

const DEFAULT_TTL_SEC = 3600 // 1시간

function buildKey(platform: SocialPlatform, userId: string): string {
  return `social:${platform}:${userId}`
}

export class RedisSocialTokenRepository implements SocialTokenRepository {
  constructor(private readonly redis: IORedis) {}

  async get(platform: SocialPlatform, userId: string): Promise<string | null> {
    const value = await this.redis.get(buildKey(platform, userId))
    return value
  }

  async set(
    platform: SocialPlatform,
    userId: string,
    token: string,
    ttlSec: number = DEFAULT_TTL_SEC,
  ): Promise<void> {
    await this.redis.set(buildKey(platform, userId), token, 'EX', ttlSec)
  }

  async delete(platform: SocialPlatform, userId: string): Promise<void> {
    await this.redis.del(buildKey(platform, userId))
  }
}
