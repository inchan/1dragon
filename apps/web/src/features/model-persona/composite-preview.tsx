import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@snapvid/ui'
import type { JSX } from 'react'

type CompositePreviewProps = {
	readonly imageUrl: string | null
	readonly isLoading: boolean
	readonly errorMessage?: string
	readonly disabled?: boolean
	readonly onGenerate: () => void
	readonly onRegenerate: () => void
}

export function CompositePreview(props: CompositePreviewProps): JSX.Element {
	const actionLabel = props.imageUrl ? '재생성' : '합성 이미지 생성'

	return (
		<Card>
			<CardHeader>
				<CardTitle>합성 이미지 미리보기</CardTitle>
				<CardDescription>
					모델+상품 합성 결과를 먼저 확인한 뒤 영상 생성 단계로 진행할 수 있습니다.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{props.isLoading && (
					<div className="rounded border border-dashed border-muted p-4 text-sm text-muted-foreground">
						합성 이미지를 생성하는 중입니다...
					</div>
				)}

				{!props.isLoading && props.imageUrl && (
					<div className="overflow-hidden rounded-lg border">
						<img
							src={props.imageUrl}
							alt="모델 합성 결과 미리보기"
							className="h-64 w-full bg-muted object-contain"
						/>
					</div>
				)}

				{!props.isLoading && !props.imageUrl && (
					<p className="text-sm text-muted-foreground">
						아직 생성된 합성 이미지가 없습니다. 페르소나를 선택하고 생성해 주세요.
					</p>
				)}

				{props.errorMessage && <p className="text-sm text-destructive">{props.errorMessage}</p>}

				<div className="flex gap-2">
					<Button
						type="button"
						disabled={props.disabled || props.isLoading}
						onClick={props.imageUrl ? props.onRegenerate : props.onGenerate}
					>
						{actionLabel}
					</Button>
					{props.imageUrl && (
						<Button
							type="button"
							variant="outline"
							disabled={props.disabled || props.isLoading}
							onClick={props.onGenerate}
						>
							새로 생성
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
