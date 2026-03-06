import { SlideRole } from '@1dragon/shared'
import type { HookFormula } from './entities.js'

const STANDARD_ROLE_SEQUENCE: readonly string[] = [
	SlideRole.HOOK,
	SlideRole.PROBLEM,
	SlideRole.DISCOVERY,
	SlideRole.TRANSFORMATION_1,
	SlideRole.TRANSFORMATION_2,
	SlideRole.CTA,
]

const COMPACT_ROLE_SEQUENCES: Record<number, readonly string[]> = {
	3: [SlideRole.HOOK, SlideRole.DISCOVERY, SlideRole.CTA],
	4: [SlideRole.HOOK, SlideRole.PROBLEM, SlideRole.DISCOVERY, SlideRole.CTA],
	5: [
		SlideRole.HOOK,
		SlideRole.PROBLEM,
		SlideRole.DISCOVERY,
		SlideRole.TRANSFORMATION_1,
		SlideRole.CTA,
	],
}

export class HookSelectionService {
	public rankByPerformance(hooks: ReadonlyArray<HookFormula>): HookFormula[] {
		return [...hooks].sort((a, b) => {
			if (a.totalUses === 0 && b.totalUses === 0) return 0
			if (a.totalUses === 0) return 1
			if (b.totalUses === 0) return -1
			return b.successRate - a.successRate
		})
	}

	public selectBest(hooks: ReadonlyArray<HookFormula>): HookFormula | null {
		if (hooks.length === 0) return null
		const ranked = this.rankByPerformance(hooks)
		return ranked[0] ?? null
	}

	public selectWithExploration(
		hooks: ReadonlyArray<HookFormula>,
		explorationRate: number,
	): HookFormula | null {
		if (hooks.length === 0) return null

		const ranked = this.rankByPerformance(hooks)

		if (ranked.length <= 1 || Math.random() >= explorationRate) {
			return ranked[0] ?? null
		}

		const explorationIndex = Math.floor(Math.random() * ranked.length)
		return ranked[explorationIndex] ?? ranked[0] ?? null
	}
}

type SlideLayoutInput = {
	readonly productName: string
	readonly hookText: string
	readonly slideCount: number
}

type SlideLayoutItem = {
	readonly role: string
	readonly imagePrompt: string
	readonly overlayText: string | null
}

export class SlideLayoutService {
	public generateLayout(input: SlideLayoutInput): SlideLayoutItem[] {
		const roles = this.resolveRoleSequence(input.slideCount)

		return roles.map((role, index) => ({
			role,
			imagePrompt: this.buildImagePrompt(role, input.productName, index),
			overlayText: role === SlideRole.HOOK ? input.hookText : null,
		}))
	}

	private resolveRoleSequence(slideCount: number): readonly string[] {
		if (slideCount <= 5) {
			const compact = COMPACT_ROLE_SEQUENCES[slideCount]
			if (!compact) {
				throw new Error(`Unsupported slide count: ${slideCount}`)
			}
			return compact
		}

		if (slideCount === 6) return STANDARD_ROLE_SEQUENCE

		const middleRoles: string[] = [
			SlideRole.PROBLEM,
			SlideRole.DISCOVERY,
			SlideRole.TRANSFORMATION_1,
			SlideRole.TRANSFORMATION_2,
		]
		const extraCount = slideCount - 6
		const extraRoles = Array.from(
			{ length: extraCount },
			(_, i) => middleRoles[i % middleRoles.length] ?? SlideRole.DISCOVERY,
		)
		return [
			SlideRole.HOOK,
			...middleRoles,
			...extraRoles,
			SlideRole.CTA,
		]
	}

	private buildImagePrompt(role: string, productName: string, index: number): string {
		const prompts: Record<string, string> = {
			[SlideRole.HOOK]: `Eye-catching product showcase of ${productName}, dramatic lighting, professional product photography, slide ${index + 1}`,
			[SlideRole.PROBLEM]: `Before state showing the problem that ${productName} solves, relatable everyday scene, slide ${index + 1}`,
			[SlideRole.DISCOVERY]: `Moment of discovery, person encountering ${productName} for the first time, natural reaction, slide ${index + 1}`,
			[SlideRole.TRANSFORMATION_1]: `First transformation result using ${productName}, visible improvement, side-by-side style, slide ${index + 1}`,
			[SlideRole.TRANSFORMATION_2]: `Second transformation showcasing ${productName} lifestyle integration, aspirational scene, slide ${index + 1}`,
			[SlideRole.CTA]: `Final call-to-action scene for ${productName}, clean layout with space for text overlay, compelling visual, slide ${index + 1}`,
		}

		return prompts[role] ?? `Product scene for ${productName}, ${role.toLowerCase()} perspective, slide ${index + 1}`
	}
}
