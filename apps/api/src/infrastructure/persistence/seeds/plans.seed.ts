import { eq } from 'drizzle-orm'
import { closeConnection, db } from '../db.js'
import { plans } from '../schema.js'
import { logger } from '../../logging/index.js'

type PlanSeed = {
	name: string
	tier: 'FREE' | 'STARTER'
	quota: number
	limits: {
		maxVideoLengthSec: number
		watermarkRequired: boolean
		multiPlatformEnabled: boolean
		bgmLibraryTier: 'BASIC' | 'PREMIUM'
		ttsVoiceCount: number
	}
	features: string[]
	priceMonthly: number
	priceYearly: number
}

const PLAN_SEEDS: readonly PlanSeed[] = [
	{
		name: 'Free',
		tier: 'FREE',
		quota: 3,
		limits: {
			maxVideoLengthSec: 15,
			watermarkRequired: true,
			multiPlatformEnabled: false,
			bgmLibraryTier: 'BASIC',
			ttsVoiceCount: 1,
		},
		features: ['1-platform-output', 'basic-bgm-library', 'single-tts-voice'],
		priceMonthly: 0,
		priceYearly: 0,
	},
	{
		name: 'Starter',
		tier: 'STARTER',
		quota: 30,
		limits: {
			maxVideoLengthSec: 30,
			watermarkRequired: false,
			multiPlatformEnabled: true,
			bgmLibraryTier: 'PREMIUM',
			ttsVoiceCount: 3,
		},
		features: [
			'3-platform-outputs',
			'premium-bgm-library',
			'watermark-optional',
			'monthly-watermark-bonus-up-to-5',
		],
		priceMonthly: 9900,
		priceYearly: 94800,
	},
]

export async function seedPlans(): Promise<void> {
	for (const plan of PLAN_SEEDS) {
		const existing = await db.query.plans.findFirst({
			where: eq(plans.tier, plan.tier),
		})

		if (existing) {
			await db
				.update(plans)
				.set({
					name: plan.name,
					quota: plan.quota,
					limits: plan.limits,
					features: plan.features,
					priceMonthly: plan.priceMonthly,
					priceYearly: plan.priceYearly,
					updatedAt: new Date(),
				})
				.where(eq(plans.id, existing.id))

			logger.info(
				{
					action: 'updated',
					entity: 'plan',
					tier: plan.tier,
					quota: plan.quota,
				},
				'updated plan seed',
			)
			continue
		}

		await db.insert(plans).values({
			name: plan.name,
			tier: plan.tier,
			quota: plan.quota,
			limits: plan.limits,
			features: plan.features,
			priceMonthly: plan.priceMonthly,
			priceYearly: plan.priceYearly,
		})

		logger.info(
			{
				action: 'inserted',
				entity: 'plan',
				tier: plan.tier,
				quota: plan.quota,
			},
			'inserted plan seed',
		)
	}
}

async function main(): Promise<void> {
	try {
		await seedPlans()
		logger.info(
			{
				entity: 'plan',
				total_records: PLAN_SEEDS.length,
			},
			'plans seed complete',
		)
	} finally {
		await closeConnection()
	}
}

const entrypoint = process.argv[1] ?? ''
if (import.meta.url === `file://${entrypoint}`) {
	void main()
}
