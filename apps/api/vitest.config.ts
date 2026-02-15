import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		include: ['src/**/*.test.ts'],
		env: {
			NODE_ENV: 'development',
			DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
			REDIS_URL: 'redis://localhost:6379',
			S3_ENDPOINT: 'http://localhost:9000',
			S3_ACCESS_KEY: 'test',
			S3_SECRET_KEY: 'test',
			S3_BUCKET: 'test',
		},
		coverage: {
			provider: 'v8',
			include: ['src/domain/**', 'src/application/**', 'src/infrastructure/**'],
			exclude: ['src/**/*.test.*', 'src/api/**'],
			thresholds: {
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100,
			},
		},
	},
})
