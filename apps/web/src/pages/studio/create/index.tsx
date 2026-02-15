import { createFileRoute } from '@tanstack/react-router'
import type { JSX } from 'react'
import { VideoCreatorWizard } from '@/widgets/video-creator'

export const Route = createFileRoute('/studio/create/')({
	component: StudioCreatePage,
})

function StudioCreatePage(): JSX.Element {
	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<VideoCreatorWizard />
		</div>
	)
}
