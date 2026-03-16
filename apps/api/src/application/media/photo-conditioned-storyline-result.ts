import { z } from 'zod'
import {
	PHOTO_ACTION_FRAMES,
	PHASE1_FASHION_MESSAGE_SPINES,
	PHOTO_CONDITIONED_STORYLINE_TYPES,
	PHOTO_MOMENT_FRAMES,
	PHOTO_PLACE_FRAMES,
	PHOTO_PROOF_GOALS,
	PHOTO_SCENARIO_WRAPPERS,
	type FashionMessageSpineId,
	type PhotoActionFrame,
	type PhotoMomentFrame,
	type PhotoPlaceFrame,
	type PhotoProofGoal,
	type PhotoScenarioWrapper,
} from '@/domain/media/planning.js'

const messageSpineSchema = z.enum(PHASE1_FASHION_MESSAGE_SPINES)
const storylineTypeSchema = z.enum(PHOTO_CONDITIONED_STORYLINE_TYPES)
const scenarioWrapperSchema = z.enum(PHOTO_SCENARIO_WRAPPERS)
const placeFrameSchema = z.enum(PHOTO_PLACE_FRAMES)
const actionFrameSchema = z.enum(PHOTO_ACTION_FRAMES)
const momentFrameSchema = z.enum(PHOTO_MOMENT_FRAMES)
const proofGoalSchema = z.enum(PHOTO_PROOF_GOALS)
const beatPhaseSchema = z.enum(['HOOK', 'PROOF', 'PAYOFF'])

const diagnosisSchema = z.object({
	visibleGarmentType: z.string().min(1),
	primaryVisualClaim: z.string().min(1),
	heroDetail: z.string().min(1),
	silhouetteRead: z.string().min(1),
	proofFocus: z.string().min(1),
	patternDensity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
	stylingComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
	versatilitySignal: z.enum(['SINGLE_OCCASION', 'MULTI_OCCASION']),
	visualRisks: z.array(z.string()),
	reasoning: z.array(z.string()),
	confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
	recommendedScenarioWrappers: z.array(scenarioWrapperSchema).min(1),
	recommendedStorylineTypes: z.array(storylineTypeSchema).min(1),
	recommendedMessageSpines: z.array(messageSpineSchema).min(1),
})

const beatPlanSchema = z.object({
	phase: beatPhaseSchema,
	timeRangeSeconds: z.string().min(1),
	narrativeGoal: z.string().min(1),
	garmentReadGoal: z.string().min(1),
	shotHint: z.string().min(1),
	mustShow: z.array(z.string()),
	mustAvoid: z.array(z.string()),
})

const candidateSchema = z.object({
	id: z.string().min(1),
	scenarioWrapper: scenarioWrapperSchema,
	placeFrame: placeFrameSchema,
	actionFrame: actionFrameSchema,
	momentFrame: momentFrameSchema,
	proofGoal: proofGoalSchema,
	storylineType: storylineTypeSchema,
	messageSpineId: messageSpineSchema,
	oneSentenceClaim: z.string().min(1),
	whyThisFitsImage: z.string().min(1),
	hook: z.string().min(1),
	proof: z.string().min(1),
	payoff: z.string().min(1),
	cta: z.string().min(1),
	viewerTakeaway: z.string().min(1),
	editorialThesis: z.string().min(1),
	talentDirection: z.string().min(1),
	supportingSignals: z.array(z.string()),
	beatPlan: z.array(beatPlanSchema).min(1),
	rejectionIf: z.array(z.string()),
})

const selectionSchema = z.object({
	recommendedCandidateId: z.string().min(1),
	rationale: z.string().min(1),
	rejectedCandidateIds: z.array(z.string()),
})

export const photoConditionedStorylineResponseSchema = z.object({
	diagnosis: diagnosisSchema,
	candidates: z.array(candidateSchema).min(1),
	selection: selectionSchema,
})

export type PhotoConditionedStorylineResponse = z.infer<
	typeof photoConditionedStorylineResponseSchema
>
export type PhotoConditionedStorylineCandidate = z.infer<typeof candidateSchema>
export type DerivedPhotoStorylineShortform = {
	readonly messageSpineId: FashionMessageSpineId
	readonly hook: string
	readonly message: string
	readonly proofDetail: string
	readonly viewerTakeaway: string
	readonly editorialThesis: string
	readonly talentBrief: string
	readonly referenceDirective: string
	readonly scenarioSituation: string
	readonly visibleAction: string
	readonly hookDirection: string
	readonly proofDirection: string
	readonly payoffDirection: string
	readonly scenarioWrapper: PhotoScenarioWrapper
	readonly placeFrame: PhotoPlaceFrame
	readonly actionFrame: PhotoActionFrame
	readonly momentFrame: PhotoMomentFrame
	readonly proofGoal: PhotoProofGoal
}
export type ResponsesApiBody = {
	readonly output_text?: string
	readonly output?: ReadonlyArray<{
		readonly content?: ReadonlyArray<{
			readonly text?: string
		}>
	}>
}

export type GeminiGenerateContentResponse = {
	readonly candidates?: ReadonlyArray<{
		readonly content?: {
			readonly parts?: ReadonlyArray<{
				readonly text?: string
			}>
		}
	}>
}

export function extractJsonObject(value: string): string {
	const start = value.indexOf('{')
	const end = value.lastIndexOf('}')
	if (start === -1 || end === -1 || end <= start) {
		throw new Error(`Expected JSON object in model output, received: ${value}`)
	}

	return value.slice(start, end + 1)
}

export function extractResponseText(body: ResponsesApiBody): string {
	const outputText = body.output_text?.trim()
	if (outputText) {
		return outputText
	}

	const joined =
		body.output
			?.flatMap((item) => item.content ?? [])
			.map((item) => item.text ?? '')
			.join('\n')
			.trim() ?? ''

	if (!joined) {
		throw new Error('Responses API body did not contain text output')
	}

	return joined
}

export function extractGeminiText(body: GeminiGenerateContentResponse): string {
	const candidates = Array.isArray(body.candidates) ? body.candidates : []

	for (const candidate of candidates) {
		const parts = Array.isArray(candidate.content?.parts) ? candidate.content?.parts : []
		const text = parts
			.map((part) => part.text?.trim() ?? '')
			.filter(Boolean)
			.join('\n')
			.trim()
		if (text) {
			return text
		}
	}

	throw new Error('Gemini generateContent response did not contain text output')
}

export function buildPhotoConditionedStorylineJsonSchema(): Record<string, unknown> {
	const beatPlanItem = {
		type: 'object',
		properties: {
			phase: { type: 'string', enum: ['HOOK', 'PROOF', 'PAYOFF'] },
			timeRangeSeconds: { type: 'string' },
			narrativeGoal: { type: 'string' },
			garmentReadGoal: { type: 'string' },
			shotHint: { type: 'string' },
			mustShow: { type: 'array', items: { type: 'string' } },
			mustAvoid: { type: 'array', items: { type: 'string' } },
		},
		required: [
			'phase',
			'timeRangeSeconds',
			'narrativeGoal',
			'garmentReadGoal',
			'shotHint',
			'mustShow',
			'mustAvoid',
		],
	}

	return {
		type: 'object',
		properties: {
			diagnosis: {
				type: 'object',
				properties: {
					visibleGarmentType: { type: 'string' },
					primaryVisualClaim: { type: 'string' },
					heroDetail: { type: 'string' },
					silhouetteRead: { type: 'string' },
					proofFocus: { type: 'string' },
					patternDensity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
					stylingComplexity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
					versatilitySignal: {
						type: 'string',
						enum: ['SINGLE_OCCASION', 'MULTI_OCCASION'],
					},
					visualRisks: { type: 'array', items: { type: 'string' } },
					reasoning: { type: 'array', items: { type: 'string' } },
					confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
					recommendedScenarioWrappers: {
						type: 'array',
						items: { type: 'string', enum: [...PHOTO_SCENARIO_WRAPPERS] },
					},
					recommendedStorylineTypes: {
						type: 'array',
						items: { type: 'string', enum: [...PHOTO_CONDITIONED_STORYLINE_TYPES] },
					},
					recommendedMessageSpines: {
						type: 'array',
						items: { type: 'string', enum: [...PHASE1_FASHION_MESSAGE_SPINES] },
					},
				},
				required: [
					'visibleGarmentType',
					'primaryVisualClaim',
					'heroDetail',
					'silhouetteRead',
					'proofFocus',
					'patternDensity',
					'stylingComplexity',
					'versatilitySignal',
					'visualRisks',
					'reasoning',
					'confidence',
					'recommendedScenarioWrappers',
					'recommendedStorylineTypes',
					'recommendedMessageSpines',
				],
			},
			candidates: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						scenarioWrapper: {
							type: 'string',
							enum: [...PHOTO_SCENARIO_WRAPPERS],
						},
						placeFrame: {
							type: 'string',
							enum: [...PHOTO_PLACE_FRAMES],
						},
						actionFrame: {
							type: 'string',
							enum: [...PHOTO_ACTION_FRAMES],
						},
						momentFrame: {
							type: 'string',
							enum: [...PHOTO_MOMENT_FRAMES],
						},
						proofGoal: {
							type: 'string',
							enum: [...PHOTO_PROOF_GOALS],
						},
						storylineType: {
							type: 'string',
							enum: [...PHOTO_CONDITIONED_STORYLINE_TYPES],
						},
						messageSpineId: {
							type: 'string',
							enum: [...PHASE1_FASHION_MESSAGE_SPINES],
						},
						oneSentenceClaim: { type: 'string' },
						whyThisFitsImage: { type: 'string' },
						hook: { type: 'string' },
						proof: { type: 'string' },
						payoff: { type: 'string' },
						cta: { type: 'string' },
						viewerTakeaway: { type: 'string' },
						editorialThesis: { type: 'string' },
						talentDirection: { type: 'string' },
						supportingSignals: { type: 'array', items: { type: 'string' } },
						beatPlan: { type: 'array', items: beatPlanItem },
						rejectionIf: { type: 'array', items: { type: 'string' } },
					},
					required: [
						'id',
						'scenarioWrapper',
						'placeFrame',
						'actionFrame',
						'momentFrame',
						'proofGoal',
						'storylineType',
						'messageSpineId',
						'oneSentenceClaim',
						'whyThisFitsImage',
						'hook',
						'proof',
						'payoff',
						'cta',
						'viewerTakeaway',
						'editorialThesis',
						'talentDirection',
						'supportingSignals',
						'beatPlan',
						'rejectionIf',
					],
				},
			},
			selection: {
				type: 'object',
				properties: {
					recommendedCandidateId: { type: 'string' },
					rationale: { type: 'string' },
					rejectedCandidateIds: { type: 'array', items: { type: 'string' } },
				},
				required: ['recommendedCandidateId', 'rationale', 'rejectedCandidateIds'],
			},
		},
		required: ['diagnosis', 'candidates', 'selection'],
	}
}

export function parsePhotoConditionedStorylineResponse(
	value: string,
): PhotoConditionedStorylineResponse {
	return photoConditionedStorylineResponseSchema.parse(JSON.parse(extractJsonObject(value)))
}

export function selectRecommendedStorylineCandidate(
	response: PhotoConditionedStorylineResponse,
): PhotoConditionedStorylineCandidate {
	const selected = response.candidates.find(
		(candidate) => candidate.id === response.selection.recommendedCandidateId,
	)
	if (selected) {
		return selected
	}

	const fallback = response.candidates[0]
	if (!fallback) {
		throw new Error('Expected at least one storyline candidate')
	}

	return fallback
}

export function buildPhotoConditionedStorylineMarkdown(input: {
	readonly imagePath: string
	readonly productCategory: string
	readonly model: string
	readonly response: PhotoConditionedStorylineResponse
}): string {
	const selected = selectRecommendedStorylineCandidate(input.response)
	const lines: string[] = []

	lines.push('# Photo Storyline Plan')
	lines.push('')
	lines.push(`- image: ${input.imagePath}`)
	lines.push(`- category: ${input.productCategory}`)
	lines.push(`- model: ${input.model}`)
	lines.push('')
	lines.push('## Diagnosis')
	lines.push(`- visible garment: ${input.response.diagnosis.visibleGarmentType}`)
	lines.push(`- primary visual claim: ${input.response.diagnosis.primaryVisualClaim}`)
	lines.push(`- hero detail: ${input.response.diagnosis.heroDetail}`)
	lines.push(`- silhouette read: ${input.response.diagnosis.silhouetteRead}`)
	lines.push(`- proof focus: ${input.response.diagnosis.proofFocus}`)
	lines.push(`- versatility: ${input.response.diagnosis.versatilitySignal}`)
	lines.push(`- confidence: ${input.response.diagnosis.confidence}`)
	lines.push(
		`- recommended scenario wrappers: ${input.response.diagnosis.recommendedScenarioWrappers.join(', ')}`,
	)
	lines.push(
		`- recommended storyline types: ${input.response.diagnosis.recommendedStorylineTypes.join(', ')}`,
	)
	lines.push(
		`- recommended message spines: ${input.response.diagnosis.recommendedMessageSpines.join(', ')}`,
	)
	if (input.response.diagnosis.reasoning.length > 0) {
		lines.push('')
		lines.push('### Reasoning')
		for (const reason of input.response.diagnosis.reasoning) {
			lines.push(`- ${reason}`)
		}
	}
	if (input.response.diagnosis.visualRisks.length > 0) {
		lines.push('')
		lines.push('### Visual Risks')
		for (const risk of input.response.diagnosis.visualRisks) {
			lines.push(`- ${risk}`)
		}
	}
	lines.push('')
	lines.push('## Selected Storyline')
	lines.push(`- candidate: ${selected.id}`)
	lines.push(`- scenario wrapper: ${selected.scenarioWrapper}`)
	lines.push(`- place frame: ${selected.placeFrame}`)
	lines.push(`- action frame: ${selected.actionFrame}`)
	lines.push(`- moment frame: ${selected.momentFrame}`)
	lines.push(`- proof goal: ${selected.proofGoal}`)
	lines.push(`- storyline type: ${selected.storylineType}`)
	lines.push(`- message spine: ${selected.messageSpineId}`)
	lines.push(`- claim: ${selected.oneSentenceClaim}`)
	lines.push(`- why this fits: ${selected.whyThisFitsImage}`)
	lines.push(`- hook: ${selected.hook}`)
	lines.push(`- proof: ${selected.proof}`)
	lines.push(`- payoff: ${selected.payoff}`)
	lines.push(`- CTA: ${selected.cta}`)
	lines.push(`- viewer takeaway: ${selected.viewerTakeaway}`)
	lines.push(`- editorial thesis: ${selected.editorialThesis}`)
	lines.push(`- talent direction: ${selected.talentDirection}`)
	if (selected.supportingSignals.length > 0) {
		lines.push(`- supporting signals: ${selected.supportingSignals.join(', ')}`)
	}
	lines.push('')
	lines.push('### Beat Plan')
	for (const beat of selected.beatPlan) {
		lines.push(
			`- ${beat.phase} ${beat.timeRangeSeconds}s: ${beat.narrativeGoal} | garment read: ${beat.garmentReadGoal} | shot hint: ${beat.shotHint}`,
		)
		if (beat.mustShow.length > 0) {
			lines.push(`  must show: ${beat.mustShow.join(', ')}`)
		}
		if (beat.mustAvoid.length > 0) {
			lines.push(`  must avoid: ${beat.mustAvoid.join(', ')}`)
		}
	}
	if (selected.rejectionIf.length > 0) {
		lines.push('')
		lines.push('### Reject If')
		for (const reason of selected.rejectionIf) {
			lines.push(`- ${reason}`)
		}
	}
	lines.push('')
	lines.push('## Selection Rationale')
	lines.push(`- ${input.response.selection.rationale}`)

	const alternates = input.response.candidates.filter((candidate) => candidate.id !== selected.id)
	if (alternates.length > 0) {
		lines.push('')
		lines.push('## Alternate Candidates')
		for (const candidate of alternates) {
			lines.push(
				`- ${candidate.id}: ${candidate.scenarioWrapper} / ${candidate.placeFrame} / ${candidate.storylineType} / ${candidate.messageSpineId} / ${candidate.oneSentenceClaim}`,
			)
		}
	}

	return lines.join('\n')
}

export function buildPhotoConditionedReferenceDirective(
	candidate: PhotoConditionedStorylineCandidate,
): string {
	const scenario = buildScenarioActionPlan(candidate)

	return [
		`Scenario wrapper: ${candidate.scenarioWrapper}`,
		`Place frame: ${candidate.placeFrame}`,
		`Action frame: ${candidate.actionFrame}`,
		`Moment frame: ${candidate.momentFrame}`,
		`Proof goal: ${candidate.proofGoal}`,
		`Situation: ${scenario.scenarioSituation}`,
		`Visible action: ${scenario.visibleAction}`,
		`Core claim: ${candidate.oneSentenceClaim}`,
		`Hook intent: ${candidate.hook}`,
		`Proof intent: ${candidate.proof}`,
		`Payoff intent: ${candidate.payoff}`,
		'Use a believable human action in context rather than mannequin-like swaying.',
		'Keep the same garment as hero while the action makes the fit claim legible.',
		`HOOK -> ${scenario.hookDirection}`,
		`PROOF -> ${scenario.proofDirection}`,
		`PAYOFF -> ${scenario.payoffDirection}`,
		...candidate.beatPlan.map(
			(beat) =>
				`${beat.phase} support -> must show ${beat.mustShow.join(', ') || 'none'}; avoid ${beat.mustAvoid.join(', ') || 'none'}`,
		),
	].join('\n')
}

export function buildDerivedShortformFromPhotoStorylineCandidate(
	candidate: PhotoConditionedStorylineCandidate,
): DerivedPhotoStorylineShortform {
	const scenario = buildScenarioActionPlan(candidate)

	return {
		messageSpineId: candidate.messageSpineId,
		hook: candidate.hook,
		message: candidate.oneSentenceClaim,
		proofDetail: candidate.proof,
		viewerTakeaway: candidate.viewerTakeaway,
		editorialThesis: candidate.editorialThesis,
		talentBrief: `${candidate.talentDirection} ${scenario.visibleAction} Keep the movement restrained, believable, and garment-first.`,
		referenceDirective: buildPhotoConditionedReferenceDirective(candidate),
		scenarioSituation: scenario.scenarioSituation,
		visibleAction: scenario.visibleAction,
		hookDirection: scenario.hookDirection,
		proofDirection: scenario.proofDirection,
		payoffDirection: scenario.payoffDirection,
		scenarioWrapper: candidate.scenarioWrapper,
		placeFrame: candidate.placeFrame,
		actionFrame: candidate.actionFrame,
		momentFrame: candidate.momentFrame,
		proofGoal: candidate.proofGoal,
	}
}

function buildScenarioActionPlan(candidate: PhotoConditionedStorylineCandidate): {
	readonly scenarioSituation: string
	readonly visibleAction: string
	readonly hookDirection: string
	readonly proofDirection: string
	readonly payoffDirection: string
} {
	switch (candidate.actionFrame) {
		case 'GET_READY':
			if (candidate.placeFrame === 'OFFICE' || candidate.proofGoal === 'DRESS_CODE_FIT') {
				return {
					scenarioSituation: 'right before leaving for the office',
					visibleAction:
						'She checks the waist line in the mirror, smooths the dress once at the waist, then reaches for her work bag.',
					hookDirection:
						'Start with the wearer already at the mirror at a 3/4 angle and let one natural waist-check motion make the outfit concern immediately legible.',
					proofDirection:
						'Keep attention on the waist construction as she smooths the dress once and relaxes the arm so the waist and skirt drop stay visible.',
					payoffDirection:
						'Have her reach for the work bag and take one composed office-bound step so the full silhouette resolves cleanly.',
				}
			}

			return {
				scenarioSituation: 'right before leaving home for the day',
				visibleAction:
					'She checks the fit once in the mirror, smooths the dress at the waist, and settles into a ready-to-leave stance.',
				hookDirection:
					'Open on the mirror check so the outfit question feels immediate and human.',
				proofDirection:
					'Use one clean waist-adjustment action to prove the structure and silhouette.',
				payoffDirection:
					'Resolve into a composed full-body ready-to-leave silhouette with no extra posing.',
			}
		case 'WORK_ON_LAPTOP':
			return {
				scenarioSituation: 'during a remote-work session at a coffee shop',
				visibleAction:
					'She sits, settles the skirt once, places one hand near the laptop, and keeps the waist line visible while working.',
				hookDirection:
					'Start with the wearer already seated or settling into the chair so the work context reads instantly.',
				proofDirection:
					'Show the sit-and-settle motion once, then hold the frame long enough for the waist and skirt shape to stay readable.',
				payoffDirection:
					'End with a composed seated or rising silhouette that still looks polished enough to wear all day.',
			}
		case 'SIT_AND_SETTLE':
			return {
				scenarioSituation: 'arriving and settling into a seated moment',
				visibleAction:
					'She sits once, smooths the skirt lightly, and lets the silhouette settle without hiding the waist.',
				hookDirection:
					'Open already in the act of sitting so the use-case reads as a real seated scenario.',
				proofDirection:
					'Keep the skirt and waist visible while the seated posture settles naturally.',
				payoffDirection:
					'Finish with a calm seated or half-rising silhouette that still reads clean and polished.',
			}
		case 'TRANSITION':
			return {
				scenarioSituation: 'during the transition from work to dinner',
				visibleAction:
					'She resets the waist line once, lets the skirt settle, and takes one evening-ready step forward.',
				hookDirection:
					'Open in a poised transitional stance so the shift from daytime polish to evening presence is already implied.',
				proofDirection:
					'Use one deliberate adjustment at the waist or side seam to make the structure feel purposeful rather than pose-like.',
				payoffDirection:
					'Resolve with one controlled forward step or half-turn that lands in a dinner-ready full silhouette.',
			}
		case 'COMMUTE':
			return {
				scenarioSituation: 'during the morning commute',
				visibleAction:
					'She grips the bag strap, takes one purposeful commuting step, and lets the garment move naturally without losing the waist line.',
				hookDirection:
					'Start in motion with a single commute-ready step rather than a static pose.',
				proofDirection:
					'Keep the bag and arm placement disciplined so the waist and skirt movement stay readable during the step.',
				payoffDirection:
					'End with a stable full-body frame that still feels mobile and comfortable for transit.',
			}
		case 'ENTER_SPACE':
			return {
				scenarioSituation: 'entering the venue or occasion space',
				visibleAction:
					'She enters with one composed step, pauses briefly, and lets the silhouette settle before moving again.',
				hookDirection:
					'Open on the moment of entry so the dress-code context is legible immediately.',
				proofDirection:
					'Use the pause after entry to show the waist, hem, and overall proportion without extra flourishes.',
				payoffDirection:
					'Finish on a composed full-body read that feels socially appropriate and polished.',
			}
		case 'CHOOSE_LOOK':
			return {
				scenarioSituation: 'deciding on the final look before going out',
				visibleAction:
					'She checks the outfit choice once in the mirror, touches the waist or hem lightly, and settles on the look.',
				hookDirection:
					'Open mid-decision so the viewer feels the choice moment immediately.',
				proofDirection:
					'Keep the gesture minimal and functional so the garment shape stays readable while she confirms the look.',
				payoffDirection:
					'End in the settled chosen look with a confident but restrained full-body stance.',
			}
		case 'RUN_ERRANDS':
			return {
				scenarioSituation: 'heading out for errands in the city',
				visibleAction:
					'She gathers herself, takes one easy step, and lets the garment move in a practical everyday rhythm.',
				hookDirection:
					'Start already in the first errand-bound step so the everyday context feels immediate.',
				proofDirection:
					'Keep movement practical and light while preserving a clear read of the waist and skirt line.',
				payoffDirection:
					'Resolve with one stable full-body frame that says easy, wearable, and repeatable.',
			}
		case 'TRAVEL':
			return {
				scenarioSituation: 'moving through a travel moment',
				visibleAction:
					'She takes one travel-ready step with controlled bag handling and lets the outfit settle back into shape.',
				hookDirection:
					'Open already in a travel-bound movement so the use-case is immediately believable.',
				proofDirection:
					'Show that the garment keeps its line through one practical travel motion.',
				payoffDirection:
					'End with a calm full-body silhouette that still reads composed after movement.',
			}
		case 'GROUP_OUTING':
			return {
				scenarioSituation: 'arriving for a weekend social outing',
				visibleAction:
					'She steps in with a relaxed social energy, lets the silhouette settle, and holds a clean final stance.',
				hookDirection:
					'Open on the arrival moment so the social context reads before any pose appears.',
				proofDirection:
					'Use one small human adjustment to show the garment staying flattering in motion.',
				payoffDirection:
					'Finish in a stable full-body read that feels social, wearable, and polished.',
			}
		default:
			return {
				scenarioSituation: 'inside a believable real-world fashion moment',
				visibleAction:
					'She performs one natural garment-aware action, then lets the silhouette settle into a clear final read.',
				hookDirection:
					'Open with the wearer already inside the action so the moment feels immediate.',
				proofDirection:
					'Use one visible action to prove the garment claim instead of a generic pose loop.',
				payoffDirection:
					'End in a clean full-body silhouette with restrained movement and no mannequin-like sway.',
			}
	}
}
