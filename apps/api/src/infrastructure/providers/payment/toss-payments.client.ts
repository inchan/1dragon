type RequestOptions = {
	method: 'POST'
	path: string
	body: Record<string, unknown>
}

type TossPaymentRequest = {
	orderId: string
	orderName: string
	customerEmail: string
	amount: number
	successUrl: string
	failUrl: string
}

type TossPaymentApproveRequest = {
	paymentKey: string
	orderId: string
	amount: number
}

type TossPaymentCancelRequest = {
	cancelReason: string
	cancelAmount?: number
}

export class TossPaymentsApiError extends Error {
	public readonly statusCode: number
	public readonly providerCode: string | undefined

	public constructor(statusCode: number, message: string, providerCode?: string) {
		super(message)
		this.name = 'TossPaymentsApiError'
		this.statusCode = statusCode
		this.providerCode = providerCode
	}
}

export class TossPaymentsClient {
	private readonly baseUrl: string
	private readonly secretKey: string

	public constructor(secretKey: string, baseUrl = 'https://api.tosspayments.com') {
		if (!secretKey) {
			throw new Error('TossPayments secret key is required')
		}

		this.secretKey = secretKey
		this.baseUrl = baseUrl
	}

	public async requestPayment(payload: TossPaymentRequest): Promise<Record<string, unknown>> {
		return this.request({
			method: 'POST',
			path: '/v1/payments',
			body: payload,
		})
	}

	public async approvePayment(payload: TossPaymentApproveRequest): Promise<Record<string, unknown>> {
		return this.request({
			method: 'POST',
			path: '/v1/payments/confirm',
			body: payload,
		})
	}

	public async cancelPayment(
		paymentKey: string,
		payload: TossPaymentCancelRequest,
	): Promise<Record<string, unknown>> {
		return this.request({
			method: 'POST',
			path: `/v1/payments/${paymentKey}/cancel`,
			body: payload,
		})
	}

	private async request(options: RequestOptions): Promise<Record<string, unknown>> {
		const response = await fetch(`${this.baseUrl}${options.path}`, {
			method: options.method,
			headers: {
				Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(options.body),
		})

		const rawBody = await response.text()
		let data: Record<string, unknown>

		if (!rawBody.trim()) {
			throw new TossPaymentsApiError(
				response.status,
				'TossPayments returned an empty response body',
				'INVALID_JSON',
			)
		}

		try {
			data = JSON.parse(rawBody) as Record<string, unknown>
		} catch {
			throw new TossPaymentsApiError(
				response.status,
				'Failed to parse TossPayments response JSON',
				'INVALID_JSON',
			)
		}

		if (!response.ok) {
			throw new TossPaymentsApiError(
				response.status,
				typeof data.message === 'string' ? data.message : 'TossPayments request failed',
				typeof data.code === 'string' ? data.code : undefined,
			)
		}

		return data
	}
}

export type { TossPaymentRequest, TossPaymentApproveRequest, TossPaymentCancelRequest }
