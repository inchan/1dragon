import { describe, expect, it } from 'vitest'
import {
	AgenticMode,
	AgenticRouting,
	AgenticWorkflow,
	agenticExecutionPlanSchema,
	resolveAgenticExecutionPlan,
} from './agentic'
import { Platform, ProductCategory } from './enums'

describe('resolveAgenticExecutionPlan', () => {
	it('selects baseline workflow for simple requests in auto mode', () => {
		const plan = resolveAgenticExecutionPlan({
			productCategory: 'unknown-category',
			platforms: [Platform.TIKTOK],
			duration: 15,
		})

		expect(plan).toEqual({
			mode: AgenticMode.AUTO,
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
		expect(agenticExecutionPlanSchema.parse(plan)).toEqual(plan)
	})

	it('selects prompt chain for richer non-orchestrated requests', () => {
		const plan = resolveAgenticExecutionPlan({
			productCategory: ProductCategory.BEAUTY,
			keywords: ['glow', 'serum'],
			duration: 20,
			platforms: [Platform.INSTAGRAM_REELS],
		})

		expect(plan.workflow).toBe(AgenticWorkflow.PROMPT_CHAIN)
		expect(plan.reasoning).toEqual([
			'Detected richer creative input that benefits from staged prompt construction.',
		])
		expect(plan.steps).toEqual([
			'analyze_brief',
			'build_prompt',
			'generate_video',
			'quality_gate',
		])
		expect(plan.features).toEqual({
			evaluator: true,
			shortformWorkflow: false,
			wearableComposite: false,
		})
	})

	it('selects orchestrator-workers for fashion requests with shortform planning', () => {
		const plan = resolveAgenticExecutionPlan({
			productCategory: ProductCategory.FASHION,
			autoShortformWorkflow: true,
			skipWearableComposite: true,
			creativeContext: {
				traits: ['urban runway'],
			},
			platforms: [Platform.TIKTOK, Platform.INSTAGRAM_REELS],
		})

		expect(plan.workflow).toBe(AgenticWorkflow.ORCHESTRATOR_WORKERS)
		expect(plan.reasoning).toContain('Detected multi-step media generation requirements.')
		expect(plan.reasoning).toContain(
			'Fashion shortform workflow benefits from coordinated planning directives.',
		)
		expect(plan.reasoning).toContain(
			'Persona or creative context requires expert-style orchestration.',
		)
		expect(plan.reasoning).toContain(
			'Multiple delivery targets benefit from routed orchestration.',
		)
		expect(plan.steps).toEqual([
			'route_request',
			'shortform_planner_worker',
			'video_generation_worker',
			'quality_gate',
		])
		expect(plan.features).toEqual({
			evaluator: true,
			shortformWorkflow: true,
			wearableComposite: false,
		})
	})

	it('respects manual prompt chain mode and keeps fashion shortform enabled', () => {
		const plan = resolveAgenticExecutionPlan({
			agenticMode: AgenticMode.CHAIN,
			productCategory: ProductCategory.FASHION,
			autoShortformWorkflow: true,
		})

		expect(plan).toEqual({
			mode: AgenticMode.CHAIN,
			routing: AgenticRouting.MANUAL,
			workflow: AgenticWorkflow.PROMPT_CHAIN,
			reasoning: ['Manual prompt chain mode requested.'],
			steps: ['analyze_brief', 'build_prompt', 'generate_video', 'quality_gate'],
			features: {
				evaluator: true,
				shortformWorkflow: true,
				wearableComposite: false,
			},
		})
	})

	it('enables wearable composite for accessory footwear in manual orchestrator mode', () => {
		const plan = resolveAgenticExecutionPlan({
			agenticMode: AgenticMode.ORCHESTRATOR,
			productCategory: ProductCategory.ACCESSORIES,
			keywords: ['sneakers', 'limited'],
		})

		expect(plan.workflow).toBe(AgenticWorkflow.ORCHESTRATOR_WORKERS)
		expect(plan.steps).toEqual([
			'route_request',
			'wearable_composite_worker',
			'video_generation_worker',
			'quality_gate',
		])
		expect(plan.features).toEqual({
			evaluator: true,
			shortformWorkflow: false,
			wearableComposite: true,
		})
	})

	it('disables all extras in manual baseline mode', () => {
		const plan = resolveAgenticExecutionPlan({
			agenticMode: AgenticMode.BASELINE,
			productCategory: ProductCategory.FASHION,
			autoShortformWorkflow: true,
			keywords: ['shoe'],
		})

		expect(plan).toEqual({
			mode: AgenticMode.BASELINE,
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
	})
})
