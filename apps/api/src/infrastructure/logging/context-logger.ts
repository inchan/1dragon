import type { LogContext } from './logger.js'

const asyncLocalStorage = new Map<symbol, LogContext>()

const CONTEXT_KEY = Symbol('logger-context')

export function getLogContext(): LogContext {
	return asyncLocalStorage.get(CONTEXT_KEY) ?? {}
}

export function setLogContext(context: LogContext): void {
	asyncLocalStorage.set(CONTEXT_KEY, context)
}

export function updateLogContext(updates: Partial<LogContext>): LogContext {
	const current = getLogContext()
	const updated = { ...current, ...updates }
	asyncLocalStorage.set(CONTEXT_KEY, updated)
	return updated
}

export function removeLogContextKeys(keys: (keyof LogContext)[]): LogContext {
	const current = getLogContext()
	const updated = { ...current }
	for (const key of keys) {
		delete updated[key]
	}
	asyncLocalStorage.set(CONTEXT_KEY, updated)
	return updated
}

export function clearLogContext(): void {
	asyncLocalStorage.delete(CONTEXT_KEY)
}

export function withLogContext<T>(context: LogContext, fn: () => T): T {
	const previous = getLogContext()
	setLogContext({ ...previous, ...context })
	try {
		return fn()
	} finally {
		setLogContext(previous)
	}
}

export async function withLogContextAsync<T>(
	context: LogContext,
	fn: () => Promise<T>,
): Promise<T> {
	const previous = getLogContext()
	setLogContext({ ...previous, ...context })
	try {
		return await fn()
	} finally {
		setLogContext(previous)
	}
}
