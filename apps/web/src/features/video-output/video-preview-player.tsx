import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@1dragon/ui'
import { useMemo, useRef, useState, type JSX } from 'react'
import { resolvePlatformLabel, resolveSafeZone } from './model'
import type { VideoPlatform, VideoVariantItem } from './types'

type VideoPreviewPlayerProps = {
	readonly variants: ReadonlyArray<VideoVariantItem>
	readonly selectedPlatform: VideoPlatform
	readonly overlayPlatform: VideoPlatform
	readonly showSafeZone: boolean
	readonly onChangeSelectedPlatform: (platform: VideoPlatform) => void
	readonly onChangeOverlayPlatform: (platform: VideoPlatform) => void
	readonly onToggleSafeZone: () => void
}

const PLATFORM_OPTIONS: ReadonlyArray<{ value: VideoPlatform; label: string }> = [
	{ value: 'tiktok', label: 'TikTok' },
	{ value: 'youtube_shorts', label: 'Shorts' },
	{ value: 'instagram_reels', label: 'Reels' },
]

export function VideoPreviewPlayer(props: VideoPreviewPlayerProps): JSX.Element {
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const [loadFailed, setLoadFailed] = useState(false)

	const selectedVariant = useMemo(
		() =>
			props.variants.find((variant) => variant.platform === props.selectedPlatform) ??
			props.variants[0],
		[props.selectedPlatform, props.variants],
	)
	const safeZone = resolveSafeZone(props.overlayPlatform)

	function enterFullScreen(): void {
		videoRef.current?.requestFullscreen?.().catch(() => {
			// 브라우저 정책에 따라 fullscreen 진입이 제한될 수 있다.
		})
	}

	function reloadVideo(): void {
		setLoadFailed(false)
		videoRef.current?.load()
		videoRef.current?.play().catch(() => {
			// autoplay 정책에 의해 차단될 수 있다.
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>영상 프리뷰 플레이어</CardTitle>
				<CardDescription>자동 재생, 전체 화면, 세이프존 오버레이를 지원합니다.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					{PLATFORM_OPTIONS.map((option) => (
						<Button
							key={option.value}
							type="button"
							variant={props.selectedPlatform === option.value ? 'default' : 'outline'}
							onClick={() => props.onChangeSelectedPlatform(option.value)}
						>
							{option.label}
						</Button>
					))}
				</div>

				<div className="relative mx-auto max-w-xs overflow-hidden rounded-xl border bg-black">
					{loadFailed ? (
						<div className="flex h-[560px] flex-col items-center justify-center gap-3 text-center text-white/80">
							{selectedVariant?.thumbnailUrl ? (
								<img
									src={selectedVariant.thumbnailUrl}
									alt="프리뷰 썸네일"
									className="h-full w-full object-cover opacity-60"
								/>
							) : (
								<p>프리뷰를 불러오지 못했습니다.</p>
							)}
							<Button type="button" onClick={reloadVideo} className="absolute bottom-6">
								다시 로드
							</Button>
						</div>
					) : (
						<>
							<video
								ref={videoRef}
								className="h-[560px] w-full object-cover"
								src={selectedVariant?.videoUrl}
								autoPlay
								playsInline
								controls
								onError={() => setLoadFailed(true)}
							/>
							{props.showSafeZone && (
								<>
									<div
										className="pointer-events-none absolute left-0 right-0 top-0 bg-red-500/25"
										style={{ height: safeZone.top }}
									/>
									<div
										className="pointer-events-none absolute bottom-0 left-0 right-0 bg-red-500/25"
										style={{ height: safeZone.bottom }}
									/>
									<div className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
										{resolvePlatformLabel(props.overlayPlatform)} safe zone
									</div>
								</>
							)}
						</>
					)}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" variant="outline" onClick={enterFullScreen}>
						전체 화면
					</Button>
					<Button
						type="button"
						variant={props.showSafeZone ? 'default' : 'outline'}
						onClick={props.onToggleSafeZone}
					>
						세이프존 {props.showSafeZone ? '켜짐' : '꺼짐'}
					</Button>
					{PLATFORM_OPTIONS.map((option) => (
						<Button
							key={`overlay-${option.value}`}
							type="button"
							variant={props.overlayPlatform === option.value ? 'default' : 'outline'}
							onClick={() => props.onChangeOverlayPlatform(option.value)}
						>
							{option.label} 오버레이
						</Button>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
