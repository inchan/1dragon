import type { I2VGenerateInput, I2VGenerateOutput } from '@/domain/media/ports.js'
import { BaseI2VAdapter } from './base-provider.js'

export class HailuoI2VAdapter extends BaseI2VAdapter {
	public readonly provider = 'HAILUO' as const
	protected readonly defaultBaseUrl = 'https://api.hailuo.ai'

	protected override get endpointPath(): string {
		return '/v2/generation/video'
	}

	protected buildPayload(input: I2VGenerateInput): Record<string, unknown> {
		return {
			engine: 'hailuo-02',
			source_image: input.imageUrl,
			target_prompt: input.prompt,
			clip_length: input.durationSec,
			frame_rate: input.fps,
			aspect_ratio: input.aspectRatio,
		}
	}

	protected normalizeResponse(response: Record<string, unknown>, input: I2VGenerateInput): I2VGenerateOutput {
		const clipUrl =
			typeof response.result_url === 'string'
				? response.result_url
				: typeof response.videoUrl === 'string'
					? response.videoUrl
					: this.simulate(input).clipUrl

		return {
			provider: this.provider,
			clipUrl,
			durationSec:
				typeof response.duration === 'number'
					? Math.max(1, Math.round(response.duration))
					: input.durationSec,
			metadata: {
				providerRequestId:
					typeof response.task_id === 'string' ? response.task_id : undefined,
				raw: response,
			},
		}
	}
}
