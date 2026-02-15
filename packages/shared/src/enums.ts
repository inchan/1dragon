import { z } from 'zod'

// ── Platform ──────────────────────────────────
export const Platform = {
	TIKTOK: 'TIKTOK',
	YOUTUBE_SHORTS: 'YOUTUBE_SHORTS',
	INSTAGRAM_REELS: 'INSTAGRAM_REELS',
} as const

export type Platform = (typeof Platform)[keyof typeof Platform]
export const platformSchema = z.nativeEnum(Platform)

// ── StylePreset ───────────────────────────────
export const StylePreset = {
	SIMPLE: 'SIMPLE',
	DYNAMIC: 'DYNAMIC',
	EMOTIONAL: 'EMOTIONAL',
	TRENDY: 'TRENDY',
	PREMIUM: 'PREMIUM',
} as const

export type StylePreset = (typeof StylePreset)[keyof typeof StylePreset]
export const stylePresetSchema = z.nativeEnum(StylePreset)

// ── ProductCategory ───────────────────────────
export const ProductCategory = {
	FASHION: 'FASHION',
	BEAUTY: 'BEAUTY',
	FOOD: 'FOOD',
	ELECTRONICS: 'ELECTRONICS',
	HOME: 'HOME',
	ACCESSORIES: 'ACCESSORIES',
	SPORTS: 'SPORTS',
	OTHER: 'OTHER',
} as const

export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory]
export const productCategorySchema = z.nativeEnum(ProductCategory)

// ── Mood ──────────────────────────────────────
export const Mood = {
	ENERGETIC: 'ENERGETIC',
	CALM: 'CALM',
	LUXURY: 'LUXURY',
	PLAYFUL: 'PLAYFUL',
	PROFESSIONAL: 'PROFESSIONAL',
	WARM: 'WARM',
	MINIMALIST: 'MINIMALIST',
} as const

export type Mood = (typeof Mood)[keyof typeof Mood]
export const moodSchema = z.nativeEnum(Mood)

// ── JobStatus ─────────────────────────────────
export const JobStatus = {
	QUEUED: 'QUEUED',
	ANALYZING: 'ANALYZING',
	GENERATING: 'GENERATING',
	COMPOSING: 'COMPOSING',
	RENDERING_VARIANTS: 'RENDERING_VARIANTS',
	SUCCEEDED: 'SUCCEEDED',
	FAILED: 'FAILED',
	DEGRADED_FAILED: 'DEGRADED_FAILED',
} as const

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus]
export const jobStatusSchema = z.nativeEnum(JobStatus)

// ── SubscriptionStatus ────────────────────────
export const SubscriptionStatus = {
	ACTIVE: 'ACTIVE',
	PAST_DUE: 'PAST_DUE',
	EXPIRED: 'EXPIRED',
	CANCELLED: 'CANCELLED',
	TRIAL: 'TRIAL',
} as const

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]
export const subscriptionStatusSchema = z.nativeEnum(SubscriptionStatus)

// ── PlanTier ──────────────────────────────────
export const PlanTier = {
	FREE: 'FREE',
	STARTER: 'STARTER',
} as const

export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier]
export const planTierSchema = z.nativeEnum(PlanTier)

// ── Gender (Model Persona) ────────────────────
export const Gender = {
	MALE: 'MALE',
	FEMALE: 'FEMALE',
	NON_BINARY: 'NON_BINARY',
} as const

export type Gender = (typeof Gender)[keyof typeof Gender]
export const genderSchema = z.nativeEnum(Gender)

// ── AgeRange (Model Persona) ──────────────────
export const AgeRange = {
	YOUNG_ADULT: 'YOUNG_ADULT',
	ADULT: 'ADULT',
	MIDDLE_AGED: 'MIDDLE_AGED',
	SENIOR: 'SENIOR',
} as const

export type AgeRange = (typeof AgeRange)[keyof typeof AgeRange]
export const ageRangeSchema = z.nativeEnum(AgeRange)

// ── SubtitleStyle ─────────────────────────────
export const SubtitleStyle = {
	SIMPLE: 'SIMPLE',
	BOLD: 'BOLD',
	MOTION: 'MOTION',
} as const

export type SubtitleStyle = (typeof SubtitleStyle)[keyof typeof SubtitleStyle]
export const subtitleStyleSchema = z.nativeEnum(SubtitleStyle)
