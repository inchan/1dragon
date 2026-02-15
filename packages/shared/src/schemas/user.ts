import { z } from 'zod'

// ── User Profile ─────────────────────────────────────────────────────────────

export const userProfileSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().nullable(),
	avatarUrl: z.string().url().nullable(),
	isOnboardingCompleted: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export type UserProfile = z.infer<typeof userProfileSchema>

// ── Update Profile Request ───────────────────────────────────────────────────

export const updateProfileRequestSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	avatarUrl: z.string().url().max(2048).optional(),
})

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

// ── Onboarding Data ──────────────────────────────────────────────────────────

export const onboardingDataSchema = z.object({
	businessName: z.string().min(1).max(255),
	sellingPlatform: z.string().min(1).max(100),
	productCategory: z.string().min(1).max(100),
})

export type OnboardingData = z.infer<typeof onboardingDataSchema>

// ── Onboarding Request ───────────────────────────────────────────────────────

export const onboardingRequestSchema = onboardingDataSchema

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>

// ── Onboarding Response ──────────────────────────────────────────────────────

export const onboardingResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		isOnboardingCompleted: z.literal(true),
		onboardingData: onboardingDataSchema,
	}),
})

export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>
