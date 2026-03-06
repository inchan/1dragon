import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@1dragon/ui'
import type { JSX } from 'react'
import type { SubtitleStyle } from './types'

type SubtitleStyleSelectorProps = {
	readonly selectedStyle: SubtitleStyle
	readonly onSelectStyle: (style: SubtitleStyle) => void
}

const STYLE_CARDS: ReadonlyArray<{ style: SubtitleStyle; label: string; description: string }> = [
	{ style: 'SIMPLE', label: '심플', description: '기본 흰색 자막으로 깔끔하게 노출' },
	{ style: 'BOLD', label: '강조', description: '핵심 단어를 노란색으로 강조' },
	{ style: 'MOTION', label: '모션', description: '단어 단위로 순차 등장' },
]

export function SubtitleStyleSelector(props: SubtitleStyleSelectorProps): JSX.Element {
	return (
		<Card>
			<CardHeader>
				<CardTitle>자막 스타일 선택</CardTitle>
				<CardDescription>심플/강조/모션 중 원하는 스타일을 선택하세요.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-2 md:grid-cols-3">
					{STYLE_CARDS.map((styleCard) => {
						const selected = props.selectedStyle === styleCard.style
						return (
							<button
								key={styleCard.style}
								type="button"
								onClick={() => props.onSelectStyle(styleCard.style)}
								className={`rounded border px-3 py-2 text-left text-sm ${
									selected ? 'border-primary bg-primary/10' : 'border-muted'
								}`}
							>
								<p className="font-semibold">{styleCard.label}</p>
								<p className="mt-1 text-xs text-muted-foreground">{styleCard.description}</p>
							</button>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
