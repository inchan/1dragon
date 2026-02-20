import { useQuery, useQueryClient } from '@tanstack/react-query'
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
} from '@snapvid/ui'
import { ProductCategory, type ProductCategory as ProductCategoryType } from '@snapvid/shared'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import {
	CopySelection,
	NarrationSettings,
	SubtitleStyleSelector,
	clampNarrationSpeed,
	createDefaultCopyVariants,
	selectCopyVariantById,
	type MarketingCopyVariant,
	type NarrationVoice,
	type SubtitleStyle,
} from '@/features/content-generation'
import {
	CompositePreview,
	ModelPersonaSelector,
	buildPersonaCatalog,
	isModelEligibleCategory,
	recommendPersonaOptions,
	resolvePersonaSelection,
	type ModelPersonaSelection,
} from '@/features/model-persona'
import { useJobStream } from '@/features/notification/use-job-stream'
import {
	DownloadActions,
	RegenerationPanel,
	VideoPreviewPlayer,
	type VideoPlatform,
	type VideoVariantItem,
} from '@/features/video-output'
import { api } from '@/lib/api'

type WizardStep = 'UPLOAD' | 'ANALYZE' | 'MODEL' | 'STYLE' | 'GENERATE' | 'PREVIEW'

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

const DEFAULT_PERSONA_SELECTION: ModelPersonaSelection = {
	gender: 'FEMALE',
	ageRange: 'YOUNG_ADULT',
	bodyType: 'REGULAR',
	style: 'CASUAL',
}

const INITIAL_COPY_VARIANTS = createDefaultCopyVariants('상품')

export function VideoCreatorWizard(): JSX.Element {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const personaCatalog = useMemo(() => buildPersonaCatalog(), [])

	const [step, setStep] = useState<WizardStep>('UPLOAD')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState('')
	const [productName, setProductName] = useState('')
	const [category, setCategory] = useState<ProductCategoryType>(ProductCategory.FASHION)
	const [analyzed, setAnalyzed] = useState(false)
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [analyzeError, setAnalyzeError] = useState<string | null>(null)
	const [selectedStyle, setSelectedStyle] =
		useState<'SIMPLE' | 'DYNAMIC' | 'EMOTIONAL' | 'TRENDY' | 'PREMIUM'>('TRENDY')
	const [jobId, setJobId] = useState('')
	const [generationProgress, setGenerationProgress] = useState(0)
	const [generationStatus, setGenerationStatus] = useState('QUEUED')
	const [generationError, setGenerationError] = useState<string | null>(null)
	const [generationCanRetry, setGenerationCanRetry] = useState(false)
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)

	const [copyVariants, setCopyVariants] = useState<MarketingCopyVariant[]>(INITIAL_COPY_VARIANTS)
	const [selectedCopyVariantId, setSelectedCopyVariantId] = useState(INITIAL_COPY_VARIANTS[0]?.id ?? '')
	const [editableCopy, setEditableCopy] = useState({
		hookCopy: INITIAL_COPY_VARIANTS[0]?.hookCopy ?? '',
		bodyCopy: INITIAL_COPY_VARIANTS[0]?.bodyCopy ?? '',
		ctaCopy: INITIAL_COPY_VARIANTS[0]?.ctaCopy ?? '',
	})
	const [narrationEnabled, setNarrationEnabled] = useState(true)
	const [narrationVoice, setNarrationVoice] = useState<NarrationVoice>('FEMALE_BRIGHT')
	const [narrationSpeed, setNarrationSpeed] = useState(1)
	const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>('SIMPLE')

	const [personaSelection, setPersonaSelection] =
		useState<ModelPersonaSelection>(DEFAULT_PERSONA_SELECTION)
	const [skipModelPersona, setSkipModelPersona] = useState(false)
	const [compositeImageUrl, setCompositeImageUrl] = useState<string | null>(null)
	const [isCompositeLoading, setIsCompositeLoading] = useState(false)
	const [analysisResult, setAnalysisResult] = useState<import('@/lib/api').AnalyzeProductResponse | null>(null)

	const [variants, setVariants] = useState<VideoVariantItem[]>([])
	const [selectedPlatform, setSelectedPlatform] = useState<VideoPlatform>('tiktok')
	const [overlayPlatform, setOverlayPlatform] = useState<VideoPlatform>('tiktok')
	const [showSafeZone, setShowSafeZone] = useState(true)
	const [remainingRegenerations, setRemainingRegenerations] = useState(5)
	const [previousVideoUrl, setPreviousVideoUrl] = useState<string | null>(null)
	const [candidateVideoUrl, setCandidateVideoUrl] = useState<string | null>(null)
	const [candidatePlatform, setCandidatePlatform] = useState<VideoPlatform | null>(null)

	async function fetchAndSetVariants(targetJobId: string): Promise<void> {
		const response = await api.getVideoJob(targetJobId)
		const fetched = response.variants ?? []
		const mapped: VideoVariantItem[] = fetched.map((v) => ({
			platform: v.platform.toLowerCase() as VideoPlatform,
			videoUrl: v.videoUrl,
			thumbnailUrl: v.thumbnailUrl,
		}))
		if (mapped.length > 0) {
			setVariants(mapped)
		}
	}

	const onJobStreamUpdate = useCallback(
		(message: { type: 'JOB_STATUS_CHANGED' | 'message'; payload: { jobId: string; newStatus: string; progress: number; canRetry?: boolean; errorMessage?: string | null; timestamp: string; retryCount?: number; metadata?: Record<string, unknown> } }) => {
			if (message.payload.jobId !== jobId) {
				return
			}
			setGenerationStatus(message.payload.newStatus)
			setGenerationProgress(message.payload.progress)
			setGenerationCanRetry(message.payload.canRetry ?? false)
			setGenerationError(message.payload.errorMessage ?? null)

			if (message.payload.newStatus === 'SUCCEEDED') {
				void fetchAndSetVariants(jobId)
					.then(() => {
						setStep('PREVIEW')
					})
					.catch((err: unknown) => {
						setGenerationError(err instanceof Error ? err.message : '영상 정보를 불러오지 못했습니다.')
						setStep('GENERATE')
						setGenerationCanRetry(true)
					})
			}
		},
		[jobId],
	)

	useJobStream({
		jobId,
		enabled: step === 'GENERATE' && Boolean(jobId),
		onUpdate: onJobStreamUpdate,
	})

	const quotaQuery = useQuery({
		queryKey: ['quota'],
		queryFn: () => api.getQuota(),
	})

	const personaRecommendations = useMemo(
		() =>
			recommendPersonaOptions({
				category,
				targetAudience: '20-39 여성',
				catalog: personaCatalog,
			}),
		[category, personaCatalog],
	)
	const selectedPersonaOption = useMemo(
		() => resolvePersonaSelection(personaCatalog, personaSelection),
		[personaCatalog, personaSelection],
	)
	const selectedVariant = useMemo(
		() => variants.find((variant) => variant.platform === selectedPlatform) ?? variants[0],
		[selectedPlatform, variants],
	)

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}, [previewUrl])

	function onPickFile(file: File | null): void {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl)
		}

		setAnalysisResult(null)
		setAnalyzed(false)
		setAnalyzeError(null)
		setCompositeImageUrl(null)

		if (!file) {
			setSelectedFile(null)
			setPreviewUrl('')
			return
		}

		setSelectedFile(file)
		setPreviewUrl(URL.createObjectURL(file))
	}

	async function runAnalyze(): Promise<void> {
		if (!selectedFile) {
			return
		}

		setIsAnalyzing(true)
		setAnalyzeError(null)

		try {
			const analysis = await api.analyzeProduct({
				image: selectedFile,
				productName,
				category,
			})
			setAnalysisResult(analysis)
			setAnalyzed(true)

			const detectedCategory = analysis.category ?? category
			setCategory(detectedCategory as ProductCategoryType)

			const variantsForProduct = createDefaultCopyVariants(productName.trim() || '상품')
			const firstVariant = variantsForProduct[0]
			setCopyVariants(variantsForProduct)
			if (firstVariant) {
				setSelectedCopyVariantId(firstVariant.id)
				setEditableCopy({
					hookCopy: firstVariant.hookCopy,
					bodyCopy: firstVariant.bodyCopy,
					ctaCopy: firstVariant.ctaCopy,
				})
			}

			setStep(isModelEligibleCategory(detectedCategory as ProductCategoryType) ? 'MODEL' : 'STYLE')
		} catch (error) {
			setAnalyzeError(error instanceof Error ? error.message : '이미지 분석에 실패했습니다.')
		} finally {
			setIsAnalyzing(false)
		}
	}

	function onSelectCopyVariant(variantId: string): void {
		const selected = selectCopyVariantById(copyVariants, variantId)
		setSelectedCopyVariantId(selected.id)
		setEditableCopy({
			hookCopy: selected.hookCopy,
			bodyCopy: selected.bodyCopy,
			ctaCopy: selected.ctaCopy,
		})
	}

	function onChangeCopyField(field: 'hookCopy' | 'bodyCopy' | 'ctaCopy', value: string): void {
		setEditableCopy((current) => ({
			...current,
			[field]: value,
		}))

		setCopyVariants((current) =>
			current.map((variant) => {
				if (variant.id !== selectedCopyVariantId) {
					return variant
				}
				if (field === 'hookCopy') {
					return { ...variant, hookCopy: value }
				}
				if (field === 'bodyCopy') {
					return { ...variant, bodyCopy: value }
				}
				return { ...variant, ctaCopy: value }
			}),
		)
	}

	async function generateCompositePreview(): Promise<void> {
		if (skipModelPersona || !previewUrl) {
			return
		}

		// blob: URL은 서버에서 접근 불가 — S3 업로드 완료된 originalImageUrl만 사용
		const sourceImageUrl = analysisResult?.originalImageUrl
		if (!sourceImageUrl) {
			return
		}

		setCompositeImageUrl(null)
		setIsCompositeLoading(true)

		try {
			const result = await api.generateModelComposite({
				productImageUrl: sourceImageUrl,
				...(productName.trim() ? { productName: productName.trim() } : {}),
				productCategory: category,
				productKeywords: analysisResult?.keywords ?? [],
				persona: selectedPersonaOption,
			})

			if (result.compositeImageUrl) {
				setCompositeImageUrl(result.compositeImageUrl)
			} else {
				setCompositeImageUrl(previewUrl)
			}
		} catch {
			setCompositeImageUrl(previewUrl)
		} finally {
			setIsCompositeLoading(false)
		}
	}

	async function startGeneration(): Promise<void> {
		if ((quotaQuery.data?.canGenerate ?? true) === false) {
			setShowUpgradeModal(true)
			return
		}

		if (!selectedFile) {
			setGenerationError('이미지 파일을 먼저 업로드해 주세요.')
			return
		}

		if (!selectedStyle) {
			setGenerationError('스타일을 먼저 선택해 주세요.')
			return
		}

		setGenerationError(null)
		setGenerationCanRetry(false)
		setStep('GENERATE')
		setGenerationStatus('ANALYZING')
		setGenerationProgress(5)

		try {
			// ANALYZE 단계에서 이미 분석된 결과 사용; 없으면 여기서 재분석
			const analysis = analysisResult ?? (await api.analyzeProduct({
				image: selectedFile,
				productName,
				category,
			}))

			if (!analysisResult) {
				setAnalysisResult(analysis)
			}

			const effectiveImageUrl =
				!skipModelPersona && compositeImageUrl ? compositeImageUrl : analysis.originalImageUrl

			const jobResult = await api.createVideoJob({
				imageUrl: effectiveImageUrl,
				stylePreset: selectedStyle,
				platforms: [mapPlatformForApi(selectedPlatform)],
				duration: CREATE_JOB_DEFAULT_DURATION,
				narration: narrationEnabled,
				subtitleStyle,
				productCategory: category,
				moods: [],
				keywords: [],
				copy: {
					hook: editableCopy.hookCopy,
					description: editableCopy.bodyCopy,
					cta: editableCopy.ctaCopy,
				},
			})

			setJobId(jobResult.jobId)
			setGenerationStatus(jobResult.status)
			setGenerationProgress(jobResult.progress)
			setGenerationCanRetry(jobResult.canRetry)
			queryClient.setQueryData(['media-job', jobResult.jobId], {
				job: {
					id: jobResult.jobId,
					status: jobResult.status,
					progress: jobResult.progress,
					platforms: [mapPlatformForApi(selectedPlatform)],
					stylePreset: selectedStyle,
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
				setStep('PREVIEW')
			}
		} catch (error) {
			setGenerationStatus('FAILED')
			setGenerationError(error instanceof Error ? error.message : '영상 생성 요청에 실패했습니다.')
			setGenerationCanRetry(false)
			setStep('STYLE')
		}
	}

	function regenerateVariant(): void {
		setStep('STYLE')
		setGenerationError(null)
		setGenerationStatus('QUEUED')
		setVariants([])
		setJobId('')
	}

	function acceptCandidate(): void {
		if (!candidateVideoUrl || !candidatePlatform) {
			return
		}

		setVariants((current) =>
			current.map((variant) =>
				variant.platform === candidatePlatform
					? {
							...variant,
							videoUrl: candidateVideoUrl,
					  }
					: variant,
			),
		)
		setCandidateVideoUrl(null)
		setCandidatePlatform(null)
		setPreviousVideoUrl(null)
	}

	function discardCandidate(): void {
		setCandidateVideoUrl(null)
		setCandidatePlatform(null)
		setPreviousVideoUrl(null)
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
									stepItem.id === step ? 'border-primary bg-primary/10 font-semibold' : 'border-muted'
								}`}
							>
								{stepItem.label}
							</li>
						))}
					</ol>
				</CardContent>
			</Card>

			{step === 'UPLOAD' && (
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
							value={productName}
							onChange={(event) => setProductName(event.target.value)}
							placeholder="상품명"
						/>
						<Select
							value={category}
							onChange={(value) => setCategory(value as ProductCategoryType)}
							options={[
								{ value: ProductCategory.FASHION, label: '패션/의류' },
								{ value: ProductCategory.BEAUTY, label: '뷰티' },
								{ value: ProductCategory.ACCESSORIES, label: '액세서리' },
								{ value: ProductCategory.OTHER, label: '기타' },
							]}
						/>
						{previewUrl && (
							<img
								src={previewUrl}
								alt="업로드 이미지"
								className="h-64 w-full rounded border object-contain"
							/>
						)}
						<Button type="button" disabled={!selectedFile} onClick={() => setStep('ANALYZE')}>
							다음: 분석
						</Button>
					</CardContent>
				</Card>
			)}

			{step === 'ANALYZE' && (
				<Card>
					<CardHeader>
						<CardTitle>2) 분석</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							상품 이미지를 분석하고 모델 선택 여부를 자동 결정합니다.
						</p>
						{analyzeError && (
							<p className="text-sm text-destructive">{analyzeError}</p>
						)}
						<div className="flex gap-2">
							<Button type="button" variant="outline" disabled={isAnalyzing} onClick={() => setStep('UPLOAD')}>
								이전
							</Button>
							<Button type="button" disabled={isAnalyzing || !selectedFile} onClick={() => { void runAnalyze() }}>
								{isAnalyzing ? '분석 중...' : '분석 시작'}
							</Button>
						</div>
						{analyzed && <p className="text-sm">분석 완료: {category}</p>}
					</CardContent>
				</Card>
			)}

			{step === 'MODEL' && (
				<>
					<ModelPersonaSelector
						selection={personaSelection}
						selectedOption={selectedPersonaOption}
						recommendations={personaRecommendations}
						skipModel={skipModelPersona}
						onChangeSelection={setPersonaSelection}
						onSkipModelChange={setSkipModelPersona}
					/>
					<CompositePreview
						imageUrl={skipModelPersona ? null : compositeImageUrl}
						isLoading={isCompositeLoading}
						errorMessage=""
						disabled={skipModelPersona}
						onGenerate={generateCompositePreview}
						onRegenerate={generateCompositePreview}
					/>
					<div className="flex gap-2">
						<Button type="button" variant="outline" onClick={() => setStep('ANALYZE')}>
							이전
						</Button>
						<Button type="button" onClick={() => setStep('STYLE')}>
							다음: 스타일/카피
						</Button>
					</div>
				</>
			)}

			{step === 'STYLE' && (
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>4) 스타일 선택</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Label htmlFor="selected-style">스타일</Label>
							<Select
								id="selected-style"
								value={selectedStyle}
								onChange={(value) =>
									setSelectedStyle(value as 'SIMPLE' | 'DYNAMIC' | 'EMOTIONAL' | 'TRENDY' | 'PREMIUM')
								}
								options={STYLE_OPTIONS}
							/>
						</CardContent>
					</Card>
					<CopySelection
						variants={copyVariants}
						selectedVariantId={selectedCopyVariantId}
						editableCopy={editableCopy}
						onSelectVariant={onSelectCopyVariant}
						onChangeCopyField={onChangeCopyField}
					/>
					<NarrationSettings
						enabled={narrationEnabled}
						voice={narrationVoice}
						speed={narrationSpeed}
						onToggleEnabled={() => setNarrationEnabled((value) => !value)}
						onChangeVoice={setNarrationVoice}
						onChangeSpeed={(speed) => setNarrationSpeed(clampNarrationSpeed(speed))}
					/>
					<SubtitleStyleSelector selectedStyle={subtitleStyle} onSelectStyle={setSubtitleStyle} />
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setStep(isModelEligibleCategory(category) ? 'MODEL' : 'ANALYZE')}
						>
							이전
						</Button>
						<Button type="button" onClick={() => { void startGeneration() }}>
							영상 생성 시작
						</Button>
					</div>
				</div>
			)}

			{step === 'GENERATE' && (
				<Card>
					<CardHeader>
						<CardTitle>5) 생성 진행</CardTitle>
						<CardDescription>SSE + Polling 폴백 기반 상태 업데이트</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">현재 상태: {generationStatus}</p>
						{generationCanRetry && <p className="text-xs text-muted-foreground">재시도 가능</p>}
						<div className="h-2 w-full rounded bg-muted">
							<div
								className="h-2 rounded bg-primary transition-all"
								style={{ width: `${generationProgress}%` }}
							/>
						</div>
						<p className="text-xs text-muted-foreground">진행률: {generationProgress}%</p>
						{generationError && <p className="text-sm text-destructive">오류: {generationError}</p>}
						{generationError && (
							<Button type="button" variant="outline" onClick={() => { void startGeneration() }}>
								다시 생성 요청
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{step === 'PREVIEW' && selectedVariant && (
				<div className="space-y-4">
					<VideoPreviewPlayer
						variants={variants}
						selectedPlatform={selectedPlatform}
						overlayPlatform={overlayPlatform}
						showSafeZone={showSafeZone}
						onChangeSelectedPlatform={setSelectedPlatform}
						onChangeOverlayPlatform={setOverlayPlatform}
						onToggleSafeZone={() => setShowSafeZone((value) => !value)}
					/>
					<DownloadActions
						productName={productName || 'snapvid_product'}
						selectedVariant={selectedVariant}
						variants={variants}
						canDownloadAll
					/>
					<RegenerationPanel
						remainingAttempts={remainingRegenerations}
						previousVideoUrl={previousVideoUrl}
						candidateVideoUrl={candidateVideoUrl}
						onRegenerate={regenerateVariant}
						onAccept={acceptCandidate}
						onDiscard={discardCandidate}
					/>
					<div className="flex gap-2">
						<Button type="button" onClick={() => setStep('STYLE')}>
							수정 후 다시 생성
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => { void navigate({ to: '/dashboard' }) }}
						>
							대시보드로 이동
						</Button>
					</div>
				</div>
			)}

			{showUpgradeModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle>크레딧이 부족합니다</CardTitle>
							<CardDescription>Starter로 업그레이드하면 추가 생성이 가능합니다.</CardDescription>
						</CardHeader>
						<CardContent className="flex gap-2">
							<Button type="button" onClick={() => setShowUpgradeModal(false)}>
								닫기
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => { void navigate({ to: '/pricing' }) }}
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
