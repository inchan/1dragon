/**
 * 실제 Gemini Veo API를 호출하여 fashion-001.png → 동영상 생성
 *
 * 실행: cd apps/api && npx tsx --env-file=.env scripts/test-veo-pipeline.ts
 */
import fs from 'node:fs'
import path from 'node:path'

// ── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.GEMINI_VEO_API_KEY ?? ''
const IMAGE_PATH = '/Users/chans/workspace/pilot/zo3/public/fashion-001.png'
const OUTPUT_DIR = '/Users/chans/workspace/zodragon/apps/api/scripts/output'
const BASE_URL = 'https://generativelanguage.googleapis.com'

const LRO_POLL_INTERVAL_MS = 3_000
const LRO_MAX_DURATION_MS = 5 * 60 * 1_000

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(emoji: string, message: string, data?: Record<string, unknown>): void {
	const ts = new Date().toISOString().slice(11, 19)
	const extra = data ? ` ${JSON.stringify(data)}` : ''
	console.log(`[${ts}] ${emoji} ${message}${extra}`)
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

// ── Step 1: 이미지 읽기 + base64 인코딩 ─────────────────────────────────────

function loadImage(imagePath: string): { base64: string; mimeType: string; sizeBytes: number } {
	if (!fs.existsSync(imagePath)) {
		throw new Error(`이미지 파일이 없습니다: ${imagePath}`)
	}

	const buffer = fs.readFileSync(imagePath)
	const base64 = buffer.toString('base64')
	const ext = path.extname(imagePath).toLowerCase()
	const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'

	return { base64, mimeType, sizeBytes: buffer.length }
}

// ── Step 2: Gemini Veo predictLongRunning 호출 ──────────────────────────────

async function startVideoGeneration(imageData: {
	base64: string
	mimeType: string
}): Promise<string> {
	const url = `${BASE_URL}/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${API_KEY}`

	const prompt = [
		'GEMINI_VEO multimodal image-to-video.',
		'Product category: FASHION.',
		'Mood direction: TRENDY, WARM.',
		'Style preset: TRENDY.',
		'Camera movement guideline: snappy handheld micro-motions.',
		'Transition guideline: glitch pop transitions.',
		'Pacing guideline: short-form rapid pacing.',
		'Color tone guideline: trendy punchy colors.',
		'Marketing hook: 이번 봄, 스타일을 완성하세요.',
		'Highlight garment drape, fabric texture, stitching, and silhouette continuity with realistic micro-motion.',
		'Maintain exact product identity from source image: do not change silhouette, logo, typography, or key visual marks.',
		'Move camera/background rather than deforming the product.',
		'Open with camera motion already in progress from frame 1.',
		'Generate polished 9:16 ad clip with smooth camera choreography and strict identity preservation.',
	].join(' ')

	const payload = {
		instances: [
			{
				prompt,
				image: {
					bytesBase64Encoded: imageData.base64,
					mimeType: imageData.mimeType,
				},
			},
		],
		parameters: {
			aspectRatio: '9:16',
			sampleCount: 1,
			durationSeconds: 5,
		},
	}

	log('🚀', 'Gemini Veo API 호출 중...', {
		promptLength: prompt.length,
		imageSize: formatBytes(imageData.base64.length),
	})

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})

	const data = (await response.json()) as Record<string, unknown>

	if (!response.ok) {
		const errorObj = data.error as Record<string, unknown> | undefined
		throw new Error(
			`API 오류 (${response.status}): ${errorObj?.message ?? JSON.stringify(data)}`,
		)
	}

	if (typeof data.name !== 'string') {
		throw new Error(`예상치 못한 응답: ${JSON.stringify(data).slice(0, 200)}`)
	}

	log('📋', 'LRO 작업 생성됨', { operationName: data.name })
	return data.name
}

// ── Step 3: LRO 폴링 ───────────────────────────────────────────────────────

async function pollUntilDone(operationName: string): Promise<string> {
	const startTime = Date.now()
	let pollCount = 0

	while (Date.now() - startTime < LRO_MAX_DURATION_MS) {
		await new Promise<void>((resolve) => setTimeout(resolve, LRO_POLL_INTERVAL_MS))
		pollCount++

		const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
		log('⏳', `폴링 #${pollCount} (${elapsed}초 경과)`)

		const response = await fetch(`${BASE_URL}/v1beta/${operationName}?key=${API_KEY}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		})

		const data = (await response.json()) as Record<string, unknown>

		if (!response.ok) {
			throw new Error(`LRO 폴링 오류 (${response.status}): ${JSON.stringify(data).slice(0, 200)}`)
		}

		// 에러 체크
		if (data.error !== null && data.error !== undefined && typeof data.error === 'object') {
			const errRecord = data.error as Record<string, unknown>
			throw new Error(`Veo 작업 실패: ${errRecord.message ?? JSON.stringify(errRecord)}`)
		}

		if (data.done === true) {
			const videoUri = extractVideoUri(data)
			if (videoUri) {
				log('✅', 'LRO 완료!', { videoUri, totalTime: `${elapsed}초` })
				return videoUri
			}
			throw new Error(`LRO 완료되었지만 videoUri 없음: ${JSON.stringify(data).slice(0, 500)}`)
		}

		// 메타데이터 출력
		const metadata = data.metadata as Record<string, unknown> | undefined
		if (metadata) {
			log('📊', '진행 상태', { state: metadata.state ?? 'unknown' })
		}
	}

	throw new Error('LRO 타임아웃 (5분 초과)')
}

function extractVideoUri(data: Record<string, unknown>): string | null {
	const responseField = data.response
	if (!responseField || typeof responseField !== 'object') return null
	const resp = responseField as Record<string, unknown>

	// Format 1: response.videos[0].videoUri
	if (Array.isArray(resp.videos) && resp.videos.length > 0) {
		const first = resp.videos[0] as Record<string, unknown>
		if (typeof first.videoUri === 'string') return first.videoUri
	}

	// Format 2: response.generatedSamples[0].video.uri
	if (Array.isArray(resp.generatedSamples) && resp.generatedSamples.length > 0) {
		const first = resp.generatedSamples[0] as Record<string, unknown>
		const video = first.video as Record<string, unknown> | undefined
		if (typeof video?.uri === 'string') return video.uri
	}

	// Format 3: response.generateVideoResponse.generatedSamples[0].video.uri
	if (resp.generateVideoResponse && typeof resp.generateVideoResponse === 'object') {
		const gvr = resp.generateVideoResponse as Record<string, unknown>
		if (Array.isArray(gvr.generatedSamples) && gvr.generatedSamples.length > 0) {
			const first = gvr.generatedSamples[0] as Record<string, unknown>
			const video = first.video as Record<string, unknown> | undefined
			if (typeof video?.uri === 'string') return video.uri
		}
	}

	return null
}

// ── Step 4: 동영상 다운로드 ─────────────────────────────────────────────────

async function downloadVideo(videoUri: string, outputPath: string): Promise<number> {
	log('📥', '동영상 다운로드 중...', { url: videoUri.slice(0, 80) + '...' })

	const downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${API_KEY}` : `${videoUri}?key=${API_KEY}`
	const response = await fetch(downloadUrl, { redirect: 'follow' })

	if (!response.ok) {
		throw new Error(`다운로드 실패 (${response.status})`)
	}

	const buffer = Buffer.from(await response.arrayBuffer())

	fs.mkdirSync(path.dirname(outputPath), { recursive: true })
	fs.writeFileSync(outputPath, buffer)

	return buffer.length
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log('═══════════════════════════════════════════════════════════')
	console.log('  SnapVid 파이프라인 테스트: fashion-001.png → Gemini Veo → MP4')
	console.log('═══════════════════════════════════════════════════════════\n')

	if (!API_KEY) {
		console.error('❌ GEMINI_VEO_API_KEY 환경 변수가 설정되지 않았습니다.')
		process.exit(1)
	}

	const startTime = Date.now()

	// Step 1: 이미지 로드
	log('📸', `이미지 로딩: ${IMAGE_PATH}`)
	const imageData = loadImage(IMAGE_PATH)
	log('📸', '이미지 로드 완료', {
		size: formatBytes(imageData.sizeBytes),
		mimeType: imageData.mimeType,
		base64Len: imageData.base64.length,
	})

	// Step 2: Gemini Veo API 호출 (LRO 시작)
	const operationName = await startVideoGeneration(imageData)

	// Step 3: LRO 폴링 (최대 5분)
	const videoUri = await pollUntilDone(operationName)

	// Step 4: 동영상 다운로드
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
	const outputPath = path.join(OUTPUT_DIR, `fashion-001-veo-${timestamp}.mp4`)
	const videoSize = await downloadVideo(videoUri, outputPath)

	// 결과 요약
	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
	console.log('\n═══════════════════════════════════════════════════════════')
	console.log('  ✅ 파이프라인 완료!')
	console.log(`  📁 출력: ${outputPath}`)
	console.log(`  📊 크기: ${formatBytes(videoSize)}`)
	console.log(`  ⏱️  소요: ${totalTime}초`)
	console.log('═══════════════════════════════════════════════════════════')
}

main().catch((error) => {
	console.error('\n❌ 파이프라인 실패:', error instanceof Error ? error.message : error)
	process.exit(1)
})
