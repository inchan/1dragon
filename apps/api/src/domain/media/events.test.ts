import { describe, expect, it } from 'vitest'
import {
	InvalidJobStatusTransitionError,
	VideoJobStateMachine,
	createJobStatusChangedEvent,
} from './events.js'

describe('media/events', () => {
	it('allows valid transitions and creates event', () => {
		const event = createJobStatusChangedEvent({
			id: 'evt_1',
			jobId: 'job_1',
			userId: 'user_1',
			previousStatus: 'QUEUED',
			newStatus: 'ANALYZING',
		})

		expect(event.previousStatus).toBe('QUEUED')
		expect(event.newStatus).toBe('ANALYZING')
		expect(VideoJobStateMachine.canTransition('ANALYZING', 'GENERATING')).toBe(true)
	})

	it('rejects invalid transitions', () => {
		expect(() => {
			createJobStatusChangedEvent({
				id: 'evt_2',
				jobId: 'job_1',
				userId: 'user_1',
				previousStatus: 'QUEUED',
				newStatus: 'COMPOSING',
			})
		}).toThrow(InvalidJobStatusTransitionError)
	})
})
