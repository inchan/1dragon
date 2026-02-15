import type { I2VGenerateInput, I2VGenerateOutput } from '@/domain/media/ports.js'
import { BaseI2VAdapter, I2VProviderError } from './base-provider.js'

export class GeminiVeoI2VAdapter extends BaseI2VAdapter {
	public readonly provider = 'GEMINI_VEO' as const
	protected readonly defaultBaseUrl = 'https://generativelanguage.googleapis.com'

	protected override get endpointPath(): string {
		return '/v1beta/models/veo-2.0-generate-001:generateVideo'
	}

	protected override async request(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
		const apiKey = this.options.apiKey ?? ''
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), this.timeoutMs)

		try {
			const response = await fetch(`${this.baseUrl}${this.endpointPath}?key=${apiKey}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			})
			const data = await this.parseJsonResponse(response)

			if (!response.ok) {
				const providerMessage =
					typeof data.error === 'string'
						? data.error
						: typeof data.message === 'string'
							? data.message
							: 'Gemini Veo request failed'
				throw new I2VProviderError({
					provider: this.provider,
					message: providerMessage,
					statusCode: response.status,
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
					message: 'Gemini Veo request timed out',
					statusCode: 408,
					retryable: true,
				})
			}

			throw new I2VProviderError({
				provider: this.provider,
				message: error instanceof Error ? error.message : 'Gemini Veo request failed',
				retryable: true,
			})
		} finally {
			clearTimeout(timer)
		}
	}

	protected buildPayload(input: I2VGenerateInput): Record<string, unknown> {
		return {
			prompt: {
				text: input.prompt,
			},
			image: {
				uri: input.imageUrl,
			},
			videoConfig: {
				durationSeconds: input.durationSec,
				aspectRatio: input.aspectRatio,
				fps: input.fps,
			},
		}
	}

	protected normalizeResponse(response: Record<string, unknown>, input: I2VGenerateInput): I2VGenerateOutput {
		const clipUrl =
			typeof response.videoUri === 'string'
				? response.videoUri
				: typeof response.outputUri === 'string'
					? response.outputUri
					: this.simulate(input).clipUrl

		return {
			provider: this.provider,
			clipUrl,
			durationSec: input.durationSec,
			metadata: {
				providerRequestId:
					typeof response.name === 'string' ? response.name : undefined,
				raw: response,
			},
		}
	}
}
