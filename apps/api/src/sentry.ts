import * as Sentry from '@sentry/node'

export function initSentry(): void {
	const dsn = process.env.SENTRY_DSN

	if (!dsn) return

	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV ?? 'development',
		enabled: process.env.NODE_ENV === 'production',
		tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
	})
}

export function captureException(error: unknown): void {
	Sentry.captureException(error)
}
