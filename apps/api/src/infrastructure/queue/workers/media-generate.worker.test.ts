import { describe, expect, it, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — variables referenced inside factories must use vi.hoisted()
const {
	mockFindById,
	mockUpdateStatus,
	mockVariantCreate,
	mockSseBrokerPublish,
	mockAppendJobStatusEvent,
	mockUseCaseExecute,
	mockPresetFindById,
	mockPresetListActive,
	mockSelectionFindByJobId,
	mockGenerateModelImageExecute,
	mockAddJob,
} =
	vi.hoisted(() => ({
		mockFindById: vi.fn(),
		mockUpdateStatus: vi.fn(),
		mockVariantCreate: vi.fn(),
		mockSseBrokerPublish: vi.fn(),
		mockAppendJobStatusEvent: vi.fn(),
		mockUseCaseExecute: vi.fn(),
		mockPresetFindById: vi.fn(),
		mockPresetListActive: vi.fn(),
		mockSelectionFindByJobId: vi.fn(),
		mockGenerateModelImageExecute: vi.fn(),
		mockAddJob: vi.fn(),
	}))

vi.mock('../bullmq.config.js', () => ({
	QueueName: {
		MEDIA_GENERATE: 'media-generate',
		MEDIA_GENERATE_DLQ: 'media-generate-dlq',
	},
	redisConnection: {},
	addJob: mockAddJob,
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

vi.mock('@/infrastructure/persistence/repositories/model-persona-selection.repository.js', () => ({
	ModelPersonaPresetRepositoryImpl: vi.fn().mockImplementation(() => ({
		findById: mockPresetFindById,
		listActive: mockPresetListActive,
	})),
	ModelPersonaSelectionRepositoryImpl: vi.fn().mockImplementation(() => ({
		findByJobId: mockSelectionFindByJobId,
		create: vi.fn(),
		findByUserId: vi.fn(),
	})),
}))

vi.mock('@/application/model-persona/generate-model-image.usecase.js', () => ({
	GenerateModelImageUseCase: vi.fn().mockImplementation(() => ({
		execute: mockGenerateModelImageExecute,
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
		mockPresetFindById.mockResolvedValue(null)
		mockPresetListActive.mockResolvedValue([])
		mockSelectionFindByJobId.mockResolvedValue(null)
		mockGenerateModelImageExecute.mockResolvedValue({
			accepted: false,
			fallbackToProductOnly: true,
			generatedImageUrl: null,
			qualityScore: null,
			attempts: 1,
			message: 'fallback',
			provider: null,
			prompt: null,
		})
		mockAddJob.mockResolvedValue(undefined)
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

	it('applies wearable model composite for fashion category before video generation', async () => {
		mockPresetFindById.mockResolvedValue({
			id: 'preset_1',
			name: 'preset_1',
			gender: 'FEMALE',
			ageRange: 'YOUNG_ADULT',
			bodyType: 'REGULAR',
			style: 'CASUAL',
			imagenPromptTemplate: 'template {{product_name}}',
			previewImageUrl: null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		mockGenerateModelImageExecute.mockResolvedValue({
			accepted: true,
			fallbackToProductOnly: false,
			generatedImageUrl: 'https://cdn.example.com/composite-fashion.png',
			qualityScore: 0.91,
			attempts: 1,
			message: 'ok',
			provider: 'GEMINI_IMAGEN',
			prompt: 'prompt',
		})
		mockSelectionFindByJobId.mockResolvedValue({
			id: 'selection_1',
			userId: 'user_1',
			jobId: 'project_1',
			presetId: 'preset_1',
			generatedImageUrl: 'https://cdn.example.com/composite-fashion.png',
			qualityScore: 0.91,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: { id: 'project_1', retryCount: 0, result: { variants: [] } },
			events: [],
			qualityScore: 0.9,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/fashion.png',
				personaId: 'preset_1',
				productCategory: 'FASHION',
				keywords: ['원피스', '봄룩'],
				copy: { hook: '봄룩', description: '플로럴 원피스', cta: '지금 구매' },
				options: { duration: 15, stylePreset: 'TRENDY' },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		await processMediaGenerateJob(job)

		expect(mockGenerateModelImageExecute).toHaveBeenCalledTimes(1)
		expect(mockUseCaseExecute).toHaveBeenCalledWith(
			expect.objectContaining({
				inputImageUrl: 'https://cdn.example.com/composite-fashion.png',
				productCategory: 'FASHION',
			}),
		)
	})

	it('applies shortform workflow directives when enabled for fashion category', async () => {
		mockUseCaseExecute.mockResolvedValue({
			status: 'SUCCEEDED',
			job: { id: 'project_1', retryCount: 0, result: { variants: [] } },
			events: [],
			qualityScore: 0.9,
			shouldRetry: false,
		})

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/fashion.png',
				productCategory: 'FASHION',
				autoShortformWorkflow: true,
				creativeContext: {
					location: '성수동',
					profession: '하이패션 모델',
					identity: '한국 여성',
					traits: ['개성이 뚜렷한 분위기'],
				},
				copy: { hook: '성수 OOTD', description: '체크 원피스', cta: '지금 확인' },
				options: { duration: 15, stylePreset: 'TRENDY' },
			},
			opts: { attempts: 3 },
			attemptsMade: 0,
		} as Job<MediaGenerateJobData>

		await processMediaGenerateJob(job)

		expect(mockUseCaseExecute).toHaveBeenCalledWith(
			expect.objectContaining({
				productCategory: 'FASHION',
				promptDirectives: expect.arrayContaining([
					expect.stringContaining('Operating soul:'),
					expect.stringContaining('Purpose:'),
					expect.stringContaining('Workflow execution order'),
					expect.stringContaining('성수동'),
				]),
				workflowStages: expect.arrayContaining(['상품 분석', '트렌드 리서치', '비판 리뷰', '비전 평가']),
			}),
		)
	})

	it('routes terminal failures to dead-letter queue', async () => {
		mockFindById.mockResolvedValue({ ...MOCK_JOB_RECORD, status: 'FAILED', retryCount: 2 })
		mockUseCaseExecute.mockRejectedValue(new Error('provider exhausted'))

		const job = {
			id: 'job_1',
			data: {
				projectId: 'project_1',
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				options: { duration: 15 },
			},
			opts: { attempts: 3 },
			attemptsMade: 2,
		} as Job<MediaGenerateJobData>

		const result = await processMediaGenerateJob(job)

		expect(result.status).toBe('FAILED')
		expect(mockAddJob).toHaveBeenCalledWith(
			'media-generate-dlq',
			expect.objectContaining({
				jobId: 'project_1',
				userId: 'user_1',
				sourceQueue: 'media-generate',
			}),
			expect.objectContaining({
				jobId: expect.stringContaining('project_1:dlq:'),
			}),
			)
	})

	it('rethrows retryable failures while attempts remain', async () => {
		mockFindById.mockResolvedValue({ ...MOCK_JOB_RECORD, status: 'QUEUED', retryCount: 0 })
		mockUseCaseExecute.mockRejectedValue(new Error('temporary provider timeout'))

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

		await expect(processMediaGenerateJob(job)).rejects.toThrow('temporary provider timeout')
		expect(mockAddJob).not.toHaveBeenCalled()
	})
})
