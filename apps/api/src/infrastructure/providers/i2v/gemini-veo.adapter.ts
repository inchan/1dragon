import type { I2VGenerateInput, I2VGenerateOutput } from '@/domain/media/ports.js'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import { BaseI2VAdapter, I2VProviderError } from './base-provider.js'

const logger = createChildLogger({ provider: 'GEMINI_VEO' })

const LRO_POLL_INTERVAL_MS = 2_000
const LRO_MAX_DURATION_MS = 5 * 60 * 1_000

export class GeminiVeoI2VAdapter extends BaseI2VAdapter {
	public readonly provider = 'GEMINI_VEO' as const
	protected readonly defaultBaseUrl = 'https://generativelanguage.googleapis.com'

	protected override get endpointPath(): string {
		return '/v1beta/models/veo-2.0-generate-001:predictLongRunning'
	}

	/**
	 * generate() override: Gemini Veo는 이미지 URL을 직접 지원하지 않아
	 * 이미지를 다운로드하여 base64로 변환한 뒤 payload에 포함시킴.
	 */
	public override async generate(input: I2VGenerateInput): Promise<I2VGenerateOutput> {
		if (!this.options.apiKey) {
			return this.simulate(input)
		}

		logger.info({ imageUrl: input.imageUrl, durationSec: input.durationSec }, 'Gemini Veo I2V 시작')
		const imageData = await this.fetchImageAsBase64(input.imageUrl)
		logger.info({ mimeType: imageData.mimeType, base64Len: imageData.base64.length }, '이미지 base64 변환 완료')
		const payload = this.buildPayloadWithImage(input, imageData)
		const response = await this.request(payload)
		const result = this.normalizeResponse(response, input)
		logger.info({ clipUrl: result.clipUrl, provider: result.provider }, 'Gemini Veo 영상 생성 완료')
		return result
	}

	private async fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), 30_000)

		try {
			const response = await fetch(imageUrl, { signal: controller.signal })
			if (!response.ok) {
				throw new I2VProviderError({
					provider: this.provider,
					message: `이미지 다운로드 실패: ${response.status}`,
					retryable: false,
				})
			}

			const contentType = response.headers.get('content-type') ?? 'image/jpeg'
			const mimeType = contentType.split(';')[0]?.trim() ?? 'image/jpeg'
			const buffer = await response.arrayBuffer()
			const base64 = Buffer.from(buffer).toString('base64')

			return { base64, mimeType }
		} catch (error) {
			if (error instanceof I2VProviderError) {
				throw error
			}
			throw new I2VProviderError({
				provider: this.provider,
				message: error instanceof Error ? error.message : '이미지 다운로드 중 오류',
				retryable: true,
			})
		} finally {
			clearTimeout(timer)
		}
	}

	private buildPayloadWithImage(
		input: I2VGenerateInput,
		imageData: { base64: string; mimeType: string },
	): Record<string, unknown> {
		return {
			instances: [
				{
					prompt: input.prompt,
					image: {
						bytesBase64Encoded: imageData.base64,
						mimeType: imageData.mimeType,
					},
				},
			],
			parameters: {
				aspectRatio: input.aspectRatio,
				sampleCount: 1,
				durationSeconds: input.durationSec,
			},
		}
	}

	protected buildPayload(input: I2VGenerateInput): Record<string, unknown> {
		// 텍스트 전용 fallback (generate() override 시에는 사용되지 않음)
		return {
			instances: [{ prompt: input.prompt }],
			parameters: {
				aspectRatio: input.aspectRatio,
				sampleCount: 1,
				durationSeconds: input.durationSec,
			},
		}
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
				const errorRecord = data.error && typeof data.error === 'object' ? (data.error as Record<string, unknown>) : null
				const providerMessage =
					typeof errorRecord?.message === 'string'
						? errorRecord.message
						: typeof data.error === 'string'
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

			// LRO: response has 'name' (operations/xxx) but no video URI yet → poll until done
			if (
				typeof data.name === 'string' &&
				typeof data.videoUri !== 'string' &&
				typeof data.outputUri !== 'string'
			) {
				return await this.pollLroUntilDone(data.name, apiKey)
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

	private async pollLroUntilDone(operationName: string, apiKey: string): Promise<Record<string, unknown>> {
		const startTime = Date.now()

		while (Date.now() - startTime < LRO_MAX_DURATION_MS) {
			await new Promise<void>((resolve) => setTimeout(resolve, LRO_POLL_INTERVAL_MS))

			const response = await fetch(`${this.baseUrl}/v1beta/${operationName}?key=${apiKey}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			const data = await this.parseJsonResponse(response)

			if (!response.ok) {
				const providerMessage =
					typeof data.message === 'string' ? data.message : 'Gemini Veo LRO polling failed'
				throw new I2VProviderError({
					provider: this.provider,
					message: providerMessage,
					statusCode: response.status,
					retryable: response.status >= 500 || response.status === 429,
				})
			}

			if (data.error !== null && data.error !== undefined && typeof data.error === 'object') {
				const errRecord = data.error as Record<string, unknown>
				const errMsg =
					typeof errRecord.message === 'string' ? errRecord.message : 'Gemini Veo operation failed'
				throw new I2VProviderError({
					provider: this.provider,
					message: errMsg,
					retryable: false,
				})
			}

			if (data.done === true) {
				const videoUri = this.extractVideoUriFromLro(data)
				logger.info({ operationName, videoUri, done: true }, 'LRO 폴링 완료')
				if (typeof videoUri === 'string') {
					return { ...data, videoUri, name: operationName }
				}
				throw new I2VProviderError({
					provider: this.provider,
					message: 'Gemini Veo LRO completed but no video URI found in response',
					retryable: false,
				})
			}
		}

		throw new I2VProviderError({
			provider: this.provider,
			message: 'Gemini Veo LRO polling timed out after 5 minutes',
			statusCode: 408,
			retryable: true,
		})
	}

	private extractVideoUriFromLro(data: Record<string, unknown>): string | null {
		const responseField = data.response
		if (!responseField || typeof responseField !== 'object') {
			return null
		}
		const responseRecord = responseField as Record<string, unknown>

		// Format 1: response.videos[0].videoUri
		if (Array.isArray(responseRecord.videos) && responseRecord.videos.length > 0) {
			const first = responseRecord.videos[0] as Record<string, unknown>
			if (typeof first.videoUri === 'string') {
				return first.videoUri
			}
		}

		// Format 2: response.generatedSamples[0].video.uri
		if (Array.isArray(responseRecord.generatedSamples) && responseRecord.generatedSamples.length > 0) {
			const first = responseRecord.generatedSamples[0] as Record<string, unknown>
			const video = first.video
			if (video && typeof video === 'object') {
				const videoRecord = video as Record<string, unknown>
				if (typeof videoRecord.uri === 'string') {
					return videoRecord.uri
				}
			}
		}

		// Format 3 (predictLongRunning): response.generateVideoResponse.generatedSamples[0].video.uri
		if (responseRecord.generateVideoResponse && typeof responseRecord.generateVideoResponse === 'object') {
			const gvr = responseRecord.generateVideoResponse as Record<string, unknown>
			if (Array.isArray(gvr.generatedSamples) && gvr.generatedSamples.length > 0) {
				const first = gvr.generatedSamples[0] as Record<string, unknown>
				const video = first.video
				if (video && typeof video === 'object') {
					const videoRecord = video as Record<string, unknown>
					if (typeof videoRecord.uri === 'string') {
						return videoRecord.uri
					}
				}
			}
		}

		return null
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
				...(typeof response.name === 'string' ? { providerRequestId: response.name } : {}),
				raw: response,
			},
		}
	}
}
