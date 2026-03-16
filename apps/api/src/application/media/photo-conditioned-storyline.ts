import {
	PHASE1_FASHION_MESSAGE_SPINES,
	PHOTO_ACTION_FRAMES,
	PHOTO_CONDITIONED_STORYLINE_TYPES,
	PHOTO_MOMENT_FRAMES,
	PHOTO_PLACE_FRAMES,
	PHOTO_PROOF_GOALS,
	PHOTO_SCENARIO_WRAPPERS,
	type FashionMessageSpineId,
	type PhotoActionFrame,
	type PhotoConditionedStorylineType,
	type PhotoMomentFrame,
	type PhotoPlaceFrame,
	type PhotoProofGoal,
	type PhotoScenarioWrapper,
	type ProductImageDiagnosis,
	type ShotCardPhase,
} from '@/domain/media/planning.js'

export type PhotoConditionedStorylinePromptInput = {
	readonly inputImageUrl: string
	readonly productCategory: string
	readonly targetDurationSeconds?: number
	readonly candidateCount?: number
	readonly cta: string
	readonly brandTone?: string
	readonly creativeContext?: string
	readonly bannedClaims?: ReadonlyArray<string>
	readonly seedDiagnosis?: Partial<ProductImageDiagnosis>
}

type BeatRange = {
	readonly phase: ShotCardPhase
	readonly timeRangeSeconds: string
}

function buildBeatRanges(durationSeconds: number): ReadonlyArray<BeatRange> {
	if (durationSeconds <= 12) {
		return [
			{ phase: 'HOOK', timeRangeSeconds: '0-2' },
			{ phase: 'PROOF', timeRangeSeconds: '2-8' },
			{ phase: 'PAYOFF', timeRangeSeconds: '8-12' },
		]
	}

	if (durationSeconds <= 16) {
		return [
			{ phase: 'HOOK', timeRangeSeconds: '0-3' },
			{ phase: 'PROOF', timeRangeSeconds: '3-11' },
			{ phase: 'PAYOFF', timeRangeSeconds: '11-16' },
		]
	}

	return [
		{ phase: 'HOOK', timeRangeSeconds: '0-4' },
		{ phase: 'PROOF', timeRangeSeconds: '4-12' },
		{ phase: 'PAYOFF', timeRangeSeconds: '12-16' },
	]
}

function stringifySeedDiagnosis(
	seedDiagnosis: Partial<ProductImageDiagnosis> | undefined,
): string {
	if (!seedDiagnosis) {
		return 'none'
	}

	const normalized = Object.fromEntries(
		Object.entries(seedDiagnosis).filter(([, value]) => value !== undefined),
	)

	return Object.keys(normalized).length > 0
		? JSON.stringify(normalized, null, 2)
		: 'none'
}

function stringifyCreativeContext(input: PhotoConditionedStorylinePromptInput): string {
	const sections: string[] = []

	if (input.brandTone?.trim()) {
		sections.push(`brandTone=${input.brandTone.trim()}`)
	}

	if (input.creativeContext?.trim()) {
		sections.push(`creativeContext=${input.creativeContext.trim()}`)
	}

	if (input.bannedClaims && input.bannedClaims.length > 0) {
		sections.push(`bannedClaims=${input.bannedClaims.join(', ')}`)
	}

	return sections.length > 0 ? sections.join(' | ') : 'none'
}

function buildCandidateSchema(durationSeconds: number) {
	const beatRanges = buildBeatRanges(durationSeconds)

	return {
		diagnosis: {
			visibleGarmentType: 'string',
			primaryVisualClaim: 'string',
			heroDetail: 'string',
			silhouetteRead: 'string',
			proofFocus: 'string',
			patternDensity: ['LOW', 'MEDIUM', 'HIGH'],
			stylingComplexity: ['LOW', 'MEDIUM', 'HIGH'],
			versatilitySignal: ['SINGLE_OCCASION', 'MULTI_OCCASION'],
			visualRisks: ['string'],
			reasoning: ['string'],
			confidence: ['LOW', 'MEDIUM', 'HIGH'],
			recommendedScenarioWrappers: [...PHOTO_SCENARIO_WRAPPERS],
			recommendedStorylineTypes: [...PHOTO_CONDITIONED_STORYLINE_TYPES],
			recommendedMessageSpines: [...PHASE1_FASHION_MESSAGE_SPINES],
		},
		candidates: [
			{
				id: 'candidate-1',
				scenarioWrapper: PHOTO_SCENARIO_WRAPPERS[0],
				placeFrame: PHOTO_PLACE_FRAMES[0],
				actionFrame: PHOTO_ACTION_FRAMES[0],
				momentFrame: PHOTO_MOMENT_FRAMES[0],
				proofGoal: PHOTO_PROOF_GOALS[0],
				storylineType: PHOTO_CONDITIONED_STORYLINE_TYPES[0],
				messageSpineId: PHASE1_FASHION_MESSAGE_SPINES[0],
				oneSentenceClaim: 'string',
				whyThisFitsImage: 'string',
				hook: 'string',
				proof: 'string',
				payoff: 'string',
				cta: 'string',
				viewerTakeaway: 'string',
				editorialThesis: 'string',
				talentDirection: 'string',
				supportingSignals: ['string'],
				beatPlan: beatRanges.map((beat) => ({
					phase: beat.phase,
					timeRangeSeconds: beat.timeRangeSeconds,
					narrativeGoal: 'string',
					garmentReadGoal: 'string',
					shotHint: 'string',
					mustShow: ['string'],
					mustAvoid: ['string'],
				})),
				rejectionIf: ['string'],
			},
		],
		selection: {
			recommendedCandidateId: 'candidate-1',
			rationale: 'string',
			rejectedCandidateIds: ['candidate-2'],
		},
	}
}

export function mapStorylineTypeToMessageSpine(
	storylineType: PhotoConditionedStorylineType,
): FashionMessageSpineId {
	switch (storylineType) {
		case 'DETAIL_TO_SILHOUETTE_REVEAL':
			return 'DETAIL_SILHOUETTE_DECISION'
		case 'QUESTION_PROOF_PAYOFF':
		case 'PROBLEM_SOLUTION_TRYON':
		case 'THREE_OCCASION_LOOKBOOK':
		case 'ROUTINE_TO_LOOK_PAYOFF':
		default:
			return 'QUESTION_PROOF_CHOICE'
	}
}

function mapScenarioWrapperToDefaults(
	wrapper: PhotoScenarioWrapper,
): {
	readonly placeFrame: PhotoPlaceFrame
	readonly actionFrame: PhotoActionFrame
	readonly momentFrame: PhotoMomentFrame
	readonly proofGoal: PhotoProofGoal
} {
	switch (wrapper) {
		case 'WHAT_I_WORE_TO_X':
			return {
				placeFrame: 'COFFEE_SHOP_WORK',
				actionFrame: 'WORK_ON_LAPTOP',
				momentFrame: 'REMOTE_WORK',
				proofGoal: 'REALISTIC_REPEAT_USE',
			}
		case 'ROTATION_SERIES':
			return {
				placeFrame: 'WEEKEND_SOCIAL',
				actionFrame: 'CHOOSE_LOOK',
				momentFrame: 'WEEKEND_DAY',
				proofGoal: 'VERSATILITY',
			}
		case 'OPTION_PICKER':
			return {
				placeFrame: 'HOME',
				actionFrame: 'CHOOSE_LOOK',
				momentFrame: 'BEFORE_LEAVING_HOME',
				proofGoal: 'VERSATILITY',
			}
		case 'TRANSITION_LOOK':
			return {
				placeFrame: 'DINNER',
				actionFrame: 'TRANSITION',
				momentFrame: 'EVENING_TRANSITION',
				proofGoal: 'VERSATILITY',
			}
		case 'TASK_COMFORT_PROOF':
			return {
				placeFrame: 'TRANSIT',
				actionFrame: 'COMMUTE',
				momentFrame: 'WORKDAY_MORNING',
				proofGoal: 'COMFORT_FOR_TASK',
			}
		case 'VENUE_RULE_GUIDE':
			return {
				placeFrame: 'WEDDING_VENUE',
				actionFrame: 'ENTER_SPACE',
				momentFrame: 'PRE_EVENT',
				proofGoal: 'SOCIAL_APPROPRIATENESS',
			}
		case 'GRWM_FOR_OCCASION':
		default:
			return {
				placeFrame: 'HOME',
				actionFrame: 'GET_READY',
				momentFrame: 'BEFORE_LEAVING_HOME',
				proofGoal: 'DRESS_CODE_FIT',
			}
	}
}

export function buildPhotoConditionedStorylineOutputSchema(
	durationSeconds = 16,
): Record<string, unknown> {
	return buildCandidateSchema(durationSeconds)
}

export function buildPhotoConditionedStorylinePrompt(
	input: PhotoConditionedStorylinePromptInput,
): string {
	const durationSeconds = input.targetDurationSeconds ?? 16
	const candidateCount = Math.max(1, Math.min(input.candidateCount ?? 3, 5))
	const beatRanges = buildBeatRanges(durationSeconds)

	return [
		'You are a photo-conditioned fashion short-form storyline planner.',
		'Analyze the provided product image first, then propose constrained storyline candidates for a vertical clothing video.',
		'Do not improvise with generic walk-turn-hero arcs. Start from visible garment signals and map them to one claim only.',
		'The output must describe a plausible human situation, not a mannequin-like pose reel.',
		'',
		'Input:',
		`- productCategory: ${input.productCategory}`,
		`- inputImageUrl: ${input.inputImageUrl}`,
		`- targetDurationSeconds: ${durationSeconds}`,
		`- candidateCount: ${candidateCount}`,
		`- cta: ${input.cta}`,
		`- creativeContext: ${stringifyCreativeContext(input)}`,
		`- seedDiagnosis: ${stringifySeedDiagnosis(input.seedDiagnosis)}`,
		'',
		'Allowed message spines:',
		...PHASE1_FASHION_MESSAGE_SPINES.map((spine) => `- ${spine}`),
		'',
		'Allowed scenario wrappers:',
		...PHOTO_SCENARIO_WRAPPERS.map((wrapper) => {
			const defaults = mapScenarioWrapperToDefaults(wrapper)
			return `- ${wrapper} -> default place ${defaults.placeFrame}, action ${defaults.actionFrame}, moment ${defaults.momentFrame}, proofGoal ${defaults.proofGoal}`
		}),
		'',
		'Allowed place frames:',
		...PHOTO_PLACE_FRAMES.map((placeFrame) => `- ${placeFrame}`),
		'',
		'Allowed action frames:',
		...PHOTO_ACTION_FRAMES.map((actionFrame) => `- ${actionFrame}`),
		'',
		'Allowed moment frames:',
		...PHOTO_MOMENT_FRAMES.map((momentFrame) => `- ${momentFrame}`),
		'',
		'Allowed proof goals:',
		...PHOTO_PROOF_GOALS.map((proofGoal) => `- ${proofGoal}`),
		'',
		'Allowed storyline types:',
		...PHOTO_CONDITIONED_STORYLINE_TYPES.map(
			(type) => `- ${type} -> default spine ${mapStorylineTypeToMessageSpine(type)}`,
		),
		'',
		'House rules:',
		'- Diagnose the image before writing any hook.',
		'- One candidate = one claim. Never bundle multiple unrelated benefits.',
		'- Every candidate must choose one scenarioWrapper, one placeFrame, one actionFrame, one momentFrame, and one proofGoal.',
		'- The action must be visible and must prove something about the garment in use.',
		'- Beat plans and shot hints must describe a concrete human action such as checking the waist in a mirror, sitting and settling, picking up a bag, or entering a space. Generic gesturing to the outfit is invalid.',
		'- The proof beat must explain why this specific garment works on-body.',
		'- A camera verb alone is not proof. "walk", "turn", or "pose" only matter when tied to garment readability.',
		'- Static mannequin-like swaying, catalog posing, or empty arm movement is invalid.',
		'- Prefer a simple, plausible real-world setting inferred from the garment signals even if the source photo is studio-only.',
		'- You may infer one believable place and one believable action, but do not invent complex props, extra people, scene changes, or impossible transformations.',
		'- Prefer on-body proof, silhouette readability, and detail evidence over abstract mood language.',
		'- If the garment appears detail-led, include at least one DETAIL_TO_SILHOUETTE_REVEAL candidate.',
		'- If the garment appears versatile across contexts, include at least one THREE_OCCASION_LOOKBOOK or ROUTINE_TO_LOOK_PAYOFF candidate.',
		'- If you choose seated work, commute, or venue scenarios, make the seated/task/entry proof explicit in the beat plan.',
		'- Do not use named brands, celebrity lookalikes, or stereotype-driven styling shorthand.',
		'- Talent direction must keep the garment as the hero.',
		`- Beat plan must fit these timing buckets exactly: ${beatRanges.map((beat) => `${beat.phase} ${beat.timeRangeSeconds}s`).join(', ')}.`,
		'',
		'Output requirements:',
		'- Return strict JSON only.',
		'- Fill diagnosis first, then candidates, then selection.',
		'- Recommend the best candidate based on image fit, message clarity, and 16-second feasibility.',
		'- For every candidate include why it fits this image, what must be shown, and what would invalidate it.',
		'',
		'Return JSON with this exact shape:',
		JSON.stringify(buildCandidateSchema(durationSeconds), null, 2),
	].join('\n')
}
