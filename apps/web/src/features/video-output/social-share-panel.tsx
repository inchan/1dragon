import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@1dragon/ui'
import { useState, type JSX } from 'react'
import { api } from '@/lib/api'
import { formatVideoFileName } from './model'
import type { VideoPlatform } from './types'

type SocialSharePanelProps = {
	readonly selectedVariantUrl: string
	readonly selectedPlatform: VideoPlatform
	readonly productName: string
}

type SocialTarget = 'tiktok' | 'instagram'

function downloadFallback(url: string, productName: string, platform: VideoPlatform): void {
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = formatVideoFileName(productName, platform)
	anchor.rel = 'noopener'
	document.body.append(anchor)
	anchor.click()
	anchor.remove()
}

export function SocialSharePanel(props: SocialSharePanelProps): JSX.Element {
	const [caption, setCaption] = useState('신상품 영상이 준비되었습니다.')
	const [hashtags, setHashtags] = useState('#스냅비드 #숏폼 #마케팅')
	const [connected, setConnected] = useState<{ tiktok: boolean; instagram: boolean }>({
		tiktok: false,
		instagram: false,
	})
	const [statusMessage, setStatusMessage] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [fallbackUrl, setFallbackUrl] = useState('')

	async function connectAccount(target: SocialTarget): Promise<void> {
		setIsLoading(true)
		setStatusMessage('')
		setFallbackUrl('')
		try {
			await api.getSocialConnectUrl(target)
			await api.connectSocialAccount(target, 'demo-auth-code')
			setConnected((current) => ({ ...current, [target]: true }))
			setStatusMessage(`${target === 'tiktok' ? 'TikTok' : 'Instagram'} 계정이 연결되었습니다.`)
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : '계정 연결에 실패했습니다.')
		} finally {
			setIsLoading(false)
		}
	}

	async function share(target: SocialTarget): Promise<void> {
		if (!connected[target]) {
			setStatusMessage('먼저 SNS 계정을 연결해 주세요.')
			return
		}

		setIsLoading(true)
		setStatusMessage('공유 중입니다...')
		setFallbackUrl('')

		try {
			const response = await api.shareToSocial(target, {
				variantUrl: props.selectedVariantUrl,
				caption,
				hashtags: hashtags
					.split(/\s+/)
					.map((tag) => tag.trim())
					.filter(Boolean),
			})

			if (response.success) {
				setStatusMessage(`${target === 'tiktok' ? 'TikTok' : 'Instagram'} 공유 완료`)
				return
			}

			setStatusMessage(response.error.message)
			if (response.data?.fallbackDownloadUrl) {
				setFallbackUrl(response.data.fallbackDownloadUrl)
			}
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : '공유에 실패했습니다.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>SNS 공유</CardTitle>
				<CardDescription>
					TikTok/Instagram 계정을 연결하고 캡션/해시태그 자동 입력으로 바로 공유합니다.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-1">
					<Label htmlFor="share-caption">캡션</Label>
					<Input
						id="share-caption"
						value={caption}
						onChange={(event) => setCaption(event.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="share-hashtags">해시태그</Label>
					<Input
						id="share-hashtags"
						value={hashtags}
						onChange={(event) => setHashtags(event.target.value)}
					/>
				</div>

				<div className="grid gap-2 md:grid-cols-2">
					<Button type="button" variant={connected.tiktok ? 'default' : 'outline'} onClick={() => connectAccount('tiktok')} disabled={isLoading}>
						{connected.tiktok ? 'TikTok 연결됨' : 'TikTok 연결'}
					</Button>
					<Button
						type="button"
						variant={connected.instagram ? 'default' : 'outline'}
						onClick={() => connectAccount('instagram')}
						disabled={isLoading}
					>
						{connected.instagram ? 'Instagram 연결됨' : 'Instagram 연결'}
					</Button>
					<Button type="button" onClick={() => share('tiktok')} disabled={isLoading}>
						TikTok에 공유
					</Button>
					<Button type="button" onClick={() => share('instagram')} disabled={isLoading}>
						Instagram에 공유
					</Button>
				</div>

				{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}

				{fallbackUrl && (
					<div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
						<p>업로드에 실패했습니다. 다운로드 후 직접 업로드해주세요.</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => downloadFallback(fallbackUrl, props.productName, props.selectedPlatform)}
						>
							대체 다운로드
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
