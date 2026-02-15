import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
	HandleTossWebhookUseCase,
	InvalidWebhookSignatureError,
	type WebhookEventRecord,
	type WebhookEventStore,
} from './handle-toss-webhook.usecase.js'

class InMemoryWebhookEventStore implements WebhookEventStore {
	public readonly items: WebhookEventRecord[] = []

	public async findByExternalId(externalId: string): Promise<WebhookEventRecord | null> {
		return this.items.find((item) => item.externalId === externalId) ?? null
	}

	public async findLatestByResourceId(resourceId: string): Promise<WebhookEventRecord | null> {
		const filtered = this.items.filter((item) => item.resourceId === resourceId)
		if (filtered.length === 0) {
			return null
		}
		return filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0] ?? null
	}

	public async insert(record: Omit<WebhookEventRecord, 'id'>): Promise<string> {
		const id = `evt_${this.items.length + 1}`
		this.items.push({ id, ...record })
		return id
	}

	public async markProcessed(id: string, processedAt: Date): Promise<void> {
		const item = this.items.find((row) => row.id === id)
		if (!item) {
			return
		}
		item.processed = true
		item.processedAt = processedAt
	}
}

function sign(payload: string, secret: string): string {
	return crypto.createHmac('sha256', secret).update(payload).digest('base64')
}

describe('HandleTossWebhookUseCase', () => {
	it('processes valid webhook once', async () => {
		const store = new InMemoryWebhookEventStore()
		const secret = 'webhook-secret'
		const useCase = new HandleTossWebhookUseCase(store, secret)
		const rawBody = JSON.stringify({ eventId: 'event_1' })

		const result = await useCase.execute({
			eventId: 'event_1',
			eventType: 'payment.confirmed',
			resourceId: 'payment_1',
			version: '3',
			occurredAt: new Date('2026-02-12T00:00:00.000Z'),
			signature: sign(rawBody, secret),
			rawBody,
			payload: { eventId: 'event_1' },
		})

		expect(result.status).toBe('processed')
		expect(store.items).toHaveLength(1)
		expect(store.items[0]?.processed).toBe(true)
	})

	it('returns duplicate for already processed event id', async () => {
		const store = new InMemoryWebhookEventStore()
		const secret = 'webhook-secret'
		const useCase = new HandleTossWebhookUseCase(store, secret)
		const rawBody = JSON.stringify({ eventId: 'event_1' })

		await useCase.execute({
			eventId: 'event_1',
			eventType: 'payment.confirmed',
			resourceId: 'payment_1',
			version: '1',
			occurredAt: new Date('2026-02-12T00:00:00.000Z'),
			signature: sign(rawBody, secret),
			rawBody,
			payload: { eventId: 'event_1' },
		})

		const result = await useCase.execute({
			eventId: 'event_1',
			eventType: 'payment.confirmed',
			resourceId: 'payment_1',
			version: '1',
			occurredAt: new Date('2026-02-12T00:00:01.000Z'),
			signature: sign(rawBody, secret),
			rawBody,
			payload: { eventId: 'event_1' },
		})

		expect(result.status).toBe('duplicate')
		expect(store.items).toHaveLength(1)
	})

	it('returns stale when lower version arrives later', async () => {
		const store = new InMemoryWebhookEventStore()
		const secret = 'webhook-secret'
		const useCase = new HandleTossWebhookUseCase(store, secret)
		const rawBody = JSON.stringify({ eventId: 'event_2' })

		await useCase.execute({
			eventId: 'event_2',
			eventType: 'payment.confirmed',
			resourceId: 'payment_2',
			version: '4',
			occurredAt: new Date('2026-02-12T00:00:00.000Z'),
			signature: sign(rawBody, secret),
			rawBody,
			payload: { eventId: 'event_2' },
		})

		const result = await useCase.execute({
			eventId: 'event_3',
			eventType: 'payment.failed',
			resourceId: 'payment_2',
			version: '3',
			occurredAt: new Date('2026-02-12T00:00:02.000Z'),
			signature: sign(rawBody, secret),
			rawBody,
			payload: { eventId: 'event_3' },
		})

		expect(result.status).toBe('stale')
		expect(store.items).toHaveLength(1)
	})

	it('throws on invalid signature', async () => {
		const store = new InMemoryWebhookEventStore()
		const secret = 'webhook-secret'
		const useCase = new HandleTossWebhookUseCase(store, secret)
		const rawBody = JSON.stringify({ eventId: 'event_1' })

		await expect(
			useCase.execute({
				eventId: 'event_1',
				eventType: 'payment.confirmed',
				resourceId: 'payment_1',
				version: '1',
				occurredAt: new Date('2026-02-12T00:00:00.000Z'),
				signature: 'invalid-signature',
				rawBody,
				payload: { eventId: 'event_1' },
			}),
		).rejects.toThrow(InvalidWebhookSignatureError)
	})
})
