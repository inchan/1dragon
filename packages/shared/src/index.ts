// ── Errors ────────────────────────────────────
export { AppError, ValidationError, ApiError, ErrorCode, errorCodeSchema } from './errors'
export type { ApiErrorResponse } from './errors'

// ── Result ────────────────────────────────────
export { ok, err, isOk, isErr, unwrap, mapResult } from './result'
export type { Result } from './result'

// ── Enums ─────────────────────────────────────
export {
	Platform,
	platformSchema,
	StylePreset,
	stylePresetSchema,
	ProductCategory,
	productCategorySchema,
	Mood,
	moodSchema,
	JobStatus,
	jobStatusSchema,
	SubscriptionStatus,
	subscriptionStatusSchema,
	PlanTier,
	planTierSchema,
	Gender,
	genderSchema,
	AgeRange,
	ageRangeSchema,
	SubtitleStyle,
	subtitleStyleSchema,
	ContentFormat,
	contentFormatSchema,
	HookPattern,
	hookPatternSchema,
	SlideRole,
	slideRoleSchema,
} from './enums'

// ── Utils ─────────────────────────────────────
export {
	formatDate,
	formatDateTime,
	formatRelativeTime,
	formatPrice,
	formatFileSize,
} from './utils'

// ── Schemas (re-exported after 2.4 is complete) ──
export * from './schemas'
