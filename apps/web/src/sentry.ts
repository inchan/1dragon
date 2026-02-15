import * as Sentry from '@sentry/react'

export function initSentry(): void {
	const dsn = import.meta.env.VITE_SENTRY_DSN

	if (!dsn) return

	Sentry.init({
		dsn,
		environment: import.meta.env.MODE,
		enabled: import.meta.env.PROD,
		integrations: [
			Sentry.browserTracingIntegration(),
			Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
		],
		tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
	})
}
