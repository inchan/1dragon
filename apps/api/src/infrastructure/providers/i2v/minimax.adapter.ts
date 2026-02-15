import type { I2VGenerateInput, I2VGenerateOutput } from '@/domain/media/ports.js'
import { BaseI2VAdapter } from './base-provider.js'

export class MiniMaxI2VAdapter extends BaseI2VAdapter {
	public readonly provider = 'MINIMAX' as const
	protected readonly defaultBaseUrl = 'https://api.minimax.io'

	protected override get endpointPath(): string {
		return '/v1/video/generate'
	}

	protected buildPayload(input: I2VGenerateInput): Record<string, unknown> {
		return {
			model: 'video-01',
			input: {
				image_url: input.imageUrl,
				prompt: input.prompt,
			},
			config: {
				duration: input.durationSec,
				fps: input.fps,
				aspect_ratio: input.aspectRatio,
			},
		}
	}

	protected normalizeResponse(response: Record<string, unknown>, input: I2VGenerateInput): I2VGenerateOutput {
		const output = response.output as { url?: string } | undefined
		const clipUrl =
			typeof output?.url === 'string'
				? output.url
				: typeof response.video_url === 'string'
					? response.video_url
					: this.simulate(input).clipUrl

		return {
			provider: this.provider,
			clipUrl,
			durationSec: input.durationSec,
			metadata: {
				providerRequestId:
					typeof response.request_id === 'string' ? response.request_id : undefined,
				raw: response,
			},
		}
	}
}
