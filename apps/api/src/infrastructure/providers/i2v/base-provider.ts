import { createHash } from 'node:crypto'
import type {
	I2VGenerateInput,
	I2VGenerateOutput,
	I2VPort,
} from '@/domain/media/ports.js'

export type I2VProviderName = 'RUNWAY' | 'HAILUO' | 'GEMINI_VEO' | 'MINIMAX'

export class I2VProviderError extends Error {
	public readonly provider: I2VProviderName
	public readonly statusCode: number | null
	public readonly providerCode: string | undefined
	public readonly retryable: boolean

	public constructor(input: {
		provider: I2VProviderName
		message: string
		statusCode?: number | null
		providerCode?: string
		retryable?: boolean
	}) {
		super(input.message)
		this.name = 'I2VProviderError'
		this.provider = input.provider
		this.statusCode = input.statusCode ?? null
		this.providerCode = input.providerCode
		this.retryable = input.retryable ?? true
	}
}

export abstract class BaseI2VAdapter implements I2VPort {
	public abstract readonly provider: I2VProviderName
	protected abstract readonly defaultBaseUrl: string

	public constructor(
		protected readonly options: {
			apiKey?: string
			baseUrl?: string
			timeoutMs?: number
		} = {},
	) {}

	public async generate(input: I2VGenerateInput): Promise<I2VGenerateOutput> {
		if (!this.options.apiKey) {
			return this.simulate(input)
		}

		const payload = this.buildPayload(input)
		const response = await this.request(payload)
		return this.normalizeResponse(response, input)
	}

	protected abstract buildPayload(input: I2VGenerateInput): Record<string, unknown>

	protected abstract normalizeResponse(response: Record<string, unknown>, input: I2VGenerateInput): I2VGenerateOutput

	protected get baseUrl(): string {
		return this.options.baseUrl ?? this.defaultBaseUrl
	}

	protected get timeoutMs(): number {
		return this.options.timeoutMs ?? 20_000
	}

	protected get endpointPath(): string {
		return '/v1/video/generate'
	}

	protected async parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
		const rawBody = await response.text()

		if (!rawBody.trim()) {
			throw new I2VProviderError({
				provider: this.provider,
				message: `${this.provider} response body is empty`,
				statusCode: response.status,
				retryable: response.status >= 500 || response.status === 429 || response.status === 408,
			})
		}

		try {
			const parsed = JSON.parse(rawBody) as unknown
			if (!parsed || typeof parsed !== 'object') {
				throw new Error('Parsed JSON is not an object')
			}
			return parsed as Record<string, unknown>
		} catch (error) {
			throw new I2VProviderError({
				provider: this.provider,
				message: `${this.provider} returned invalid JSON response`,
				providerCode: 'INVALID_JSON',
				statusCode: response.status,
				retryable: response.status >= 500 || response.status === 429 || response.status === 408,
			})
		}
	}

	protected async request(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), this.timeoutMs)

		try {
			const response = await fetch(`${this.baseUrl}${this.endpointPath}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.options.apiKey ?? ''}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			})
			const data = await this.parseJsonResponse(response)

			if (!response.ok) {
				const providerCode = typeof data.code === 'string' ? data.code : undefined
				throw new I2VProviderError({
					provider: this.provider,
					message:
						typeof data.message === 'string'
							? data.message
							: `${this.provider} request failed`,
					statusCode: response.status,
					...(providerCode ? { providerCode } : {}),
					retryable: response.status >= 500 || response.status === 429,
				})
			}

			return data
		} catch (error) {
			if (error instanceof I2VProviderError) {
				throw error
			}

			if (error instanceof Error && error.name === 'AbortError') {
				throw new I2VProviderError({
					provider: this.provider,
					message: `${this.provider} request timed out`,
					statusCode: 408,
					retryable: true,
				})
			}

			throw new I2VProviderError({
				provider: this.provider,
				message: error instanceof Error ? error.message : `${this.provider} request failed`,
				retryable: true,
			})
		} finally {
			clearTimeout(timer)
		}
	}

	protected simulate(input: I2VGenerateInput): I2VGenerateOutput {
		const digest = createHash('sha256')
			.update(`${this.provider}|${input.imageUrl}|${input.prompt}|${input.durationSec}`)
			.digest('hex')
			.slice(0, 16)

		return {
			provider: this.provider,
			clipUrl: `https://cdn.snapvid.ai/mock-i2v/${this.provider.toLowerCase()}/${digest}.mp4`,
			durationSec: input.durationSec,
			metadata: {
				simulated: true,
				provider: this.provider,
			},
		}
	}
}
