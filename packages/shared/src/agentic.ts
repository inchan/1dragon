import { z } from 'zod'
import { ProductCategory, type ProductCategory as ProductCategoryType } from './enums'

export const AgenticMode = {
	AUTO: 'AUTO',
	BASELINE: 'BASELINE',
	CHAIN: 'CHAIN',
	ORCHESTRATOR: 'ORCHESTRATOR',
} as const

export type AgenticMode = (typeof AgenticMode)[keyof typeof AgenticMode]
export const agenticModeSchema = z.nativeEnum(AgenticMode)

export const AgenticWorkflow = {
	BASELINE: 'BASELINE',
	PROMPT_CHAIN: 'PROMPT_CHAIN',
	ORCHESTRATOR_WORKERS: 'ORCHESTRATOR_WORKERS',
} as const

export type AgenticWorkflow = (typeof AgenticWorkflow)[keyof typeof AgenticWorkflow]
export const agenticWorkflowSchema = z.nativeEnum(AgenticWorkflow)

export const AgenticRouting = {
	AUTO: 'AUTO',
	MANUAL: 'MANUAL',
} as const

export type AgenticRouting = (typeof AgenticRouting)[keyof typeof AgenticRouting]
export const agenticRoutingSchema = z.nativeEnum(AgenticRouting)

export const agenticExecutionPlanSchema = z.object({
	mode: agenticModeSchema,
	routing: agenticRoutingSchema,
	workflow: agenticWorkflowSchema,
	reasoning: z.array(z.string()),
	steps: z.array(z.string()).min(1),
	features: z.object({
		evaluator: z.boolean(),
		shortformWorkflow: z.boolean(),
		wearableComposite: z.boolean(),
	}),
})

export type AgenticExecutionPlan = z.infer<typeof agenticExecutionPlanSchema>

export type ResolveAgenticExecutionPlanInput = {
	readonly agenticMode?: AgenticMode | undefined
	readonly productCategory?: string | undefined
	readonly autoShortformWorkflow?: boolean | undefined
	readonly skipWearableComposite?: boolean | undefined
	readonly personaId?: string | undefined
	readonly creativeContext?: {
		readonly location?: string | undefined
		readonly profession?: string | undefined
		readonly identity?: string | undefined
		readonly traits?: ReadonlyArray<string> | undefined
		readonly visualStyle?: string | undefined
	} | undefined
	readonly keywords?: ReadonlyArray<string> | undefined
	readonly platforms?: ReadonlyArray<string> | undefined
	readonly duration?: number | undefined
}

const WEARABLE_CATEGORY_SET = new Set<ProductCategoryType>([
	ProductCategory.FASHION,
	ProductCategory.SPORTS,
])
const FOOTWEAR_KEYWORD_PATTERN =
	/(신발|운동화|스니커|구두|로퍼|샌들|shoe|shoes|sneaker|sneakers|boot|boots|heel|heels)/i

function normalizeProductCategory(value: string | undefined): ProductCategoryType {
	const normalized = value?.trim().toUpperCase() ?? ProductCategory.OTHER
	const validCategories = Object.values(ProductCategory)

	return validCategories.includes(normalized as ProductCategoryType)
		? (normalized as ProductCategoryType)
		: ProductCategory.OTHER
}

function hasCreativeContext(
	context: ResolveAgenticExecutionPlanInput['creativeContext'],
): boolean {
	if (!context) {
		return false
	}

	const traits =
		context.traits
			?.map((value) => value.trim())
			.filter((value) => value.length > 0) ?? []

	return Boolean(
		context.location?.trim() ||
			context.profession?.trim() ||
			context.identity?.trim() ||
			context.visualStyle?.trim() ||
			traits.length > 0,
	)
}

function shouldUseWearableComposite(input: {
	readonly productCategory: ProductCategoryType
	readonly keywords: ReadonlyArray<string>
	readonly skipWearableComposite: boolean
}): boolean {
	if (input.skipWearableComposite) {
		return false
	}

	if (WEARABLE_CATEGORY_SET.has(input.productCategory)) {
		return true
	}

	if (input.productCategory !== ProductCategory.ACCESSORIES) {
		return false
	}

	return input.keywords.some((keyword) => FOOTWEAR_KEYWORD_PATTERN.test(keyword))
}

function createExecutionPlan(input: {
	readonly mode: AgenticMode
	readonly routing: AgenticRouting
	readonly workflow: AgenticWorkflow
	readonly reasoning: ReadonlyArray<string>
	readonly steps: ReadonlyArray<string>
	readonly features: AgenticExecutionPlan['features']
}): AgenticExecutionPlan {
	return {
		mode: input.mode,
		routing: input.routing,
		workflow: input.workflow,
		reasoning: [...input.reasoning],
		steps: [...input.steps],
		features: input.features,
	}
}

export function resolveAgenticExecutionPlan(
	input: ResolveAgenticExecutionPlanInput,
): AgenticExecutionPlan {
	const mode = input.agenticMode ?? AgenticMode.AUTO
	const productCategory = normalizeProductCategory(input.productCategory)
	const keywords =
		input.keywords
			?.map((keyword) => keyword.trim())
			.filter((keyword) => keyword.length > 0) ?? []
	const shortformWorkflow =
		input.autoShortformWorkflow !== false &&
		productCategory === ProductCategory.FASHION
	const wearableComposite = shouldUseWearableComposite({
		productCategory,
		keywords,
		skipWearableComposite: input.skipWearableComposite === true,
	})
	const creativeSignals =
		Boolean(input.personaId?.trim()) || hasCreativeContext(input.creativeContext)
	const multiPlatform = (input.platforms?.length ?? 0) > 1
	const extendedDuration = (input.duration ?? 15) > 15

	if (mode === AgenticMode.BASELINE) {
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.MANUAL,
			workflow: AgenticWorkflow.BASELINE,
			reasoning: ['Manual baseline mode requested.'],
			steps: ['direct_generate', 'quality_gate'],
			features: {
				evaluator: true,
				shortformWorkflow: false,
				wearableComposite: false,
			},
		})
	}

	if (mode === AgenticMode.CHAIN) {
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.MANUAL,
			workflow: AgenticWorkflow.PROMPT_CHAIN,
			reasoning: ['Manual prompt chain mode requested.'],
			steps: ['analyze_brief', 'build_prompt', 'generate_video', 'quality_gate'],
			features: {
				evaluator: true,
				shortformWorkflow,
				wearableComposite: false,
			},
		})
	}

	if (mode === AgenticMode.ORCHESTRATOR) {
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.MANUAL,
			workflow: AgenticWorkflow.ORCHESTRATOR_WORKERS,
			reasoning: ['Manual orchestrator mode requested.'],
			steps: [
				'route_request',
				...(wearableComposite ? ['wearable_composite_worker'] : []),
				...(shortformWorkflow ? ['shortform_planner_worker'] : []),
				'video_generation_worker',
				'quality_gate',
			],
			features: {
				evaluator: true,
				shortformWorkflow,
				wearableComposite,
			},
		})
	}

	if (wearableComposite || shortformWorkflow || creativeSignals || multiPlatform) {
		const reasoning: string[] = ['Detected multi-step media generation requirements.']

		if (wearableComposite) {
			reasoning.push('Wearable composite preparation improves product presentation fidelity.')
		}

		if (shortformWorkflow) {
			reasoning.push('Fashion shortform workflow benefits from coordinated planning directives.')
		}

		if (creativeSignals) {
			reasoning.push('Persona or creative context requires expert-style orchestration.')
		}

		if (multiPlatform) {
			reasoning.push('Multiple delivery targets benefit from routed orchestration.')
		}

		return createExecutionPlan({
			mode,
			routing: AgenticRouting.AUTO,
			workflow: AgenticWorkflow.ORCHESTRATOR_WORKERS,
			reasoning,
			steps: [
				'route_request',
				...(wearableComposite ? ['wearable_composite_worker'] : []),
				...(shortformWorkflow ? ['shortform_planner_worker'] : []),
				'video_generation_worker',
				'quality_gate',
			],
			features: {
				evaluator: true,
				shortformWorkflow,
				wearableComposite,
			},
		})
	}

	if (extendedDuration || keywords.length > 0) {
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.AUTO,
			workflow: AgenticWorkflow.PROMPT_CHAIN,
			reasoning: ['Detected richer creative input that benefits from staged prompt construction.'],
			steps: ['analyze_brief', 'build_prompt', 'generate_video', 'quality_gate'],
			features: {
				evaluator: true,
				shortformWorkflow: false,
				wearableComposite: false,
			},
		})
	}

	return createExecutionPlan({
		mode,
		routing: AgenticRouting.AUTO,
		workflow: AgenticWorkflow.BASELINE,
		reasoning: ['Simple single-platform request detected.'],
		steps: ['direct_generate', 'quality_gate'],
		features: {
			evaluator: true,
			shortformWorkflow: false,
			wearableComposite: false,
		},
	})
}
