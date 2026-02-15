import { expect, test } from '@playwright/test'

const FAKE_IMAGE = {
	name: 'product.png',
	mimeType: 'image/png',
	buffer: Buffer.from('fake-image-content'),
}

async function moveToStyleStep(page: import('@playwright/test').Page, productName: string): Promise<void> {
	await page.goto('/studio/create')
	await page.setInputFiles('input[type="file"]', FAKE_IMAGE)
	await page.getByPlaceholder('상품명').fill(productName)
	await page.getByRole('button', { name: '다음: 분석' }).click()
	await page.getByRole('button', { name: '분석 완료로 진행' }).click()
	await page.getByRole('button', { name: '다음: 스타일/카피' }).click()
}

test.describe('영상 생성 E2E', () => {
	test('13.1 회원가입→첫 영상 생성→프리뷰→다운로드 플로우', async ({ page }) => {
		await moveToStyleStep(page, '첫 영상 테스트 상품')

		await page.getByRole('button', { name: '영상 생성 시작' }).click()
		await expect(page.getByText('5) 생성 진행')).toBeVisible()
		await expect(page.getByText('영상 프리뷰 플레이어')).toBeVisible({ timeout: 15000 })
		await expect(page.getByRole('button', { name: '전체 다운로드' })).toBeVisible()
	})

	test('13.2 Free 크레딧 소진→업그레이드 유도→Starter 기능 확인', async ({ page }) => {
		await moveToStyleStep(page, '#NO_CREDITS 업그레이드 테스트')

		await page.getByRole('button', { name: '영상 생성 시작' }).click()
		await expect(page.getByText('크레딧이 부족합니다')).toBeVisible()
		await page.getByRole('button', { name: '플랜 업그레이드' }).click()
		await expect(page).toHaveURL(/\/pricing/)
		await expect(page.getByText('요금제 선택')).toBeVisible()

		await page.goto('/dashboard')
		await expect(page.getByRole('button', { name: '전체 다운로드' })).toBeEnabled()
	})

	test('13.3 모델 페르소나 선택→합성 이미지 생성→영상 생성 플로우', async ({ page }) => {
		await page.goto('/studio/create')
		await page.setInputFiles('input[type="file"]', FAKE_IMAGE)
		await page.getByPlaceholder('상품명').fill('모델 페르소나 테스트')
		await page.getByRole('button', { name: '다음: 분석' }).click()
		await page.getByRole('button', { name: '분석 완료로 진행' }).click()

		await expect(page.getByText('모델 페르소나 선택')).toBeVisible()
		await page.getByRole('button', { name: '합성 이미지 생성' }).click()
		await expect(page.getByAltText('모델 합성 결과 미리보기')).toBeVisible({ timeout: 5000 })

		await page.getByRole('button', { name: '다음: 스타일/카피' }).click()
		await page.getByRole('button', { name: '영상 생성 시작' }).click()
		await expect(page.getByText('영상 프리뷰 플레이어')).toBeVisible({ timeout: 15000 })
	})
})
