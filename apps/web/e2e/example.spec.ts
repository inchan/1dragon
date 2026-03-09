import { expect, test, type Page } from '@playwright/test'

const FAKE_IMAGE = {
	name: 'product.png',
	mimeType: 'image/png',
	buffer: Buffer.from('fake-image-content'),
}

async function mockApi(page: Page, options?: { noCredits?: boolean }): Promise<void> {
	const noCredits = options?.noCredits ?? false

	await page.route('**/api/v1/**', async (route) => {
		const request = route.request()
		const url = new URL(request.url())
		const path = url.pathname
		const method = request.method()

		const json = (payload: unknown) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(payload),
			})

		if (method === 'GET' && path === '/api/v1/payments/quota') {
			return json({
				creditsRemaining: noCredits ? 0 : 3,
				creditsTotal: 3,
				watermarkBonusRemaining: 0,
				watermarkBonusTotal: 0,
				canGenerate: !noCredits,
				used: noCredits ? 3 : 0,
				quota: 3,
			})
		}

		if (method === 'POST' && path === '/api/v1/products/analyze') {
			return json({
				category: 'FASHION',
				keywords: ['fashion', 'outfit'],
				moods: ['trendy'],
				originalImageUrl: 'https://cdn.example.com/product.png',
				queue: { status: 'DONE', message: 'ok' },
			})
		}

		if (method === 'POST' && path === '/api/v1/media/model-composite') {
			return json({
				compositeImageUrl: 'https://cdn.example.com/composite.png',
				qualityScore: 0.91,
				accepted: true,
				fallbackToProductOnly: false,
				message: 'ok',
			})
		}

		if (method === 'POST' && path === '/api/v1/media/jobs') {
			return json({
				jobId: 'job_1',
				status: 'SUCCEEDED',
				progress: 100,
				retryCount: 0,
				canRetry: false,
			})
		}

		if (method === 'GET' && path === '/api/v1/media/jobs/job_1') {
			return json({
				job: {
					id: 'job_1',
					status: 'SUCCEEDED',
					progress: 100,
				},
				variants: [
					{
						platform: 'TIKTOK',
						videoUrl: 'https://cdn.example.com/result.mp4',
						thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
					},
				],
			})
		}

		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({}),
		})
	})
}

async function moveToStyleStep(page: Page, productName: string): Promise<void> {
	await page.goto('/studio/create')
	await page.setInputFiles('input[type="file"]', FAKE_IMAGE)
	await page.getByPlaceholder('상품명').fill(productName)
	await page.getByRole('button', { name: '다음: 분석' }).click()
	await page.getByRole('button', { name: '분석 시작' }).click()
	await expect(page.getByRole('button', { name: '다음: 스타일/카피' })).toBeVisible({ timeout: 10000 })
	await page.getByRole('button', { name: '다음: 스타일/카피' }).click()
}

test.describe('영상 생성 E2E', () => {
	test('13.1 회원가입→첫 영상 생성→프리뷰→다운로드 플로우', async ({ page }) => {
		await mockApi(page)
		await moveToStyleStep(page, '첫 영상 테스트 상품')

		await page.getByRole('button', { name: '영상 생성 시작' }).click()
		await expect(page.getByText('5) 생성 진행')).toBeVisible()
		await expect(page.getByText('영상 프리뷰 플레이어')).toBeVisible({ timeout: 15000 })
		await expect(page.getByRole('button', { name: '전체 다운로드' })).toBeVisible()
	})

	test('13.2 Free 크레딧 소진→업그레이드 유도→Starter 기능 확인', async ({ page }) => {
		await mockApi(page, { noCredits: true })
		await moveToStyleStep(page, '#NO_CREDITS 업그레이드 테스트')

		await page.getByRole('button', { name: '영상 생성 시작' }).click()
		await expect(page.getByText('크레딧이 부족합니다')).toBeVisible()
		await page.getByRole('button', { name: '플랜 업그레이드' }).click()
		await expect(page).toHaveURL(/\/pricing/)
	})

	test('13.3 모델 페르소나 선택→합성 이미지 생성→영상 생성 플로우', async ({ page }) => {
		await mockApi(page)
		await page.goto('/studio/create')
		await page.setInputFiles('input[type="file"]', FAKE_IMAGE)
		await page.getByPlaceholder('상품명').fill('모델 페르소나 테스트')
		await page.getByRole('button', { name: '다음: 분석' }).click()
		await page.getByRole('button', { name: '분석 시작' }).click()

		await expect(page.getByText('모델 페르소나 선택')).toBeVisible({ timeout: 10000 })
		await page.getByRole('button', { name: '합성 이미지 생성' }).click()
		await expect(page.getByAltText('모델 합성 결과 미리보기')).toBeVisible({ timeout: 5000 })

		await page.getByRole('button', { name: '다음: 스타일/카피' }).click()
		await page.getByRole('button', { name: '영상 생성 시작' }).click()
		await expect(page.getByText('영상 프리뷰 플레이어')).toBeVisible({ timeout: 15000 })
	})
})
