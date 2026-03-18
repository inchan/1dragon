import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

const {
	mockAddJob,
	mockAppendJobStatusEvent,
	mockLoggerError,
	mockSelect,
	mockSubscriptionFindFirst,
	mockJobEventRows,
} = vi.hoisted(() => ({
	mockAddJob: vi.fn(),
	mockAppendJobStatusEvent: vi.fn(),
	mockLoggerError: vi.fn(),
	mockSelect: vi.fn(),
	mockSubscriptionFindFirst: vi.fn(),
	mockJobEventRows: vi.fn(),
}))

vi.mock('drizzle-orm', () => ({
	and: (...args: unknown[]) => ({ type: 'and', args }),
	count: () => ({ type: 'count' }),
	desc: (value: unknown) => ({ type: 'desc', value }),
	eq: (left: unknown, right: unknown) => ({ type: 'eq', left, right }),
	gte: (left: unknown, right: unknown) => ({ type: 'gte', left, right }),
}))

vi.mock('@/infrastructure/persistence/db.js', () => ({
	db: {
		select: mockSelect,
		query: {
			subscriptions: {
				findFirst: mockSubscriptionFindFirst,
			},
		},
	},
}))

vi.mock('@/infrastructure/persistence/schema.js', () => ({
	jobEvents: {
		jobId: 'job_events.job_id',
		eventType: 'job_events.event_type',
		createdAt: 'job_events.created_at',
	},
	subscriptions: {
		userId: 'subscriptions.user_id',
		createdAt: 'subscriptions.created_at',
	},
	videoJobs: {
		id: 'video_jobs.id',
		userId: 'video_jobs.user_id',
		status: 'video_jobs.status',
		completedAt: 'video_jobs.completed_at',
	},
}))

vi.mock('@/infrastructure/queue/bullmq.config.js', () => ({
	QueueName: {
		MEDIA_GENERATE: 'media-generate',
	},
	addJob: mockAddJob,
}))

vi.mock('@/infrastructure/persistence/job-event.helper.js', () => ({
	appendJobStatusEvent: mockAppendJobStatusEvent,
}))

vi.mock('@/infrastructure/logging/index.js', () => ({
	logger: {
		error: mockLoggerError,
	},
}))

import { buildDeterministicJobId } from './helpers.js'
import { createJobSubRouter } from './job-routes.js'

const NOW = new Date('2026-03-11T00:00:00.000Z')
const ONE_MINUTE_LATER = new Date('2026-03-11T00:01:00.000Z')

function buildApp(deps: Parameters<typeof createJobSubRouter>[0]): Hono {
	const app = new Hono()
	app.use('*', async (c, next) => {
		c.set('user', {
			id: 'user_1',
			createdAt: NOW,
			updatedAt: NOW,
			email: 'user_1@example.com',
			emailVerified: true,
			name: 'Test User',
			image: null,
		})
		await next()
	})
	app.route('/', createJobSubRouter(deps))
	return app
}

function createCountSelectResult(totalJobs: number) {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue([{ totalJobs }]),
		}),
	}
}

function createEventSelectResult(rows: Array<Record<string, unknown>>) {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				orderBy: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(rows),
				}),
			}),
		}),
	}
}

describe('createJobSubRouter', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAddJob.mockResolvedValue(undefined)
		mockAppendJobStatusEvent.mockResolvedValue(undefined)
		mockSubscriptionFindFirst.mockResolvedValue(null)
		mockJobEventRows.mockReturnValue([])
		mockSelect.mockImplementation((shape?: Record<string, unknown>) => {
			if (shape && 'totalJobs' in shape) {
				return createCountSelectResult(0)
			}

			if (shape && 'succeededCount' in shape) {
				return createCountSelectResult(0)
			}

			return createEventSelectResult(mockJobEventRows())
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('creates a job, enqueues media-generate, and returns 201 with canonical job id', async () => {
		const deterministicJobId = buildDeterministicJobId(
			'user_1',
			'submit-1',
			'https://cdn.example.com/product.png',
		)
		const createdJob = {
			id: deterministicJobId,
			userId: 'user_1',
			status: 'QUEUED',
			progress: 0,
			retryCount: 0,
			errorMessage: null,
			inputImageUrl: 'https://cdn.example.com/product.png',
			productAnalysisId: null,
			modelPersonaSelectionId: null,
			startedAt: null,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
		}
		const jobRepository = {
			findById: vi.fn().mockResolvedValue(null),
			create: vi.fn().mockResolvedValue(createdJob),
			updateStatus: vi.fn().mockResolvedValue(createdJob),
		}
		const variantRepository = {
			findByJobId: vi.fn().mockResolvedValue([]),
		}
		const app = buildApp({
			jobRepository: jobRepository as never,
			variantRepository: variantRepository as never,
		})

		const response = await app.fetch(
			new Request('http://localhost/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Idempotency-Key': 'submit-1',
				},
				body: JSON.stringify({
					imageUrl: 'https://cdn.example.com/product.png',
					stylePreset: 'TRENDY',
					platforms: ['TIKTOK'],
					copy: {
						hook: '체형이 살아나는 핏',
						description: '한 컷으로 디테일을 증명합니다.',
						cta: '지금 확인',
					},
					recentConceptFamilies: ['SOCIAL_PROOF'],
					requestedConceptFamily: 'FIT_CHECK',
				}),
			}),
		)
		const body = (await response.json()) as {
			data: {
				id: string
				jobId: string
			}
		}

		expect(response.status).toBe(201)
		expect(body.data.id).toBe(createdJob.id)
		expect(body.data.jobId).toBe(createdJob.id)
		expect(jobRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				id: createdJob.id,
				userId: 'user_1',
				status: 'QUEUED',
			}),
		)
		expect(mockAddJob).toHaveBeenCalledWith(
			'media-generate',
			expect.objectContaining({
				projectId: createdJob.id,
				userId: 'user_1',
				imageUrl: 'https://cdn.example.com/product.png',
				copy: {
					hook: '체형이 살아나는 핏',
					description: '한 컷으로 디테일을 증명합니다.',
					cta: '지금 확인',
				},
				recentConceptFamilies: ['SOCIAL_PROOF'],
				requestedConceptFamily: 'FIT_CHECK',
			}),
			{ jobId: createdJob.id },
		)
		expect(jobRepository.updateStatus).toHaveBeenCalledWith({
			jobId: createdJob.id,
			status: 'QUEUED',
			progress: 0,
		})
	})

	it('normalizes and enqueues reference brief data when provided', async () => {
		const deterministicJobId = buildDeterministicJobId(
			'user_1',
			'reference-brief-1',
			'https://cdn.example.com/product.png',
		)
		const createdJob = {
			id: deterministicJobId,
			userId: 'user_1',
			status: 'QUEUED',
			progress: 0,
			retryCount: 0,
			errorMessage: null,
			inputImageUrl: 'https://cdn.example.com/product.png',
			productAnalysisId: null,
			modelPersonaSelectionId: null,
			startedAt: null,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
		}
		const jobRepository = {
			findById: vi.fn().mockResolvedValue(null),
			create: vi.fn().mockResolvedValue(createdJob),
			updateStatus: vi.fn().mockResolvedValue(createdJob),
		}
		const variantRepository = {
			findByJobId: vi.fn().mockResolvedValue([]),
		}
		const app = buildApp({
			jobRepository: jobRepository as never,
			variantRepository: variantRepository as never,
		})

		const response = await app.fetch(
			new Request('http://localhost/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Idempotency-Key': 'reference-brief-1',
				},
				body: JSON.stringify({
					imageUrl: 'https://cdn.example.com/product.png',
					stylePreset: 'TRENDY',
					platforms: ['TIKTOK'],
					referenceBrief: {
						productName: '  Cloud Wrap Dress  ',
						productCategoryHint: ' apparel / dresses ',
						coreBenefits: ['Waist definition', ' waist definition '],
						targetAudience: {
							summary: ' office-first women ',
							useCases: ['commute', ' commute '],
							painPoints: ['unstyled mornings'],
						},
						landingPageText:
							'  A wrap dress that keeps the waistline clear and still feels polished after work.  ',
						competitorExamples: ['TikTok fashion ads', 'tiktok fashion ads'],
					},
				}),
			}),
		)

		expect(response.status).toBe(201)
		expect(mockAddJob).toHaveBeenCalledWith(
			'media-generate',
			expect.objectContaining({
				referenceBrief: expect.objectContaining({
					productName: 'Cloud Wrap Dress',
				}),
				normalizedReferenceBrief: expect.objectContaining({
					productName: 'Cloud Wrap Dress',
					coreBenefits: ['Waist definition'],
					platformTargets: ['TIKTOK'],
					queryHints: expect.objectContaining({
						productFacts: expect.arrayContaining(['Cloud Wrap Dress', 'apparel / dresses']),
						competitorQueries: ['TikTok fashion ads'],
					}),
				}),
			}),
			{ jobId: createdJob.id },
		)
	})

	it('rejects a reference brief when no landing-page source is provided', async () => {
		const jobRepository = {
			findById: vi.fn(),
			create: vi.fn(),
			updateStatus: vi.fn(),
		}
		const variantRepository = {
			findByJobId: vi.fn().mockResolvedValue([]),
		}
		const app = buildApp({
			jobRepository: jobRepository as never,
			variantRepository: variantRepository as never,
		})

		const response = await app.fetch(
			new Request('http://localhost/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageUrl: 'https://cdn.example.com/product.png',
					stylePreset: 'TRENDY',
					platforms: ['TIKTOK'],
					referenceBrief: {
						productName: 'Cloud Wrap Dress',
						coreBenefits: ['Waist definition'],
						targetAudience: {
							summary: 'office-first women',
							useCases: [],
							painPoints: [],
						},
					},
				}),
			}),
		)
		const body = (await response.json()) as {
			success: boolean
			error: {
				code: string
				message: string
				details?: {
					fieldErrors?: Array<{ field: string; message: string }>
				}
			}
		}

		expect(response.status).toBe(400)
		expect(body.success).toBe(false)
		expect(body.error.code).toBe('VALIDATION')
		expect(body.error.details?.fieldErrors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					field: 'referenceBrief.landingPageUrl',
					message: 'landingPageUrl or landingPageText is required',
				}),
			]),
		)
		expect(jobRepository.create).not.toHaveBeenCalled()
		expect(mockAddJob).not.toHaveBeenCalled()
	})

	it('fetches landing-page truth when only a url is provided', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					`
						<html>
							<head>
								<title>Cloud Wrap Dress | 1Dragon</title>
								<meta
									name="description"
									content="Polished wrap silhouette for commute days."
								/>
							</head>
							<body>
								<main>
									<h1>Cloud Wrap Dress</h1>
									<p>Made for office mornings and after-work dinners.</p>
								</main>
							</body>
						</html>
					`,
					{ headers: { 'content-type': 'text/html; charset=utf-8' } },
				),
			),
		)

		const createdJob = {
			id: buildDeterministicJobId(
				'user_1',
				'reference-brief-url-1',
				'https://cdn.example.com/product.png',
			),
			userId: 'user_1',
			status: 'QUEUED',
			progress: 0,
			retryCount: 0,
			errorMessage: null,
			inputImageUrl: 'https://cdn.example.com/product.png',
			productAnalysisId: null,
			modelPersonaSelectionId: null,
			startedAt: null,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
		}
		const app = buildApp({
			jobRepository: {
				findById: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(createdJob),
				updateStatus: vi.fn().mockResolvedValue(createdJob),
			} as never,
			variantRepository: {
				findByJobId: vi.fn().mockResolvedValue([]),
			} as never,
		})

		const response = await app.fetch(
			new Request('http://localhost/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Idempotency-Key': 'reference-brief-url-1',
				},
				body: JSON.stringify({
					imageUrl: 'https://cdn.example.com/product.png',
					stylePreset: 'TRENDY',
					platforms: ['TIKTOK'],
					referenceBrief: {
						productName: 'Cloud Wrap Dress',
						coreBenefits: ['Waist definition'],
						targetAudience: {
							summary: 'office-first women',
							useCases: ['commute'],
							painPoints: [],
						},
						landingPageUrl: 'https://example.com/products/cloud-wrap-dress',
					},
				}),
			}),
		)

		expect(response.status).toBe(201)
		const payload = mockAddJob.mock.calls[0]?.[1] as {
			normalizedReferenceBrief?: {
				landingPageSource: string
				landingPageTitle?: string
				landingPageDescription?: string
				landingPageExcerpt?: string
				missingSignals: string[]
			}
		}

		expect(payload.normalizedReferenceBrief).toMatchObject({
			landingPageSource: 'fetched_url',
			landingPageTitle: 'Cloud Wrap Dress | 1Dragon',
			landingPageDescription: 'Polished wrap silhouette for commute days.',
		})
		expect(payload.normalizedReferenceBrief?.landingPageExcerpt).toContain('Cloud Wrap Dress')
		expect(payload.normalizedReferenceBrief?.missingSignals).not.toContain('landing_page_text')
	})

	it('falls back safely when landing-page fetch fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

		const createdJob = {
			id: buildDeterministicJobId(
				'user_1',
				'reference-brief-url-fail-1',
				'https://cdn.example.com/product.png',
			),
			userId: 'user_1',
			status: 'QUEUED',
			progress: 0,
			retryCount: 0,
			errorMessage: null,
			inputImageUrl: 'https://cdn.example.com/product.png',
			productAnalysisId: null,
			modelPersonaSelectionId: null,
			startedAt: null,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
		}
		const app = buildApp({
			jobRepository: {
				findById: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(createdJob),
				updateStatus: vi.fn().mockResolvedValue(createdJob),
			} as never,
			variantRepository: {
				findByJobId: vi.fn().mockResolvedValue([]),
			} as never,
		})

		const response = await app.fetch(
			new Request('http://localhost/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Idempotency-Key': 'reference-brief-url-fail-1',
				},
				body: JSON.stringify({
					imageUrl: 'https://cdn.example.com/product.png',
					stylePreset: 'TRENDY',
					platforms: ['TIKTOK'],
					referenceBrief: {
						productName: 'Cloud Wrap Dress',
						coreBenefits: ['Waist definition'],
						targetAudience: {
							summary: 'office-first women',
							useCases: ['commute'],
							painPoints: [],
						},
						landingPageUrl: 'https://example.com/products/cloud-wrap-dress',
					},
				}),
			}),
		)

		expect(response.status).toBe(201)
		const payload = mockAddJob.mock.calls[0]?.[1] as {
			normalizedReferenceBrief?: {
				landingPageSource: string
				landingPageUrl?: string
				landingPageTitle?: string
				landingPageDescription?: string
				landingPageExcerpt?: string
				missingSignals: string[]
			}
		}

		expect(payload.normalizedReferenceBrief?.landingPageSource).toBe('url_only')
		expect(payload.normalizedReferenceBrief?.landingPageUrl).toBe(
			'https://example.com/products/cloud-wrap-dress',
		)
		expect(payload.normalizedReferenceBrief?.landingPageTitle).toBeUndefined()
		expect(payload.normalizedReferenceBrief?.landingPageDescription).toBeUndefined()
		expect(payload.normalizedReferenceBrief?.landingPageExcerpt).toBeUndefined()
		expect(payload.normalizedReferenceBrief?.missingSignals).toContain('landing_page_text')
	})

	it('returns canonical job detail with ascending events and parsed variants', async () => {
		const jobRecord = {
			id: '22222222-2222-4222-8222-222222222222',
			userId: 'user_1',
			status: 'SUCCEEDED',
			progress: 100,
			retryCount: 0,
			errorMessage: null,
			inputImageUrl: 'https://cdn.example.com/product.png',
			productAnalysisId: null,
			modelPersonaSelectionId: null,
			startedAt: NOW,
			completedAt: ONE_MINUTE_LATER,
			createdAt: NOW,
			updatedAt: ONE_MINUTE_LATER,
		}
		const jobRepository = {
			findById: vi.fn().mockResolvedValue(jobRecord),
			create: vi.fn(),
			updateStatus: vi.fn(),
		}
		const variantRepository = {
			findByJobId: vi.fn().mockResolvedValue([
				{
					id: '33333333-3333-4333-8333-333333333333',
					jobId: jobRecord.id,
					platform: 'TIKTOK',
					resolution: '1080x1920',
					duration: 15,
					fileUrl: 'https://cdn.example.com/video.mp4',
					fileSize: 4096,
					thumbnailUrl: 'https://cdn.example.com/video.jpg',
					hasWatermark: false,
				},
			]),
		}
		mockJobEventRows.mockReturnValue([
			{
				createdAt: '2026-03-11T00:02:00.000Z',
				payload: {
					jobId: jobRecord.id,
					previousStatus: 'ANALYZING',
					newStatus: 'SUCCEEDED',
					timestamp: '2026-03-11T00:02:00.000Z',
					metadata: { progress: 100 },
				},
			},
			{
				createdAt: '2026-03-11T00:01:00.000Z',
				payload: {
					jobId: jobRecord.id,
					previousStatus: 'QUEUED',
					newStatus: 'ANALYZING',
					timestamp: '2026-03-11T00:01:00.000Z',
					metadata: { progress: 20 },
				},
			},
		])
		const app = buildApp({
			jobRepository: jobRepository as never,
			variantRepository: variantRepository as never,
		})

		const response = await app.fetch(new Request(`http://localhost/jobs/${jobRecord.id}`))
		const body = (await response.json()) as {
			data: {
				job: {
					id: string
					jobId: string
					status: string
					progress: number
				}
				events: Array<{
					payload: {
						newStatus: string
					}
				}>
				variants: Array<{
					id: string
					jobId: string
					platform: string
					videoUrl: string
					thumbnailUrl: string
					resolution: {
						width: number
						height: number
					}
				}>
			}
		}

		expect(response.status).toBe(200)
		expect(body.data.job).toMatchObject({
			id: jobRecord.id,
			jobId: jobRecord.id,
			status: 'SUCCEEDED',
			progress: 100,
		})
		expect(body.data.events).toHaveLength(2)
		expect(body.data.events[0]!.payload.newStatus).toBe('ANALYZING')
		expect(body.data.events[1]!.payload.newStatus).toBe('SUCCEEDED')
		expect(body.data.variants).toEqual([
			expect.objectContaining({
				id: '33333333-3333-4333-8333-333333333333',
				jobId: jobRecord.id,
				platform: 'TIKTOK',
				videoUrl: 'https://cdn.example.com/video.mp4',
				thumbnailUrl: 'https://cdn.example.com/video.jpg',
				resolution: { width: 1080, height: 1920 },
			}),
		])
	})

	it('marks the job failed and returns 503 when enqueue fails', async () => {
		const createdJob = {
			id: '44444444-4444-4444-8444-444444444444',
			userId: 'user_1',
			status: 'QUEUED',
			progress: 0,
			retryCount: 0,
			errorMessage: null,
			inputImageUrl: 'https://cdn.example.com/product.png',
			productAnalysisId: null,
			modelPersonaSelectionId: null,
			startedAt: null,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
		}
		const jobRepository = {
			findById: vi.fn().mockResolvedValue(null),
			create: vi.fn().mockResolvedValue(createdJob),
			updateStatus: vi.fn().mockResolvedValue({
				...createdJob,
				status: 'FAILED',
				progress: 100,
				errorMessage: 'redis unavailable',
			}),
		}
		const variantRepository = {
			findByJobId: vi.fn().mockResolvedValue([]),
		}
		mockAddJob.mockRejectedValueOnce(new Error('redis unavailable'))
		const app = buildApp({
			jobRepository: jobRepository as never,
			variantRepository: variantRepository as never,
		})

		const response = await app.fetch(
			new Request('http://localhost/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageUrl: 'https://cdn.example.com/product.png',
					stylePreset: 'TRENDY',
					platforms: ['TIKTOK'],
				}),
			}),
		)
		const body = (await response.json()) as {
			success: boolean
			error: {
				code: string
				message: string
			}
		}

		expect(response.status).toBe(503)
		expect(body).toMatchObject({
			success: false,
			error: {
				code: 'PROVIDER_ERROR',
				message: 'Failed to enqueue generation job',
			},
		})
		expect(jobRepository.updateStatus).toHaveBeenCalledWith(
			expect.objectContaining({
				jobId: createdJob.id,
				status: 'FAILED',
				progress: 100,
				errorMessage: 'redis unavailable',
			}),
		)
		expect(mockAppendJobStatusEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				jobId: createdJob.id,
				userId: 'user_1',
				previousStatus: 'QUEUED',
				newStatus: 'FAILED',
				errorMessage: 'redis unavailable',
				metadata: {
					source: 'enqueue',
					reason: 'redis unavailable',
				},
			}),
		)
	})
})
