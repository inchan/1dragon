import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			include: ['src/**/model/**', 'src/**/lib/**', 'src/**/api/**'],
			exclude: ['src/**/ui/**', 'src/**/*.test.*'],
			thresholds: {
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100,
			},
		},
	},
})
