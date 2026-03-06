import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Select } from '@1dragon/ui'
import type { JSX } from 'react'
import type { NarrationVoice } from './types'

type NarrationSettingsProps = {
	readonly enabled: boolean
	readonly voice: NarrationVoice
	readonly speed: number
	readonly onToggleEnabled: () => void
	readonly onChangeVoice: (voice: NarrationVoice) => void
	readonly onChangeSpeed: (speed: number) => void
}

const VOICE_OPTIONS = [
	{ value: 'FEMALE_BRIGHT', label: '여성 밝은' },
	{ value: 'MALE_CALM', label: '남성 차분' },
	{ value: 'FEMALE_PRO', label: '여성 전문' },
]

export function NarrationSettings(props: NarrationSettingsProps): JSX.Element {
	return (
		<Card>
			<CardHeader>
				<CardTitle>내레이션 설정</CardTitle>
				<CardDescription>내레이션 사용 여부, 음성, 속도(0.8x~1.5x)를 설정합니다.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" variant={props.enabled ? 'default' : 'outline'} onClick={props.onToggleEnabled}>
						{props.enabled ? '내레이션 사용 중' : '내레이션 끔'}
					</Button>
					<p className="text-xs text-muted-foreground">
						{props.enabled ? 'TTS가 영상에 포함됩니다.' : '자막 전용 모드로 생성됩니다.'}
					</p>
				</div>

				<div className="grid gap-3 md:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="narration-voice">음성 선택</Label>
						<Select
							id="narration-voice"
							value={props.voice}
							disabled={!props.enabled}
							onChange={(value) => props.onChangeVoice(value as NarrationVoice)}
							options={VOICE_OPTIONS}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="narration-speed">속도 ({props.speed.toFixed(1)}x)</Label>
						<input
							id="narration-speed"
							type="range"
							min={0.8}
							max={1.5}
							step={0.1}
							disabled={!props.enabled}
							value={props.speed}
							onChange={(event) => props.onChangeSpeed(Number(event.target.value))}
							className="w-full"
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
