import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@1dragon/ui'
import type { JSX } from 'react'

type RegenerationPanelProps = {
	readonly remainingAttempts: number
	readonly previousVideoUrl: string | null
	readonly candidateVideoUrl: string | null
	readonly onRegenerate: () => void
	readonly onAccept: () => void
	readonly onDiscard: () => void
}

export function RegenerationPanel(props: RegenerationPanelProps): JSX.Element {
	const hasCandidate = Boolean(props.candidateVideoUrl)

	return (
		<Card>
			<CardHeader>
				<CardTitle>다른 스타일로 다시 만들기</CardTitle>
				<CardDescription>무료 재생성은 영상당 최대 5회까지 가능합니다.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" onClick={props.onRegenerate} disabled={props.remainingAttempts <= 0}>
						다른 스타일로 다시 만들기
					</Button>
					<p className="text-sm text-muted-foreground">남은 횟수: {props.remainingAttempts} / 5</p>
				</div>

				{hasCandidate && (
					<div className="grid gap-3 md:grid-cols-2">
						<div className="space-y-1">
							<p className="text-xs font-medium">이전 버전</p>
							<video className="w-full rounded border" src={props.previousVideoUrl ?? undefined} controls />
						</div>
						<div className="space-y-1">
							<p className="text-xs font-medium">새 버전</p>
							<video className="w-full rounded border" src={props.candidateVideoUrl ?? undefined} controls />
						</div>
					</div>
				)}

				{hasCandidate && (
					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={props.onAccept}>
							이 영상 사용하기
						</Button>
						<Button type="button" variant="outline" onClick={props.onDiscard}>
							이전 영상으로 돌아가기
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
