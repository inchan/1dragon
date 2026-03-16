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

export const PHASE1_FASHION_MESSAGE_SPINES = [
	'QUESTION_PROOF_CHOICE',
	'DETAIL_SILHOUETTE_DECISION',
] as const

export const PHOTO_CONDITIONED_STORYLINE_TYPES = [
	'QUESTION_PROOF_PAYOFF',
	'DETAIL_TO_SILHOUETTE_REVEAL',
	'PROBLEM_SOLUTION_TRYON',
	'THREE_OCCASION_LOOKBOOK',
	'ROUTINE_TO_LOOK_PAYOFF',
] as const

export const PHOTO_SCENARIO_WRAPPERS = [
	'GRWM_FOR_OCCASION',
	'WHAT_I_WORE_TO_X',
	'ROTATION_SERIES',
	'OPTION_PICKER',
	'TRANSITION_LOOK',
	'TASK_COMFORT_PROOF',
	'VENUE_RULE_GUIDE',
] as const

export const PHOTO_PLACE_FRAMES = [
	'OFFICE',
	'COFFEE_SHOP_WORK',
	'CAFE_DATE',
	'DINNER',
	'AIRPORT',
	'TRANSIT',
	'HOME',
	'WEDDING_VENUE',
	'GRADUATION_VENUE',
	'ERRAND_ROUTE',
	'WEEKEND_SOCIAL',
] as const

export const PHOTO_ACTION_FRAMES = [
	'GET_READY',
	'ENTER_SPACE',
	'SIT_AND_SETTLE',
	'WORK_ON_LAPTOP',
	'CHOOSE_LOOK',
	'COMMUTE',
	'TRANSITION',
	'RUN_ERRANDS',
	'TRAVEL',
	'GROUP_OUTING',
] as const

export const PHOTO_MOMENT_FRAMES = [
	'PRE_EVENT',
	'WORKDAY_MORNING',
	'REMOTE_WORK',
	'EVENING_TRANSITION',
	'LONG_HAUL_TRAVEL',
	'WEEKEND_DAY',
	'BEFORE_LEAVING_HOME',
] as const

export const PHOTO_PROOF_GOALS = [
	'DRESS_CODE_FIT',
	'COMFORT_FOR_TASK',
	'VERSATILITY',
	'SOCIAL_APPROPRIATENESS',
	'SILHOUETTE_POLISH',
	'REALISTIC_REPEAT_USE',
] as const

export type StoryConceptFamily = (typeof STORY_CONCEPT_FAMILIES)[number]
export type FashionMessageSpineId = (typeof PHASE1_FASHION_MESSAGE_SPINES)[number]
export type PhotoConditionedStorylineType =
	(typeof PHOTO_CONDITIONED_STORYLINE_TYPES)[number]
export type PhotoScenarioWrapper = (typeof PHOTO_SCENARIO_WRAPPERS)[number]
export type PhotoPlaceFrame = (typeof PHOTO_PLACE_FRAMES)[number]
export type PhotoActionFrame = (typeof PHOTO_ACTION_FRAMES)[number]
export type PhotoMomentFrame = (typeof PHOTO_MOMENT_FRAMES)[number]
export type PhotoProofGoal = (typeof PHOTO_PROOF_GOALS)[number]
export type StoryPlanningStage = 'STORY_BRIEF' | 'SHOT_PLAN' | 'PROMPT_COMPILATION'
export type ReviewDecisionOutcome = 'APPROVED' | 'REVISE' | 'REJECT'
export type ReviewRiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH'
export type ShotCardPhase = 'HOOK' | 'PROOF' | 'PAYOFF'
export type DiagnosisConfidence = 'LOW' | 'MEDIUM' | 'HIGH'
export type MotionEnergyClass = 'STILL' | 'RESTRAINED' | 'KINETIC' | 'STREET_RUSH'
export type ReferenceSourceLane =
	| 'OFFICIAL_SNS_STRUCTURE'
	| 'OFFICIAL_PLATFORM_PROMPT'
	| 'INTERNAL_JUDGED'
	| 'LICENSED_CREATOR'
	| 'SIGNAL_MINING'
export type ReferenceDependencyLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type CreativeContext = {
	readonly location?: string
	readonly profession?: string
	readonly identity?: string
	readonly traits?: ReadonlyArray<string>
	readonly visualStyle?: string
}

export type ProductImageDiagnosis = {
	readonly visibleGarmentType: string
	readonly primaryVisualClaim: string
	readonly heroDetail: string
	readonly silhouetteRead: string
	readonly proofFocus: string
	readonly patternDensity: 'LOW' | 'MEDIUM' | 'HIGH'
	readonly stylingComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
	readonly versatilitySignal: 'SINGLE_OCCASION' | 'MULTI_OCCASION'
	readonly visualRisks: ReadonlyArray<string>
	readonly reasoning: ReadonlyArray<string>
	readonly confidence: DiagnosisConfidence
	readonly recommendedScenarioWrappers: ReadonlyArray<PhotoScenarioWrapper>
	readonly recommendedStorylineTypes: ReadonlyArray<PhotoConditionedStorylineType>
	readonly recommendedMessageSpines: ReadonlyArray<FashionMessageSpineId>
}

export type StorylineBeatPlan = {
	readonly phase: ShotCardPhase
	readonly timeRangeSeconds: string
	readonly narrativeGoal: string
	readonly garmentReadGoal: string
	readonly shotHint: string
	readonly mustShow: ReadonlyArray<string>
	readonly mustAvoid: ReadonlyArray<string>
}

export type PhotoConditionedStorylineCandidate = {
	readonly id: string
	readonly scenarioWrapper: PhotoScenarioWrapper
	readonly placeFrame: PhotoPlaceFrame
	readonly actionFrame: PhotoActionFrame
	readonly momentFrame: PhotoMomentFrame
	readonly proofGoal: PhotoProofGoal
	readonly storylineType: PhotoConditionedStorylineType
	readonly messageSpineId: FashionMessageSpineId
	readonly oneSentenceClaim: string
	readonly whyThisFitsImage: string
	readonly hook: string
	readonly proof: string
	readonly payoff: string
	readonly cta: string
	readonly viewerTakeaway: string
	readonly editorialThesis: string
	readonly talentDirection: string
	readonly supportingSignals: ReadonlyArray<string>
	readonly beatPlan: ReadonlyArray<StorylineBeatPlan>
	readonly rejectionIf: ReadonlyArray<string>
}

export type StorylineElementPlan = {
	readonly backgroundElement: string
	readonly motionElement: string
	readonly cameraElement: string
	readonly proofElement: string
	readonly payoffElement: string
	readonly energyClass: MotionEnergyClass
	readonly distinctivenessCue: string
	readonly antiGenericGuardrail: string
	readonly rationale: ReadonlyArray<string>
}

export type StoryBrief = {
	readonly targetViewer: string
	readonly corePromise: string
	readonly hook: string
	readonly proofStrategy: string
	readonly emotionalPayoff: string
	readonly cta: string
	readonly messageSpineId?: FashionMessageSpineId
	readonly hookLine?: string
	readonly proofLine?: string
	readonly payoffLine?: string
	readonly ctaLine?: string
	readonly viewerTakeaway?: string
	readonly editorialThesis?: string
	readonly talentDirection?: string
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
	readonly storylineType?: PhotoConditionedStorylineType
	readonly angle: string
	readonly hook: string
	readonly proofBeat: string
	readonly emotionalPayoff: string
	readonly cta: string
	readonly rationale: ReadonlyArray<string>
	readonly supportingSignals?: ReadonlyArray<string>
	readonly rejectionIf?: ReadonlyArray<string>
	readonly preferredEnergyClass?: MotionEnergyClass
	readonly distinctivenessCue?: string
	readonly score: number
}

export type PlannerReferenceCue = {
	readonly id: string
	readonly sourceLane: ReferenceSourceLane
	readonly sourcePlatform: string
	readonly storylineType: PhotoConditionedStorylineType
	readonly messageSpineId: FashionMessageSpineId
	readonly oneClaim: string
	readonly structureSummary: string
	readonly proofType: string
	readonly payoffType: string
	readonly textDependency: ReferenceDependencyLevel
	readonly bestForSignals: ReadonlyArray<string>
	readonly badFitSignals: ReadonlyArray<string>
	readonly mustShow: ReadonlyArray<string>
	readonly mustAvoid: ReadonlyArray<string>
	readonly promptSections: ReadonlyArray<string>
	readonly negativeConstraints: ReadonlyArray<string>
	readonly elementSeed?: {
		readonly backgroundElement: string
		readonly motionElement: string
		readonly cameraElement: string
		readonly energyClass: MotionEnergyClass
		readonly distinctivenessCue: string
	}
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
	readonly palettePlan?: string
	readonly framingPlan?: string
	readonly alignmentBlockingPlan?: string
	readonly gazeDirection?: string
	readonly silhouetteHeroZone?: string
	readonly visualHierarchyPlan?: string
	readonly overlaySafeZone?: string
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
	readonly palettePlan?: string
	readonly framingPlan?: string
	readonly alignmentBlockingPlan?: string
	readonly gazeDirection?: string
	readonly silhouetteHeroZone?: string
	readonly visualHierarchyPlan?: string
	readonly overlaySafeZone?: string
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
	readonly selectedStorylineType?: PhotoConditionedStorylineType
	readonly selectedReferenceIds?: ReadonlyArray<string>
	readonly storylineElements?: StorylineElementPlan
	readonly shotMappings: ReadonlyArray<PromptCompileShotMapping>
}

export type StoryPlanningArtifacts = {
	readonly productImageDiagnosis?: ProductImageDiagnosis
	readonly storyBrief: StoryBrief
	readonly conceptCandidates: ReadonlyArray<ConceptCandidate>
	readonly selectedConcept: ConceptCandidate
	readonly selectedReferences?: ReadonlyArray<PlannerReferenceCue>
	readonly storylineElements?: StorylineElementPlan
	readonly shotCards: ReadonlyArray<ShotCard>
	readonly reviewArtifacts: ReadonlyArray<ReviewArtifact>
	readonly promptCompilation?: PromptCompilationDebug
}
