import { z } from 'zod'

export const ErrorCode = {
	VALIDATION: 'VALIDATION',
	NOT_FOUND: 'NOT_FOUND',
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	CONFLICT: 'CONFLICT',
	RATE_LIMITED: 'RATE_LIMITED',
	QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
	PROVIDER_ERROR: 'PROVIDER_ERROR',
	INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export const errorCodeSchema = z.nativeEnum(ErrorCode)

export class AppError extends Error {
	readonly code: ErrorCode
	readonly statusCode: number
	readonly details: Record<string, unknown> | undefined

	constructor(
		code: ErrorCode,
		message: string,
		statusCode: number,
		details?: Record<string, unknown>,
	) {
		super(message)
		this.name = 'AppError'
		this.code = code
		this.statusCode = statusCode
		this.details = details
	}
}

export class ValidationError extends AppError {
	readonly fieldErrors: ReadonlyArray<{ field: string; message: string }>

	constructor(fieldErrors: ReadonlyArray<{ field: string; message: string }>) {
		super(ErrorCode.VALIDATION, 'Validation failed', 400, { fieldErrors })
		this.name = 'ValidationError'
		this.fieldErrors = fieldErrors
	}
}

export class ApiError extends AppError {
	constructor(code: ErrorCode, message: string, statusCode: number) {
		super(code, message, statusCode)
		this.name = 'ApiError'
	}
}

export const apiErrorResponseSchema = z.object({
	code: errorCodeSchema,
	message: z.string(),
	details: z.record(z.unknown()).optional(),
})

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
