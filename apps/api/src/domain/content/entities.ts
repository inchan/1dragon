import type {
	HookPattern,
	Platform,
	ProductCategory,
	SlideRole,
} from '@1dragon/shared'

const MAX_HASHTAGS = 5
const MIN_SLIDES = 3
const IMAGE_COST_PER_SLIDE_USD = 0.08

type SlideshowStatus = 'DRAFT' | 'GENERATING' | 'READY' | 'PUBLISHED' | 'FAILED'

const ALLOWED_SLIDESHOW_TRANSITIONS: Record<SlideshowStatus, readonly SlideshowStatus[]> = {
	DRAFT: ['GENERATING'],
	GENERATING: ['READY', 'FAILED'],
	READY: ['PUBLISHED'],
	PUBLISHED: [],
	FAILED: ['DRAFT'],
}

type HookFormulaInput = {
	readonly id: string
	readonly pattern: HookPattern
	readonly template: string
	readonly category: ProductCategory
	readonly exampleHook?: string
	readonly successCount?: number
	readonly totalUses?: number
}

export class HookFormula {
	public readonly id: string
	public readonly pattern: HookPattern
	public readonly template: string
	public readonly category: ProductCategory
	public readonly exampleHook: string | null
	public readonly successCount: number
	public readonly totalUses: number

	public constructor(input: HookFormulaInput) {
		this.id = input.id
		this.pattern = input.pattern
		this.template = input.template
		this.category = input.category
		this.exampleHook = input.exampleHook ?? null
		this.successCount = Math.max(0, input.successCount ?? 0)
		this.totalUses = Math.max(0, input.totalUses ?? 0)
	}

	public get successRate(): number {
		if (this.totalUses === 0) return 0
		return this.successCount / this.totalUses
	}

	public recordOutcome(success: boolean): HookFormula {
		return new HookFormula({
			id: this.id,
			pattern: this.pattern,
			template: this.template,
			category: this.category,
			...(this.exampleHook ? { exampleHook: this.exampleHook } : {}),
			successCount: this.successCount + (success ? 1 : 0),
			totalUses: this.totalUses + 1,
		})
	}
}

type SlideInput = {
	readonly index: number
	readonly role: SlideRole
	readonly imagePrompt: string
	readonly overlayText?: string | null
	readonly imageUrl?: string | null
}

export class Slide {
	public readonly index: number
	public readonly role: SlideRole
	public readonly imagePrompt: string
	public readonly overlayText: string | null
	public readonly imageUrl: string | null

	public constructor(input: SlideInput) {
		this.index = Math.max(0, Math.round(input.index))
		this.role = input.role
		this.imagePrompt = input.imagePrompt
		this.overlayText = input.overlayText ?? null
		this.imageUrl = input.imageUrl ?? null
	}
}

type SlideshowInput = {
	readonly id: string
	readonly userId: string
	readonly productAnalysisId: string
	readonly hookFormulaId: string
	readonly platform: Platform
	readonly slides: ReadonlyArray<Slide>
	readonly caption: string
	readonly hashtags: ReadonlyArray<string>
	readonly status?: SlideshowStatus
}

export class Slideshow {
	public readonly id: string
	public readonly userId: string
	public readonly productAnalysisId: string
	public readonly hookFormulaId: string
	public readonly platform: Platform
	public readonly slides: ReadonlyArray<Slide>
	public readonly caption: string
	public readonly hashtags: ReadonlyArray<string>
	private _status: SlideshowStatus

	public get status(): SlideshowStatus {
		return this._status
	}

	public constructor(input: SlideshowInput) {
		if (input.slides.length < MIN_SLIDES) {
			throw new Error(`Slideshow must have at least ${MIN_SLIDES} slides`)
		}

		const firstSlide = input.slides[0]
		if (firstSlide && firstSlide.role !== 'HOOK') {
			throw new Error('First slide must have HOOK role')
		}

		const lastSlide = input.slides[input.slides.length - 1]
		if (lastSlide && lastSlide.role !== 'CTA') {
			throw new Error('Last slide must have CTA role')
		}

		this.id = input.id
		this.userId = input.userId
		this.productAnalysisId = input.productAnalysisId
		this.hookFormulaId = input.hookFormulaId
		this.platform = input.platform
		this.slides = input.slides
		this.caption = input.caption
		this.hashtags = input.hashtags.slice(0, MAX_HASHTAGS)
		this._status = input.status ?? 'DRAFT'
	}

	public get estimatedCostUsd(): number {
		return this.slides.length * IMAGE_COST_PER_SLIDE_USD
	}

	public markGenerating(): void {
		this.assertTransition('GENERATING')
		this._status = 'GENERATING'
	}

	public markReady(): void {
		this.assertTransition('READY')
		this._status = 'READY'
	}

	public markPublished(): void {
		this.assertTransition('PUBLISHED')
		this._status = 'PUBLISHED'
	}

	public markFailed(): void {
		this.assertTransition('FAILED')
		this._status = 'FAILED'
	}

	private assertTransition(next: SlideshowStatus): void {
		const allowed = ALLOWED_SLIDESHOW_TRANSITIONS[this._status]
		if (!allowed.includes(next)) {
			throw new Error(`Cannot transition from ${this._status} to ${next}`)
		}
	}
}
