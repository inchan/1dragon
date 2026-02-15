import crypto from 'node:crypto'

type IncomingTossWebhook = {
	eventId: string
	eventType: string
	resourceId: string
	version: string
	occurredAt: Date
	signature: string
	rawBody: string
	payload: Record<string, unknown>
}

type WebhookEventRecord = {
	id: string
	provider: 'TOSS'
	externalId: string
	resourceId: string
	eventType: string
	version: string
	occurredAt: Date
	payload: Record<string, unknown>
	signature: string
	processed: boolean
	processedAt: Date | undefined
	errorMessage: string | undefined
}

type WebhookResult = {
	status: 'processed' | 'duplicate' | 'stale'
	eventId: string
}

export interface WebhookEventStore {
	findByExternalId(externalId: string): Promise<WebhookEventRecord | null>
	findLatestByResourceId(resourceId: string): Promise<WebhookEventRecord | null>
	insert(record: Omit<WebhookEventRecord, 'id'>): Promise<string>
	markProcessed(id: string, processedAt: Date): Promise<void>
}

export class InvalidWebhookSignatureError extends Error {
	public constructor() {
		super('Invalid webhook signature')
		this.name = 'InvalidWebhookSignatureError'
	}
}

export class HandleTossWebhookUseCase {
	private readonly store: WebhookEventStore
	private readonly webhookSecret: string

	public constructor(store: WebhookEventStore, webhookSecret: string) {
		this.store = store
		this.webhookSecret = webhookSecret
	}

	public async execute(input: IncomingTossWebhook): Promise<WebhookResult> {
		if (!this.isValidSignature(input.rawBody, input.signature)) {
			throw new InvalidWebhookSignatureError()
		}

		const duplicate = await this.store.findByExternalId(input.eventId)
		if (duplicate) {
			return {
				status: 'duplicate',
				eventId: input.eventId,
			}
		}

		const latest = await this.store.findLatestByResourceId(input.resourceId)
		if (latest && this.isStaleEvent(latest, input)) {
			return {
				status: 'stale',
				eventId: input.eventId,
			}
		}

		const recordId = await this.store.insert({
			provider: 'TOSS',
			externalId: input.eventId,
			resourceId: input.resourceId,
			eventType: input.eventType,
			version: input.version,
			occurredAt: input.occurredAt,
			payload: input.payload,
			signature: input.signature,
			processed: false,
			processedAt: undefined,
			errorMessage: undefined,
		})

		await this.store.markProcessed(recordId, new Date())

		return {
			status: 'processed',
			eventId: input.eventId,
		}
	}

	private isValidSignature(rawBody: string, signature: string): boolean {
		const digest = crypto
			.createHmac('sha256', this.webhookSecret)
			.update(rawBody)
			.digest('base64')

		const expected = Buffer.from(digest)
		const actual = Buffer.from(signature)

		if (expected.length !== actual.length) {
			return false
		}

		return crypto.timingSafeEqual(expected, actual)
	}

	private isStaleEvent(latest: WebhookEventRecord, incoming: IncomingTossWebhook): boolean {
		const latestVersion = Number.parseInt(latest.version, 10)
		const incomingVersion = Number.parseInt(incoming.version, 10)

		if (!Number.isNaN(latestVersion) && !Number.isNaN(incomingVersion)) {
			return incomingVersion < latestVersion
		}

		return incoming.occurredAt.getTime() <= latest.occurredAt.getTime()
	}
}

export type { IncomingTossWebhook, WebhookEventRecord, WebhookResult }
