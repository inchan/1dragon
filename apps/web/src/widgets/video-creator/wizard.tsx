import {
	CopySelection,
	NarrationSettings,
	type NarrationVoice,
	type SubtitleStyle,
	SubtitleStyleSelector,
	clampNarrationSpeed,
	createDefaultCopyVariants,
	selectCopyVariantById,
} from '@/features/content-generation'
import {
	CompositePreview,
	type ModelPersonaSelection,
	ModelPersonaSelector,
	buildPersonaCatalog,
	isModelEligibleCategory,
	recommendPersonaOptions,
	resolvePersonaSelection,
} from '@/features/model-persona'
import { useJobStream } from '@/features/notification/use-job-stream'
import {
	DownloadActions,
	RegenerationPanel,
	type VideoPlatform,
	VideoPreviewPlayer,
	type VideoVariantItem,
} from '@/features/video-output'
import { api } from '@/lib/api'
import {
	ProductCategory,
	type ProductCategory as ProductCategoryType,
	type StylePreset,
} from '@1dragon/shared'
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
} from '@1dragon/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { type JSX, useCallback, useEffect, useMemo, useReducer } from 'react'
import { type WizardStep, createInitialState, wizardReducer } from './wizard-reducer'

const STEP_ORDER: ReadonlyArray<{ id: WizardStep; label: string }> = [
	{ id: 'UPLOAD', label: '업로드' },
	{ id: 'ANALYZE', label: '분석' },
	{ id: 'MODEL', label: '모델 선택' },
	{ id: 'STYLE', label: '스타일/카피' },
	{ id: 'GENERATE', label: '생성' },
	{ id: 'PREVIEW', label: '프리뷰' },
]

const STYLE_OPTIONS = [
	{ value: 'SIMPLE', label: '심플' },
	{ value: 'DYNAMIC', label: '다이내믹' },
	{ value: 'EMOTIONAL', label: '감성' },
	{ value: 'TRENDY', label: '트렌디' },
	{ value: 'PREMIUM', label: '프리미엄' },
]
const CREATE_JOB_DEFAULT_DURATION = 15

function mapPlatformForApi(
	platform: VideoPlatform,
): 'TIKTOK' | 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' {
	if (platform === 'youtube_shorts') {
		return 'YOUTUBE_SHORTS'
	}
	return platform === 'instagram_reels' ? 'INSTAGRAM_REELS' : 'TIKTOK'
}

const INITIAL_COPY_VARIANTS = createDefaultCopyVariants('상품')

export function VideoCreatorWizard(): JSX.Element {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const personaCatalog = useMemo(() => buildPersonaCatalog(), [])

	const [state, dispatch] = useReducer(wizardReducer, INITIAL_COPY_VARIANTS, createInitialState)

	const fetchAndSetVariants = useCallback(async (targetJobId: string): Promise<void> => {
		const response = await api.getVideoJob(targetJobId)
		const fetched = response.variants ?? []
		const mapped: VideoVariantItem[] = fetched.map((v) => ({
			platform: v.platform.toLowerCase() as VideoPlatform,
			videoUrl: v.videoUrl,
			thumbnailUrl: v.thumbnailUrl,
		}))
		if (mapped.length > 0) {
			dispatch({ type: 'SET_VARIANTS', variants: mapped })
		}
	}, [])

	const onJobStreamUpdate = useCallback(
		(message: {
			type: 'JOB_STATUS_CHANGED' | 'message'
			payload: {
				jobId: string
				newStatus: string
				progress: number
				canRetry?: boolean
				errorMessage?: string | null
				timestamp: string
				retryCount?: number
				metadata?: Record<string, unknown>
			}
		}) => {
			if (message.payload.jobId !== state.generation.jobId) {
				return
			}
			dispatch({
				type: 'SSE_UPDATE',
				newStatus: message.payload.newStatus,
				progress: message.payload.progress,
				canRetry: message.payload.canRetry ?? false,
				errorMessage: message.payload.errorMessage ?? null,
			})

			if (message.payload.newStatus === 'SUCCEEDED') {
				void fetchAndSetVariants(state.generation.jobId)
					.then(() => {
						dispatch({ type: 'GENERATION_SUCCEEDED' })
					})
					.catch((err: unknown) => {
						dispatch({
							type: 'FETCH_VARIANTS_ERROR',
							error: err instanceof Error ? err.message : '영상 정보를 불러오지 못했습니다.',
						})
					})
			}
		},
		[state.generation.jobId, fetchAndSetVariants],
	)

	useJobStream({
		jobId: state.generation.jobId,
		enabled: state.step === 'GENERATE' && Boolean(state.generation.jobId),
		onUpdate: onJobStreamUpdate,
	})

	const quotaQuery = useQuery({
		queryKey: ['quota'],
		queryFn: () => api.getQuota(),
	})

	const personaRecommendations = useMemo(
		() =>
			recommendPersonaOptions({
				category: state.file.category,
				targetAudience: '20-39 여성',
				catalog: personaCatalog,
			}),
		[state.file.category, personaCatalog],
	)
	const selectedPersonaOption = useMemo(
		() => resolvePersonaSelection(personaCatalog, state.persona.selection),
		[personaCatalog, state.persona.selection],
	)
	const selectedVariant = useMemo(
		() =>
			state.preview.variants.find(
				(variant) => variant.platform === state.preview.selectedPlatform,
			) ?? state.preview.variants[0],
		[state.preview.selectedPlatform, state.preview.variants],
	)

	useEffect(() => {
		return () => {
			if (state.file.previewUrl) {
				URL.revokeObjectURL(state.file.previewUrl)
			}
		}
	}, [state.file.previewUrl])

	function onPickFile(file: File | null): void {
		if (state.file.previewUrl) {
			URL.revokeObjectURL(state.file.previewUrl)
		}

		dispatch({
			type: 'PICK_FILE',
			file,
			previewUrl: file ? URL.createObjectURL(file) : '',
		})
	}

	async function runAnalyze(): Promise<void> {
		if (!state.file.selectedFile) {
			return
		}

		dispatch({ type: 'ANALYZE_START' })

		try {
			const analysis = await api.analyzeProduct({
				image: state.file.selectedFile,
				productName: state.file.productName,
				category: state.file.category,
			})

			const detectedCategory = (analysis.category ?? state.file.category) as ProductCategoryType
			const variantsForProduct = createDefaultCopyVariants(state.file.productName.trim() || '상품')

			dispatch({
				type: 'ANALYZE_SUCCESS',
				result: analysis,
				category: detectedCategory,
				copyVariants: variantsForProduct,
				nextStep: isModelEligibleCategory(detectedCategory) ? 'MODEL' : 'STYLE',
			})
		} catch (error) {
			dispatch({
				type: 'ANALYZE_ERROR',
				error: error instanceof Error ? error.message : '이미지 분석에 실패했습니다.',
			})
		}
	}

	function onSelectCopyVariant(variantId: string): void {
		const selected = selectCopyVariantById(state.style.copyVariants, variantId)
		dispatch({
			type: 'SELECT_COPY_VARIANT',
			variantId: selected.id,
			editableCopy: {
				hookCopy: selected.hookCopy,
				bodyCopy: selected.bodyCopy,
				ctaCopy: selected.ctaCopy,
			},
		})
	}

	function onChangeCopyField(field: 'hookCopy' | 'bodyCopy' | 'ctaCopy', value: string): void {
		dispatch({ type: 'CHANGE_COPY_FIELD', field, value })
	}

	async function generateCompositePreview(): Promise<void> {
		if (state.persona.skip || !state.file.previewUrl) {
			return
		}

		// blob: URL은 서버에서 접근 불가 -- S3 업로드 완료된 originalImageUrl만 사용
		const sourceImageUrl = state.analysis.result?.originalImageUrl
		if (!sourceImageUrl) {
			return
		}

		dispatch({ type: 'SET_COMPOSITE_IMAGE', url: null })
		dispatch({ type: 'SET_COMPOSITE_LOADING', loading: true })

		try {
			const result = await api.generateModelComposite({
				productImageUrl: sourceImageUrl,
				...(state.file.productName.trim() ? { productName: state.file.productName.trim() } : {}),
				productCategory: state.file.category,
				productKeywords: state.analysis.result?.keywords ?? [],
				persona: selectedPersonaOption,
			})

			if (result.compositeImageUrl) {
				dispatch({ type: 'SET_COMPOSITE_IMAGE', url: result.compositeImageUrl })
			} else {
				dispatch({ type: 'SET_COMPOSITE_IMAGE', url: state.file.previewUrl })
			}
		} catch {
			dispatch({ type: 'SET_COMPOSITE_IMAGE', url: state.file.previewUrl })
		} finally {
			dispatch({ type: 'SET_COMPOSITE_LOADING', loading: false })
		}
	}

	async function startGeneration(): Promise<void> {
		if ((quotaQuery.data?.canGenerate ?? true) === false) {
			dispatch({ type: 'SHOW_UPGRADE_MODAL', show: true })
			return
		}

		if (!state.file.selectedFile) {
			dispatch({
				type: 'GENERATION_ERROR',
				error: '이미지 파일을 먼저 업로드해 주세요.',
			})
			return
		}

		if (!state.style.selectedStyle) {
			dispatch({
				type: 'GENERATION_ERROR',
				error: '스타일을 먼저 선택해 주세요.',
			})
			return
		}

		dispatch({ type: 'GENERATION_START', status: 'ANALYZING', progress: 5 })

		try {
			// ANALYZE 단계에서 이미 분석된 결과 사용; 없으면 여기서 재분석
			const analysis =
				state.analysis.result ??
				(await api.analyzeProduct({
					image: state.file.selectedFile,
					productName: state.file.productName,
					category: state.file.category,
				}))

			if (!state.analysis.result) {
				dispatch({ type: 'SET_ANALYSIS_RESULT', result: analysis })
			}

			const effectiveImageUrl =
				!state.persona.skip && state.persona.compositeImageUrl
					? state.persona.compositeImageUrl
					: analysis.originalImageUrl

			const jobResult = await api.createVideoJob({
				imageUrl: effectiveImageUrl,
				stylePreset: state.style.selectedStyle,
				platforms: [mapPlatformForApi(state.preview.selectedPlatform)],
				duration: CREATE_JOB_DEFAULT_DURATION,
				narration: state.style.narration.enabled,
				subtitleStyle: state.style.subtitleStyle,
				productCategory: state.file.category,
				moods: [],
				keywords: [],
				copy: {
					hook: state.style.editableCopy.hookCopy,
					description: state.style.editableCopy.bodyCopy,
					cta: state.style.editableCopy.ctaCopy,
				},
			})

			dispatch({
				type: 'GENERATION_JOB_CREATED',
				jobId: jobResult.jobId,
				status: jobResult.status,
				progress: jobResult.progress,
				canRetry: jobResult.canRetry,
			})
			queryClient.setQueryData(['media-job', jobResult.jobId], {
				job: {
					id: jobResult.jobId,
					status: jobResult.status,
					progress: jobResult.progress,
					platforms: [mapPlatformForApi(state.preview.selectedPlatform)],
					stylePreset: state.style.selectedStyle,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					retryCount: jobResult.retryCount,
					canRetry: jobResult.canRetry,
					errorMessage: null,
					startedAt: null,
				},
				events: [],
			})

			if (jobResult.status === 'SUCCEEDED') {
				await fetchAndSetVariants(jobResult.jobId)
				dispatch({ type: 'GENERATION_SUCCEEDED' })
			}
		} catch (error) {
			dispatch({ type: 'SET_STEP', step: 'STYLE' })
			dispatch({
				type: 'GENERATION_ERROR',
				error: error instanceof Error ? error.message : '영상 생성 요청에 실패했습니다.',
			})
		}
	}

	function regenerateVariant(): void {
		dispatch({ type: 'REGENERATE' })
	}

	function acceptCandidate(): void {
		dispatch({ type: 'ACCEPT_CANDIDATE' })
	}

	function discardCandidate(): void {
		dispatch({ type: 'DISCARD_CANDIDATE' })
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>영상 생성 위저드</CardTitle>
					<CardDescription>
						업로드 → 분석 → 모델 선택(조건부) → 스타일 → 생성 → 프리뷰
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ol className="grid gap-2 text-xs md:grid-cols-6">
						{STEP_ORDER.map((stepItem) => (
							<li
								key={stepItem.id}
								className={`rounded border px-2 py-1 ${
									stepItem.id === state.step
										? 'border-primary bg-primary/10 font-semibold'
										: 'border-muted'
								}`}
							>
								{stepItem.label}
							</li>
						))}
					</ol>
				</CardContent>
			</Card>

			{state.step === 'UPLOAD' && (
				<Card>
					<CardHeader>
						<CardTitle>1) 업로드</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
						/>
						<Input
							value={state.file.productName}
							onChange={(event) => dispatch({ type: 'SET_PRODUCT_NAME', name: event.target.value })}
							placeholder="상품명"
						/>
						<Select
							value={state.file.category}
							onChange={(value) =>
								dispatch({ type: 'SET_CATEGORY', category: value as ProductCategoryType })
							}
							options={[
								{ value: ProductCategory.FASHION, label: '패션/의류' },
								{ value: ProductCategory.BEAUTY, label: '뷰티' },
								{ value: ProductCategory.ACCESSORIES, label: '액세서리' },
								{ value: ProductCategory.OTHER, label: '기타' },
							]}
						/>
						{state.file.previewUrl && (
							<img
								src={state.file.previewUrl}
								alt="업로드 이미지"
								className="h-64 w-full rounded border object-contain"
							/>
						)}
						<Button
							type="button"
							disabled={!state.file.selectedFile}
							onClick={() => dispatch({ type: 'SET_STEP', step: 'ANALYZE' })}
						>
							다음: 분석
						</Button>
					</CardContent>
				</Card>
			)}

			{state.step === 'ANALYZE' && (
				<Card>
					<CardHeader>
						<CardTitle>2) 분석</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							상품 이미지를 분석하고 모델 선택 여부를 자동 결정합니다.
						</p>
						{state.analysis.error && (
							<p className="text-sm text-destructive">{state.analysis.error}</p>
						)}
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={state.analysis.isAnalyzing}
								onClick={() => dispatch({ type: 'SET_STEP', step: 'UPLOAD' })}
							>
								이전
							</Button>
							<Button
								type="button"
								disabled={state.analysis.isAnalyzing || !state.file.selectedFile}
								onClick={() => {
									void runAnalyze()
								}}
							>
								{state.analysis.isAnalyzing ? '분석 중...' : '분석 시작'}
							</Button>
						</div>
						{state.analysis.analyzed && <p className="text-sm">분석 완료: {state.file.category}</p>}
					</CardContent>
				</Card>
			)}

			{state.step === 'MODEL' && (
				<>
					<ModelPersonaSelector
						selection={state.persona.selection}
						selectedOption={selectedPersonaOption}
						recommendations={personaRecommendations}
						skipModel={state.persona.skip}
						onChangeSelection={(selection: ModelPersonaSelection) =>
							dispatch({ type: 'SET_PERSONA_SELECTION', selection })
						}
						onSkipModelChange={(skip: boolean) => dispatch({ type: 'SET_SKIP_MODEL', skip })}
					/>
					<CompositePreview
						imageUrl={state.persona.skip ? null : state.persona.compositeImageUrl}
						isLoading={state.persona.isCompositeLoading}
						errorMessage=""
						disabled={state.persona.skip}
						onGenerate={generateCompositePreview}
						onRegenerate={generateCompositePreview}
					/>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => dispatch({ type: 'SET_STEP', step: 'ANALYZE' })}
						>
							이전
						</Button>
						<Button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 'STYLE' })}>
							다음: 스타일/카피
						</Button>
					</div>
				</>
			)}

			{state.step === 'STYLE' && (
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>4) 스타일 선택</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Label htmlFor="selected-style">스타일</Label>
							<Select
								id="selected-style"
								value={state.style.selectedStyle}
								onChange={(value) =>
									dispatch({ type: 'SELECT_STYLE', style: value as StylePreset })
								}
								options={STYLE_OPTIONS}
							/>
						</CardContent>
					</Card>
					<CopySelection
						variants={state.style.copyVariants}
						selectedVariantId={state.style.selectedCopyVariantId}
						editableCopy={state.style.editableCopy}
						onSelectVariant={onSelectCopyVariant}
						onChangeCopyField={onChangeCopyField}
					/>
					<NarrationSettings
						enabled={state.style.narration.enabled}
						voice={state.style.narration.voice}
						speed={state.style.narration.speed}
						onToggleEnabled={() => dispatch({ type: 'TOGGLE_NARRATION' })}
						onChangeVoice={(voice: NarrationVoice) =>
							dispatch({ type: 'SET_NARRATION_VOICE', voice })
						}
						onChangeSpeed={(speed: number) =>
							dispatch({ type: 'SET_NARRATION_SPEED', speed: clampNarrationSpeed(speed) })
						}
					/>
					<SubtitleStyleSelector
						selectedStyle={state.style.subtitleStyle}
						onSelectStyle={(style: SubtitleStyle) =>
							dispatch({ type: 'SET_SUBTITLE_STYLE', style })
						}
					/>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								dispatch({
									type: 'SET_STEP',
									step: isModelEligibleCategory(state.file.category) ? 'MODEL' : 'ANALYZE',
								})
							}
						>
							이전
						</Button>
						<Button
							type="button"
							onClick={() => {
								void startGeneration()
							}}
						>
							영상 생성 시작
						</Button>
					</div>
				</div>
			)}

			{state.step === 'GENERATE' && (
				<Card>
					<CardHeader>
						<CardTitle>5) 생성 진행</CardTitle>
						<CardDescription>SSE + Polling 폴백 기반 상태 업데이트</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">현재 상태: {state.generation.status}</p>
						{state.generation.canRetry && (
							<p className="text-xs text-muted-foreground">재시도 가능</p>
						)}
						<div className="h-2 w-full rounded bg-muted">
							<div
								className="h-2 rounded bg-primary transition-all"
								style={{ width: `${state.generation.progress}%` }}
							/>
						</div>
						<p className="text-xs text-muted-foreground">진행률: {state.generation.progress}%</p>
						{state.generation.error && (
							<p className="text-sm text-destructive">오류: {state.generation.error}</p>
						)}
						{state.generation.error && (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									void startGeneration()
								}}
							>
								다시 생성 요청
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{state.step === 'PREVIEW' && selectedVariant && (
				<div className="space-y-4">
					<VideoPreviewPlayer
						variants={state.preview.variants}
						selectedPlatform={state.preview.selectedPlatform}
						overlayPlatform={state.preview.overlayPlatform}
						showSafeZone={state.preview.showSafeZone}
						onChangeSelectedPlatform={(platform: VideoPlatform) =>
							dispatch({ type: 'SET_SELECTED_PLATFORM', platform })
						}
						onChangeOverlayPlatform={(platform: VideoPlatform) =>
							dispatch({ type: 'SET_OVERLAY_PLATFORM', platform })
						}
						onToggleSafeZone={() => dispatch({ type: 'TOGGLE_SAFE_ZONE' })}
					/>
					<DownloadActions
						productName={state.file.productName || 'snapvid_product'}
						selectedVariant={selectedVariant}
						variants={state.preview.variants}
						canDownloadAll
					/>
					<RegenerationPanel
						remainingAttempts={state.preview.remainingRegenerations}
						previousVideoUrl={state.preview.previousVideoUrl}
						candidateVideoUrl={state.preview.candidateVideoUrl}
						onRegenerate={regenerateVariant}
						onAccept={acceptCandidate}
						onDiscard={discardCandidate}
					/>
					<div className="flex gap-2">
						<Button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 'STYLE' })}>
							수정 후 다시 생성
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void navigate({ to: '/dashboard' })
							}}
						>
							대시보드로 이동
						</Button>
					</div>
				</div>
			)}

			{state.showUpgradeModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle>크레딧이 부족합니다</CardTitle>
							<CardDescription>Starter로 업그레이드하면 추가 생성이 가능합니다.</CardDescription>
						</CardHeader>
						<CardContent className="flex gap-2">
							<Button
								type="button"
								onClick={() => dispatch({ type: 'SHOW_UPGRADE_MODAL', show: false })}
							>
								닫기
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									void navigate({ to: '/pricing' })
								}}
							>
								플랜 업그레이드
							</Button>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}
