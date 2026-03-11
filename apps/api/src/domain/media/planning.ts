import type { StylePreset } from '@1dragon/shared'

export const STORY_CONCEPT_FAMILIES = [
	'FIT_CHECK',
	'DETAIL_PROOF',
	'COMMENT_CHALLENGE',
	'ROUTINE_STORY',
	'PROBLEM_SOLUTION',
	'LIFESTYLE_DEMO',
	'SOCIAL_PROOF',
] as const

export type StoryConceptFamily = (typeof STORY_CONCEPT_FAMILIES)[number]
export type StoryPlanningStage = 'STORY_BRIEF' | 'SHOT_PLAN' | 'PROMPT_COMPILATION'
export type ReviewDecisionOutcome = 'APPROVED' | 'REVISE' | 'REJECT'
export type ReviewRiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH'
export type ShotCardPhase = 'HOOK' | 'PROOF' | 'PAYOFF'

export type CreativeContext = {
	readonly location?: string
	readonly profession?: string
	readonly identity?: string
	readonly traits?: ReadonlyArray<string>
	readonly visualStyle?: string
}

export type StoryBrief = {
	readonly targetViewer: string
	readonly corePromise: string
	readonly hook: string
	readonly proofStrategy: string
	readonly emotionalPayoff: string
	readonly cta: string
	readonly tone: string
	readonly productCategory: string
	readonly stylePreset: StylePreset
	readonly moods: ReadonlyArray<string>
	readonly keywords: ReadonlyArray<string>
	readonly creativeContext?: CreativeContext
}

export type ConceptCandidate = {
	readonly id: string
	readonly family: StoryConceptFamily
	readonly angle: string
	readonly hook: string
	readonly proofBeat: string
	readonly emotionalPayoff: string
	readonly cta: string
	readonly rationale: ReadonlyArray<string>
	readonly score: number
}

export type ShotCard = {
	readonly id: string
	readonly phase: ShotCardPhase
	readonly order: number
	readonly sceneIntent: string
	readonly actorAction: string
	readonly proofTarget: string
	readonly background: string
	readonly cameraDirection: string
	readonly payoff: string
	readonly overlayText: string
	readonly durationWeight: number
}

export type ReviewPoint = {
	readonly statement: string
	readonly evidence: ReadonlyArray<string>
}

export type ReviewRisk = {
	readonly statement: string
	readonly severity: ReviewRiskSeverity
	readonly mitigation: string
}

export type ReviewDecision = {
	readonly outcome: ReviewDecisionOutcome
	readonly rationale: string
}

export type ReviewArtifact = {
	readonly stage: StoryPlanningStage
	readonly selfCritique: ReadonlyArray<string>
	readonly fact: ReadonlyArray<ReviewPoint>
	readonly inference: ReadonlyArray<ReviewPoint>
	readonly risk: ReadonlyArray<ReviewRisk>
	readonly decision: ReviewDecision
	readonly nextStep: string
}

export type PromptCompileShotMapping = {
	readonly shotCardId: string
	readonly phase: ShotCardPhase
	readonly sceneIntent: string
	readonly proofTarget: string
	readonly payoff: string
	readonly providerSegments: {
		readonly runway: string
		readonly hailuo: string
		readonly geminiVeo: string
		readonly minimax: string
	}
}

export type PromptCompilationDebug = {
	readonly storySummary: string
	readonly selectedConceptFamily: StoryConceptFamily
	readonly shotMappings: ReadonlyArray<PromptCompileShotMapping>
}

export type StoryPlanningArtifacts = {
	readonly storyBrief: StoryBrief
	readonly conceptCandidates: ReadonlyArray<ConceptCandidate>
	readonly selectedConcept: ConceptCandidate
	readonly shotCards: ReadonlyArray<ShotCard>
	readonly reviewArtifacts: ReadonlyArray<ReviewArtifact>
	readonly promptCompilation?: PromptCompilationDebug
}
