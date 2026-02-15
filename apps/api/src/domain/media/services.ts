import { PlanTier, Platform, type PlanTier as PlanTierType, type Platform as PlatformType } from '@snapvid/shared'

type VariantDecision = {
	readonly planTier: PlanTierType
	readonly platforms: ReadonlyArray<PlatformType>
	readonly maxDurationSec: number
}

export class VariantPolicyService {
	public resolveVariants(planTier: PlanTierType): VariantDecision {
		if (planTier === PlanTier.STARTER) {
			return {
				planTier,
				platforms: [Platform.TIKTOK, Platform.YOUTUBE_SHORTS, Platform.INSTAGRAM_REELS],
				maxDurationSec: 30,
			}
		}

		return {
			planTier: PlanTier.FREE,
			platforms: [Platform.TIKTOK],
			maxDurationSec: 15,
		}
	}

	public shouldRenderWatermark(planTier: PlanTierType, includeWatermark: boolean): boolean {
		if (planTier === PlanTier.FREE) {
			return true
		}

		return includeWatermark
	}
}
