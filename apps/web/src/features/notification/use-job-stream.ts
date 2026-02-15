import { useEffect, useRef } from 'react'
import { QueryClient, useQueryClient } from '@tanstack/react-query'

type JobStreamPayload = {
	jobId: string
	newStatus: string
	progress: number
	errorMessage?: string | null
	retryCount?: number
	canRetry?: boolean
	timestamp: string
	metadata?: Record<string, unknown>
}

type JobStreamMessage = {
	type: 'JOB_STATUS_CHANGED' | 'message'
	payload: JobStreamPayload
}

type MediaJob = {
	status?: string
	progress?: number
	errorMessage?: string | null
	retryCount?: number
	canRetry?: boolean
}

type UseJobStreamOptions = {
	jobId: string
	enabled?: boolean
	onUpdate?: (message: JobStreamMessage) => void
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))
const toRecord = (value: unknown): Record<string, unknown> | null =>
	(value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null)

const parseJobStreamMessage = (rawData: string): JobStreamMessage | null => {
	try {
		const parsed = JSON.parse(rawData) as { type?: unknown; payload?: unknown; eventType?: unknown } | null
		if (!parsed || typeof parsed !== 'object') {
			return null
		}

		const payloadCandidate = toRecord(parsed.payload)
		if (!payloadCandidate) {
			return null
		}

		if (
			parsed.type !== 'JOB_STATUS_CHANGED' &&
			parsed.eventType !== 'JOB_STATUS_CHANGED' &&
			parsed.type !== 'message'
		) {
			return null
		}

		const rawStatus = payloadCandidate.newStatus
		const rawProgress = payloadCandidate.progress
		if (typeof payloadCandidate.jobId !== 'string' || typeof rawStatus !== 'string') {
			return null
		}

		const progressValue = typeof rawProgress === 'number' ? rawProgress : Number(rawProgress)

		const retryCount =
			typeof payloadCandidate.retryCount === 'number'
				? Math.max(0, Math.round(payloadCandidate.retryCount))
				: Number.isFinite(Number(payloadCandidate.retryCount))
					? Math.max(0, Math.round(Number(payloadCandidate.retryCount)))
					: 0

		const canRetry =
			typeof payloadCandidate.canRetry === 'boolean'
				? payloadCandidate.canRetry
				: payloadCandidate.canRetry === 'true'

		const errorMessage: string | null =
			payloadCandidate.errorMessage === null
				? null
				: typeof payloadCandidate.errorMessage === 'string'
					? payloadCandidate.errorMessage
					: null

		return {
			type: 'JOB_STATUS_CHANGED',
			payload: {
				jobId: payloadCandidate.jobId as string,
				newStatus: rawStatus,
				progress: Number.isFinite(progressValue) ? clampPercent(progressValue) : 0,
				errorMessage,
				retryCount,
				canRetry,
				timestamp:
					typeof payloadCandidate.timestamp === 'string'
						? payloadCandidate.timestamp
						: new Date().toISOString(),
				metadata: toRecord(payloadCandidate.metadata) ?? {},
			},
		}
	} catch {
		return null
	}
}

function applyJobMessageToQueryCache(
	queryClient: QueryClient,
	jobId: string,
	message: Pick<JobStreamPayload, 'newStatus' | 'progress' | 'errorMessage' | 'retryCount' | 'canRetry'>,
): void {
	queryClient.setQueryData(['media-job', jobId], (previous: unknown) => {
		if (!previous || typeof previous !== 'object') {
			return {
				job: {
					jobId,
					status: message.newStatus,
					progress: message.progress,
					errorMessage: message.errorMessage ?? null,
					retryCount: message.retryCount ?? 0,
					canRetry: message.canRetry ?? false,
					updatedAt: new Date().toISOString(),
				},
			}
		}

		const previousRecord = previous as Record<string, unknown>
		if (!('job' in previousRecord) || typeof previousRecord.job !== 'object' || previousRecord.job === null) {
			return {
				...previousRecord,
				status: message.newStatus,
				progress: message.progress,
				errorMessage: message.errorMessage ?? null,
				retryCount: message.retryCount ?? 0,
				canRetry: message.canRetry ?? false,
				updatedAt: new Date().toISOString(),
			}
		}

		const previousJob = previousRecord.job as Record<string, unknown>
		return {
			...previousRecord,
			job: {
				...previousJob,
				status: message.newStatus,
				progress: message.progress,
				errorMessage: message.errorMessage ?? null,
				retryCount: message.retryCount ?? previousJob.retryCount,
				canRetry: message.canRetry ?? previousJob.canRetry ?? false,
				updatedAt: new Date().toISOString(),
			},
		}
	})
}

export function useJobStream({ jobId, enabled = true, onUpdate }: UseJobStreamOptions): void {
	const queryClient = useQueryClient()
	const pollTimerRef = useRef<number | null>(null)

	useEffect(() => {
		if (!enabled || !jobId) {
			return
		}

		const handleMessage = (message: JobStreamMessage): void => {
			if (message.payload.jobId !== jobId) {
				return
			}

			applyJobMessageToQueryCache(queryClient, jobId, {
				newStatus: message.payload.newStatus,
				progress: message.payload.progress,
				errorMessage: message.payload.errorMessage ?? null,
				retryCount: message.payload.retryCount ?? 0,
				canRetry: message.payload.canRetry ?? false,
			})
			onUpdate?.(message)
		}

		const applyPollSnapshot = (job: MediaJob): void => {
			if (!job || typeof job.status !== 'string') {
				return
			}

			const progress = Number.isFinite(Number(job.progress))
				? clampPercent(Number(job.progress))
				: 0

			applyJobMessageToQueryCache(queryClient, jobId, {
				newStatus: job.status,
				progress,
				errorMessage: job.errorMessage ?? null,
				retryCount:
					typeof job.retryCount === 'number'
						? Math.max(0, Math.round(job.retryCount))
						: 0,
				canRetry: job.canRetry ?? false,
			})

			onUpdate?.({
				type: 'JOB_STATUS_CHANGED',
				payload: {
					jobId,
					newStatus: job.status,
					progress,
					errorMessage: job.errorMessage ?? null,
					retryCount:
						typeof job.retryCount === 'number'
							? Math.max(0, Math.round(job.retryCount))
							: 0,
					canRetry: job.canRetry ?? false,
					timestamp: new Date().toISOString(),
				},
			})
		}

		const startPollingFallback = (): void => {
			if (pollTimerRef.current !== null) {
				return
			}

			pollTimerRef.current = window.setInterval(async () => {
				try {
					const response = await fetch(`${BASE_URL}/api/v1/media/jobs/${jobId}`, { credentials: 'include' })
					const json = (await response.json()) as {
						success?: boolean
						data?: { job?: MediaJob }
					}

					if (json.success && json.data?.job) {
						applyPollSnapshot(json.data.job)
					}
				} catch {
					// Keep polling as fallback
				}
			}, 5000)
		}

		const eventSource = new EventSource(`${BASE_URL}/api/v1/media/jobs/${jobId}/stream`, {
			withCredentials: true,
		})

		eventSource.onmessage = (event) => {
			const message = parseJobStreamMessage(event.data)
			if (!message) {
				return
			}
			handleMessage(message)
		}

		eventSource.onerror = () => {
			eventSource.close()
			startPollingFallback()
		}

		return () => {
			eventSource.close()
			if (pollTimerRef.current !== null) {
				window.clearInterval(pollTimerRef.current)
				pollTimerRef.current = null
			}
		}
	}, [enabled, jobId, onUpdate, queryClient])
}
