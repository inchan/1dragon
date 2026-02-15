import type { BuildPromptInput, BuildPromptOutput, PromptBuilderPort } from '@/domain/media/ports.js'

type StyleConfig = {
	cameraMovement: string
	transition: string
	pace: string
	colorTone: string
}

const STYLE_CONFIGS: Record<string, StyleConfig> = {
	SIMPLE: {
		cameraMovement: 'stable close-up, slow zoom',
		transition: 'clean crossfade',
		pace: 'balanced pacing',
		colorTone: 'neutral product-accurate colors',
	},
	DYNAMIC: {
		cameraMovement: 'fast push-in and pan',
		transition: 'hard cut with whip transition',
		pace: 'high tempo',
		colorTone: 'vivid contrast',
	},
	EMOTIONAL: {
		cameraMovement: 'gentle dolly movement',
		transition: 'soft dissolve',
		pace: 'slow emotional pacing',
		colorTone: 'warm cinematic tone',
	},
	TRENDY: {
		cameraMovement: 'snappy handheld micro-motions',
		transition: 'glitch pop transitions',
		pace: 'short-form rapid pacing',
		colorTone: 'trendy punchy colors',
	},
	PREMIUM: {
		cameraMovement: 'cinematic slider movement',
		transition: 'luxury fade transitions',
		pace: 'premium composed pacing',
		colorTone: 'high-end polished grade',
	},
}

const DEFAULT_STYLE_CONFIG: StyleConfig = {
	cameraMovement: 'stable close-up, slow zoom',
	transition: 'clean crossfade',
	pace: 'balanced pacing',
	colorTone: 'neutral product-accurate colors',
}

function joinKeywords(values: ReadonlyArray<string>): string {
	const keywords = values.map((value) => value.trim()).filter(Boolean)
	return keywords.length > 0 ? keywords.join(', ') : 'product focused marketing'
}

function buildBaseNarrative(input: BuildPromptInput): string {
	const style = STYLE_CONFIGS[input.stylePreset] ?? DEFAULT_STYLE_CONFIG
	const mood = input.moods.join(', ') || 'professional'
	const keywords = joinKeywords(input.keywords)

	return [
		`Category: ${input.productCategory}.`,
		`Mood: ${mood}.`,
		`Keywords: ${keywords}.`,
		`Style direction: ${input.stylePreset}.`,
		`Camera: ${style.cameraMovement}.`,
		`Transition: ${style.transition}.`,
		`Pacing: ${style.pace}.`,
		`Color grade: ${style.colorTone}.`,
		`Hook: ${input.copy.hook}.`,
		`Description: ${input.copy.description}.`,
		`CTA: ${input.copy.cta}.`,
		'Keep product details accurate and readable.',
	].join(' ')
}

export class PromptBuilder implements PromptBuilderPort {
	public async build(input: BuildPromptInput): Promise<BuildPromptOutput> {
		const narrative = buildBaseNarrative(input)

		return {
			runway: `RUNWAY_GEN4_TURBO | image_ref required | ${narrative} | motion_strength=0.6`,
			hailuo: `HAILUO_02 | source_image mode | ${narrative} | clip_structure=intro,detail,cta`,
			geminiVeo: `GEMINI_VEO | multimodal prompt | ${narrative} | preserve brand-safe output`,
			minimax: `MINIMAX_VIDEO | image_to_video preset=ad_short | ${narrative} | optimize for 9:16 shortform`,
		}
	}
}
