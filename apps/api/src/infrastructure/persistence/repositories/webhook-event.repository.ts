import { and, desc, eq } from 'drizzle-orm'
import type { WebhookEventRecord, WebhookEventStore } from '@/application/payment/handle-toss-webhook.usecase.js'
import { db } from '../db.js'
import { webhookEvents } from '../schema.js'

function mapToRecord(row: typeof webhookEvents.$inferSelect): WebhookEventRecord {
	return {
		id: row.id,
		provider: 'TOSS',
		externalId: row.externalId,
		resourceId: row.resourceId ?? '',
		eventType: row.eventType,
		version: row.version ?? '0',
		occurredAt: row.occurredAt ?? row.createdAt,
		payload: (row.payload ?? {}) as Record<string, unknown>,
		signature: row.signature ?? '',
		processed: row.processed,
		processedAt: row.processedAt ?? undefined,
		errorMessage: row.errorMessage ?? undefined,
	}
}

export class WebhookEventRepository implements WebhookEventStore {
	public async findByExternalId(externalId: string): Promise<WebhookEventRecord | null> {
		const row = await db.query.webhookEvents.findFirst({
			where: and(eq(webhookEvents.provider, 'toss'), eq(webhookEvents.externalId, externalId)),
		})

		return row ? mapToRecord(row) : null
	}

	public async findLatestByResourceId(resourceId: string): Promise<WebhookEventRecord | null> {
		const rows = await db
			.select()
			.from(webhookEvents)
			.where(and(eq(webhookEvents.provider, 'toss'), eq(webhookEvents.resourceId, resourceId)))
			.orderBy(desc(webhookEvents.occurredAt), desc(webhookEvents.createdAt))
			.limit(1)

		const row = rows[0]
		return row ? mapToRecord(row) : null
	}

	public async insert(record: Omit<WebhookEventRecord, 'id'>): Promise<string> {
		const inserted = await db
			.insert(webhookEvents)
			.values({
				provider: 'toss',
				externalId: record.externalId,
				resourceId: record.resourceId,
				eventType: record.eventType,
				payload: record.payload,
				signature: record.signature,
				processed: record.processed,
				processedAt: record.processedAt,
				occurredAt: record.occurredAt,
				version: record.version,
				errorMessage: record.errorMessage,
			})
			.returning({ id: webhookEvents.id })

		const row = inserted[0]
		if (!row) {
			throw new Error('Failed to insert webhook event')
		}

		return row.id
	}

	public async markProcessed(id: string, processedAt: Date): Promise<void> {
		await db
			.update(webhookEvents)
			.set({
				processed: true,
				processedAt,
				errorMessage: null,
			})
			.where(eq(webhookEvents.id, id))
	}
}
