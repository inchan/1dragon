import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@snapvid/ui'
import type { JSX } from 'react'
import type { MarketingCopyVariant } from './types'

type CopySelectionProps = {
	readonly variants: ReadonlyArray<MarketingCopyVariant>
	readonly selectedVariantId: string
	readonly editableCopy: {
		readonly hookCopy: string
		readonly bodyCopy: string
		readonly ctaCopy: string
	}
	readonly onSelectVariant: (variantId: string) => void
	readonly onChangeCopyField: (field: 'hookCopy' | 'bodyCopy' | 'ctaCopy', value: string) => void
}

export function CopySelection(props: CopySelectionProps): JSX.Element {
	return (
		<Card>
			<CardHeader>
				<CardTitle>카피 선택</CardTitle>
				<CardDescription>3개 변형 중 하나를 선택하고 문구를 직접 수정할 수 있습니다.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-2 md:grid-cols-3">
					{props.variants.map((variant) => {
						const selected = props.selectedVariantId === variant.id
						return (
							<button
								key={variant.id}
								type="button"
								onClick={() => props.onSelectVariant(variant.id)}
								className={`rounded border px-3 py-2 text-left text-xs ${
									selected ? 'border-primary bg-primary/10' : 'border-muted'
								}`}
							>
								<p className="font-semibold">{variant.label}</p>
								<p className="mt-1 line-clamp-2 text-muted-foreground">{variant.hookCopy}</p>
							</button>
						)
					})}
				</div>

				<div className="space-y-3">
					<div className="space-y-1">
						<Label htmlFor="copy-hook">Hook (1~3초)</Label>
						<Input
							id="copy-hook"
							value={props.editableCopy.hookCopy}
							onChange={(event) => props.onChangeCopyField('hookCopy', event.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="copy-body">Body</Label>
						<textarea
							id="copy-body"
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={props.editableCopy.bodyCopy}
							onChange={(event) => props.onChangeCopyField('bodyCopy', event.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="copy-cta">CTA</Label>
						<Input
							id="copy-cta"
							value={props.editableCopy.ctaCopy}
							onChange={(event) => props.onChangeCopyField('ctaCopy', event.target.value)}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
