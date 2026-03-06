import type {
	AnalyzeProductRequest,
	ProductAnalysisResponse,
	OnboardingRequest,
	OnboardingResponse,
	UpdateProfileRequest,
	UserProfile,
	CreateVideoJobRequest,
	CreateVideoJobResponse,
	MediaJobStatusResponse,
} from '@1dragon/shared'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

type UnknownObject = Record<string, unknown>

function parseResponseJson(response: Response): Promise<unknown> {
	return response.json().catch(() => {
		throw new Error(`Invalid JSON response from ${response.url}`)
	})
}

function extractErrorMessage(body: unknown): string | undefined {
	if (!body || typeof body !== 'object') {
		return undefined
	}

	const candidate = body as UnknownObject
	const message = candidate.message
	const codeMessage = candidate.error

	if (typeof message === 'string') {
		return message
	}

	if (codeMessage && typeof codeMessage === 'object') {
		const nested = codeMessage as UnknownObject
		if (typeof nested.message === 'string') {
			return nested.message
		}
	}

	return undefined
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const hasFormDataBody =
		typeof FormData !== 'undefined' && options?.body instanceof FormData

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			...(hasFormDataBody ? {} : { 'Content-Type': 'application/json' }),
			...options?.headers,
		},
		credentials: 'include',
	})

	const body = await parseResponseJson(response)

	if (!response.ok) {
		throw new Error(extractErrorMessage(body) || `HTTP error! status: ${response.status}`)
	}

	if (
		body &&
		typeof body === 'object' &&
		'success' in body &&
		'data' in body &&
		(body as { success?: unknown }).success === true
	) {
		return (body as { data: T }).data
	}

	return body as T
}

async function uploadApi<T>(endpoint: string, formData: FormData): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method: 'POST',
		body: formData,
		credentials: 'include',
	})

	const body = await parseResponseJson(response)

	if (!response.ok) {
		throw new Error(extractErrorMessage(body) || `HTTP error! status: ${response.status}`)
	}

	if (
		body &&
		typeof body === 'object' &&
		'success' in body &&
		'data' in body &&
		(body as { success?: unknown }).success === true
	) {
		return (body as { data: T }).data
	}

	return body as T
}

export interface AnalyzeProductResponse extends ProductAnalysisResponse {
	queue: {
		status: 'QUEUED' | 'PROCESSING' | 'DONE'
		message: string
		info?: string
	}
}

export interface AnalyzeProductPayload extends AnalyzeProductRequest {
	image: File
}

export interface ProductAnalysisListResponse {
	total: number
	limit: number
	offset: number
	items: ProductAnalysisResponse[]
}

export interface PlanDto {
	id: string
	name: string
	tier: 'FREE' | 'STARTER'
	quota: number
	priceMonthly: number
	priceYearly: number
	limits: {
		maxVideoLengthSec: number
		watermarkRequired: boolean
		multiPlatformEnabled: boolean
	}
	features: string[]
}

export interface SubscriptionDto {
	id: string
	userId: string
	planId: string
	billingCycle: 'MONTHLY' | 'YEARLY'
	status: 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'TRIAL'
	currentPeriodStart: string
	currentPeriodEnd: string
	baseQuota: number
	remainingCredits: number
	cancelAtPeriodEnd: boolean
	paymentRetryCount: number
	plan?: PlanDto
}

export interface QuotaDto {
	creditsRemaining: number
	creditsTotal: number
	watermarkBonusRemaining: number
	watermarkBonusTotal: number
	canGenerate: boolean
	used: number
	quota: number
}

export interface LimitedOfferDto {
	active: boolean
	discountPercent?: number
	expiresAt?: string
}

export interface SocialConnectUrlResponse {
	url: string
}

export interface SocialConnectionResponse {
	platform: 'TIKTOK' | 'INSTAGRAM'
	connected: boolean
	expiresInSec: number
}

export interface SocialShareSuccessData {
	platform: 'TIKTOK' | 'INSTAGRAM'
	attempts: number
	remoteId: string
	shareUrl: string
}

export interface SocialShareFailureData {
	platform: 'TIKTOK' | 'INSTAGRAM'
	fallbackDownloadUrl: string
}

export type SocialShareResponse =
	| {
			success: true
			data: SocialShareSuccessData
	  }
	| {
			success: false
			error: { code: string; message: string }
			data?: SocialShareFailureData
	  }

export const api = {
	// User Profile
	getProfile: (): Promise<UserProfile> =>
		fetchApi<UserProfile>('/api/v1/users/me'),

	updateProfile: (data: UpdateProfileRequest): Promise<UserProfile> =>
		fetchApi<UserProfile>('/api/v1/users/me', {
			method: 'PATCH',
			body: JSON.stringify(data),
		}),

	// Onboarding
	completeOnboarding: (data: OnboardingRequest): Promise<OnboardingResponse> =>
		fetchApi<OnboardingResponse>('/api/v1/users/me/onboarding', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	// Payments / Billing
	getPlans: (): Promise<PlanDto[]> => fetchApi<PlanDto[]>('/api/v1/payments/plans'),

	getSubscription: (): Promise<SubscriptionDto> =>
		fetchApi<SubscriptionDto>('/api/v1/payments/subscription'),

	getQuota: (): Promise<QuotaDto> => fetchApi<QuotaDto>('/api/v1/payments/quota'),

	getLimitedOffer: (): Promise<LimitedOfferDto> =>
		fetchApi<LimitedOfferDto>('/api/v1/payments/offers/limited-time'),

	subscribe: (data: {
		planTier: 'FREE' | 'STARTER'
		billingCycle: 'MONTHLY' | 'YEARLY'
		paymentMethod: { type: string; token: string }
	}): Promise<SubscriptionDto> =>
		fetchApi<SubscriptionDto>('/api/v1/payments/subscription', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	checkout: (data: { paymentKey: string; orderId: string; amount: number; method?: string }): Promise<unknown> =>
		fetchApi('/api/v1/payments/checkout', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	cancelSubscription: (reason?: string): Promise<SubscriptionDto> =>
		fetchApi<SubscriptionDto>('/api/v1/payments/subscription/cancel', {
			method: 'POST',
			body: JSON.stringify({ reason }),
		}),

	refund: (data: { subscriptionId: string; reason: string }): Promise<unknown> =>
		fetchApi('/api/v1/payments/refund', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	// Product Analysis
	analyzeProduct: (payload: AnalyzeProductPayload): Promise<AnalyzeProductResponse> => {
		const formData = new FormData()
		formData.append('image', payload.image)

		if (payload.productName) {
			formData.append('productName', payload.productName)
		}

		if (payload.category) {
			formData.append('category', payload.category)
		}

		return uploadApi<AnalyzeProductResponse>('/api/v1/products/analyze', formData)
	},

	getProductAnalyses: (limit = 20, offset = 0): Promise<ProductAnalysisListResponse> =>
		fetchApi<ProductAnalysisListResponse>(`/api/v1/products/analyses?limit=${limit}&offset=${offset}`),

	getSocialConnectUrl: (platform: 'tiktok' | 'instagram'): Promise<SocialConnectUrlResponse> =>
		fetchApi<SocialConnectUrlResponse>(`/api/v1/media/shares/${platform}/connect-url`),

	connectSocialAccount: (
		platform: 'tiktok' | 'instagram',
		code: string,
	): Promise<SocialConnectionResponse> =>
		fetchApi<SocialConnectionResponse>(`/api/v1/media/shares/${platform}/connect`, {
			method: 'POST',
			body: JSON.stringify({ code }),
		}),

	shareToSocial: async (
		platform: 'tiktok' | 'instagram',
		input: { variantUrl: string; caption: string; hashtags: string[] },
	): Promise<SocialShareResponse> => {
		const response = await fetch(`${API_BASE_URL}/api/v1/media/shares/${platform}`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(input),
		})

		const body = (await parseResponseJson(response)) as SocialShareResponse | null

			if (!response.ok) {
				throw new Error(
					(extractErrorMessage(body) ?? 'SNS 공유 요청에 실패했습니다.'),
				)
			}

			if (!body || typeof body !== 'object' || typeof body.success !== 'boolean') {
				throw new Error('SNS 공유 응답 형식이 올바르지 않습니다.')
			}

			return body
		},

	createVideoJob: (
		payload: Pick<
			CreateVideoJobRequest,
			'imageUrl' | 'stylePreset' | 'platforms' | 'duration' | 'stage' | 'token' | 'narration' | 'subtitleStyle'
		> & {
			idempotencyKey?: string
			productCategory?: string
			moods?: string[]
			keywords?: string[]
			autoShortformWorkflow?: boolean
			creativeContext?: {
				location?: string
				profession?: string
				identity?: string
				traits?: string[]
				visualStyle?: string
			}
			copy?: { hook: string; description: string; cta: string }
		},
	): Promise<CreateVideoJobResponse & { isDuplicate?: boolean }> =>
		fetchApi<CreateVideoJobResponse & { isDuplicate?: boolean }>('/api/v1/media/jobs', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: payload.idempotencyKey
				? {
						'Idempotency-Key': payload.idempotencyKey,
					}
				: {},
		}),

	getVideoJob: (jobId: string): Promise<MediaJobStatusResponse> =>
		fetchApi<MediaJobStatusResponse>(`/api/v1/media/jobs/${jobId}`),

	generateModelComposite: (payload: {
		productImageUrl: string
		productName?: string
		productCategory: string
		productKeywords: string[]
		persona: {
			id: string
			gender: string
			ageRange: string
			bodyType: string
			style: string
			imagenPromptTemplate?: string
		}
	}): Promise<{
		compositeImageUrl: string | null
		qualityScore: number | null
		accepted: boolean
		fallbackToProductOnly: boolean
		message: string
	}> =>
		fetchApi('/api/v1/media/model-composite', {
			method: 'POST',
			body: JSON.stringify(payload),
		}),
}
