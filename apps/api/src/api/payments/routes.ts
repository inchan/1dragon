import { and, desc, eq, gte } from 'drizzle-orm'
import { Hono } from 'hono'
import {
	ErrorCode,
	cancelSubscriptionRequestSchema,
	createSubscriptionRequestSchema,
	refundRequestSchema,
} from '@1dragon/shared'
import { HandleTossWebhookUseCase, InvalidWebhookSignatureError } from '@/application/payment/handle-toss-webhook.usecase.js'
import { requireAuth } from '@/infrastructure/auth/hono-handler.js'
import { logger } from '@/infrastructure/logging/logger.js'
import { db } from '@/infrastructure/persistence/db.js'
import { WebhookEventRepository } from '@/infrastructure/persistence/repositories/webhook-event.repository.js'
import { paymentTransactions, plans, subscriptions } from '@/infrastructure/persistence/schema.js'
import { TossPaymentsClient } from '@/infrastructure/providers/payment/toss-payments.client.js'
import { config } from '@/shared/config.js'

const TOSS_SECRET = config.TOSSPAYMENTS_SECRET ?? ''
const WEBHOOK_SECRET = config.TOSSPAYMENTS_WEBHOOK_SECRET ?? TOSS_SECRET
const UNAUTHORIZED_RESPONSE = {
	success: false,
	error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
} as const

function mapFieldErrors(errors: ReadonlyArray<{ path: Array<string | number>; message: string }>) {
	return errors.map((error) => ({
		field: error.path.join('.'),
		message: error.message,
	}))
}

export function createPaymentsRouter(): Hono {
	const app = new Hono()
	const tossClient = TOSS_SECRET ? new TossPaymentsClient(TOSS_SECRET) : null
	const webhookStore = new WebhookEventRepository()
	const handleTossWebhook = new HandleTossWebhookUseCase(webhookStore, WEBHOOK_SECRET)

	app.get('/plans', async (c) => {
		const list = await db.select().from(plans)
		return c.json({
			success: true,
			data: list,
		})
	})

		app.post('/webhooks/toss', async (c) => {
			const signature = c.req.header('Toss-Signature') ?? c.req.header('X-Toss-Signature')
			if (!signature) {
			return c.json(
				{
					success: false,
					error: {
						code: 'MISSING_SIGNATURE',
						message: 'Webhook signature is required',
					},
				},
				401,
			)
		}

			const rawBody = await c.req.text()
			let payload: Record<string, unknown>
			try {
				payload = JSON.parse(rawBody) as Record<string, unknown>
			} catch (error) {
				logger.warn({ error, bodyLength: rawBody.length }, 'Invalid Toss webhook JSON payload')
				return c.json(
					{
						success: false,
						error: {
							code: 'INVALID_PAYLOAD',
							message: 'Webhook body must be valid JSON',
						},
					},
					400,
				)
			}
			const eventId =
				typeof payload.eventId === 'string'
					? payload.eventId
					: typeof payload.event_id === 'string'
					? payload.event_id
					: ''
		const resourceId =
			typeof payload.paymentKey === 'string'
				? payload.paymentKey
				: typeof payload.payment_key === 'string'
					? payload.payment_key
					: eventId
		const version =
			typeof payload.version === 'string'
				? payload.version
				: typeof payload.version === 'number'
					? String(payload.version)
					: '0'
		const occurredAt =
			typeof payload.createdAt === 'string'
				? new Date(payload.createdAt)
				: typeof payload.created_at === 'string'
					? new Date(payload.created_at)
					: new Date()

		try {
			const result = await handleTossWebhook.execute({
				eventId,
				eventType: typeof payload.eventType === 'string' ? payload.eventType : 'unknown',
				resourceId,
				version,
				occurredAt,
				signature,
				rawBody,
				payload,
			})

			return c.json({
				success: true,
				data: result,
			})
		} catch (error) {
			if (error instanceof InvalidWebhookSignatureError) {
				return c.json(
					{
						success: false,
						error: {
							code: 'INVALID_SIGNATURE',
							message: error.message,
						},
					},
					401,
				)
			}

			throw error
		}
	})

	app.use('*', requireAuth)

	app.get('/subscription', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const subscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			with: {
				plan: true,
			},
			orderBy: [desc(subscriptions.createdAt)],
		})

		if (!subscription) {
			return c.json(
				{
					success: false,
					error: {
						code: 'SUBSCRIPTION_NOT_FOUND',
						message: 'Subscription not found',
					},
				},
				404,
			)
		}

		return c.json({
			success: true,
			data: subscription,
		})
	})

	app.get('/quota', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const subscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			with: {
				plan: true,
			},
			orderBy: [desc(subscriptions.createdAt)],
		})

		if (!subscription || !subscription.plan) {
			return c.json(
				{
					success: false,
					error: {
						code: 'SUBSCRIPTION_NOT_FOUND',
						message: 'Subscription not found',
					},
				},
				404,
			)
		}

		return c.json({
			success: true,
			data: {
				creditsRemaining: subscription.remainingCredits,
				creditsTotal: subscription.baseQuota + subscription.watermarkBonusCredits,
				watermarkBonusRemaining: Math.max(0, 5 - subscription.watermarkBonusCredits),
				watermarkBonusTotal: 5,
				canGenerate: subscription.remainingCredits > 0,
				used: Math.max(0, subscription.baseQuota - subscription.remainingCredits),
				quota: subscription.baseQuota,
			},
		})
	})

	app.get('/offers/limited-time', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const subscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			with: { plan: true },
			orderBy: [desc(subscriptions.createdAt)],
		})

		if (!subscription || !subscription.plan) {
			return c.json({ success: true, data: { active: false } })
		}

		const shouldOffer = subscription.plan.tier === 'FREE' && subscription.remainingCredits === 0
		const now = new Date()

		if (!shouldOffer) {
			return c.json({ success: true, data: { active: false } })
		}

		const expiresAt = subscription.offerExpiresAt ?? new Date(now.getTime() + 72 * 60 * 60 * 1000)
		if (!subscription.offerExpiresAt) {
			await db
				.update(subscriptions)
				.set({
					offerExpiresAt: expiresAt,
					updatedAt: now,
				})
				.where(eq(subscriptions.id, subscription.id))
		}

		return c.json({
			success: true,
			data: {
				active: expiresAt.getTime() > now.getTime(),
				discountPercent: 50,
				expiresAt: expiresAt.toISOString(),
			},
		})
	})

	app.post('/subscription', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const body = await c.req.json().catch(() => null)
		const parsed = createSubscriptionRequestSchema.safeParse(body)

		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const targetPlan = await db.query.plans.findFirst({
			where: eq(plans.tier, parsed.data.planTier),
		})

		if (!targetPlan) {
			return c.json(
				{
					success: false,
					error: {
						code: 'PLAN_NOT_FOUND',
						message: 'Plan not found',
					},
				},
				404,
			)
		}

		const existing = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			orderBy: [desc(subscriptions.createdAt)],
		})

		const now = new Date()
		const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

		if (existing) {
			const [updated] = await db
				.update(subscriptions)
				.set({
					planId: targetPlan.id,
					billingCycle: parsed.data.billingCycle,
					status: 'ACTIVE',
					baseQuota: targetPlan.quota,
					remainingCredits: targetPlan.quota,
					watermarkBonusCredits: 0,
					currentPeriodStart: now,
					currentPeriodEnd: periodEnd,
					cancelAtPeriodEnd: false,
					paymentRetryCount: 0,
					pastDueSince: null,
					nextRetryAt: null,
					offerExpiresAt: null,
					updatedAt: now,
				})
				.where(eq(subscriptions.id, existing.id))
				.returning()

			return c.json({ success: true, data: updated })
		}

		const [created] = await db
			.insert(subscriptions)
			.values({
				userId: user.id,
				planId: targetPlan.id,
				billingCycle: parsed.data.billingCycle,
				status: 'ACTIVE',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
				baseQuota: targetPlan.quota,
				remainingCredits: targetPlan.quota,
				watermarkBonusCredits: 0,
			})
			.returning()

		return c.json({ success: true, data: created })
	})

	app.post('/subscription/cancel', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const body = await c.req.json().catch(() => ({}))
		const parsed = cancelSubscriptionRequestSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const subscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			orderBy: [desc(subscriptions.createdAt)],
		})

		if (!subscription) {
			return c.json(
				{ success: false, error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Not found' } },
				404,
			)
		}

		const [updated] = await db
			.update(subscriptions)
			.set({
				status: 'CANCELLED',
				cancelAtPeriodEnd: true,
				updatedAt: new Date(),
			})
			.where(eq(subscriptions.id, subscription.id))
			.returning()

		return c.json({ success: true, data: updated })
	})

	app.post('/checkout', async (c) => {
		if (!tossClient) {
			return c.json(
				{
					success: false,
					error: {
						code: 'TOSS_NOT_CONFIGURED',
						message: 'TossPayments secret is not configured',
					},
				},
				500,
			)
		}

		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const body = (await c.req.json().catch(() => ({}))) as {
			paymentKey: string
			orderId: string
			amount: number
			method?: string
		}

		const subscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			orderBy: [desc(subscriptions.createdAt)],
		})
		if (!subscription) {
			return c.json(
				{ success: false, error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Not found' } },
				404,
			)
		}

		const approved = await tossClient.approvePayment({
			paymentKey: body.paymentKey,
			orderId: body.orderId,
			amount: body.amount,
		})

		await db.insert(paymentTransactions).values({
			userId: user.id,
			subscriptionId: subscription.id,
			paymentKey: body.paymentKey,
			orderId: body.orderId,
			amount: body.amount,
			status: 'SUCCEEDED',
			method: body.method ?? 'CARD',
			paidAt: new Date(),
		})

		return c.json({ success: true, data: approved })
	})

	app.post('/refund', async (c) => {
		if (!tossClient) {
			return c.json(
				{
					success: false,
					error: {
						code: 'TOSS_NOT_CONFIGURED',
						message: 'TossPayments secret is not configured',
					},
				},
				500,
			)
		}

		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}
		const body = await c.req.json().catch(() => null)
		const parsed = refundRequestSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const [latestPayment] = await db
			.select()
			.from(paymentTransactions)
			.where(
				and(
					eq(paymentTransactions.userId, user.id),
					eq(paymentTransactions.subscriptionId, parsed.data.subscriptionId),
					eq(paymentTransactions.status, 'SUCCEEDED'),
					gte(paymentTransactions.paidAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
				),
			)
			.orderBy(desc(paymentTransactions.paidAt))
			.limit(1)

		if (!latestPayment || !latestPayment.paidAt) {
			return c.json(
				{
					success: false,
					error: {
						code: 'REFUND_WINDOW_EXPIRED',
						message:
							'구독 시작 7일 이후에는 환불이 불가합니다. 다음 결제일까지 서비스를 이용하실 수 있습니다',
					},
				},
				400,
			)
		}

		const refund = await tossClient.cancelPayment(latestPayment.paymentKey, {
			cancelReason: parsed.data.reason,
		})

		await db
			.update(paymentTransactions)
			.set({
				status: 'REFUNDED',
				refundedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(paymentTransactions.id, latestPayment.id))

		const [updatedSubscription] = await db
			.update(subscriptions)
			.set({
				status: 'CANCELLED',
				cancelAtPeriodEnd: false,
				updatedAt: new Date(),
			})
			.where(eq(subscriptions.id, latestPayment.subscriptionId))
			.returning()

		return c.json({
			success: true,
			data: {
				refund,
				subscription: updatedSubscription,
			},
		})
	})

	return app
}
