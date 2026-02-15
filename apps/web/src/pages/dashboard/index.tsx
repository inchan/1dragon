import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState, type JSX } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@snapvid/ui'
import {
	DownloadActions,
	RegenerationPanel,
	SocialSharePanel,
	VideoPreviewPlayer,
	formatVideoFileName,
	resolvePlatformLabel,
	type VideoPlatform,
	type VideoVariantItem,
} from '@/features/video-output'

export const Route = createFileRoute('/dashboard/')({
	component: DashboardPage,
})

const INITIAL_VARIANTS: ReadonlyArray<VideoVariantItem> = [
	{
		platform: 'tiktok',
		videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
		thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
	},
	{
		platform: 'youtube_shorts',
		videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
		thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
	},
	{
		platform: 'instagram_reels',
		videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
		thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
	},
]

type HistoryItem = {
	readonly id: string
	readonly platform: VideoPlatform
	readonly videoUrl: string
	readonly thumbnailUrl: string
	readonly createdAt: string
}

const MOCK_HISTORY: ReadonlyArray<HistoryItem> = Array.from({ length: 18 }).map((_, index) => {
	const platform: VideoPlatform =
		index % 3 === 0 ? 'tiktok' : index % 3 === 1 ? 'youtube_shorts' : 'instagram_reels'
	const baseVariant =
		INITIAL_VARIANTS.find((variant) => variant.platform === platform) ?? INITIAL_VARIANTS[0]

	return {
		id: `history_${index + 1}`,
		platform,
		videoUrl: `${baseVariant?.videoUrl}${baseVariant?.videoUrl.includes('?') ? '&' : '?'}v=${index + 1}`,
		thumbnailUrl: baseVariant?.thumbnailUrl ?? '',
		createdAt: new Date(Date.now() - index * 1000 * 60 * 60).toISOString(),
	}
})

function triggerHistoryDownload(item: HistoryItem): void {
	const anchor = document.createElement('a')
	anchor.href = item.videoUrl
	anchor.download = formatVideoFileName('snapvid_product', item.platform, new Date(item.createdAt))
	anchor.rel = 'noopener'
	document.body.append(anchor)
	anchor.click()
	anchor.remove()
}

function DashboardPage(): JSX.Element {
	const [variants, setVariants] = useState<VideoVariantItem[]>([...INITIAL_VARIANTS])
	const [selectedPlatform, setSelectedPlatform] = useState<VideoPlatform>('tiktok')
	const [overlayPlatform, setOverlayPlatform] = useState<VideoPlatform>('tiktok')
	const [showSafeZone, setShowSafeZone] = useState(true)
	const [remainingRegenerations, setRemainingRegenerations] = useState(5)
	const [previousVideoUrl, setPreviousVideoUrl] = useState<string | null>(null)
	const [candidateVideoUrl, setCandidateVideoUrl] = useState<string | null>(null)
	const [candidatePlatform, setCandidatePlatform] = useState<VideoPlatform | null>(null)
	const [historyPage, setHistoryPage] = useState(1)

	const historyPageSize = 6

	const selectedVariant = useMemo(
		() => variants.find((variant) => variant.platform === selectedPlatform) ?? variants[0],
		[selectedPlatform, variants],
	)
	const totalHistoryPages = Math.max(1, Math.ceil(MOCK_HISTORY.length / historyPageSize))
	const pagedHistory = useMemo(() => {
		const start = (historyPage - 1) * historyPageSize
		return MOCK_HISTORY.slice(start, start + historyPageSize)
	}, [historyPage, historyPageSize])

	function regenerateVariant(): void {
		if (!selectedVariant || remainingRegenerations <= 0) {
			return
		}

		setPreviousVideoUrl(selectedVariant.videoUrl)
		setCandidateVideoUrl(
			`${selectedVariant.videoUrl}${selectedVariant.videoUrl.includes('?') ? '&' : '?'}regenerated=${Date.now()}`,
		)
		setCandidatePlatform(selectedPlatform)
		setRemainingRegenerations((value) => Math.max(0, value - 1))
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

	if (!selectedVariant) {
		return <div className="mx-auto max-w-6xl px-4 py-8" />
	}

	return (
		<div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
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
				productName="snapvid_product"
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
			<SocialSharePanel
				selectedVariantUrl={selectedVariant.videoUrl}
				selectedPlatform={selectedPlatform}
				productName="snapvid_product"
			/>

			<Card>
				<CardHeader>
					<CardTitle>생성 히스토리</CardTitle>
					<CardDescription>썸네일 확인, 페이지네이션, 재다운로드를 지원합니다.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{pagedHistory.map((item) => (
							<div key={item.id} className="rounded border p-2">
								<img
									src={item.thumbnailUrl}
									alt={`${item.id} 썸네일`}
									className="h-36 w-full rounded border object-cover"
								/>
								<p className="mt-2 text-sm font-medium">{resolvePlatformLabel(item.platform)}</p>
								<p className="text-xs text-muted-foreground">
									{new Date(item.createdAt).toLocaleString('ko-KR')}
								</p>
								<Button
									type="button"
									variant="outline"
									className="mt-2 w-full"
									onClick={() => triggerHistoryDownload(item)}
								>
									재다운로드
								</Button>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between">
						<Button
							type="button"
							variant="outline"
							disabled={historyPage <= 1}
							onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
						>
							이전
						</Button>
						<p className="text-sm text-muted-foreground">
							{historyPage} / {totalHistoryPages}
						</p>
						<Button
							type="button"
							variant="outline"
							disabled={historyPage >= totalHistoryPages}
							onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
						>
							다음
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
