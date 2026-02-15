import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Select } from '@snapvid/ui'
import type { JSX } from 'react'
import type {
	ModelPersonaAgeRange,
	ModelPersonaBodyType,
	ModelPersonaOption,
	ModelPersonaSelection,
	ModelPersonaStyle,
} from './types'

type ModelPersonaSelectorProps = {
	readonly selection: ModelPersonaSelection
	readonly selectedOption: ModelPersonaOption
	readonly recommendations: ReadonlyArray<ModelPersonaOption>
	readonly skipModel: boolean
	readonly onChangeSelection: (selection: ModelPersonaSelection) => void
	readonly onSkipModelChange: (skip: boolean) => void
}

const GENDER_OPTIONS = [
	{ value: 'FEMALE', label: '여성' },
	{ value: 'MALE', label: '남성' },
]

const AGE_OPTIONS = [
	{ value: 'YOUNG_ADULT', label: '20대' },
	{ value: 'ADULT', label: '30대' },
	{ value: 'MIDDLE_AGED', label: '40대' },
]

const BODY_TYPE_OPTIONS = [
	{ value: 'SLIM', label: '슬림' },
	{ value: 'REGULAR', label: '레귤러' },
]

const STYLE_OPTIONS = [
	{ value: 'CASUAL', label: '캐주얼' },
	{ value: 'FORMAL', label: '포멀' },
	{ value: 'STREET', label: '스트리트' },
	{ value: 'MINIMAL', label: '미니멀' },
]

export function ModelPersonaSelector(props: ModelPersonaSelectorProps): JSX.Element {
	function updateSelection(patch: Partial<ModelPersonaSelection>): void {
		props.onChangeSelection({
			...props.selection,
			...patch,
		})
	}

	function selectRecommendation(option: ModelPersonaOption): void {
		props.onSkipModelChange(false)
		props.onChangeSelection({
			gender: option.gender,
			ageRange: option.ageRange,
			bodyType: option.bodyType,
			style: option.style,
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>모델 페르소나 선택</CardTitle>
				<CardDescription>
					카테고리에 맞는 모델 페르소나를 선택하면 합성 이미지 기반으로 영상을 생성할 수 있습니다.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 md:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="persona-gender">성별</Label>
						<Select
							id="persona-gender"
							value={props.selection.gender}
							disabled={props.skipModel}
							onChange={(value) => updateSelection({ gender: value as 'FEMALE' | 'MALE' })}
							options={GENDER_OPTIONS}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="persona-age">연령대</Label>
						<Select
							id="persona-age"
							value={props.selection.ageRange}
							disabled={props.skipModel}
							onChange={(value) => updateSelection({ ageRange: value as ModelPersonaAgeRange })}
							options={AGE_OPTIONS}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="persona-body">체형</Label>
						<Select
							id="persona-body"
							value={props.selection.bodyType}
							disabled={props.skipModel}
							onChange={(value) => updateSelection({ bodyType: value as ModelPersonaBodyType })}
							options={BODY_TYPE_OPTIONS}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="persona-style">스타일</Label>
						<Select
							id="persona-style"
							value={props.selection.style}
							disabled={props.skipModel}
							onChange={(value) => updateSelection({ style: value as ModelPersonaStyle })}
							options={STYLE_OPTIONS}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<p className="text-sm font-medium">추천 3개</p>
					<div className="grid gap-2 md:grid-cols-3">
						{props.recommendations.map((option) => {
							const selected = option.id === props.selectedOption.id
							return (
								<button
									key={option.id}
									type="button"
									onClick={() => selectRecommendation(option)}
									className={`rounded border px-3 py-2 text-left text-xs ${
										selected ? 'border-primary bg-primary/10' : 'border-muted'
									}`}
								>
									<div className="font-medium">추천</div>
									<div>{option.label}</div>
								</button>
							)
						})}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant={props.skipModel ? 'default' : 'outline'}
						onClick={() => props.onSkipModelChange(!props.skipModel)}
					>
						{props.skipModel ? '모델 사용으로 전환' : '모델 없이 만들기'}
					</Button>
					{!props.skipModel && (
						<p className="text-xs text-muted-foreground">선택됨: {props.selectedOption.label}</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
