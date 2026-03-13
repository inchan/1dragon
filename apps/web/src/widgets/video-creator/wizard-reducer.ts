import type {
	MarketingCopyVariant,
	NarrationVoice,
	SubtitleStyle,
} from '@/features/content-generation'
import type { ModelPersonaSelection } from '@/features/model-persona'
import type { VideoPlatform, VideoVariantItem } from '@/features/video-output'
import type { AnalyzeProductResponse } from '@/lib/api'
import type { ProductCategory as ProductCategoryType, StylePreset } from '@1dragon/shared'
import { ProductCategory } from '@1dragon/shared'

// ── Types ───────────────────────────────────────────────────────────────────

export type WizardStep = 'UPLOAD' | 'ANALYZE' | 'MODEL' | 'STYLE' | 'GENERATE' | 'PREVIEW'

export interface EditableCopy {
	hookCopy: string
	bodyCopy: string
	ctaCopy: string
}

export interface NarrationConfig {
	enabled: boolean
	voice: NarrationVoice
	speed: number
}

export interface WizardState {
	step: WizardStep
	file: {
		selectedFile: File | null
		previewUrl: string
		productName: string
		category: ProductCategoryType
	}
	analysis: {
		analyzed: boolean
		isAnalyzing: boolean
		error: string | null
		result: AnalyzeProductResponse | null
	}
	style: {
		selectedStyle: StylePreset
		copyVariants: MarketingCopyVariant[]
		selectedCopyVariantId: string
		editableCopy: EditableCopy
		narration: NarrationConfig
		subtitleStyle: SubtitleStyle
	}
	persona: {
		selection: ModelPersonaSelection
		skip: boolean
		compositeImageUrl: string | null
		isCompositeLoading: boolean
	}
	generation: {
		jobId: string
		progress: number
		status: string
		error: string | null
		canRetry: boolean
	}
	preview: {
		variants: VideoVariantItem[]
		selectedPlatform: VideoPlatform
		overlayPlatform: VideoPlatform
		showSafeZone: boolean
		remainingRegenerations: number
		previousVideoUrl: string | null
		candidateVideoUrl: string | null
		candidatePlatform: VideoPlatform | null
	}
	showUpgradeModal: boolean
}

// ── Actions ─────────────────────────────────────────────────────────────────

export type WizardAction =
	| { type: 'SET_STEP'; step: WizardStep }
	| { type: 'PICK_FILE'; file: File | null; previewUrl: string }
	| { type: 'SET_PRODUCT_NAME'; name: string }
	| { type: 'SET_CATEGORY'; category: ProductCategoryType }
	| { type: 'ANALYZE_START' }
	| {
			type: 'ANALYZE_SUCCESS'
			result: AnalyzeProductResponse
			category: ProductCategoryType
			copyVariants: MarketingCopyVariant[]
			nextStep: WizardStep
	  }
	| { type: 'ANALYZE_ERROR'; error: string }
	| { type: 'ANALYZE_END' }
	| { type: 'SELECT_STYLE'; style: StylePreset }
	| { type: 'SELECT_COPY_VARIANT'; variantId: string; editableCopy: EditableCopy }
	| { type: 'CHANGE_COPY_FIELD'; field: 'hookCopy' | 'bodyCopy' | 'ctaCopy'; value: string }
	| { type: 'TOGGLE_NARRATION' }
	| { type: 'SET_NARRATION_VOICE'; voice: NarrationVoice }
	| { type: 'SET_NARRATION_SPEED'; speed: number }
	| { type: 'SET_SUBTITLE_STYLE'; style: SubtitleStyle }
	| { type: 'SET_PERSONA_SELECTION'; selection: ModelPersonaSelection }
	| { type: 'SET_SKIP_MODEL'; skip: boolean }
	| { type: 'SET_COMPOSITE_IMAGE'; url: string | null }
	| { type: 'SET_COMPOSITE_LOADING'; loading: boolean }
	| {
			type: 'GENERATION_START'
			status: string
			progress: number
	  }
	| {
			type: 'GENERATION_JOB_CREATED'
			jobId: string
			status: string
			progress: number
			canRetry: boolean
	  }
	| { type: 'GENERATION_ERROR'; error: string }
	| { type: 'GENERATION_SUCCEEDED' }
	| {
			type: 'SSE_UPDATE'
			newStatus: string
			progress: number
			canRetry: boolean
			errorMessage: string | null
	  }
	| { type: 'SET_VARIANTS'; variants: VideoVariantItem[] }
	| { type: 'SET_SELECTED_PLATFORM'; platform: VideoPlatform }
	| { type: 'SET_OVERLAY_PLATFORM'; platform: VideoPlatform }
	| { type: 'TOGGLE_SAFE_ZONE' }
	| { type: 'REGENERATE' }
	| { type: 'ACCEPT_CANDIDATE' }
	| { type: 'DISCARD_CANDIDATE' }
	| {
			type: 'SET_CANDIDATE'
			videoUrl: string
			platform: VideoPlatform
			previousUrl: string
	  }
	| { type: 'SHOW_UPGRADE_MODAL'; show: boolean }
	| { type: 'SET_ANALYSIS_RESULT'; result: AnalyzeProductResponse }
	| { type: 'FETCH_VARIANTS_ERROR'; error: string }

// ── Default values ──────────────────────────────────────────────────────────

const DEFAULT_PERSONA_SELECTION: ModelPersonaSelection = {
	gender: 'FEMALE',
	ageRange: 'YOUNG_ADULT',
	bodyType: 'REGULAR',
	style: 'CASUAL',
}

// ── Initial state factory ───────────────────────────────────────────────────

export function createInitialState(initialCopyVariants: MarketingCopyVariant[]): WizardState {
	const firstVariant = initialCopyVariants[0]
	return {
		step: 'UPLOAD',
		file: {
			selectedFile: null,
			previewUrl: '',
			productName: '',
			category: ProductCategory.FASHION,
		},
		analysis: {
			analyzed: false,
			isAnalyzing: false,
			error: null,
			result: null,
		},
		style: {
			selectedStyle: 'TRENDY',
			copyVariants: initialCopyVariants,
			selectedCopyVariantId: firstVariant?.id ?? '',
			editableCopy: {
				hookCopy: firstVariant?.hookCopy ?? '',
				bodyCopy: firstVariant?.bodyCopy ?? '',
				ctaCopy: firstVariant?.ctaCopy ?? '',
			},
			narration: {
				enabled: true,
				voice: 'FEMALE_BRIGHT',
				speed: 1,
			},
			subtitleStyle: 'SIMPLE',
		},
		persona: {
			selection: DEFAULT_PERSONA_SELECTION,
			skip: false,
			compositeImageUrl: null,
			isCompositeLoading: false,
		},
		generation: {
			jobId: '',
			progress: 0,
			status: 'QUEUED',
			error: null,
			canRetry: false,
		},
		preview: {
			variants: [],
			selectedPlatform: 'tiktok',
			overlayPlatform: 'tiktok',
			showSafeZone: true,
			remainingRegenerations: 5,
			previousVideoUrl: null,
			candidateVideoUrl: null,
			candidatePlatform: null,
		},
		showUpgradeModal: false,
	}
}

// ── Reducer ─────────────────────────────────────────────────────────────────

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
	switch (action.type) {
		case 'SET_STEP':
			return { ...state, step: action.step }

		case 'PICK_FILE':
			return {
				...state,
				file: {
					...state.file,
					selectedFile: action.file,
					previewUrl: action.previewUrl,
				},
				analysis: {
					...state.analysis,
					analyzed: false,
					error: null,
					result: null,
				},
				persona: {
					...state.persona,
					compositeImageUrl: null,
				},
				preview: {
					...state.preview,
					remainingRegenerations: 5,
					previousVideoUrl: null,
					candidateVideoUrl: null,
					candidatePlatform: null,
				},
			}

		case 'SET_PRODUCT_NAME':
			return {
				...state,
				file: { ...state.file, productName: action.name },
			}

		case 'SET_CATEGORY':
			return {
				...state,
				file: { ...state.file, category: action.category },
			}

		case 'ANALYZE_START':
			return {
				...state,
				analysis: {
					...state.analysis,
					isAnalyzing: true,
					error: null,
				},
			}

		case 'ANALYZE_SUCCESS': {
			const firstVariant = action.copyVariants[0]
			return {
				...state,
				step: action.nextStep,
				file: { ...state.file, category: action.category },
				analysis: {
					...state.analysis,
					result: action.result,
					analyzed: true,
					isAnalyzing: false,
				},
				style: {
					...state.style,
					copyVariants: action.copyVariants,
					selectedCopyVariantId: firstVariant?.id ?? state.style.selectedCopyVariantId,
					editableCopy: firstVariant
						? {
								hookCopy: firstVariant.hookCopy,
								bodyCopy: firstVariant.bodyCopy,
								ctaCopy: firstVariant.ctaCopy,
							}
						: state.style.editableCopy,
				},
			}
		}

		case 'ANALYZE_ERROR':
			return {
				...state,
				analysis: {
					...state.analysis,
					error: action.error,
					isAnalyzing: false,
				},
			}

		case 'ANALYZE_END':
			return {
				...state,
				analysis: {
					...state.analysis,
					isAnalyzing: false,
				},
			}

		case 'SELECT_STYLE':
			return {
				...state,
				style: { ...state.style, selectedStyle: action.style },
			}

		case 'SELECT_COPY_VARIANT':
			return {
				...state,
				style: {
					...state.style,
					selectedCopyVariantId: action.variantId,
					editableCopy: action.editableCopy,
				},
			}

		case 'CHANGE_COPY_FIELD':
			return {
				...state,
				style: {
					...state.style,
					editableCopy: {
						...state.style.editableCopy,
						[action.field]: action.value,
					},
					copyVariants: state.style.copyVariants.map((variant) =>
						variant.id === state.style.selectedCopyVariantId
							? { ...variant, [action.field]: action.value }
							: variant,
					),
				},
			}

		case 'TOGGLE_NARRATION':
			return {
				...state,
				style: {
					...state.style,
					narration: {
						...state.style.narration,
						enabled: !state.style.narration.enabled,
					},
				},
			}

		case 'SET_NARRATION_VOICE':
			return {
				...state,
				style: {
					...state.style,
					narration: { ...state.style.narration, voice: action.voice },
				},
			}

		case 'SET_NARRATION_SPEED':
			return {
				...state,
				style: {
					...state.style,
					narration: { ...state.style.narration, speed: action.speed },
				},
			}

		case 'SET_SUBTITLE_STYLE':
			return {
				...state,
				style: { ...state.style, subtitleStyle: action.style },
			}

		case 'SET_PERSONA_SELECTION':
			return {
				...state,
				persona: { ...state.persona, selection: action.selection },
			}

		case 'SET_SKIP_MODEL':
			return {
				...state,
				persona: { ...state.persona, skip: action.skip },
			}

		case 'SET_COMPOSITE_IMAGE':
			return {
				...state,
				persona: { ...state.persona, compositeImageUrl: action.url },
			}

		case 'SET_COMPOSITE_LOADING':
			return {
				...state,
				persona: { ...state.persona, isCompositeLoading: action.loading },
			}

		case 'GENERATION_START':
			return {
				...state,
				step: 'GENERATE',
				generation: {
					...state.generation,
					error: null,
					canRetry: false,
					status: action.status,
					progress: action.progress,
				},
			}

		case 'GENERATION_JOB_CREATED':
			return {
				...state,
				generation: {
					...state.generation,
					jobId: action.jobId,
					status: action.status,
					progress: action.progress,
					canRetry: action.canRetry,
				},
			}

		case 'GENERATION_ERROR':
			return {
				...state,
				generation: {
					...state.generation,
					status: 'FAILED',
					error: action.error,
					canRetry: false,
				},
			}

		case 'GENERATION_SUCCEEDED':
			return {
				...state,
				step: 'PREVIEW',
			}

		case 'SSE_UPDATE':
			return {
				...state,
				generation: {
					...state.generation,
					status: action.newStatus,
					progress: action.progress,
					canRetry: action.canRetry,
					error: action.errorMessage,
				},
			}

		case 'FETCH_VARIANTS_ERROR':
			return {
				...state,
				step: 'GENERATE',
				generation: {
					...state.generation,
					error: action.error,
					canRetry: true,
				},
			}

		case 'SET_VARIANTS':
			return {
				...state,
				preview: { ...state.preview, variants: action.variants },
			}

		case 'SET_SELECTED_PLATFORM':
			return {
				...state,
				preview: { ...state.preview, selectedPlatform: action.platform },
			}

		case 'SET_OVERLAY_PLATFORM':
			return {
				...state,
				preview: { ...state.preview, overlayPlatform: action.platform },
			}

		case 'TOGGLE_SAFE_ZONE':
			return {
				...state,
				preview: { ...state.preview, showSafeZone: !state.preview.showSafeZone },
			}

		case 'REGENERATE':
			if (state.preview.remainingRegenerations <= 0) {
				return state
			}

			return {
				...state,
				step: 'STYLE',
				generation: {
					...state.generation,
					error: null,
					status: 'QUEUED',
					jobId: '',
				},
				preview: {
					...state.preview,
					variants: [],
					remainingRegenerations: state.preview.remainingRegenerations - 1,
					previousVideoUrl: null,
					candidateVideoUrl: null,
					candidatePlatform: null,
				},
			}

		case 'ACCEPT_CANDIDATE': {
			if (!state.preview.candidateVideoUrl || !state.preview.candidatePlatform) {
				return state
			}
			const targetPlatform = state.preview.candidatePlatform
			const newVideoUrl = state.preview.candidateVideoUrl
			return {
				...state,
				preview: {
					...state.preview,
					variants: state.preview.variants.map((variant) =>
						variant.platform === targetPlatform ? { ...variant, videoUrl: newVideoUrl } : variant,
					),
					candidateVideoUrl: null,
					candidatePlatform: null,
					previousVideoUrl: null,
				},
			}
		}

		case 'DISCARD_CANDIDATE':
			return {
				...state,
				preview: {
					...state.preview,
					candidateVideoUrl: null,
					candidatePlatform: null,
					previousVideoUrl: null,
				},
			}

		case 'SET_CANDIDATE':
			return {
				...state,
				preview: {
					...state.preview,
					candidateVideoUrl: action.videoUrl,
					candidatePlatform: action.platform,
					previousVideoUrl: action.previousUrl,
				},
			}

		case 'SHOW_UPGRADE_MODAL':
			return { ...state, showUpgradeModal: action.show }

		case 'SET_ANALYSIS_RESULT':
			return {
				...state,
				analysis: { ...state.analysis, result: action.result },
			}

		default:
			return state
	}
}
