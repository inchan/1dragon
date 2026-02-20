import { ProductCategory } from '@snapvid/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiModelCompositeAdapter } from './gemini-model-composite.adapter.js'

vi.mock('@/infrastructure/logging/index.js', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}))

vi.mock('@/infrastructure/storage/s3-client.js', () => ({
	uploadImage: vi.fn().mockResolvedValue({
		key: 'model-composites/anon/123-composite.png',
		url: 'https://s3.example.com/model-composites/anon/123-composite.png',
	}),
	s3Client: {},
}))

const PRESET = {
	id: 'preset_1',
	gender: 'FEMALE' as const,
	ageRange: 'YOUNG_ADULT' as const,
	bodyType: 'SLIM' as const,
	style: 'CASUAL' as const,
	imagenPromptTemplate:
		'{{gender}} {{age_range}} {{style}} model with {{product_name}} in {{product_category}}: {{product_keywords}}',
}

const BASE_INPUT = {
	productImageUrl: 'https://cdn.example.com/product.png',
	productName: '플로럴 원피스',
	productCategory: ProductCategory.FASHION,
	productKeywords: ['floral', 'dress'],
	preset: PRESET,
}

describe('providers/image-gen/gemini-model-composite.adapter', () => {
	describe('API 키 없음 (mock fallback)', () => {
		it('interpolates prompt and returns deterministic image url', async () => {
			const adapter = new GeminiModelCompositeAdapter()
			const result = await adapter.generateComposite(BASE_INPUT)

			expect(result.provider).toBe('GEMINI_IMAGEN')
			expect(result.prompt).toContain('플로럴 원피스')
			expect(result.imageUrl).toContain('persona=preset_1')
			expect(result.qualitySignals.visibilityScore).toBeGreaterThan(0)
		})

		it('apiKey 옵션 없으면 mock URL 반환', async () => {
			const adapter = new GeminiModelCompositeAdapter({})
			const result = await adapter.generateComposite(BASE_INPUT)

			expect(result.imageUrl).toContain('cdn.example.com/product.png')
			expect(result.imageUrl).toContain('persona=preset_1')
		})

		it('retryAttempt이 증가하면 qualitySignals도 변한다', async () => {
			const adapter = new GeminiModelCompositeAdapter()

			const result0 = await adapter.generateComposite({ ...BASE_INPUT, retryAttempt: 0 })
			const result1 = await adapter.generateComposite({ ...BASE_INPUT, retryAttempt: 1 })

			expect(result1.qualitySignals.visibilityScore).toBeGreaterThan(result0.qualitySignals.visibilityScore)
		})
	})

	describe('API 키 있음 (실제 Imagen API 호출)', () => {
		const fetchMock = vi.fn()

		beforeEach(() => {
			vi.stubGlobal('fetch', fetchMock)
			fetchMock.mockReset()
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})

		it('Imagen API 호출 후 S3 URL 반환', async () => {
			const fakeBase64 = Buffer.from('fake-image-bytes').toString('base64')

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					predictions: [
						{
							bytesBase64Encoded: fakeBase64,
							mimeType: 'image/png',
						},
					],
				}),
				text: async () => '',
			})

			const { uploadImage } = await import('@/infrastructure/storage/s3-client.js')
			const uploadMock = vi.mocked(uploadImage)
			uploadMock.mockClear()

			const adapter = new GeminiModelCompositeAdapter({ apiKey: 'test-api-key' })
			const result = await adapter.generateComposite(BASE_INPUT)

			expect(fetchMock).toHaveBeenCalledOnce()
			const [calledUrl, calledOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
			expect(calledUrl).toContain('imagen-3.0-generate-001:generateImages')
			expect(calledUrl).toContain('key=test-api-key')
			expect(calledOptions.method).toBe('POST')

			const body = JSON.parse(calledOptions.body as string) as Record<string, unknown>
			expect(body.prompt).toContain('플로럴 원피스')
			expect(body.aspectRatio).toBe('9:16')
			expect(body.personGeneration).toBe('allow_adult')

			expect(uploadMock).toHaveBeenCalledOnce()
			const [uploadedBuffer, uploadedKey, uploadedMime] = uploadMock.mock.calls[0] as [Buffer, string, string]
			expect(Buffer.isBuffer(uploadedBuffer)).toBe(true)
			expect(uploadedKey).toMatch(/^model-composites\/anon\/\d+-[0-9a-f-]+-composite\.png$/)
			expect(uploadedMime).toBe('image/png')

			expect(result.provider).toBe('GEMINI_IMAGEN')
			expect(result.imageUrl).toContain('s3.example.com')
		})

		it('Imagen API가 실패하면 에러를 throw한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 429,
				text: async () => 'Rate limit exceeded',
			})

			const adapter = new GeminiModelCompositeAdapter({ apiKey: 'test-api-key' })

			await expect(adapter.generateComposite(BASE_INPUT)).rejects.toThrow('이미지 생성에 실패했습니다. (status: 429)')
		})

		it('Imagen API가 예측값 없이 응답하면 에러를 throw한다', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ predictions: [] }),
				text: async () => '',
			})

			const adapter = new GeminiModelCompositeAdapter({ apiKey: 'test-api-key' })

			await expect(adapter.generateComposite(BASE_INPUT)).rejects.toThrow('Imagen API returned no image data')
		})
	})
})
