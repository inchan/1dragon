import type { MarketingCopyVariant } from '@/features/content-generation'
import type { AnalyzeProductResponse } from '@/lib/api'
import { describe, expect, it } from 'vitest'
import {
	type EditableCopy,
	type WizardAction,
	type WizardState,
	createInitialState,
	wizardReducer,
} from './wizard-reducer'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCopyVariants(productName: string): MarketingCopyVariant[] {
	return [
		{
			id: 'copy-1',
			label: '변형 1',
			hookCopy: `${productName} hook`,
			bodyCopy: `${productName} body`,
			ctaCopy: `${productName} cta`,
			hashtags: ['#test'],
		},
		{
			id: 'copy-2',
			label: '변형 2',
			hookCopy: `${productName} hook 2`,
			bodyCopy: `${productName} body 2`,
			ctaCopy: `${productName} cta 2`,
			hashtags: ['#test2'],
		},
	]
}

function makeBaseState(): WizardState {
	return createInitialState(makeCopyVariants('상품'))
}

function makeAnalysisResult(): AnalyzeProductResponse {
	return {
		id: 'analysis-1',
		category: 'FASHION',
		keywords: ['키워드1'],
		moods: ['WARM'],
		colors: ['#fff'],
		targetAudience: '20대 여성',
		suggestedStyles: ['TRENDY'],
		hasTransparentBg: false,
		resolution: { width: 1080, height: 1920 },
		originalImageUrl: 'https://example.com/image.png',
		isProductImage: true,
		confidence: 0.95,
		queue: { status: 'DONE', message: '완료' },
	}
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('wizardReducer', () => {
	describe('createInitialState', () => {
		it('initializes with correct default values', () => {
			const variants = makeCopyVariants('원피스')
			const state = createInitialState(variants)

			expect(state.step).toBe('UPLOAD')
			expect(state.file.selectedFile).toBeNull()
			expect(state.file.previewUrl).toBe('')
			expect(state.file.category).toBe('FASHION')
			expect(state.analysis.analyzed).toBe(false)
			expect(state.analysis.isAnalyzing).toBe(false)
			expect(state.style.copyVariants).toBe(variants)
			expect(state.style.selectedCopyVariantId).toBe('copy-1')
			expect(state.style.editableCopy.hookCopy).toBe('원피스 hook')
			expect(state.style.narration.enabled).toBe(true)
			expect(state.style.narration.voice).toBe('FEMALE_BRIGHT')
			expect(state.style.narration.speed).toBe(1)
			expect(state.style.subtitleStyle).toBe('SIMPLE')
			expect(state.persona.skip).toBe(false)
			expect(state.generation.jobId).toBe('')
			expect(state.generation.status).toBe('QUEUED')
			expect(state.preview.variants).toEqual([])
			expect(state.preview.selectedPlatform).toBe('tiktok')
			expect(state.preview.showSafeZone).toBe(true)
			expect(state.preview.remainingRegenerations).toBe(5)
			expect(state.showUpgradeModal).toBe(false)
		})

		it('handles empty variant array gracefully', () => {
			const state = createInitialState([])

			expect(state.style.copyVariants).toEqual([])
			expect(state.style.selectedCopyVariantId).toBe('')
			expect(state.style.editableCopy.hookCopy).toBe('')
			expect(state.style.editableCopy.bodyCopy).toBe('')
			expect(state.style.editableCopy.ctaCopy).toBe('')
		})
	})

	describe('SET_STEP', () => {
		it('updates the current step', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_STEP', step: 'ANALYZE' })

			expect(next.step).toBe('ANALYZE')
			// other slices unchanged
			expect(next.file).toBe(state.file)
		})
	})

	describe('PICK_FILE', () => {
		it('sets file and preview URL', () => {
			const state = makeBaseState()
			const file = new File(['data'], 'photo.png', { type: 'image/png' })
			const next = wizardReducer(state, {
				type: 'PICK_FILE',
				file,
				previewUrl: 'blob://preview',
			})

			expect(next.file.selectedFile).toBe(file)
			expect(next.file.previewUrl).toBe('blob://preview')
		})

		it('resets analysis state when picking a new file', () => {
			const state: WizardState = {
				...makeBaseState(),
				analysis: {
					analyzed: true,
					isAnalyzing: false,
					error: 'some error',
					result: makeAnalysisResult(),
				},
			}

			const next = wizardReducer(state, {
				type: 'PICK_FILE',
				file: new File(['x'], 'new.png'),
				previewUrl: 'blob://new',
			})

			expect(next.analysis.analyzed).toBe(false)
			expect(next.analysis.error).toBeNull()
			expect(next.analysis.result).toBeNull()
		})

		it('resets persona composite when picking a new file', () => {
			const state: WizardState = {
				...makeBaseState(),
				persona: {
					...makeBaseState().persona,
					compositeImageUrl: 'https://example.com/composite.png',
				},
			}

			const next = wizardReducer(state, {
				type: 'PICK_FILE',
				file: null,
				previewUrl: '',
			})

			expect(next.persona.compositeImageUrl).toBeNull()
		})
	})

	describe('ANALYZE_START', () => {
		it('sets analyzing flag and clears error', () => {
			const state: WizardState = {
				...makeBaseState(),
				analysis: { ...makeBaseState().analysis, error: 'previous error' },
			}

			const next = wizardReducer(state, { type: 'ANALYZE_START' })

			expect(next.analysis.isAnalyzing).toBe(true)
			expect(next.analysis.error).toBeNull()
		})
	})

	describe('ANALYZE_SUCCESS', () => {
		it('sets correct next step and updates analysis + copy variants', () => {
			const state = makeBaseState()
			const result = makeAnalysisResult()
			const newVariants = makeCopyVariants('신발')

			const next = wizardReducer(state, {
				type: 'ANALYZE_SUCCESS',
				result,
				category: 'FASHION',
				copyVariants: newVariants,
				nextStep: 'MODEL',
			})

			expect(next.step).toBe('MODEL')
			expect(next.analysis.result).toBe(result)
			expect(next.analysis.analyzed).toBe(true)
			expect(next.analysis.isAnalyzing).toBe(false)
			expect(next.file.category).toBe('FASHION')
			expect(next.style.copyVariants).toBe(newVariants)
			expect(next.style.selectedCopyVariantId).toBe('copy-1')
			expect(next.style.editableCopy.hookCopy).toBe('신발 hook')
		})

		it('skips to STYLE step when category is not model-eligible', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, {
				type: 'ANALYZE_SUCCESS',
				result: makeAnalysisResult(),
				category: 'FOOD',
				copyVariants: makeCopyVariants('음식'),
				nextStep: 'STYLE',
			})

			expect(next.step).toBe('STYLE')
		})
	})

	describe('ANALYZE_ERROR', () => {
		it('sets error and stops analyzing', () => {
			const state: WizardState = {
				...makeBaseState(),
				analysis: { ...makeBaseState().analysis, isAnalyzing: true },
			}

			const next = wizardReducer(state, {
				type: 'ANALYZE_ERROR',
				error: '분석 실패',
			})

			expect(next.analysis.error).toBe('분석 실패')
			expect(next.analysis.isAnalyzing).toBe(false)
		})
	})

	describe('SELECT_COPY_VARIANT', () => {
		it('updates selected variant id and editable copy', () => {
			const state = makeBaseState()
			const editableCopy: EditableCopy = {
				hookCopy: 'new hook',
				bodyCopy: 'new body',
				ctaCopy: 'new cta',
			}

			const next = wizardReducer(state, {
				type: 'SELECT_COPY_VARIANT',
				variantId: 'copy-2',
				editableCopy,
			})

			expect(next.style.selectedCopyVariantId).toBe('copy-2')
			expect(next.style.editableCopy).toEqual(editableCopy)
		})
	})

	describe('CHANGE_COPY_FIELD', () => {
		it('updates editableCopy and the corresponding variant in copyVariants', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, {
				type: 'CHANGE_COPY_FIELD',
				field: 'hookCopy',
				value: '수정된 hook',
			})

			expect(next.style.editableCopy.hookCopy).toBe('수정된 hook')
			expect(next.style.editableCopy.bodyCopy).toBe(state.style.editableCopy.bodyCopy)

			const updatedVariant = next.style.copyVariants.find(
				(v) => v.id === state.style.selectedCopyVariantId,
			)
			expect(updatedVariant?.hookCopy).toBe('수정된 hook')
		})

		it('updates bodyCopy field correctly', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, {
				type: 'CHANGE_COPY_FIELD',
				field: 'bodyCopy',
				value: '수정된 body',
			})

			expect(next.style.editableCopy.bodyCopy).toBe('수정된 body')
			const updatedVariant = next.style.copyVariants.find(
				(v) => v.id === state.style.selectedCopyVariantId,
			)
			expect(updatedVariant?.bodyCopy).toBe('수정된 body')
		})

		it('updates ctaCopy field correctly', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, {
				type: 'CHANGE_COPY_FIELD',
				field: 'ctaCopy',
				value: '수정된 cta',
			})

			expect(next.style.editableCopy.ctaCopy).toBe('수정된 cta')
			const updatedVariant = next.style.copyVariants.find(
				(v) => v.id === state.style.selectedCopyVariantId,
			)
			expect(updatedVariant?.ctaCopy).toBe('수정된 cta')
		})

		it('does not modify other variants', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, {
				type: 'CHANGE_COPY_FIELD',
				field: 'hookCopy',
				value: '변경됨',
			})

			const otherVariant = next.style.copyVariants.find((v) => v.id === 'copy-2')
			expect(otherVariant?.hookCopy).toBe('상품 hook 2')
		})
	})

	describe('TOGGLE_NARRATION', () => {
		it('toggles narration enabled from true to false', () => {
			const state = makeBaseState()
			expect(state.style.narration.enabled).toBe(true)

			const next = wizardReducer(state, { type: 'TOGGLE_NARRATION' })
			expect(next.style.narration.enabled).toBe(false)
		})

		it('toggles narration enabled from false to true', () => {
			const state: WizardState = {
				...makeBaseState(),
				style: {
					...makeBaseState().style,
					narration: { ...makeBaseState().style.narration, enabled: false },
				},
			}

			const next = wizardReducer(state, { type: 'TOGGLE_NARRATION' })
			expect(next.style.narration.enabled).toBe(true)
		})
	})

	describe('GENERATION_START', () => {
		it('transitions to GENERATE step with initial progress', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, {
				type: 'GENERATION_START',
				status: 'ANALYZING',
				progress: 5,
			})

			expect(next.step).toBe('GENERATE')
			expect(next.generation.status).toBe('ANALYZING')
			expect(next.generation.progress).toBe(5)
			expect(next.generation.error).toBeNull()
			expect(next.generation.canRetry).toBe(false)
		})
	})

	describe('GENERATION_JOB_CREATED', () => {
		it('stores job details', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'GENERATE',
			}

			const next = wizardReducer(state, {
				type: 'GENERATION_JOB_CREATED',
				jobId: 'job-123',
				status: 'QUEUED',
				progress: 10,
				canRetry: true,
			})

			expect(next.generation.jobId).toBe('job-123')
			expect(next.generation.status).toBe('QUEUED')
			expect(next.generation.progress).toBe(10)
			expect(next.generation.canRetry).toBe(true)
		})
	})

	describe('SSE_UPDATE', () => {
		it('updates generation state from SSE message', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'GENERATE',
				generation: {
					...makeBaseState().generation,
					jobId: 'job-456',
					status: 'QUEUED',
				},
			}

			const next = wizardReducer(state, {
				type: 'SSE_UPDATE',
				newStatus: 'RENDERING_VARIANTS',
				progress: 80,
				canRetry: false,
				errorMessage: null,
			})

			expect(next.generation.status).toBe('RENDERING_VARIANTS')
			expect(next.generation.progress).toBe(80)
			expect(next.generation.canRetry).toBe(false)
			expect(next.generation.error).toBeNull()
		})

		it('passes through error message from SSE', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'GENERATE',
			}

			const next = wizardReducer(state, {
				type: 'SSE_UPDATE',
				newStatus: 'FAILED',
				progress: 0,
				canRetry: true,
				errorMessage: 'GPU timeout',
			})

			expect(next.generation.error).toBe('GPU timeout')
			expect(next.generation.canRetry).toBe(true)
		})
	})

	describe('GENERATION_ERROR', () => {
		it('sets error without changing step (caller decides step)', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'GENERATE',
			}

			const next = wizardReducer(state, {
				type: 'GENERATION_ERROR',
				error: '요청 실패',
			})

			expect(next.step).toBe('GENERATE')
			expect(next.generation.status).toBe('FAILED')
			expect(next.generation.error).toBe('요청 실패')
			expect(next.generation.canRetry).toBe(false)
		})

		it('preserves STYLE step when dispatched during validation', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'STYLE',
			}

			const next = wizardReducer(state, {
				type: 'GENERATION_ERROR',
				error: '이미지를 먼저 업로드해 주세요.',
			})

			expect(next.step).toBe('STYLE')
			expect(next.generation.error).toBe('이미지를 먼저 업로드해 주세요.')
		})
	})

	describe('GENERATION_SUCCEEDED', () => {
		it('transitions to PREVIEW step', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'GENERATE',
			}

			const next = wizardReducer(state, { type: 'GENERATION_SUCCEEDED' })
			expect(next.step).toBe('PREVIEW')
		})
	})

	describe('REGENERATE', () => {
		it('resets to STYLE step and clears generation + preview variants', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'PREVIEW',
				generation: {
					jobId: 'job-old',
					progress: 100,
					status: 'SUCCEEDED',
					error: null,
					canRetry: false,
				},
				preview: {
					...makeBaseState().preview,
					variants: [
						{ platform: 'tiktok', videoUrl: 'https://v.mp4', thumbnailUrl: 'https://t.jpg' },
					],
				},
			}

			const next = wizardReducer(state, { type: 'REGENERATE' })

			expect(next.step).toBe('STYLE')
			expect(next.generation.error).toBeNull()
			expect(next.generation.status).toBe('QUEUED')
			expect(next.generation.jobId).toBe('')
			expect(next.preview.variants).toEqual([])
		})

		it('preserves file and style state', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'PREVIEW',
				file: {
					...makeBaseState().file,
					productName: '가방',
					selectedFile: new File(['x'], 'bag.png'),
				},
				style: {
					...makeBaseState().style,
					selectedStyle: 'PREMIUM',
				},
			}

			const next = wizardReducer(state, { type: 'REGENERATE' })

			expect(next.file.productName).toBe('가방')
			expect(next.style.selectedStyle).toBe('PREMIUM')
		})
	})

	describe('ACCEPT_CANDIDATE', () => {
		it('replaces the correct variant video URL', () => {
			const state: WizardState = {
				...makeBaseState(),
				preview: {
					...makeBaseState().preview,
					variants: [
						{ platform: 'tiktok', videoUrl: 'old-tiktok.mp4' },
						{ platform: 'youtube_shorts', videoUrl: 'old-yt.mp4' },
					],
					candidateVideoUrl: 'new-tiktok.mp4',
					candidatePlatform: 'tiktok',
					previousVideoUrl: 'old-tiktok.mp4',
				},
			}

			const next = wizardReducer(state, { type: 'ACCEPT_CANDIDATE' })

			expect(next.preview.variants[0]?.videoUrl).toBe('new-tiktok.mp4')
			expect(next.preview.variants[1]?.videoUrl).toBe('old-yt.mp4')
			expect(next.preview.candidateVideoUrl).toBeNull()
			expect(next.preview.candidatePlatform).toBeNull()
			expect(next.preview.previousVideoUrl).toBeNull()
		})

		it('returns same state if no candidate exists', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, { type: 'ACCEPT_CANDIDATE' })

			expect(next).toBe(state)
		})
	})

	describe('DISCARD_CANDIDATE', () => {
		it('clears all candidate state', () => {
			const state: WizardState = {
				...makeBaseState(),
				preview: {
					...makeBaseState().preview,
					candidateVideoUrl: 'candidate.mp4',
					candidatePlatform: 'tiktok',
					previousVideoUrl: 'previous.mp4',
				},
			}

			const next = wizardReducer(state, { type: 'DISCARD_CANDIDATE' })

			expect(next.preview.candidateVideoUrl).toBeNull()
			expect(next.preview.candidatePlatform).toBeNull()
			expect(next.preview.previousVideoUrl).toBeNull()
		})
	})

	describe('SET_CANDIDATE', () => {
		it('stores candidate info', () => {
			const state = makeBaseState()

			const next = wizardReducer(state, {
				type: 'SET_CANDIDATE',
				videoUrl: 'candidate.mp4',
				platform: 'instagram_reels',
				previousUrl: 'prev.mp4',
			})

			expect(next.preview.candidateVideoUrl).toBe('candidate.mp4')
			expect(next.preview.candidatePlatform).toBe('instagram_reels')
			expect(next.preview.previousVideoUrl).toBe('prev.mp4')
		})
	})

	describe('TOGGLE_SAFE_ZONE', () => {
		it('toggles safe zone visibility', () => {
			const state = makeBaseState()
			expect(state.preview.showSafeZone).toBe(true)

			const next = wizardReducer(state, { type: 'TOGGLE_SAFE_ZONE' })
			expect(next.preview.showSafeZone).toBe(false)

			const again = wizardReducer(next, { type: 'TOGGLE_SAFE_ZONE' })
			expect(again.preview.showSafeZone).toBe(true)
		})
	})

	describe('SHOW_UPGRADE_MODAL', () => {
		it('shows and hides upgrade modal', () => {
			const state = makeBaseState()

			const shown = wizardReducer(state, { type: 'SHOW_UPGRADE_MODAL', show: true })
			expect(shown.showUpgradeModal).toBe(true)

			const hidden = wizardReducer(shown, { type: 'SHOW_UPGRADE_MODAL', show: false })
			expect(hidden.showUpgradeModal).toBe(false)
		})
	})

	describe('SET_VARIANTS', () => {
		it('sets preview variants', () => {
			const state = makeBaseState()
			const variants = [
				{ platform: 'tiktok' as const, videoUrl: 'v.mp4' },
				{ platform: 'youtube_shorts' as const, videoUrl: 'yt.mp4' },
			]

			const next = wizardReducer(state, { type: 'SET_VARIANTS', variants })

			expect(next.preview.variants).toEqual(variants)
		})
	})

	describe('style actions', () => {
		it('SELECT_STYLE updates selected style', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SELECT_STYLE', style: 'PREMIUM' })
			expect(next.style.selectedStyle).toBe('PREMIUM')
		})

		it('SET_NARRATION_VOICE updates voice', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, {
				type: 'SET_NARRATION_VOICE',
				voice: 'MALE_CALM',
			})
			expect(next.style.narration.voice).toBe('MALE_CALM')
		})

		it('SET_NARRATION_SPEED updates speed', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_NARRATION_SPEED', speed: 1.3 })
			expect(next.style.narration.speed).toBe(1.3)
		})

		it('SET_SUBTITLE_STYLE updates subtitle style', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_SUBTITLE_STYLE', style: 'BOLD' })
			expect(next.style.subtitleStyle).toBe('BOLD')
		})
	})

	describe('persona actions', () => {
		it('SET_PERSONA_SELECTION updates selection', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, {
				type: 'SET_PERSONA_SELECTION',
				selection: {
					gender: 'MALE',
					ageRange: 'ADULT',
					bodyType: 'SLIM',
					style: 'FORMAL',
				},
			})
			expect(next.persona.selection.gender).toBe('MALE')
			expect(next.persona.selection.ageRange).toBe('ADULT')
		})

		it('SET_SKIP_MODEL updates skip flag', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_SKIP_MODEL', skip: true })
			expect(next.persona.skip).toBe(true)
		})

		it('SET_COMPOSITE_IMAGE updates URL', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, {
				type: 'SET_COMPOSITE_IMAGE',
				url: 'https://composite.png',
			})
			expect(next.persona.compositeImageUrl).toBe('https://composite.png')
		})

		it('SET_COMPOSITE_LOADING updates loading flag', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_COMPOSITE_LOADING', loading: true })
			expect(next.persona.isCompositeLoading).toBe(true)
		})
	})

	describe('platform actions', () => {
		it('SET_SELECTED_PLATFORM updates selected platform', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, {
				type: 'SET_SELECTED_PLATFORM',
				platform: 'youtube_shorts',
			})
			expect(next.preview.selectedPlatform).toBe('youtube_shorts')
		})

		it('SET_OVERLAY_PLATFORM updates overlay platform', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, {
				type: 'SET_OVERLAY_PLATFORM',
				platform: 'instagram_reels',
			})
			expect(next.preview.overlayPlatform).toBe('instagram_reels')
		})
	})

	describe('file actions', () => {
		it('SET_PRODUCT_NAME updates product name', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_PRODUCT_NAME', name: '가방' })
			expect(next.file.productName).toBe('가방')
		})

		it('SET_CATEGORY updates category', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'SET_CATEGORY', category: 'BEAUTY' })
			expect(next.file.category).toBe('BEAUTY')
		})
	})

	describe('FETCH_VARIANTS_ERROR', () => {
		it('goes to GENERATE step with error and canRetry', () => {
			const state: WizardState = {
				...makeBaseState(),
				step: 'GENERATE',
			}

			const next = wizardReducer(state, {
				type: 'FETCH_VARIANTS_ERROR',
				error: '불러오기 실패',
			})

			expect(next.step).toBe('GENERATE')
			expect(next.generation.error).toBe('불러오기 실패')
			expect(next.generation.canRetry).toBe(true)
		})
	})

	describe('SET_ANALYSIS_RESULT', () => {
		it('stores analysis result', () => {
			const state = makeBaseState()
			const result = makeAnalysisResult()

			const next = wizardReducer(state, { type: 'SET_ANALYSIS_RESULT', result })

			expect(next.analysis.result).toBe(result)
		})
	})

	describe('unknown action', () => {
		it('returns same state for unknown action type', () => {
			const state = makeBaseState()
			const next = wizardReducer(state, { type: 'UNKNOWN_ACTION' } as unknown as WizardAction)
			expect(next).toBe(state)
		})
	})
})
