const DATE_FORMATTERS: Record<string, Intl.DateTimeFormat> = {}

function getDateFormatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const key = `${locale}-${JSON.stringify(options)}`
	const cached = DATE_FORMATTERS[key]
	if (cached) return cached
	const formatter = new Intl.DateTimeFormat(locale, options)
	DATE_FORMATTERS[key] = formatter
	return formatter
}

export function formatDate(date: Date | string, locale = 'ko-KR'): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return getDateFormatter(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(d)
}

export function formatDateTime(date: Date | string, locale = 'ko-KR'): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return getDateFormatter(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(d)
}

export function formatRelativeTime(date: Date | string, locale = 'ko-KR'): string {
	const d = typeof date === 'string' ? new Date(date) : date
	const now = Date.now()
	const diffMs = now - d.getTime()
	const diffSec = Math.floor(diffMs / 1000)
	const diffMin = Math.floor(diffSec / 60)
	const diffHour = Math.floor(diffMin / 60)
	const diffDay = Math.floor(diffHour / 24)

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

	if (diffSec < 60) return rtf.format(-diffSec, 'second')
	if (diffMin < 60) return rtf.format(-diffMin, 'minute')
	if (diffHour < 24) return rtf.format(-diffHour, 'hour')
	if (diffDay < 30) return rtf.format(-diffDay, 'day')
	return formatDate(d, locale)
}

// ── Price Format ──────────────────────────────

export function formatPrice(amount: number, currency = 'KRW', locale = 'ko-KR'): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		maximumFractionDigits: currency === 'KRW' ? 0 : 2,
	}).format(amount)
}

// ── File Size Format ──────────────────────────

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'

	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1)
	const size = bytes / 1024 ** exponent
	const unit = SIZE_UNITS[exponent]

	return `${size % 1 === 0 ? size.toString() : size.toFixed(1)} ${unit}`
}
