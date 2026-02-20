import { describe, expect, it } from 'vitest'
import { safeErrorMessage } from './error-utils.js'

describe('safeErrorMessage', () => {
	it('returns error message in development', () => {
		const error = new Error('database connection failed')
		expect(safeErrorMessage(error, 'development')).toBe('database connection failed')
	})

	it('returns error message in test', () => {
		const error = new Error('test error')
		expect(safeErrorMessage(error, 'test')).toBe('test error')
	})

	it('returns generic message in production', () => {
		const error = new Error('secret internal details')
		expect(safeErrorMessage(error, 'production')).toBe('An unexpected error occurred')
	})

	it('handles non-Error values in development', () => {
		expect(safeErrorMessage('string error', 'development')).toBe('string error')
		expect(safeErrorMessage(42, 'development')).toBe('42')
		expect(safeErrorMessage(null, 'development')).toBe('null')
		expect(safeErrorMessage(undefined, 'development')).toBe('undefined')
	})

	it('masks non-Error values in production', () => {
		expect(safeErrorMessage('string error', 'production')).toBe('An unexpected error occurred')
		expect(safeErrorMessage(42, 'production')).toBe('An unexpected error occurred')
		expect(safeErrorMessage(null, 'production')).toBe('An unexpected error occurred')
	})
})
