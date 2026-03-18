import { describe, expect, it, vi } from 'vitest'
import {
	extractLandingPageTruthFromHtml,
	resolveLandingPageTruth,
} from './landing-page-truth.js'

describe('landing page truth extraction', () => {
	it('extracts title, description, and readable text from html', async () => {
		const html = `
			<html>
				<head>
					<title>Cloud Wrap Dress | 1Dragon</title>
					<meta name="description" content="Polished wrap silhouette for commute days." />
				</head>
				<body>
					<main>
						<h1>Cloud Wrap Dress</h1>
						<p>Made for office mornings and after-work dinners.</p>
					</main>
				</body>
			</html>
		`
		const extracted = extractLandingPageTruthFromHtml(html)
		const resolved = await resolveLandingPageTruth({
			landingPageUrl: 'https://example.com/products/cloud-wrap-dress',
			fetchImpl: vi
				.fn()
				.mockResolvedValue(
					new Response(html, {
						headers: { 'content-type': 'text/html; charset=utf-8' },
					}),
				),
		})

		expect(extracted).toMatchObject({
			title: 'Cloud Wrap Dress | 1Dragon',
			description: 'Polished wrap silhouette for commute days.',
		})
		expect(extracted.text).toContain('Cloud Wrap Dress')
		expect(resolved).toMatchObject({
			source: 'fetched_url',
			title: 'Cloud Wrap Dress | 1Dragon',
			description: 'Polished wrap silhouette for commute days.',
		})
		expect(resolved.text).toContain('Made for office mornings')
	})

	it('falls back to url_only when fetch fails', async () => {
		const resolved = await resolveLandingPageTruth({
			landingPageUrl: 'https://example.com/products/cloud-wrap-dress',
			fetchImpl: vi.fn().mockRejectedValue(new Error('timeout')),
		})

		expect(resolved).toEqual({ source: 'url_only' })
	})
})
