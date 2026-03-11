import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockReturning, mockValues, mockInsert } = vi.hoisted(() => ({
	mockReturning: vi.fn(),
	mockValues: vi.fn(),
	mockInsert: vi.fn(),
}))

vi.mock('../db.js', () => ({
	db: {
		insert: mockInsert,
		query: {
			videoJobs: {
				findFirst: vi.fn(),
				findMany: vi.fn(),
			},
			videoVariants: {
				findMany: vi.fn(),
			},
		},
		update: vi.fn(),
		select: vi.fn(),
	},
}))

vi.mock('@/infrastructure/logging/logger.js', () => ({
	logger: {
		warn: vi.fn(),
	},
}))

import { VideoJobRepositoryImpl } from './video-job.repository.js'

const NOW = new Date('2026-03-11T00:00:00.000Z')

describe('VideoJobRepositoryImpl', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockReturning.mockResolvedValue([
			{
				id: 'job-123e4567-e89b-12d3-a456-426614174000',
				userId: 'user-123e4567-e89b-12d3-a456-426614174000',
				status: 'QUEUED',
				inputImageUrl: 'https://cdn.example.com/input.png',
				productAnalysisId: null,
				modelPersonaSelectionId: null,
				progress: 0,
				retryCount: 0,
				errorMessage: null,
				startedAt: null,
				completedAt: null,
				createdAt: NOW,
				updatedAt: NOW,
			},
		])
		mockValues.mockReturnValue({ returning: mockReturning })
		mockInsert.mockReturnValue({ values: mockValues })
	})

	it('passes an explicit job id to the insert payload when provided', async () => {
		const repository = new VideoJobRepositoryImpl()

		await repository.create({
			id: 'job-123e4567-e89b-12d3-a456-426614174000',
			userId: 'user-123e4567-e89b-12d3-a456-426614174000',
			inputImageUrl: 'https://cdn.example.com/input.png',
			status: 'QUEUED',
		})

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'job-123e4567-e89b-12d3-a456-426614174000',
				userId: 'user-123e4567-e89b-12d3-a456-426614174000',
			}),
		)
	})
})
