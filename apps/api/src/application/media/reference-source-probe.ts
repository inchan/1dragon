import type {
	OfficialReferenceDiscoveryBundle,
	OfficialReferenceProbeBundle,
	OfficialReferenceProbeResult,
} from '@1dragon/shared'

type ProbeOfficialReferenceSourcesInput = {
	bundle: OfficialReferenceDiscoveryBundle
	fetchImpl?: typeof fetch
	timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 3_000

function normalizeText(value: string | undefined): string | undefined {
	const normalized = value?.replace(/\s+/g, ' ').trim()
	return normalized && normalized.length > 0 ? normalized : undefined
}

function extractHtmlTitle(html: string): string | undefined {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
	return normalizeText(match?.[1])?.slice(0, 160)
}

async function probeOpenUrlTarget(input: {
	target: OfficialReferenceDiscoveryBundle['targets'][number]
	fetchImpl: typeof fetch
	timeoutMs: number
}): Promise<OfficialReferenceProbeResult> {
	const entryUrl = input.target.entryUrl
	if (!entryUrl) {
		return {
			...input.target,
			status: 'unreachable',
			errorMessage: 'Missing entryUrl for open_url target',
		}
	}

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), input.timeoutMs)

	try {
		const response = await input.fetchImpl(entryUrl, {
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
			},
			redirect: 'follow',
		})
		const contentType = normalizeText(response.headers.get('content-type') ?? undefined)
		const resolvedUrl = normalizeText(response.url)
		const isHtml = contentType?.toLowerCase().includes('html') ?? false
		const html = isHtml ? await response.text() : undefined
		const pageTitle = html ? extractHtmlTitle(html) : undefined

		return {
			...input.target,
			status: response.ok ? 'reachable' : 'unreachable',
			httpStatus: response.status,
			...(contentType ? { contentType } : {}),
			...(resolvedUrl ? { resolvedUrl } : {}),
			...(pageTitle ? { pageTitle } : {}),
			...(!response.ok ? { errorMessage: `HTTP ${response.status}` } : {}),
		}
	} catch (error) {
		return {
			...input.target,
			status: 'unreachable',
			errorMessage: error instanceof Error ? error.message.slice(0, 200) : 'probe_failed',
		}
	} finally {
		clearTimeout(timer)
	}
}

export async function probeOfficialReferenceSources(
	input: ProbeOfficialReferenceSourcesInput,
): Promise<OfficialReferenceProbeBundle> {
	const fetchImpl = input.fetchImpl ?? fetch
	const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
	const results: OfficialReferenceProbeResult[] = []

	for (const target of input.bundle.targets) {
		if (target.adapter === 'manual_search') {
			results.push({
				...target,
				status: 'manual',
			})
			continue
		}

		results.push(
			await probeOpenUrlTarget({
				target,
				fetchImpl,
				timeoutMs,
			}),
		)
	}

	return {
		jobId: input.bundle.jobId,
		taxonomy: input.bundle.taxonomy,
		results,
	}
}
