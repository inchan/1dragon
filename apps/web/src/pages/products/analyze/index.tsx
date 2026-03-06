import {
	ChangeEvent,
	DragEvent,
	FormEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
	type JSX,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
} from '@1dragon/ui'
import { ProductCategory, type ProductAnalysisResponse } from '@1dragon/shared'
import {
	CompositePreview,
	ModelPersonaSelector,
	buildPersonaCatalog,
	isModelEligibleCategory,
	recommendPersonaOptions,
	resolvePersonaSelection,
	type ModelPersonaSelection,
} from '@/features/model-persona'
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
	api,
	type AnalyzeProductPayload,
	type AnalyzeProductResponse,
	type ProductAnalysisListResponse,
} from '@/lib/api'

export const Route = createFileRoute('/products/analyze/')({
	component: ProductAnalyzePage,
})

const MAX_FILE_BYTES = 20 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const HISTORY_LIMIT = 6

const PRODUCT_CATEGORIES = [
	{ value: '', label: '선택 안 함' },
	{ value: ProductCategory.FASHION, label: '패션/의류' },
	{ value: ProductCategory.BEAUTY, label: '뷰티/화장품' },
	{ value: ProductCategory.FOOD, label: '식품' },
	{ value: ProductCategory.ELECTRONICS, label: '전자제품' },
	{ value: ProductCategory.HOME, label: '홈/인테리어' },
	{ value: ProductCategory.ACCESSORIES, label: '액세서리/잡화' },
	{ value: ProductCategory.SPORTS, label: '스포츠/레저' },
	{ value: ProductCategory.OTHER, label: '기타' },
]

const MOOD_LABELS: Record<string, string> = {
	ENERGETIC: '활기찬',
	CALM: '차분한',
	LUXURY: '고급스러운',
	PLAYFUL: '경쾌한',
	PROFESSIONAL: '프로페셔널',
	WARM: '따뜻한',
	MINIMALIST: '미니멀',
}

const STYLE_LABELS: Record<string, string> = {
	SIMPLE: '심플',
	DYNAMIC: '다이내믹',
	EMOTIONAL: '감성',
	TRENDY: '트렌디',
	PREMIUM: '프리미엄',
}

const DEFAULT_PERSONA_SELECTION: ModelPersonaSelection = {
	gender: 'FEMALE',
	ageRange: 'YOUNG_ADULT',
	bodyType: 'REGULAR',
	style: 'CASUAL',
}
const INITIAL_COPY_VARIANTS = createDefaultCopyVariants('상품')

function formatFileSize(bytes: number): string {
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	if (bytes >= 1024) {
		return `${Math.round(bytes / 1024)} KB`
	}

	return `${bytes} B`
}

function resolveCategoryLabel(category: string | null | undefined): string {
	const match = PRODUCT_CATEGORIES.find((entry) => entry.value === category)
	return match?.label ?? '미지정'
}

function resolvePersonaCategory(input: {
	readonly detectedCategory: ProductCategory
	readonly overriddenCategory: '' | ProductCategory
}): ProductCategory {
	return input.overriddenCategory || input.detectedCategory
}

function ProductAnalyzePage(): JSX.Element {
	const queryClient = useQueryClient()
	const personaCatalog = useMemo(() => buildPersonaCatalog(), [])

	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState('')
	const [isDragging, setIsDragging] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [progressPercent, setProgressPercent] = useState(0)
	const [errorMessage, setErrorMessage] = useState('')
	const [productName, setProductName] = useState('')
	const [category, setCategory] = useState<'' | ProductCategory>('')
	const [result, setResult] = useState<AnalyzeProductResponse | null>(null)
	const [copyVariants, setCopyVariants] =
		useState<MarketingCopyVariant[]>(INITIAL_COPY_VARIANTS)
	const [selectedCopyVariantId, setSelectedCopyVariantId] = useState(
		INITIAL_COPY_VARIANTS[0]?.id ?? '',
	)
	const [editableCopy, setEditableCopy] = useState({
		hookCopy: INITIAL_COPY_VARIANTS[0]?.hookCopy ?? '',
		bodyCopy: INITIAL_COPY_VARIANTS[0]?.bodyCopy ?? '',
		ctaCopy: INITIAL_COPY_VARIANTS[0]?.ctaCopy ?? '',
	})
	const [narrationEnabled, setNarrationEnabled] = useState(true)
	const [narrationVoice, setNarrationVoice] =
		useState<NarrationVoice>('FEMALE_BRIGHT')
	const [narrationSpeed, setNarrationSpeed] = useState(1)
	const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>('SIMPLE')

	const [skipModelPersona, setSkipModelPersona] = useState(false)
	const [personaSelection, setPersonaSelection] =
		useState<ModelPersonaSelection>(DEFAULT_PERSONA_SELECTION)
	const [compositeImageUrl, setCompositeImageUrl] = useState<string | null>(null)
	const [isCompositeLoading, setIsCompositeLoading] = useState(false)
	const [compositeErrorMessage, setCompositeErrorMessage] = useState('')

	const progressTimer = useRef<number | null>(null)
	const compositeTimer = useRef<number | null>(null)

	function resetContentGeneration(productBaseName: string): void {
		const variants = createDefaultCopyVariants(productBaseName)
		const first = variants[0]

		setCopyVariants(variants)
		if (first) {
			setSelectedCopyVariantId(first.id)
			setEditableCopy({
				hookCopy: first.hookCopy,
				bodyCopy: first.bodyCopy,
				ctaCopy: first.ctaCopy,
			})
		}
	}

	const historyQuery = useQuery<ProductAnalysisListResponse, Error>({
		queryKey: ['product-analyses', HISTORY_LIMIT, 0],
		queryFn: () => api.getProductAnalyses(HISTORY_LIMIT, 0),
	})

	const analyzeMutation = useMutation<AnalyzeProductResponse, Error, AnalyzeProductPayload>({
		mutationFn: (payload) => api.analyzeProduct(payload),
		onSuccess: (data) => {
			setResult(data)
			setErrorMessage('')
			resetContentGeneration(productName.trim() || resolveCategoryLabel(data.category))
			queryClient.invalidateQueries({ queryKey: ['product-analyses', HISTORY_LIMIT, 0] })
			setProgressComplete()
		},
		onError: (error) => {
			setErrorMessage(error.message)
			setProgressComplete()
		},
	})

	const resolvedDetectedCategory = result?.category ?? ProductCategory.OTHER
	const resolvedPersonaCategory = resolvePersonaCategory({
		detectedCategory: resolvedDetectedCategory,
		overriddenCategory: category,
	})
	const showPersonaSelector = Boolean(result) && isModelEligibleCategory(resolvedPersonaCategory)

	const personaRecommendations = useMemo(() => {
		if (!showPersonaSelector) {
			return []
		}

		return recommendPersonaOptions({
			category: resolvedPersonaCategory,
			targetAudience: result?.targetAudience ?? '',
			catalog: personaCatalog,
		})
	}, [showPersonaSelector, resolvedPersonaCategory, result?.targetAudience, personaCatalog])

	const selectedPersonaOption = useMemo(
		() => resolvePersonaSelection(personaCatalog, personaSelection),
		[personaCatalog, personaSelection],
	)

	useEffect(() => {
		if (!showPersonaSelector) {
			setSkipModelPersona(false)
			setCompositeImageUrl(null)
			setCompositeErrorMessage('')
			return
		}

		const defaultOption = personaRecommendations[0] ?? personaCatalog[0]
		if (defaultOption) {
			setPersonaSelection({
				gender: defaultOption.gender,
				ageRange: defaultOption.ageRange,
				bodyType: defaultOption.bodyType,
				style: defaultOption.style,
			})
		}

		setSkipModelPersona(false)
		setCompositeImageUrl(null)
		setCompositeErrorMessage('')
	}, [showPersonaSelector, result?.id, personaRecommendations, personaCatalog])

	useEffect(() => {
		if (!skipModelPersona) {
			return
		}

		setCompositeImageUrl(null)
		setCompositeErrorMessage('')
	}, [skipModelPersona])

	useEffect(() => {
		return () => {
			if (progressTimer.current !== null) {
				window.clearInterval(progressTimer.current)
			}

			if (compositeTimer.current !== null) {
				window.clearTimeout(compositeTimer.current)
			}

			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}, [previewUrl])

	function validateFile(file: File): string {
		if (!ALLOWED_MIME_TYPES.has(file.type)) {
			return '지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP 형식을 사용해주세요.'
		}

		if (file.size > MAX_FILE_BYTES) {
			return '이미지가 너무 큽니다 (최대 20MB)'
		}

		return ''
	}

	function setImage(file: File | null): void {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl)
		}

		if (!file) {
			setSelectedFile(null)
			setPreviewUrl('')
			return
		}

		setSelectedFile(file)
		setPreviewUrl(URL.createObjectURL(file))
	}

	function handleFileSelect(file: File | null): void {
		if (!file) {
			setErrorMessage('')
			setImage(null)
			return
		}

		const error = validateFile(file)
		if (error) {
			setErrorMessage(error)
			setImage(null)
			return
		}

		setErrorMessage('')
		setImage(file)
	}

	function onDragOver(event: DragEvent<HTMLDivElement>): void {
		event.preventDefault()
		setIsDragging(true)
	}

	function onDragLeave(event: DragEvent<HTMLDivElement>): void {
		event.preventDefault()
		setIsDragging(false)
	}

	function onDrop(event: DragEvent<HTMLDivElement>): void {
		event.preventDefault()
		setIsDragging(false)
		handleFileSelect(event.dataTransfer.files?.[0] ?? null)
	}

	function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
		handleFileSelect(event.target.files?.[0] ?? null)
	}

	function setProgressComplete(): void {
		if (progressTimer.current !== null) {
			window.clearInterval(progressTimer.current)
		}

		setProgressPercent(100)
		setIsSubmitting(false)
		progressTimer.current = null
	}

	function startProgress(): void {
		setIsSubmitting(true)
		setProgressPercent(5)
		progressTimer.current = window.setInterval(() => {
			setProgressPercent((current) => (current >= 90 ? 90 : current + 5))
		}, 150)
	}

	function onSubmit(event: FormEvent): void {
		event.preventDefault()

		if (!selectedFile) {
			setErrorMessage('이미지를 먼저 업로드해 주세요.')
			return
		}

		setCompositeImageUrl(null)
		setCompositeErrorMessage('')
		setErrorMessage('')
		startProgress()
		analyzeMutation.mutate({
			image: selectedFile,
			...(productName.trim() ? { productName: productName.trim() } : {}),
			...(category ? { category } : {}),
		})
	}

	function showHistoryRecord(item: ProductAnalysisResponse): void {
		setResult({
			...item,
			queue: {
				status: 'DONE',
				message: '이력에서 불러온 결과입니다.',
			},
		})
		resetContentGeneration(productName.trim() || resolveCategoryLabel(item.category))
	}

	function handleSelectCopyVariant(variantId: string): void {
		const selected = selectCopyVariantById(copyVariants, variantId)
		setSelectedCopyVariantId(selected.id)
		setEditableCopy({
			hookCopy: selected.hookCopy,
			bodyCopy: selected.bodyCopy,
			ctaCopy: selected.ctaCopy,
		})
	}

	function handleChangeCopyField(
		field: 'hookCopy' | 'bodyCopy' | 'ctaCopy',
		value: string,
	): void {
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

	function buildCompositeImageUrl(): string | null {
		if (!result) {
			return null
		}

		const baseImageUrl = result.processedImageUrl ?? result.originalImageUrl
		const personaToken = `${selectedPersonaOption.gender}-${selectedPersonaOption.ageRange}-${selectedPersonaOption.bodyType}-${selectedPersonaOption.style}`.toLowerCase()
		const separator = baseImageUrl.includes('?') ? '&' : '?'

		return `${baseImageUrl}${separator}persona=${personaToken}&ts=${Date.now()}`
	}

	function generateCompositePreview(): void {
		if (!result || skipModelPersona) {
			return
		}

		setCompositeErrorMessage('')
		setIsCompositeLoading(true)

		if (compositeTimer.current !== null) {
			window.clearTimeout(compositeTimer.current)
		}

		compositeTimer.current = window.setTimeout(() => {
			const generated = buildCompositeImageUrl()
			if (!generated) {
				setCompositeErrorMessage('합성 이미지 생성에 실패했습니다.')
				setCompositeImageUrl(null)
			} else {
				setCompositeImageUrl(generated)
			}
			setIsCompositeLoading(false)
			compositeTimer.current = null
		}, 900)
	}

	return (
		<div className="mx-auto flex max-w-6xl gap-6 px-4 py-8 md:flex-row">
			<div className="flex-1 space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>이미지 업로드</CardTitle>
						<CardDescription>드래그앤드롭 또는 파일 선택으로 상품 사진을 업로드하세요.</CardDescription>
					</CardHeader>
					<form onSubmit={onSubmit}>
						<CardContent className="space-y-4">
							<div
								className={`rounded-lg border border-dashed p-6 text-center ${
									isDragging ? 'border-primary bg-primary/5' : 'border-muted'
								}`}
								onDragOver={onDragOver}
								onDragLeave={onDragLeave}
								onDrop={onDrop}
							>
								<p className="mb-3 text-sm text-muted-foreground">이미지 파일을 여기로 드래그하세요.</p>
								<label className="inline-flex cursor-pointer rounded-md bg-secondary px-4 py-2 text-sm">
									<input
										type="file"
										accept="image/jpeg,image/png,image/webp"
										onChange={onFileChange}
										className="hidden"
									/>
									파일 선택
								</label>
							</div>

							{selectedFile && (
								<div className="space-y-1 text-sm">
									<p>선택 파일: {selectedFile.name}</p>
									<p>{formatFileSize(selectedFile.size)}</p>
								</div>
							)}

							{previewUrl && (
								<div className="overflow-hidden rounded-lg border">
									<img
										src={previewUrl}
										alt="업로드 미리보기"
										className="h-64 w-full rounded-lg border bg-muted object-contain"
									/>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="productName">상품명 (선택)</Label>
								<Input
									id="productName"
									value={productName}
									onChange={(event) => setProductName(event.target.value)}
									placeholder="예: 미니멀 원피스"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="category">카테고리 (선택)</Label>
								<Select
									id="category"
									value={category}
									onChange={(value) => setCategory(value as '' | ProductCategory)}
									options={PRODUCT_CATEGORIES}
									placeholder="카테고리를 선택해 주세요"
								/>
							</div>

							{isSubmitting && (
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">진행률: {progressPercent}%</p>
									<div className="h-2 w-full rounded bg-muted">
										<div
											className="h-2 rounded bg-primary transition-all"
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
								</div>
							)}

							{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
						</CardContent>
						<CardFooter>
							<Button type="submit" disabled={isSubmitting || !selectedFile}>
								분석 시작
							</Button>
						</CardFooter>
					</form>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>분석 결과</CardTitle>
						<CardDescription>{result?.queue.message || '아직 분석이 완료되지 않았습니다.'}</CardDescription>
					</CardHeader>
					{result && (
						<CardContent className="space-y-3">
							<div className="grid gap-3 md:grid-cols-2">
								<p>
									<strong>카테고리:</strong> {resolveCategoryLabel(result.category)}
								</p>
								<p>
									<strong>상품 여부:</strong> {result.isProductImage ? '상품' : '상품 아님'}
								</p>
								<p>
									<strong>신뢰도:</strong> {Math.round(result.confidence * 100)}%
								</p>
								<p>
									<strong>해상도:</strong> {result.resolution.width}x{result.resolution.height}
								</p>
							</div>

							<div>
								<p className="font-medium">분위기</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{result.moods.map((mood) => (
										<span key={mood} className="rounded-full bg-secondary px-2 py-1 text-xs">
											{MOOD_LABELS[mood] ?? mood}
										</span>
									))}
								</div>
							</div>

							<div>
								<p className="font-medium">추천 스타일</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{result.suggestedStyles.map((style) => (
										<span key={style} className="rounded-full bg-secondary px-2 py-1 text-xs">
											{STYLE_LABELS[style] ?? style}
										</span>
									))}
								</div>
							</div>

							<div>
								<p className="font-medium">키워드</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{result.keywords.map((keyword) => (
										<span key={keyword} className="rounded-full border px-2 py-1 text-xs">
											{keyword}
										</span>
									))}
								</div>
							</div>

							{result.colors.length > 0 && (
								<div>
									<p className="font-medium">주요 색상</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{result.colors.map((color) => (
											<span
												key={color}
												className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
											>
												<span
													className="inline-block h-3 w-3 rounded-full border border-white"
													style={{ backgroundColor: color }}
												/>
												{color}
											</span>
										))}
									</div>
								</div>
							)}
						</CardContent>
					)}
				</Card>

				{result && (
					<>
						<CopySelection
							variants={copyVariants}
							selectedVariantId={selectedCopyVariantId}
							editableCopy={editableCopy}
							onSelectVariant={handleSelectCopyVariant}
							onChangeCopyField={handleChangeCopyField}
						/>
						<NarrationSettings
							enabled={narrationEnabled}
							voice={narrationVoice}
							speed={narrationSpeed}
							onToggleEnabled={() => setNarrationEnabled((enabled) => !enabled)}
							onChangeVoice={setNarrationVoice}
							onChangeSpeed={(speed) => setNarrationSpeed(clampNarrationSpeed(speed))}
						/>
						<SubtitleStyleSelector
							selectedStyle={subtitleStyle}
							onSelectStyle={setSubtitleStyle}
						/>
					</>
				)}

				{showPersonaSelector && (
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
							errorMessage={compositeErrorMessage}
							disabled={skipModelPersona}
							onGenerate={generateCompositePreview}
							onRegenerate={generateCompositePreview}
						/>
					</>
				)}

				{result && !showPersonaSelector && (
					<Card>
						<CardContent className="pt-6">
							<p className="text-sm text-muted-foreground">
								현재 카테고리는 모델 페르소나 적용 대상이 아니므로 상품 중심 플로우로 진행됩니다.
							</p>
						</CardContent>
					</Card>
				)}
			</div>

			<div className="w-full space-y-4 md:w-96">
				<Card>
					<CardHeader>
						<CardTitle>최근 분석 이력</CardTitle>
						<CardDescription>최근 6개 분석 결과입니다.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{historyQuery.isLoading && <p className="text-sm text-muted-foreground">이력을 불러오는 중입니다.</p>}
						{historyQuery.isError && <p className="text-sm text-destructive">이력 조회 실패</p>}
						{!historyQuery.isLoading && historyQuery.data?.items.length === 0 && (
							<p className="text-sm text-muted-foreground">아직 이력이 없습니다.</p>
						)}
						{historyQuery.data?.items.map((item) => (
							<button
								key={item.id}
								type="button"
								className="w-full rounded border px-3 py-2 text-left text-sm"
								onClick={() => showHistoryRecord(item)}
							>
								<div className="font-medium">{resolveCategoryLabel(item.category)}</div>
								<div className="text-xs text-muted-foreground">
									{item.isProductImage ? '상품' : '비상품'} · {Math.round(item.confidence * 100)}%
								</div>
							</button>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
