import { afterEach, describe, expect, it, vi } from 'vitest'
import { TossPaymentsApiError, TossPaymentsClient } from './toss-payments.client.js'

describe('TossPaymentsClient', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('approves payment successfully', async () => {
		const approveBody = JSON.stringify({ paymentKey: 'pay_123', status: 'DONE' })
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => approveBody,
		})
		vi.stubGlobal('fetch', fetchMock)

		const client = new TossPaymentsClient('test_secret')
		const result = await client.approvePayment({
			paymentKey: 'pay_123',
			orderId: 'order_123',
			amount: 9900,
		})

		expect(result.status).toBe('DONE')
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.tosspayments.com/v1/payments/confirm')
	})

	it('throws provider error on failed request', async () => {
		const errorBody = JSON.stringify({ code: 'INVALID_REQUEST', message: 'invalid payload' })
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 400,
			text: async () => errorBody,
		})
		vi.stubGlobal('fetch', fetchMock)

		const client = new TossPaymentsClient('test_secret')

		await expect(
			client.cancelPayment('pay_123', {
				cancelReason: '사용자 요청 취소',
			}),
		).rejects.toEqual(
			expect.objectContaining<TossPaymentsApiError>({
				name: 'TossPaymentsApiError',
				message: 'invalid payload',
				statusCode: 400,
				providerCode: 'INVALID_REQUEST',
			}),
		)
	})
})
