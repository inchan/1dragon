import { randomUUID } from 'node:crypto'
import type { NotificationEvent } from '@/domain/notification/entities.js'

type SseClient = {
	id: string
	userId: string
	connectedAt: number
	send: (event: string) => void
	close: () => void
}

type BufferedEvent = {
	eventId: string
	userId: string
	eventType: string
	data: NotificationEvent
	timestamp: number
}

const MAX_CONNECTION_AGE_MS = 60 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 30 * 1000
const MAX_BUFFER_SIZE = 1000

export class SseBroker {
	private readonly clients = new Map<string, SseClient>()
	private readonly eventBuffer: BufferedEvent[] = []

	public connect(userId: string, send: (event: string) => void, close: () => void): string {
		const id = randomUUID()
		this.clients.set(id, {
			id,
			userId,
			send,
			close,
			connectedAt: Date.now(),
		})
		return id
	}

	public disconnect(clientId: string): void {
		const client = this.clients.get(clientId)
		if (!client) {
			return
		}
		this.clients.delete(clientId)
		client.close()
	}

	public publish(userId: string, eventType: string, data: NotificationEvent): string {
		const eventId = randomUUID()
		const payload = this.serialize(eventId, eventType, data)

		for (const client of this.clients.values()) {
			if (client.userId !== userId) {
				continue
			}
			try {
				client.send(payload)
			} catch {
				this.disconnect(client.id)
			}
		}

		this.eventBuffer.push({
			eventId,
			userId,
			eventType,
			data,
			timestamp: Date.now(),
		})
		if (this.eventBuffer.length > MAX_BUFFER_SIZE) {
			this.eventBuffer.splice(0, this.eventBuffer.length - MAX_BUFFER_SIZE)
		}

		return eventId
	}

	public replay(userId: string, lastEventId: string | null): string[] {
		const events = this.eventBuffer.filter((item) => item.userId === userId)
		if (!lastEventId) {
			return events.map((item) => this.serialize(item.eventId, item.eventType, item.data))
		}

		const index = events.findIndex((item) => item.eventId === lastEventId)
		const toReplay = index >= 0 ? events.slice(index + 1) : events
		return toReplay.map((item) => this.serialize(item.eventId, item.eventType, item.data))
	}

	public createHeartbeatEvent(): string {
		return ': heartbeat\n\n'
	}

	public sweepExpiredConnections(now = Date.now()): void {
		for (const client of this.clients.values()) {
			if (now - client.connectedAt > MAX_CONNECTION_AGE_MS) {
				this.disconnect(client.id)
			}
		}
	}

	public getHeartbeatIntervalMs(): number {
		return HEARTBEAT_INTERVAL_MS
	}

	private serialize(eventId: string, eventType: string, data: NotificationEvent): string {
		return `id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
	}
}

export const sseBroker = new SseBroker()
