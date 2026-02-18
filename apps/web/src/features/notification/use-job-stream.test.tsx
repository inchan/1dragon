import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useJobStream } from './use-job-stream'

class MockEventSource {
	public static instances: MockEventSource[] = []
	public onmessage: ((event: MessageEvent<string>) => void) | null = null
	public onerror: ((event: Event) => void) | null = null
	public readonly close = vi.fn()
	private readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>()

	public constructor(public readonly url: string) {
		MockEventSource.instances.push(this)
	}

	public addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
		const existing = this.listeners.get(type) ?? []
		this.listeners.set(type, [...existing, listener])
	}

	public dispatchCustomEvent(type: string, event: MessageEvent<string>): void {
		const handlers = this.listeners.get(type) ?? []
		for (const handler of handlers) {
			handler(event)
		}
	}
}

function TestHarness(props: { jobId: string; enabled?: boolean }): null {
	useJobStream({
		jobId: props.jobId,
		...(props.enabled !== undefined ? { enabled: props.enabled } : {}),
	})
	return null
}

describe('useJobStream', () => {
	beforeEach(() => {
		MockEventSource.instances = []
		vi.useFakeTimers()
		vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	it('updates query cache from SSE message and falls back to polling on disconnect', async () => {
		const queryClient = new QueryClient()
		queryClient.setQueryData(['media-job', 'job_1'], { status: 'QUEUED' })

		const fetchMock = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { job: { status: 'SUCCEEDED' } } }),
		})
		vi.stubGlobal('fetch', fetchMock)

		const container = document.createElement('div')
		document.body.append(container)
		const root = createRoot(container)

		act(() => {
			root.render(
				<QueryClientProvider client={queryClient}>
					<TestHarness jobId="job_1" enabled />
				</QueryClientProvider>,
			)
		})

		const source = MockEventSource.instances[0]
		expect(source).toBeDefined()

		act(() => {
			source?.onmessage?.({
				data: JSON.stringify({
					type: 'JOB_STATUS_CHANGED',
					payload: {
						jobId: 'job_1',
						newStatus: 'GENERATING',
						timestamp: new Date().toISOString(),
					},
				}),
			} as MessageEvent<string>)
		})

		expect((queryClient.getQueryData(['media-job', 'job_1']) as { status: string }).status).toBe(
			'GENERATING',
		)

		act(() => {
			source?.onerror?.(new Event('error'))
		})

		await vi.advanceTimersByTimeAsync(5100)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect((queryClient.getQueryData(['media-job', 'job_1']) as { status: string }).status).toBe(
			'SUCCEEDED',
		)

		act(() => {
			root.unmount()
		})
		container.remove()
	})
})
