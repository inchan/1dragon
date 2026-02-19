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

function buildCategoryHint(category: string): string {
	switch (category.trim().toUpperCase()) {
		case 'FASHION':
			return 'Highlight garment drape, fabric texture, stitching, and silhouette continuity with realistic micro-motion.'
		case 'BEAUTY':
			return 'Focus on packaging finish, gloss/reflection control, and clean hero framing.'
		case 'ACCESSORIES':
			return 'Emphasize material shine, edges, and fine details with premium close-up motion.'
		default:
			return 'Prioritize clear product readability, stable geometry, and natural camera-led motion.'
	}
}

function buildBaseNarrative(input: BuildPromptInput): string {
	const style = STYLE_CONFIGS[input.stylePreset] ?? DEFAULT_STYLE_CONFIG
	const mood = input.moods.join(', ') || 'professional'
	const keywords = joinKeywords(input.keywords)
	const categoryHint = buildCategoryHint(input.productCategory)

	return [
		`Product category: ${input.productCategory}.`,
		`Mood direction: ${mood}.`,
		`Keywords: ${keywords}.`,
		`Style preset: ${input.stylePreset}.`,
		`Camera movement guideline: ${style.cameraMovement}.`,
		`Transition guideline: ${style.transition}.`,
		`Pacing guideline: ${style.pace}.`,
		`Color tone guideline: ${style.colorTone}.`,
		`Marketing hook: ${input.copy.hook}.`,
		`Product description highlight: ${input.copy.description}.`,
		`Call to action tone: ${input.copy.cta}.`,
		categoryHint,
		'Maintain exact product identity from source image: do not change silhouette, logo, typography, or key visual marks.',
		'Move camera/background rather than deforming the product. Keep composition brand-safe and ad-appropriate.',
		'Open with camera motion already in progress from frame 1. no freeze frame at video start. Video begins mid-movement, not from a static standstill.',
	].join(' ')
}

export class PromptBuilder implements PromptBuilderPort {
	public async build(input: BuildPromptInput): Promise<BuildPromptOutput> {
		const narrative = buildBaseNarrative(input)

		return {
			runway: `RUNWAY_GEN4_TURBO. Use image reference mode. ${narrative} Motion strength medium. Output: cinematic 9:16 ecommerce short.`,
			hailuo: `HAILUO_02 source-image workflow. ${narrative} Keep stable product geometry and cinematic motion rhythm for short-form commerce.`,
			geminiVeo: `GEMINI_VEO multimodal image-to-video. ${narrative} Generate polished 9:16 ad clip with smooth camera choreography and strict identity preservation.`,
			minimax: `MINIMAX_VIDEO image-to-video ad preset. ${narrative} Optimize visual clarity and conversion-focused framing for vertical short video.`,
		}
	}
}
