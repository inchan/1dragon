import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockReturning, mockValues, mockInsert, mockVideoJobsFindFirst, mockVideoJobsFindMany } =
	vi.hoisted(() => ({
		mockReturning: vi.fn(),
		mockValues: vi.fn(),
		mockInsert: vi.fn(),
		mockVideoJobsFindFirst: vi.fn(),
		mockVideoJobsFindMany: vi.fn(),
	}))

vi.mock('../db.js', () => ({
	db: {
		insert: mockInsert,
		query: {
			videoJobs: {
				findFirst: mockVideoJobsFindFirst,
				findMany: mockVideoJobsFindMany,
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

import type { ReferenceIntake } from '@1dragon/shared'
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
				referenceIntake: null,
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

	it('round-trips persisted reference intake payloads', async () => {
		const repository = new VideoJobRepositoryImpl()
		const persistedReferenceIntake: ReferenceIntake = {
			referenceBrief: {
				productName: 'Cloud Wrap Dress',
				coreBenefits: ['Waist definition'],
				targetAudience: {
					summary: 'office-first women',
					useCases: ['commute'],
					painPoints: [],
				},
				landingPageText: 'Polished wrap dress for commute days.',
				differentiators: [],
				proofPoints: [],
				competitorExamples: [],
				categoryExamples: [],
				successMetrics: [],
			},
			normalizedReferenceBrief: {
				productName: 'Cloud Wrap Dress',
				coreBenefits: ['Waist definition'],
				differentiators: [],
				proofPoints: [],
				targetAudienceSummary: 'office-first women',
				useCases: ['commute'],
				painPoints: [],
				landingPageExcerpt: 'Polished wrap dress for commute days.',
				landingPageSource: 'provided_text',
				competitorExamples: [],
				categoryExamples: [],
				successMetrics: [],
				platformTargets: ['TIKTOK' as const],
				queryHints: {
					productFacts: ['Cloud Wrap Dress'],
					marketLanguage: ['office-first women'],
					proofQueries: ['Waist definition'],
					competitorQueries: [],
				},
				taxonomy: {
					category: 'FASHION',
					source: 'brief',
					usageContexts: ['COMMUTE'],
				},
				missingSignals: ['price_band', 'proof_points', 'reference_examples', 'success_metrics'],
				completenessScore: 40,
			},
			productAnalysisId: '11111111-1111-4111-8111-111111111111',
		}

		await repository.create({
			userId: 'user-123e4567-e89b-12d3-a456-426614174000',
			inputImageUrl: 'https://cdn.example.com/input.png',
			productAnalysisId: '11111111-1111-4111-8111-111111111111',
			referenceIntake: persistedReferenceIntake,
			status: 'QUEUED',
		})

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				productAnalysisId: '11111111-1111-4111-8111-111111111111',
				referenceIntake: persistedReferenceIntake,
			}),
		)

		mockVideoJobsFindFirst.mockResolvedValueOnce({
			id: 'job-123e4567-e89b-12d3-a456-426614174000',
			userId: 'user-123e4567-e89b-12d3-a456-426614174000',
			status: 'QUEUED',
			inputImageUrl: 'https://cdn.example.com/input.png',
			productAnalysisId: '11111111-1111-4111-8111-111111111111',
			referenceIntake: persistedReferenceIntake,
			modelPersonaSelectionId: null,
			progress: 0,
			retryCount: 0,
			errorMessage: null,
			startedAt: null,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
		})

		const result = await repository.findById(
			'job-123e4567-e89b-12d3-a456-426614174000',
			'user-123e4567-e89b-12d3-a456-426614174000',
		)

		expect(result?.referenceIntake).toEqual(persistedReferenceIntake)
	})
})
