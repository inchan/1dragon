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

export const agenticGoalSchema = z.object({
	name: z.string().min(1),
	outcome: z.string().min(1),
	successSignal: z.string().min(1),
})

export type AgenticGoal = z.infer<typeof agenticGoalSchema>

export const agenticMissionSchema = z.object({
	soul: z.string().min(1),
	purpose: z.string().min(1),
	philosophy: z.array(z.string().min(1)).min(3),
	goals: z.array(agenticGoalSchema).min(2),
	successCriteria: z.array(z.string().min(1)).min(2),
})

export type AgenticMission = z.infer<typeof agenticMissionSchema>

export const agenticExecutionPlanSchema = z.object({
	mode: agenticModeSchema,
	routing: agenticRoutingSchema,
	workflow: agenticWorkflowSchema,
	reasoning: z.array(z.string()),
	steps: z.array(z.string()).min(1),
	mission: agenticMissionSchema,
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
	readonly mission: AgenticMission
	readonly features: AgenticExecutionPlan['features']
}): AgenticExecutionPlan {
	return {
		mode: input.mode,
		routing: input.routing,
		workflow: input.workflow,
		reasoning: [...input.reasoning],
		steps: [...input.steps],
		mission: {
			...input.mission,
			philosophy: [...input.mission.philosophy],
			goals: input.mission.goals.map((goal) => ({ ...goal })),
			successCriteria: [...input.mission.successCriteria],
		},
		features: input.features,
	}
}

function appendUniqueValues(
	base: ReadonlyArray<string>,
	extras: ReadonlyArray<string>,
): string[] {
	const seen = new Set<string>()
	const merged: string[] = []

	for (const value of [...base, ...extras]) {
		const normalized = value.trim()
		if (normalized.length === 0) {
			continue
		}

		const key = normalized.toLowerCase()
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		merged.push(normalized)
	}

	return merged
}

function buildCategoryPromise(productCategory: ProductCategoryType): string {
	switch (productCategory) {
		case ProductCategory.FASHION:
			return 'show fit, texture, silhouette, and movement convincingly'
		case ProductCategory.BEAUTY:
			return 'make finish, texture, and premium trust cues obvious'
		case ProductCategory.ACCESSORIES:
			return 'highlight detail, material quality, and styling context clearly'
		case ProductCategory.SPORTS:
			return 'prove motion-readiness and product stability under action'
		default:
			return 'make the product value legible in one clean viewing pass'
	}
}

function buildMission(input: {
	readonly mode: AgenticMode
	readonly workflow: AgenticWorkflow
	readonly productCategory: ProductCategoryType
	readonly shortformWorkflow: boolean
	readonly wearableComposite: boolean
	readonly creativeSignals: boolean
	readonly multiPlatform: boolean
}): AgenticMission {
	const categoryPromise = buildCategoryPromise(input.productCategory)
	const autoDirectedPhilosophy =
		input.mode === AgenticMode.AUTO
			? 'Autonomously derive the next concrete goal from the brief instead of waiting for manual micromanagement.'
			: 'Honor the user-selected workflow, then self-manage each stage rigorously until the quality gate decides the outcome.'

	const philosophy = appendUniqueValues(
		[
			'Protect product truth, geometry, branding, and shopper trust over stylistic novelty.',
			'Prefer the smallest workflow that can still achieve the intended outcome.',
			autoDirectedPhilosophy,
			'Do not treat generation as completion; only a defended quality-gated result counts as done.',
		],
		[
			...(input.wearableComposite
				? ['If human context is introduced, keep anatomy, fit, and styling believable.']
				: []),
			...(input.multiPlatform
				? ['Keep one core story while adapting framing and pacing to each destination surface.']
				: []),
		],
	)

	const goals: AgenticGoal[] = [
		{
			name: 'Win attention fast',
			outcome: 'Reveal the product promise in the opening beat with immediate clarity.',
			successSignal:
				'Within the first 2-3 seconds, a shopper can tell what the product is and why it matters.',
		},
		{
			name: 'Protect product truth',
			outcome: 'Keep the product visually stable and faithful across every generated moment.',
			successSignal:
				'The output preserves silhouette, texture, branding, and material cues without distracting drift.',
		},
	]

	if (input.wearableComposite) {
		goals.push({
			name: 'Humanize the context believably',
			outcome: 'Use persona or styling context to increase desire without creating uncanny artifacts.',
			successSignal:
				'Any human or wearable presentation feels natural, product-led, and conversion-safe.',
		})
	} else if (input.shortformWorkflow) {
		goals.push({
			name: 'Land a full short-form story arc',
			outcome: 'Move from hook to proof to CTA without losing momentum.',
			successSignal:
				'The clip feels native to short-form feeds and still closes on a clear action cue.',
		})
	} else if (input.workflow === AgenticWorkflow.PROMPT_CHAIN) {
		goals.push({
			name: 'Think in stages before generating',
			outcome: 'Translate richer creative signals into an explicit staged plan before motion starts.',
			successSignal:
				'Analysis, prompt design, generation, and evaluation each contribute visible structure to the final result.',
		})
	}

	goals.push({
		name: 'Finish with evidence',
		outcome: 'Ship only what can be defended by the quality gate and the operating philosophy.',
		successSignal:
			'The quality gate passes or the system explicitly requests retry instead of pretending success.',
	})

	const soul =
		input.workflow === AgenticWorkflow.ORCHESTRATOR_WORKERS
			? 'Coordinate the smallest creative team necessary to turn one product image into a coherent, trustworthy short-form story.'
			: input.workflow === AgenticWorkflow.PROMPT_CHAIN
				? 'Think before generating so every frame serves a deliberate product story instead of decorative motion.'
				: 'Make the product instantly understandable, desirable, and safe to ship in one focused pass.'

	const purpose = input.multiPlatform
		? `Create one durable product story that can adapt across multiple surfaces while continuing to ${categoryPromise}.`
		: input.shortformWorkflow
			? `Help the viewer understand and desire the product inside a short-form vertical arc while continuing to ${categoryPromise}.`
			: `Produce a clear, conversion-focused asset that can ${categoryPromise}.`

	const successCriteria = appendUniqueValues(
		[
			'The opening moment communicates the product promise immediately.',
			'Product identity remains stable from first frame to final CTA.',
			'The final result is defensible at the quality gate.',
		],
		[
			...(input.shortformWorkflow
				? ['Hook, proof, and CTA each have a visible role in the final story arc.']
				: []),
			...(input.wearableComposite
				? ['Any wearable or persona context improves persuasion without overpowering the product.']
				: []),
			...(input.creativeSignals
				? ['Creative context appears as intentional direction, not random stylistic noise.']
				: []),
			...(input.multiPlatform
				? ['The core story stays consistent even when tailored to multiple destination platforms.']
				: []),
		],
	)

	return {
		soul,
		purpose,
		philosophy,
		goals,
		successCriteria,
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
		const workflow = AgenticWorkflow.BASELINE
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.MANUAL,
			workflow,
			reasoning: ['Manual baseline mode requested.'],
			steps: ['direct_generate', 'quality_gate'],
			mission: buildMission({
				mode,
				workflow,
				productCategory,
				shortformWorkflow: false,
				wearableComposite: false,
				creativeSignals,
				multiPlatform,
			}),
			features: {
				evaluator: true,
				shortformWorkflow: false,
				wearableComposite: false,
			},
		})
	}

	if (mode === AgenticMode.CHAIN) {
		const workflow = AgenticWorkflow.PROMPT_CHAIN
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.MANUAL,
			workflow,
			reasoning: ['Manual prompt chain mode requested.'],
			steps: ['analyze_brief', 'build_prompt', 'generate_video', 'quality_gate'],
			mission: buildMission({
				mode,
				workflow,
				productCategory,
				shortformWorkflow,
				wearableComposite: false,
				creativeSignals,
				multiPlatform,
			}),
			features: {
				evaluator: true,
				shortformWorkflow,
				wearableComposite: false,
			},
		})
	}

	if (mode === AgenticMode.ORCHESTRATOR) {
		const workflow = AgenticWorkflow.ORCHESTRATOR_WORKERS
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.MANUAL,
			workflow,
			reasoning: ['Manual orchestrator mode requested.'],
			steps: [
				'route_request',
				...(wearableComposite ? ['wearable_composite_worker'] : []),
				...(shortformWorkflow ? ['shortform_planner_worker'] : []),
				'video_generation_worker',
				'quality_gate',
			],
			mission: buildMission({
				mode,
				workflow,
				productCategory,
				shortformWorkflow,
				wearableComposite,
				creativeSignals,
				multiPlatform,
			}),
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

		const workflow = AgenticWorkflow.ORCHESTRATOR_WORKERS
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.AUTO,
			workflow,
			reasoning,
			steps: [
				'route_request',
				...(wearableComposite ? ['wearable_composite_worker'] : []),
				...(shortformWorkflow ? ['shortform_planner_worker'] : []),
				'video_generation_worker',
				'quality_gate',
			],
			mission: buildMission({
				mode,
				workflow,
				productCategory,
				shortformWorkflow,
				wearableComposite,
				creativeSignals,
				multiPlatform,
			}),
			features: {
				evaluator: true,
				shortformWorkflow,
				wearableComposite,
			},
		})
	}

	if (extendedDuration || keywords.length > 0) {
		const workflow = AgenticWorkflow.PROMPT_CHAIN
		return createExecutionPlan({
			mode,
			routing: AgenticRouting.AUTO,
			workflow,
			reasoning: ['Detected richer creative input that benefits from staged prompt construction.'],
			steps: ['analyze_brief', 'build_prompt', 'generate_video', 'quality_gate'],
			mission: buildMission({
				mode,
				workflow,
				productCategory,
				shortformWorkflow: false,
				wearableComposite: false,
				creativeSignals,
				multiPlatform,
			}),
			features: {
				evaluator: true,
				shortformWorkflow: false,
				wearableComposite: false,
			},
		})
	}

	const workflow = AgenticWorkflow.BASELINE
	return createExecutionPlan({
		mode,
		routing: AgenticRouting.AUTO,
		workflow,
		reasoning: ['Simple single-platform request detected.'],
		steps: ['direct_generate', 'quality_gate'],
		mission: buildMission({
			mode,
			workflow,
			productCategory,
			shortformWorkflow: false,
			wearableComposite: false,
			creativeSignals,
			multiPlatform,
		}),
		features: {
			evaluator: true,
			shortformWorkflow: false,
			wearableComposite: false,
		},
	})
}
