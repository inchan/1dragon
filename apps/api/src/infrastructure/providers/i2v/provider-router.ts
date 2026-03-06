import { PlanTier, type PlanTier as PlanTierType } from '@1dragon/shared'
import { MediaReliabilityPolicyService } from '@/domain/media/services.js'
import type { I2VGenerateInput, I2VGenerateOutput, I2VPort } from '@/domain/media/ports.js'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import { I2VProviderError, type I2VProviderName } from './base-provider.js'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

type ProviderChainInput = {
	readonly planTier: PlanTierType
	readonly isFirstVideo: boolean
}

type RouterGenerateInput = Omit<I2VGenerateInput, 'provider' | 'prompt'> & {
	readonly prompt: string | Record<I2VProviderName, string>
	readonly planTier: PlanTierType
	readonly isFirstVideo: boolean
	readonly jobId?: string
	readonly userId?: string
}

type CircuitSnapshot = {
	state: CircuitState
	consecutiveFailures: number
	openedAt: number | null
	halfOpenAttempts: number
	halfOpenSuccesses: number
}

const PAID_CHAIN: readonly I2VProviderName[] = ['RUNWAY', 'GEMINI_VEO', 'MINIMAX', 'HAILUO']
const FREE_CHAIN: readonly I2VProviderName[] = ['HAILUO', 'MINIMAX', 'GEMINI_VEO']
const reliabilityPolicy = new MediaReliabilityPolicyService()
const circuitPolicy = reliabilityPolicy.getCircuitBreakerPolicy()

export class AllI2VProvidersFailedError extends Error {
	public readonly attemptedProviders: I2VProviderName[]

	public constructor(attemptedProviders: I2VProviderName[]) {
		super('현재 서버가 바쁩니다. 잠시 후 다시 시도해주세요')
		this.name = 'AllI2VProvidersFailedError'
		this.attemptedProviders = attemptedProviders
	}
}

export class ProviderRouter {
	private readonly circuitBreaker: Record<I2VProviderName, CircuitSnapshot>
	private providerFailoverCount = 0
	private readonly logger = createChildLogger({ provider: 'I2V_ROUTER' })

	public constructor(
		private readonly providers: Record<I2VProviderName, I2VPort>,
		private readonly options: {
			failureThreshold?: number
			openDurationMs?: number
			halfOpenMaxCalls?: number
			halfOpenSuccessThreshold?: number
		} = {},
	) {
		this.circuitBreaker = {
			RUNWAY: { state: 'CLOSED', consecutiveFailures: 0, openedAt: null, halfOpenAttempts: 0, halfOpenSuccesses: 0 },
			HAILUO: { state: 'CLOSED', consecutiveFailures: 0, openedAt: null, halfOpenAttempts: 0, halfOpenSuccesses: 0 },
			GEMINI_VEO: { state: 'CLOSED', consecutiveFailures: 0, openedAt: null, halfOpenAttempts: 0, halfOpenSuccesses: 0 },
			MINIMAX: { state: 'CLOSED', consecutiveFailures: 0, openedAt: null, halfOpenAttempts: 0, halfOpenSuccesses: 0 },
		}
	}

	public async generateClip(input: RouterGenerateInput): Promise<I2VGenerateOutput> {
		const chain = this.resolveChain(input)
		const attempted: I2VProviderName[] = []

		for (const providerName of chain) {
			if (!this.canAttempt(providerName)) {
				this.logger.warn({ provider: providerName, state: this.circuitBreaker[providerName].state }, 'provider skipped by circuit breaker')
				continue
			}

			attempted.push(providerName)
			const provider = this.providers[providerName]
			if (!provider) {
				continue
			}

			try {
				const prompt =
					typeof input.prompt === 'string'
						? input.prompt
						: input.prompt[providerName] ?? input.prompt.RUNWAY

				const output = await provider.generate({
					provider: providerName,
					imageUrl: input.imageUrl,
					prompt,
					durationSec: input.durationSec,
					aspectRatio: input.aspectRatio,
					fps: input.fps,
					...(input.seed !== undefined ? { seed: input.seed } : {}),
				})
				this.onProviderSuccess(providerName)

				return {
					...output,
					metadata: {
						...(typeof output.metadata === 'object' && output.metadata !== null ? output.metadata : {}),
						attemptedProviders: [...attempted],
						failoverCount: this.providerFailoverCount,
						circuitBreakerState: this.getCircuitStates(),
					},
				}
			} catch (error) {
				this.onProviderFailure(providerName)
				if (attempted.length < chain.length) {
					this.providerFailoverCount += 1
				}

				const normalized =
					error instanceof I2VProviderError
						? error
						: new I2VProviderError({
								provider: providerName,
								message: error instanceof Error ? error.message : `${providerName} failed`,
							})

				this.logger.warn(
					{
						provider: providerName,
						error: normalized.message,
						retryable: normalized.retryable,
						statusCode: normalized.statusCode,
					},
					'provider generation failed',
				)
			}
		}

		throw new AllI2VProvidersFailedError(attempted)
	}

	public getCircuitStates(): Record<I2VProviderName, CircuitState> {
		return {
			RUNWAY: this.circuitBreaker.RUNWAY.state,
			HAILUO: this.circuitBreaker.HAILUO.state,
			GEMINI_VEO: this.circuitBreaker.GEMINI_VEO.state,
			MINIMAX: this.circuitBreaker.MINIMAX.state,
		}
	}

	public getFailoverCount(): number {
		return this.providerFailoverCount
	}

	private resolveChain(input: ProviderChainInput): I2VProviderName[] {
		if (input.isFirstVideo) {
			const seen = new Set<I2VProviderName>()
			const merged = ['RUNWAY', ...(input.planTier === PlanTier.STARTER ? PAID_CHAIN : FREE_CHAIN)]
			return merged.filter((name): name is I2VProviderName => {
				if (seen.has(name as I2VProviderName)) {
					return false
				}
				seen.add(name as I2VProviderName)
				return true
			})
		}

		if (input.planTier === PlanTier.STARTER) {
			return [...PAID_CHAIN]
		}

		return [...FREE_CHAIN]
	}

	private get failureThreshold(): number {
		return this.options.failureThreshold ?? circuitPolicy.failureThreshold
	}

	private get openDurationMs(): number {
		return this.options.openDurationMs ?? circuitPolicy.openDurationMs
	}

	private get halfOpenMaxCalls(): number {
		return this.options.halfOpenMaxCalls ?? circuitPolicy.halfOpenMaxCalls
	}

	private get halfOpenSuccessThreshold(): number {
		return this.options.halfOpenSuccessThreshold ?? circuitPolicy.successThresholdToClose
	}

	private canAttempt(provider: I2VProviderName): boolean {
		const circuit = this.circuitBreaker[provider]
		if (circuit.state !== 'OPEN') {
			return true
		}

		if (!circuit.openedAt) {
			return false
		}

		const elapsed = Date.now() - circuit.openedAt
		if (elapsed >= this.openDurationMs) {
			circuit.state = 'HALF_OPEN'
			circuit.halfOpenAttempts = 0
			circuit.halfOpenSuccesses = 0
			return true
		}

		return false
	}

	private onProviderSuccess(provider: I2VProviderName): void {
		const circuit = this.circuitBreaker[provider]
		if (circuit.state === 'HALF_OPEN') {
			const nextAttempts = circuit.halfOpenAttempts + 1
			const nextSuccesses = circuit.halfOpenSuccesses + 1

			if (nextSuccesses >= this.halfOpenSuccessThreshold) {
				this.circuitBreaker[provider] = {
					state: 'CLOSED',
					consecutiveFailures: 0,
					openedAt: null,
					halfOpenAttempts: 0,
					halfOpenSuccesses: 0,
				}
				return
			}

			if (nextAttempts >= this.halfOpenMaxCalls) {
				this.circuitBreaker[provider] = {
					state: 'OPEN',
					consecutiveFailures: this.failureThreshold,
					openedAt: Date.now(),
					halfOpenAttempts: 0,
					halfOpenSuccesses: 0,
				}
				return
			}

			this.circuitBreaker[provider] = {
				...circuit,
				state: 'HALF_OPEN',
				consecutiveFailures: 0,
				openedAt: null,
				halfOpenAttempts: nextAttempts,
				halfOpenSuccesses: nextSuccesses,
			}
			return
		}

		this.circuitBreaker[provider] = {
			state: 'CLOSED',
			consecutiveFailures: 0,
			openedAt: null,
			halfOpenAttempts: 0,
			halfOpenSuccesses: 0,
		}
	}

	private onProviderFailure(provider: I2VProviderName): void {
		const circuit = this.circuitBreaker[provider]

		if (circuit.state === 'HALF_OPEN') {
			this.circuitBreaker[provider] = {
				state: 'OPEN',
				consecutiveFailures: this.failureThreshold,
				openedAt: Date.now(),
				halfOpenAttempts: 0,
				halfOpenSuccesses: 0,
			}
			return
		}

		const nextFailures = circuit.consecutiveFailures + 1
		if (nextFailures >= this.failureThreshold) {
			this.circuitBreaker[provider] = {
				state: 'OPEN',
				consecutiveFailures: nextFailures,
				openedAt: Date.now(),
				halfOpenAttempts: 0,
				halfOpenSuccesses: 0,
			}
			return
		}

		this.circuitBreaker[provider] = {
			...circuit,
			state: 'CLOSED',
			consecutiveFailures: nextFailures,
			openedAt: null,
			halfOpenAttempts: 0,
			halfOpenSuccesses: 0,
		}
	}
}
