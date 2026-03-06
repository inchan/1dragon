import type { PlanTier as PlanTierType } from '@1dragon/shared'
import { VideoAsset, VideoVariant } from '@/domain/media/entities.js'
import type { ComposerPort } from '@/domain/media/ports.js'
import { VariantPolicyService } from '@/domain/media/services.js'

export type RenderVariantsInput = {
	readonly jobId: string
	readonly planTier: PlanTierType
	readonly masterVideoUrl: string
	readonly durationSec: number
	readonly width: number
	readonly height: number
	readonly includeWatermark: boolean
}

export type RenderVariantsOutput = {
	readonly variants: VideoVariant[]
}

export class RenderVariantsUseCase {
	private readonly variantPolicy = new VariantPolicyService()

	public constructor(private readonly composer: ComposerPort) {}

	public async execute(input: RenderVariantsInput): Promise<RenderVariantsOutput> {
		const decision = this.variantPolicy.resolveVariants(input.planTier)
		const hasWatermark = this.variantPolicy.shouldRenderWatermark(input.planTier, input.includeWatermark)

		const variants = await Promise.all(
			decision.platforms.map(async (platform, index) => {
				const rendered = await this.composer.renderVariant({
					masterVideoUrl: input.masterVideoUrl,
					platform,
				})

				return new VideoVariant({
					id: `${input.jobId}_${index + 1}`,
					platform,
					asset: new VideoAsset({
						url: rendered.variantUrl,
						durationSec: input.durationSec,
						width: input.width,
						height: input.height,
					}),
					hasWatermark,
				})
			}),
		)

		return { variants }
	}
}
