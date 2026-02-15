import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit 설정
 * 마이그레이션 설정
 */

export default defineConfig({
	schema: './src/infrastructure/persistence/schema.ts',
	out: './drizzle/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? '',
	},
	verbose: true,
	strict: true,
})
