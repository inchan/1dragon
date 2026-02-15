import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@snapvid/ui'
import { useState, type JSX } from 'react'
import {
	SocialSharePanel,
	VideoPreviewPlayer,
	type VideoPlatform,
	type VideoVariantItem,
} from '@/features/video-output'

export const Route = createFileRoute('/studio/result/$jobId')({
	component: StudioResultPage,
})

const VARIANTS: ReadonlyArray<VideoVariantItem> = [
	{
		platform: 'tiktok',
		videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
	},
	{
		platform: 'youtube_shorts',
		videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
	},
	{
		platform: 'instagram_reels',
		videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
	},
]

function StudioResultPage(): JSX.Element {
	const { jobId } = Route.useParams()
	const [selectedPlatform, setSelectedPlatform] = useState<VideoPlatform>('tiktok')
	const [overlayPlatform, setOverlayPlatform] = useState<VideoPlatform>('tiktok')
	const [showSafeZone, setShowSafeZone] = useState(true)

	const selectedVariant = VARIANTS.find((variant) => variant.platform === selectedPlatform) ?? VARIANTS[0]

	if (!selectedVariant) {
		return <div className="mx-auto max-w-6xl px-4 py-8" />
	}

	return (
		<div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
			<p className="text-sm text-muted-foreground">결과 Job ID: {jobId}</p>
			<VideoPreviewPlayer
				variants={VARIANTS}
				selectedPlatform={selectedPlatform}
				overlayPlatform={overlayPlatform}
				showSafeZone={showSafeZone}
				onChangeSelectedPlatform={setSelectedPlatform}
				onChangeOverlayPlatform={setOverlayPlatform}
				onToggleSafeZone={() => setShowSafeZone((value) => !value)}
			/>
			<SocialSharePanel
				selectedVariantUrl={selectedVariant.videoUrl}
				selectedPlatform={selectedPlatform}
				productName="snapvid_product"
			/>
			<Button type="button" variant="outline" onClick={() => window.location.assign('/studio/create')}>
				다시 생성하기
			</Button>
		</div>
	)
}
