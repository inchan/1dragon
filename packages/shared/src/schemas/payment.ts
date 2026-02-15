/**
 * Payment Domain Schemas
 * 구독/결제/쿼터 요청/응답 스키마
 */

import { z } from 'zod'
import { planTierSchema, subscriptionStatusSchema } from '../enums'

// ── Request Schemas ──────────────────────────────────────────────────────────

export const createSubscriptionRequestSchema = z.object({
	planTier: planTierSchema,
	billingCycle: z.enum(['MONTHLY', 'YEARLY']),
	paymentMethod: z.object({
		type: z.string(),
		token: z.string(),
	}),
})

export const cancelSubscriptionRequestSchema = z.object({
	reason: z.string().optional(),
})

export const refundRequestSchema = z.object({
	subscriptionId: z.string().uuid(),
	reason: z.string(),
})

// ── Response Schemas ─────────────────────────────────────────────────────────

export const subscriptionResponseSchema = z.object({
	id: z.string().uuid(),
	planTier: planTierSchema,
	status: subscriptionStatusSchema,
	billingCycle: z.enum(['MONTHLY', 'YEARLY']),
	currentPeriodStart: z.string().datetime(),
	currentPeriodEnd: z.string().datetime(),
	cancelledAt: z.string().datetime().optional(),
	creditsUsed: z.number().int().min(0),
	creditsTotal: z.number().int().min(0),
	watermarkBonusUsed: z.number().int().min(0),
	watermarkBonusTotal: z.number().int().min(0),
})

export const quotaResponseSchema = z.object({
	creditsRemaining: z.number().int().min(0),
	creditsTotal: z.number().int().min(0),
	watermarkBonusRemaining: z.number().int().min(0),
	watermarkBonusTotal: z.number().int().min(0),
	canGenerate: z.boolean(),
})

export const paymentHistoryItemSchema = z.object({
	id: z.string().uuid(),
	amount: z.number().positive(),
	currency: z.string(),
	status: z.enum(['SUCCEEDED', 'FAILED', 'REFUNDED']),
	method: z.string(),
	paidAt: z.string().datetime(),
	refundedAt: z.string().datetime().optional(),
})

// ── Type Exports ─────────────────────────────────────────────────────────────

export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionRequestSchema>
export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionRequestSchema>
export type RefundRequest = z.infer<typeof refundRequestSchema>
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>
export type QuotaResponse = z.infer<typeof quotaResponseSchema>
export type PaymentHistoryItem = z.infer<typeof paymentHistoryItemSchema>
