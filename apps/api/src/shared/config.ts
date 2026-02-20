import { z } from 'zod'

const envSchema = z.object({
	// Server
	NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
	PORT: z.string().default('3000').transform(Number),

	// Database
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

	// Redis
	REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

	// S3 Storage
	S3_ENDPOINT: z.string().min(1, 'S3_ENDPOINT is required'),
	S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY is required'),
	S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY is required'),
	S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),

	// Auth Providers
	KAKAO_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_ID: z.string().optional(),

	// Apple OAuth
	APPLE_CLIENT_ID: z.string().optional(),
	APPLE_TEAM_ID: z.string().optional(),
	APPLE_KEY_ID: z.string().optional(),
	APPLE_PRIVATE_KEY: z.string().optional(),

	TOSSPAYMENTS_SECRET: z.string().optional(),
	TOSSPAYMENTS_WEBHOOK_SECRET: z.string().optional(),

	// SNS Sharing
	TIKTOK_CLIENT_KEY: z.string().optional(),
	TIKTOK_CLIENT_SECRET: z.string().optional(),
	META_APP_ID: z.string().optional(),
	META_APP_SECRET: z.string().optional(),

	// Monitoring
	SENTRY_DSN: z.string().optional(),
	APP_VERSION: z.string().default('0.0.0'),

	// Logging
	LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

	// AI Provider API Keys (optional — feature disabled when missing)
	GEMINI_VEO_API_KEY: z.string().optional(),
	GEMINI_IMAGEN_API_KEY: z.string().optional(),
	RUNWAY_API_KEY: z.string().optional(),
	HAILUO_API_KEY: z.string().optional(),
	MINIMAX_API_KEY: z.string().optional(),
	ELEVENLABS_API_KEY: z.string().optional(),

	// Web App URL (for OAuth redirect URIs)
	WEB_URL: z.string().url().optional(),
})

function loadEnv(): z.infer<typeof envSchema> {
	const result = envSchema.safeParse(process.env)

	if (!result.success) {
		const errors = result.error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`)
		throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
	}

	return result.data
}

export const config = loadEnv()

export type Config = typeof config
