import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@snapvid/ui'
import type { JSX } from 'react'

export const Route = createFileRoute('/settings/')({
	component: SettingsIndexPage,
})

function SettingsIndexPage(): JSX.Element {
	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<Card>
				<CardHeader>
					<CardTitle>설정</CardTitle>
					<CardDescription>프로필/결제 설정 페이지로 이동할 수 있습니다.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					<Button type="button" onClick={() => window.location.assign('/settings/profile')}>
						프로필 설정
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => window.location.assign('/settings/billing')}
					>
						결제 설정
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
