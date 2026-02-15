import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'

/**
 * ESLint flat config for FSD (Feature-Sliced Design) layer enforcement
 * Layers: app → widgets → features → shared (one-way only)
 * Cross-feature imports are blocked (features/A cannot import features/B)
 *
 * NOTE: This configuration is set up for future FSD layer enforcement.
 * When FSD layers (app/, widgets/, features/, shared/) are implemented,
 * this will enforce architectural boundaries automatically.
 */
export default [
	{
		files: ['src/**/*.ts', 'src/**/*.tsx'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			boundaries,
		},
		settings: {
			'boundaries/elements': [
				{
					type: 'app',
					pattern: 'app/**',
					mode: 'folder',
				},
				{
					type: 'widgets',
					pattern: 'widgets/**',
					mode: 'folder',
				},
				{
					type: 'features',
					pattern: 'features/*/**',
					mode: 'folder',
					capture: ['featureName'],
				},
				{
					type: 'shared',
					pattern: 'shared/**',
					mode: 'folder',
				},
			],
			'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
		},
		rules: {
			'boundaries/element-types': [
				'warn',
				{
					default: 'disallow',
					rules: [
						{
							from: 'app',
							allow: ['widgets', 'features', 'shared'],
						},
						{
							from: 'widgets',
							allow: ['features', 'shared'],
						},
						{
							from: 'features',
							allow: ['shared'],
						},
						{
							from: ['features'],
							allow: [['features', { featureName: '${from.featureName}' }]],
							message: 'Cross-feature imports are not allowed. Features must be independent.',
						},
						{
							from: 'shared',
							allow: [],
							message: 'Shared layer cannot import from app layers.',
						},
					],
				},
			],
		},
	},
]
