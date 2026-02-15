import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	// 테스트 파일 위치
	testDir: './e2e',

	// 병렬 실행 설정
	fullyParallel: true,

	// CI에서 실패 시 재시도
	retries: process.env.CI ? 2 : 0,

	// CI에서는 worker 수를 1로 제한 (안정성 우선)
	workers: process.env.CI ? 1 : undefined,

	// 리포터 설정
	reporter: process.env.CI ? 'html' : 'list',

	// 공통 테스트 설정
	use: {
		// 모든 테스트의 기본 URL
		baseURL: 'http://localhost:4173',

		// 스크린샷은 실패 시에만
		screenshot: 'only-on-failure',

		// 비디오는 재시도 시에만 (디버깅용)
		video: 'retain-on-failure',

		// 트레이스는 재시도 시에만
		trace: 'on-first-retry',
	},

	// 테스트 실행 전 개발 서버 구동
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000, // 2분 타임아웃
	},

	// 테스트할 브라우저 (CI 최적화를 위해 chromium만)
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
