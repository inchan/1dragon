import baseConfig from '@snapvid/eslint-config'

/**
 * ESLint configuration for apps/web
 * Extends base FSD layer enforcement from @snapvid/eslint-config
 */
export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
	},
	...baseConfig,
]
