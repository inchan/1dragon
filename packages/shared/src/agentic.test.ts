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

		expect(plan.mode).toBe(AgenticMode.AUTO)
		expect(plan.routing).toBe(AgenticRouting.AUTO)
		expect(plan.workflow).toBe(AgenticWorkflow.BASELINE)
		expect(plan.reasoning).toEqual(['Simple single-platform request detected.'])
		expect(plan.steps).toEqual(['direct_generate', 'quality_gate'])
		expect(plan.mission.soul).toContain('safe to ship')
		expect(plan.mission.purpose).toContain('conversion-focused')
		expect(plan.mission.philosophy).toContain(
			'Autonomously derive the next concrete goal from the brief instead of waiting for manual micromanagement.',
		)
		expect(plan.mission.goals.map((goal) => goal.name)).toContain('Finish with evidence')
		expect(plan.mission.successCriteria).toContain(
			'The final result is defensible at the quality gate.',
		)
		expect(plan.features).toEqual({
			evaluator: true,
			shortformWorkflow: false,
			wearableComposite: false,
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
		expect(plan.mission.soul).toContain('Think before generating')
		expect(plan.mission.goals.map((goal) => goal.name)).toContain(
			'Think in stages before generating',
		)
		expect(plan.mission.purpose).toContain('conversion-focused asset')
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
		expect(plan.mission.soul).toContain('creative team')
		expect(plan.mission.purpose).toContain('multiple surfaces')
		expect(plan.mission.philosophy).toContain(
			'Keep one core story while adapting framing and pacing to each destination surface.',
		)
		expect(plan.mission.goals.map((goal) => goal.name)).toContain('Land a full short-form story arc')
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

		expect(plan.mode).toBe(AgenticMode.CHAIN)
		expect(plan.routing).toBe(AgenticRouting.MANUAL)
		expect(plan.workflow).toBe(AgenticWorkflow.PROMPT_CHAIN)
		expect(plan.reasoning).toEqual(['Manual prompt chain mode requested.'])
		expect(plan.mission.philosophy).toContain(
			'Honor the user-selected workflow, then self-manage each stage rigorously until the quality gate decides the outcome.',
		)
		expect(plan.mission.goals.map((goal) => goal.name)).toContain('Land a full short-form story arc')
		expect(plan.features).toEqual({
			evaluator: true,
			shortformWorkflow: true,
			wearableComposite: false,
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
		expect(plan.mission.goals.map((goal) => goal.name)).toContain(
			'Humanize the context believably',
		)
		expect(plan.mission.successCriteria).toContain(
			'Any wearable or persona context improves persuasion without overpowering the product.',
		)
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

		expect(plan.mode).toBe(AgenticMode.BASELINE)
		expect(plan.routing).toBe(AgenticRouting.MANUAL)
		expect(plan.workflow).toBe(AgenticWorkflow.BASELINE)
		expect(plan.reasoning).toEqual(['Manual baseline mode requested.'])
		expect(plan.mission.purpose).toContain('conversion-focused asset')
		expect(plan.mission.goals.map((goal) => goal.name)).not.toContain(
			'Humanize the context believably',
		)
		expect(plan.features).toEqual({
			evaluator: true,
			shortformWorkflow: false,
			wearableComposite: false,
		})
	})
})
