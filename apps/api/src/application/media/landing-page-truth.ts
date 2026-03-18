type LandingPageSource = 'provided_text' | 'fetched_url' | 'url_only'

type ResolvedLandingPageTruth = {
	readonly source: LandingPageSource
	readonly text?: string
	readonly title?: string
	readonly description?: string
}

type ResolveLandingPageTruthInput = {
	readonly landingPageUrl?: string
	readonly landingPageText?: string
	readonly fetchImpl?: typeof fetch
	readonly timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 3_000
const HTML_ENTITY_MAP: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
}

function normalizeText(value: string | undefined): string | undefined {
	const normalized = value?.replace(/\s+/g, ' ').trim()
	return normalized && normalized.length > 0 ? normalized : undefined
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replace(/&#([0-9]+);/g, (_, numeric: string) =>
			String.fromCodePoint(Number.parseInt(numeric, 10)),
		)
		.replace(/&([a-z]+);/gi, (match: string, named: string) => HTML_ENTITY_MAP[named] ?? match)
}

function stripTags(html: string): string {
	return html
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
}

function extractTagContent(html: string, pattern: RegExp): string | undefined {
	const match = html.match(pattern)
	return normalizeText(match?.[1] ? decodeHtmlEntities(match[1]) : undefined)
}

function extractMetaContent(html: string, key: 'description' | 'og:description'): string | undefined {
	const escaped = key.replace(':', '\\:')
	return (
		extractTagContent(
			html,
			new RegExp(
				`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
				'i',
			),
		) ??
		extractTagContent(
			html,
			new RegExp(
				`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
				'i',
			),
		)
	)
}

export function extractLandingPageTruthFromHtml(html: string): Omit<
	ResolvedLandingPageTruth,
	'source'
> {
	const title = extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
	const description =
		extractMetaContent(html, 'description') ?? extractMetaContent(html, 'og:description')
	const text = normalizeText(decodeHtmlEntities(stripTags(html)))

	return {
		...(text ? { text } : {}),
		...(title ? { title } : {}),
		...(description ? { description } : {}),
	}
}

export async function resolveLandingPageTruth(
	input: ResolveLandingPageTruthInput,
): Promise<ResolvedLandingPageTruth> {
	const providedText = normalizeText(input.landingPageText)
	if (providedText) {
		return {
			source: 'provided_text',
			text: providedText,
		}
	}

	const landingPageUrl = normalizeText(input.landingPageUrl)
	if (!landingPageUrl) {
		return {
			source: 'url_only',
		}
	}

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS)

	try {
		const response = await (input.fetchImpl ?? fetch)(landingPageUrl, {
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
			},
		})

		if (!response.ok) {
			return { source: 'url_only' }
		}

		const contentType = response.headers.get('content-type') ?? ''
		if (!contentType.toLowerCase().includes('html')) {
			return { source: 'url_only' }
		}

		const html = await response.text()
		const extracted = extractLandingPageTruthFromHtml(html)

		return {
			source:
				extracted.text || extracted.title || extracted.description ? 'fetched_url' : 'url_only',
			...extracted,
		}
	} catch {
		return { source: 'url_only' }
	} finally {
		clearTimeout(timer)
	}
}

export type { LandingPageSource, ResolvedLandingPageTruth, ResolveLandingPageTruthInput }
