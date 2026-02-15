import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@snapvid/ui'
import type { JSX } from 'react'
import { formatVideoFileName, resolvePlatformLabel } from './model'
import type { VideoVariantItem } from './types'

type DownloadActionsProps = {
	readonly productName: string
	readonly selectedVariant: VideoVariantItem
	readonly variants: ReadonlyArray<VideoVariantItem>
	readonly canDownloadAll: boolean
}

function triggerDownload(url: string, fileName: string): void {
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = fileName
	anchor.rel = 'noopener'
	document.body.append(anchor)
	anchor.click()
	anchor.remove()
}

export function DownloadActions(props: DownloadActionsProps): JSX.Element {
	function downloadSelected(): void {
		triggerDownload(
			props.selectedVariant.videoUrl,
			formatVideoFileName(props.productName, props.selectedVariant.platform),
		)
	}

	function downloadAll(): void {
		props.variants.forEach((variant, index) => {
			window.setTimeout(() => {
				triggerDownload(variant.videoUrl, formatVideoFileName(props.productName, variant.platform))
			}, index * 120)
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>다운로드</CardTitle>
				<CardDescription>플랫폼별 MP4 파일로 즉시 다운로드할 수 있습니다.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="text-sm text-muted-foreground">
					현재 선택: {resolvePlatformLabel(props.selectedVariant.platform)}
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" onClick={downloadSelected}>
						MP4 다운로드
					</Button>
					<Button type="button" variant="outline" disabled={!props.canDownloadAll} onClick={downloadAll}>
						전체 다운로드
					</Button>
				</div>
				{!props.canDownloadAll && (
					<p className="text-xs text-muted-foreground">
						Starter 플랜에서 전체 다운로드(3개 파일)를 사용할 수 있습니다.
					</p>
				)}
			</CardContent>
		</Card>
	)
}
