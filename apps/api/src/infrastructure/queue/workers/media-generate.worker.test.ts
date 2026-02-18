import { describe, expect, it, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — variables referenced inside factories must use vi.hoisted()
const { mockFindById, mockUpdateStatus, mockVariantCreate, mockSseBrokerPublish, mockAppendJobStatusEvent, mockUseCaseExecute } =
	vi.hoisted(() => ({
		mockFindById: vi.fn(),
		mockUpdateStatus: vi.fn(),
		mockVariantCreate: vi.fn(),
		mockSseBrokerPublish: vi.fn(),
		mockAppendJobStatusEvent: vi.fn(),
		mockUseCaseExecute: vi.fn(),
	}))

vi.mock('../bullmq.config.js', () => ({
	QueueName: {
		MEDIA_GENERATE: 'media-generate',
	},
	redisConnection: {},
}))

vi.mock('@/infrastructure/persistence/db.js', () => ({
	db: {
		insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
		}),
	},
}))

vi.mock('@/infrastructure/persistence/repositories/video-job.repository.js', () => ({
	VideoJobRepositoryImpl: vi.fn().mockImplementation(() => ({
		findById: mockFindById,
		updateStatus: mockUpdateStatus,
	})),
	VideoVariantRepositoryImpl: vi.fn().mockImplementation(() => ({
		create: mockVariantCreate,
	})),
}))

vi.mock('@/infrastructure/notification/sse-broker.js', () => ({
	sseBroker: {
		publish: mockSseBrokerPublish,
	},
}))

vi.mock('@/infrastructure/persistence/job-event.helper.js', () => ({
	appendJobStatusEvent: mockAppendJobStatusEvent,
}))

vi.mock('@/application/media/generate-video.usecase.js', () => ({
	GenerateVideoUseCase: vi.fn().mockImplementation(() => ({
		execute: mockUseCaseExecute,
	})),
}))

import type { Job } from 'bullmq'
import type { MediaGenerateJobData } from '../bullmq.config.js'
import { processMediaGenerateJob } from './media-generate.worker.js'

const MOCK_JOB_RECORD = {
	id: 'project_1',
	userId: 'user_1',
	status: 'QUEUED',
	progress: 0,
	retryCount: 0,
	inputImageUrl: 'https://cdn.example.com/product.png',
	errorMessage: null,
	productAnalysisId: null,
	modelPersonaSelectionId: null,
	startedAt: null,
	completedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
}

describe('processMediaGenerateJob', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFindById.mockResolvedValue(MOCK_JOB_RECORD)
		mockUpdateStatus.mockResolvedValue(null)
		mockVariantCreate.mockResolvedValue({})
		mockAppendJobStatusEvent.mockResolvedValue(undefined)
	})

	it('runs generation pipeline and returns summary on SUCCEEDED', async () => {
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: { id: 'project_1', retryCount: 0, result: { variants: [] } },
			events: [
				{ previousStatus: 'QUEUED', newStatus: 'ANALYZING', metadata: {} },
				{ previousStatus: 'ANALYZING', newStatus: 'GENERATING', metadata: {} },
				{ previousStatus: 'GENERATING', newStatus: 'SUCCEEDED', metadata: {} },
			],
			qualityScore: 0.9,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				options: { duration: 15, stylePreset: 'SIMPLE' },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		const result = await processMediaGenerateJob(job)
		expect(result.jobId).toBe('project_1')
		expect(result.status).toBe('SUCCEEDED')
		expect(result.eventCount).toBe(3)
	})

	it('calls sseBroker.publish() for each status transition', async () => {
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: { id: 'project_1', retryCount: 0, result: { variants: [] } },
			events: [
				{ previousStatus: 'QUEUED', newStatus: 'ANALYZING', metadata: {} },
				{ previousStatus: 'ANALYZING', newStatus: 'SUCCEEDED', metadata: {} },
			],
			qualityScore: 0.95,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				options: { duration: 10 },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		await processMediaGenerateJob(job)

		expect(mockSseBrokerPublish).toHaveBeenCalledTimes(2)
		expect(mockSseBrokerPublish).toHaveBeenCalledWith('user_1', 'JOB_STATUS_CHANGED', expect.objectContaining({
			type: 'JOB_STATUS_CHANGED',
			userId: 'user_1',
		}))
	})

	it('uses job payload productCategory, moods, keywords, copy when provided', async () => {
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: { id: 'project_1', retryCount: 0, result: { variants: [] } },
			events: [],
			qualityScore: 0.8,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				productCategory: 'BEAUTY',
				moods: ['LUXURY', 'CALM'],
				keywords: ['skincare', 'glow'],
				copy: { hook: '빛나는 피부', description: '고급 스킨케어', cta: '지금 구매' },
				options: { duration: 15 },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		await processMediaGenerateJob(job)

		expect(mockUseCaseExecute).toHaveBeenCalledWith(
			expect.objectContaining({
				productCategory: 'BEAUTY',
				moods: ['LUXURY', 'CALM'],
				keywords: ['skincare', 'glow'],
				copy: { hook: '빛나는 피부', description: '고급 스킨케어', cta: '지금 구매' },
			}),
		)
	})

	it('falls back to defaults when optional payload fields are missing', async () => {
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: { id: 'project_1', retryCount: 0, result: { variants: [] } },
			events: [],
			qualityScore: 0.8,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				options: { duration: 15 },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		await processMediaGenerateJob(job)

		expect(mockUseCaseExecute).toHaveBeenCalledWith(
			expect.objectContaining({
				productCategory: 'OTHER',
				moods: ['PROFESSIONAL'],
				keywords: [],
			}),
		)
	})

	it('saves video variants to DB when SUCCEEDED with result', async () => {
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: {
				id: 'project_1',
				retryCount: 0,
				result: {
					variants: [
						{
							platform: 'TIKTOK',
							asset: { width: 1080, height: 1920, durationSec: 15, url: 'https://cdn.example.com/tiktok.mp4' },
							hasWatermark: false,
						},
					],
				},
			},
			events: [],
			qualityScore: 0.9,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				options: { duration: 15 },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		await processMediaGenerateJob(job)

		expect(mockVariantCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				jobId: 'project_1',
				platform: 'TIKTOK',
				fileUrl: 'https://cdn.example.com/tiktok.mp4',
			}),
		)
	})
})
