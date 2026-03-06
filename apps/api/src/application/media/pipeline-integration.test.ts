import fs from 'node:fs'
import path from 'node:path'
import { PlanTier } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import type {
	ComposerPort,
	I2VGenerateOutput,
	PromptBuilderPort,
	RemoveBgPort,
} from '@/domain/media/ports.js'
import { PromptBuilder } from '@/infrastructure/media/prompt-builder.js'
import { GenerateVideoUseCase } from './generate-video.usecase.js'
import { QualityControlService } from './quality-control.js'

// ── 실제 이미지 파일 경로 ────────────────────────────────────────────────────
const TEST_IMAGE_PATH = '/Users/chans/workspace/pilot/zo3/public/fashion-001.png'

// ── Recording Stubs (호출 기록 + 입력값 검증) ────────────────────────────────

class RecordingRemoveBg implements RemoveBgPort {
	public calls: Array<{ imageUrl: string }> = []

	public async removeBackground(input: { imageUrl: string }) {
		this.calls.push({ imageUrl: input.imageUrl })
		return {
			imageUrl: `${input.imageUrl}?bg_removed=true`,
			transparentBackground: true,
		}
	}
}

class RecordingRouter {
	public calls: Array<{
		planTier: string
		isFirstVideo: boolean
		imageUrl: string
		durationSec: number
		promptType: 'string' | 'object'
	}> = []

	private clipIndex = 0

	public async generateClip(input: {
		readonly planTier: string
		readonly isFirstVideo: boolean
		readonly imageUrl: string
		readonly prompt: string | Record<string, string>
		readonly durationSec: number
	}): Promise<I2VGenerateOutput> {
		this.clipIndex++
		this.calls.push({
			planTier: input.planTier,
			isFirstVideo: input.isFirstVideo,
			imageUrl: input.imageUrl,
			durationSec: input.durationSec,
			promptType: typeof input.prompt === 'string' ? 'string' : 'object',
		})
		return {
			provider: 'GEMINI_VEO',
			clipUrl: `https://cdn.test/clip-${this.clipIndex}.mp4`,
			durationSec: input.durationSec,
			metadata: { index: this.clipIndex },
		}
	}
}

class RecordingComposer implements ComposerPort {
	public composeCalls: Array<{
		clipCount: number
		watermarkEnabled: boolean
		hasSubtitle: boolean
		hasNarration: boolean
		hasBgm: boolean
	}> = []

	public variantCalls: Array<{ platform: string }> = []

	public async compose(input: {
		foregroundImageUrl: string
		backgroundClipUrls: ReadonlyArray<string>
		subtitleFileUrl?: string
		narrationAudioUrl?: string
		bgmAudioUrl?: string
		watermarkEnabled: boolean
	}) {
		this.composeCalls.push({
			clipCount: input.backgroundClipUrls.length,
			watermarkEnabled: input.watermarkEnabled,
			hasSubtitle: !!input.subtitleFileUrl,
			hasNarration: !!input.narrationAudioUrl,
			hasBgm: !!input.bgmAudioUrl,
		})
		return {
			masterVideoUrl: 'https://cdn.test/master.mp4',
			durationSec: 30,
			width: 1080,
			height: 1920,
		}
	}

	public async renderVariant(input: { masterVideoUrl: string; platform: string }) {
		this.variantCalls.push({ platform: input.platform })
		return { variantUrl: `https://cdn.test/variant-${input.platform}.mp4` }
	}
}

// ── 상태 전이 추출 헬퍼 ──────────────────────────────────────────────────────

function extractTransitions(
	events: Array<{ previousStatus: string; newStatus: string }>,
): string[] {
	return events.map((e) => `${e.previousStatus}→${e.newStatus}`)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('영상 생성 파이프라인 통합 테스트', () => {
	// 실제 이미지 파일 존재 여부 확인
	const imageExists = fs.existsSync(TEST_IMAGE_PATH)

	describe('실제 이미지 파일 검증', () => {
		it.skipIf(!imageExists)('이미지 파일이 유효한 PNG임을 확인', () => {
			const buffer = fs.readFileSync(TEST_IMAGE_PATH)
			// PNG 매직 바이트: 89 50 4E 47
			expect(buffer[0]).toBe(0x89)
			expect(buffer[1]).toBe(0x50) // P
			expect(buffer[2]).toBe(0x4e) // N
			expect(buffer[3]).toBe(0x47) // G
			expect(buffer.length).toBeGreaterThan(100_000) // 패션 이미지는 최소 100KB
		})

		it.skipIf(!imageExists)('이미지를 base64로 인코딩할 수 있음', () => {
			const buffer = fs.readFileSync(TEST_IMAGE_PATH)
			const base64 = buffer.toString('base64')
			expect(base64.length).toBeGreaterThan(0)

			// round-trip 검증
			const decoded = Buffer.from(base64, 'base64')
			expect(decoded.equals(buffer)).toBe(true)
		})
	})

	describe('PromptBuilder — 실제 FASHION 입력', () => {
		it('FASHION 카테고리로 4-provider 프롬프트 생성', async () => {
			const builder = new PromptBuilder()
			const result = await builder.build({
				productCategory: 'FASHION',
				moods: ['TRENDY', 'WARM'],
				keywords: ['원피스', '봄신상', '데일리룩'],
				stylePreset: 'TRENDY',
				copy: {
					hook: '이번 봄, 당신의 스타일을 완성하세요',
					description: '부드러운 시폰 소재의 플로럴 원피스',
					cta: '지금 바로 만나보세요',
				},
			})

			// 모든 프로바이더별 프롬프트가 생성됨
			expect(result.runway).toContain('RUNWAY_GEN4_TURBO')
			expect(result.hailuo).toContain('HAILUO_02')
			expect(result.geminiVeo).toContain('GEMINI_VEO')
			expect(result.minimax).toContain('MINIMAX_VIDEO')

			// FASHION 카테고리 힌트 포함
			expect(result.runway).toContain('fabric texture')
			expect(result.geminiVeo).toContain('garment drape')

			// 사용자 입력이 프롬프트에 반영됨
			expect(result.runway).toContain('원피스')
			expect(result.runway).toContain('봄신상')
			expect(result.runway).toContain('TRENDY')
			expect(result.runway).toContain('이번 봄')

			// TRENDY 스타일 프리셋 적용
			expect(result.runway).toContain('snappy handheld')
			expect(result.runway).toContain('glitch pop')
		})

		it('빈 키워드 배열 → 기본값 fallback', async () => {
			const builder = new PromptBuilder()
			const result = await builder.build({
				productCategory: 'OTHER',
				moods: [],
				keywords: [],
				stylePreset: 'SIMPLE',
				copy: { hook: 'h', description: 'd', cta: 'c' },
			})

			expect(result.runway).toContain('product focused marketing')
			expect(result.runway).toContain('professional')
		})
	})

	describe('FREE 플랜 파이프라인 (2클립, 워터마크)', () => {
		it('QUEUED → ANALYZING → GENERATING → COMPOSING → RENDERING_VARIANTS → SUCCEEDED 순서 전이', async () => {
			const removeBg = new RecordingRemoveBg()
			const router = new RecordingRouter()
			const composer = new RecordingComposer()

			const useCase = new GenerateVideoUseCase(
				new PromptBuilder(),
				router,
				composer,
				removeBg,
				new QualityControlService(0.5),
			)

			const imageUrl = imageExists
				? `file://${TEST_IMAGE_PATH}`
				: 'https://cdn.test/fashion-001.png'

			const result = await useCase.execute({
				jobId: 'pipeline-test-free-001',
				userId: 'test-user-001',
				planTier: PlanTier.FREE,
				isFirstVideo: false,
				inputImageUrl: imageUrl,
				stylePreset: 'TRENDY',
				productCategory: 'FASHION',
				moods: ['TRENDY'],
				keywords: ['원피스'],
				copy: {
					hook: '스타일 완성',
					description: '시폰 원피스',
					cta: '지금 확인',
				},
				includeWatermark: true,
			})

			// 상태 전이 순서 검증
			const transitions = extractTransitions(result.events)
			expect(transitions).toEqual([
				'QUEUED→ANALYZING',
				'ANALYZING→GENERATING',
				'GENERATING→COMPOSING',
				'COMPOSING→RENDERING_VARIANTS',
				'RENDERING_VARIANTS→SUCCEEDED',
			])

			// FREE 플랜: 2 클립
			expect(router.calls).toHaveLength(2)
			expect(router.calls[0]?.planTier).toBe(PlanTier.FREE)

			// 프롬프트가 provider-specific 번들로 전달됨
			expect(router.calls[0]?.promptType).toBe('object')

			// 워터마크 활성화 확인
			expect(composer.composeCalls[0]?.watermarkEnabled).toBe(true)
			expect(composer.composeCalls[0]?.clipCount).toBe(2)

			// 배경 제거 호출됨
			expect(removeBg.calls).toHaveLength(1)
			expect(removeBg.calls[0]?.imageUrl).toBe(imageUrl)

			// 최종 결과
			expect(result.status).toBe('SUCCEEDED')
			expect(result.qualityScore).toBeGreaterThan(0)
			expect(result.job.result?.masterAsset.url).toBe('https://cdn.test/master.mp4')
		})
	})

	describe('STARTER 플랜 파이프라인 (3클립, 워터마크 없음)', () => {
		it('3개 클립 생성 + 워터마크 비활성', async () => {
			const router = new RecordingRouter()
			const composer = new RecordingComposer()

			const useCase = new GenerateVideoUseCase(
				new PromptBuilder(),
				router,
				composer,
				new RecordingRemoveBg(),
				new QualityControlService(0.5),
			)

			const result = await useCase.execute({
				jobId: 'pipeline-test-starter-001',
				userId: 'test-user-002',
				planTier: PlanTier.STARTER,
				isFirstVideo: true,
				inputImageUrl: 'https://cdn.test/fashion-001.png',
				stylePreset: 'PREMIUM',
				productCategory: 'FASHION',
				moods: ['LUXURY'],
				keywords: ['가방', '명품'],
				copy: {
					hook: '프리미엄 컬렉션',
					description: '이태리 수제 가죽',
					cta: '컬렉션 보기',
				},
				includeWatermark: false,
			})

			// STARTER: 3 클립
			expect(router.calls).toHaveLength(3)

			// 첫 클립만 isFirstVideo = true (best-foot-forward Runway 우선)
			expect(router.calls[0]?.isFirstVideo).toBe(true)
			expect(router.calls[1]?.isFirstVideo).toBe(false)
			expect(router.calls[2]?.isFirstVideo).toBe(false)

			// 워터마크 비활성
			expect(composer.composeCalls[0]?.watermarkEnabled).toBe(false)
			expect(composer.composeCalls[0]?.clipCount).toBe(3)

			// STARTER 플랜: 3개 variant (tiktok, youtube_shorts, instagram_reels)
			expect(composer.variantCalls.length).toBe(3)
			expect(result.status).toBe('SUCCEEDED')
		})
	})

	describe('품질 평가 + 재시도 판정', () => {
		it('유사도 < 0.7 → DEGRADED_FAILED + shouldRetry=true', async () => {
			// 유사도가 낮게 나오도록 설정 (randomSeed 고정 불가이므로 threshold 조정)
			const strictQc = new QualityControlService(0.99)

			const useCase = new GenerateVideoUseCase(
				new PromptBuilder(),
				new RecordingRouter(),
				new RecordingComposer(),
				new RecordingRemoveBg(),
				strictQc,
			)

			const result = await useCase.execute({
				jobId: 'pipeline-test-qc-fail',
				userId: 'test-user-003',
				planTier: PlanTier.FREE,
				isFirstVideo: false,
				inputImageUrl: 'https://cdn.test/product.png',
				stylePreset: 'SIMPLE',
				productCategory: 'OTHER',
				moods: ['PROFESSIONAL'],
				keywords: [],
				copy: { hook: 'h', description: 'd', cta: 'c' },
				includeWatermark: true,
				currentRetryCount: 0,
			})

			expect(result.status).toBe('DEGRADED_FAILED')
			expect(result.shouldRetry).toBe(true)
			expect(result.qualityScore).toBeLessThan(0.99)
		})

		it('retryCount >= 2 → shouldRetry=false (재시도 한도 초과)', async () => {
			const strictQc = new QualityControlService(0.99)

			const useCase = new GenerateVideoUseCase(
				new PromptBuilder(),
				new RecordingRouter(),
				new RecordingComposer(),
				new RecordingRemoveBg(),
				strictQc,
			)

			const result = await useCase.execute({
				jobId: 'pipeline-test-qc-max-retry',
				userId: 'test-user-004',
				planTier: PlanTier.FREE,
				isFirstVideo: false,
				inputImageUrl: 'https://cdn.test/product.png',
				stylePreset: 'SIMPLE',
				productCategory: 'OTHER',
				moods: [],
				keywords: [],
				copy: { hook: 'h', description: 'd', cta: 'c' },
				includeWatermark: true,
				currentRetryCount: 2,
			})

			expect(result.status).toBe('DEGRADED_FAILED')
			expect(result.shouldRetry).toBe(false)
		})
	})

	describe('이벤트 메타데이터 검증', () => {
		it('각 전이 이벤트에 jobId, userId, timestamp가 포함됨', async () => {
			const useCase = new GenerateVideoUseCase(
				new PromptBuilder(),
				new RecordingRouter(),
				new RecordingComposer(),
				new RecordingRemoveBg(),
				new QualityControlService(0.5),
			)

			const result = await useCase.execute({
				jobId: 'event-meta-test',
				userId: 'user-meta-001',
				planTier: PlanTier.FREE,
				isFirstVideo: false,
				inputImageUrl: 'https://cdn.test/img.png',
				stylePreset: 'SIMPLE',
				productCategory: 'OTHER',
				moods: [],
				keywords: [],
				copy: { hook: 'h', description: 'd', cta: 'c' },
				includeWatermark: true,
			})

			expect(result.events.length).toBeGreaterThanOrEqual(5)
			for (const event of result.events) {
				expect(event.jobId).toBe('event-meta-test')
				expect(event.userId).toBe('user-meta-001')
				expect(event.id).toBeTruthy()
			}
		})
	})

	describe('배경 제거 → I2V에 전처리된 URL 전달', () => {
		it('removeBg 결과가 I2V 라우터 imageUrl에 전달됨', async () => {
			const removeBg = new RecordingRemoveBg()
			const router = new RecordingRouter()

			const useCase = new GenerateVideoUseCase(
				new PromptBuilder(),
				router,
				new RecordingComposer(),
				removeBg,
				new QualityControlService(0.5),
			)

			await useCase.execute({
				jobId: 'bg-chain-test',
				userId: 'user-005',
				planTier: PlanTier.FREE,
				isFirstVideo: false,
				inputImageUrl: 'https://cdn.test/original.png',
				stylePreset: 'SIMPLE',
				productCategory: 'FASHION',
				moods: [],
				keywords: [],
				copy: { hook: 'h', description: 'd', cta: 'c' },
				includeWatermark: true,
			})

			// RemoveBg에 원본 URL 전달
			expect(removeBg.calls[0]?.imageUrl).toBe('https://cdn.test/original.png')

			// I2V 라우터에 배경 제거된 URL 전달
			expect(router.calls[0]?.imageUrl).toBe(
				'https://cdn.test/original.png?bg_removed=true',
			)
		})
	})
})
