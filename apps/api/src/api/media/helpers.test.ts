import { describe, expect, it } from 'vitest'
import { buildDeterministicJobId, toJobStatusResponse } from './helpers.js'

describe('media helpers', () => {
	it('builds a stable deterministic job id for the same user, key, and image', () => {
		const first = buildDeterministicJobId(
			'user-123e4567-e89b-12d3-a456-426614174000',
			'submit-1',
			'https://cdn.example.com/input.png',
		)
		const second = buildDeterministicJobId(
			'user-123e4567-e89b-12d3-a456-426614174000',
			'submit-1',
			'https://cdn.example.com/input.png',
		)

		expect(first).toBe(second)
	})

	it('returns canonical status fields with both id and jobId aliases', () => {
		const createdAt = new Date('2026-03-11T00:00:00.000Z')
		const updatedAt = new Date('2026-03-11T00:01:00.000Z')
		const response = toJobStatusResponse({
			id: 'job-123e4567-e89b-12d3-a456-426614174000',
			status: 'QUEUED',
			progress: 5,
			retryCount: 0,
			errorMessage: null,
			createdAt,
			updatedAt,
			startedAt: null,
			completedAt: null,
		})

		expect(response.id).toBe('job-123e4567-e89b-12d3-a456-426614174000')
		expect(response.jobId).toBe('job-123e4567-e89b-12d3-a456-426614174000')
		expect(response.status).toBe('QUEUED')
		expect(response.progress).toBe(5)
	})
})
