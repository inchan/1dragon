import type { I2VGenerateInput, I2VGenerateOutput } from '@/domain/media/ports.js'
import { BaseI2VAdapter } from './base-provider.js'

export class RunwayI2VAdapter extends BaseI2VAdapter {
	public readonly provider = 'RUNWAY' as const
	protected readonly defaultBaseUrl = 'https://api.runwayml.com'

	protected override get endpointPath(): string {
		return '/v1/video/generate'
	}

	protected buildPayload(input: I2VGenerateInput): Record<string, unknown> {
		return {
			model: 'gen4_turbo',
			image_ref: input.imageUrl,
			prompt_text: input.prompt,
			motion_strength: 0.6,
			duration_seconds: input.durationSec,
			fps: input.fps,
			aspect_ratio: input.aspectRatio,
		}
	}

	protected normalizeResponse(response: Record<string, unknown>, input: I2VGenerateInput): I2VGenerateOutput {
		const clipUrl =
			typeof response.video_url === 'string'
				? response.video_url
				: typeof response.output_url === 'string'
					? response.output_url
					: this.simulate(input).clipUrl

		return {
			provider: this.provider,
			clipUrl,
			durationSec:
				typeof response.duration_seconds === 'number'
					? Math.max(1, Math.round(response.duration_seconds))
					: input.durationSec,
			metadata: {
				providerRequestId:
					typeof response.id === 'string' ? response.id : undefined,
				raw: response,
			},
		}
	}
}
