import fs from 'node:fs'
import path from 'node:path'
import {
	copyFile,
	createRunContext,
	detectMimeType,
	ensureReadableFile,
	formatDurationMs,
	getNumberArg,
	getStringArg,
	hasFlag,
	parseCliArgs,
	printHeader,
	printUsage,
	requireEnv,
	writeJson,
	writeText,
} from './live-media-smoke.utils.js'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'veo-3.1-generate-preview'
const DEFAULT_ASPECT_RATIO = '9:16'
const DEFAULT_DURATION_SECONDS = 4
const DEFAULT_POLL_INTERVAL_MS = 10_000
const DEFAULT_MAX_DURATION_MS = 8 * 60 * 1_000
const DEFAULT_PROMPT = [
	'Create a short vertical ecommerce video from this source image.',
	'Preserve the product identity exactly.',
	'Use gentle camera movement and realistic motion only.',
	'Keep the output polished, photorealistic, and conversion-oriented.',
].join(' ')

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function extractVideoUri(data: Record<string, unknown>): string | null {
	const responseField = data.response
	if (!responseField || typeof responseField !== 'object') {
		return null
	}

	const responseRecord = responseField as Record<string, unknown>

	if (responseRecord.generateVideoResponse && typeof responseRecord.generateVideoResponse === 'object') {
		const generateVideoResponse = responseRecord.generateVideoResponse as Record<string, unknown>
		if (Array.isArray(generateVideoResponse.generatedSamples) && generateVideoResponse.generatedSamples.length > 0) {
			const firstSample = generateVideoResponse.generatedSamples[0] as Record<string, unknown>
			const video = firstSample.video
			if (video && typeof video === 'object') {
				const videoRecord = video as Record<string, unknown>
				if (typeof videoRecord.uri === 'string') {
					return videoRecord.uri
				}
			}
		}
	}

	if (Array.isArray(responseRecord.generatedSamples) && responseRecord.generatedSamples.length > 0) {
		const firstSample = responseRecord.generatedSamples[0] as Record<string, unknown>
		const video = firstSample.video
		if (video && typeof video === 'object') {
			const videoRecord = video as Record<string, unknown>
			if (typeof videoRecord.uri === 'string') {
				return videoRecord.uri
			}
		}
	}

	return null
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
	const rawBody = await response.text()
	if (!rawBody.trim()) {
		throw new Error(`Provider returned empty response (status ${response.status})`)
	}

	try {
		return JSON.parse(rawBody) as Record<string, unknown>
	} catch {
		throw new Error(`Provider returned invalid JSON (status ${response.status})`)
	}
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2))
	if (hasFlag(args, 'help')) {
		printUsage([
			'Usage: pnpm --filter @1dragon/api smoke:gemini:video -- --image <path> [options]',
			'',
			'Options:',
			'  --image <path>             Local source image path (required)',
			'  --prompt <text>            Prompt override',
			'  --aspect-ratio <ratio>     Default: 9:16',
			'  --duration-seconds <n>     Default: 4',
			'  --resolution <value>       Optional: 720p | 1080p | 4k',
			'  --model <name>             Default: veo-3.1-generate-preview',
			'  --run-name <label>         Optional suffix for artifact directory',
		])
		return
	}

	printHeader('Gemini Veo Direct Smoke Test')

	const apiKey = requireEnv('GEMINI_VEO_API_KEY')
	const imageArg = getStringArg(args, 'image')
	if (!imageArg) {
		throw new Error('Missing required argument: --image <path>')
	}

	const imagePath = ensureReadableFile(imageArg)
	const prompt = getStringArg(args, 'prompt', DEFAULT_PROMPT) ?? DEFAULT_PROMPT
	const aspectRatio = getStringArg(args, 'aspect-ratio', DEFAULT_ASPECT_RATIO) ?? DEFAULT_ASPECT_RATIO
	const durationSeconds = getNumberArg(args, 'duration-seconds', DEFAULT_DURATION_SECONDS)
	const resolution = getStringArg(args, 'resolution')
	const model = getStringArg(args, 'model', DEFAULT_MODEL) ?? DEFAULT_MODEL
	const pollIntervalMs = getNumberArg(args, 'poll-interval-ms', DEFAULT_POLL_INTERVAL_MS)
	const maxDurationMs = getNumberArg(args, 'max-duration-ms', DEFAULT_MAX_DURATION_MS)
	const run = createRunContext('veo', getStringArg(args, 'run-name'))
	const startedAtMs = Date.now()

	const sourceBuffer = fs.readFileSync(imagePath)
	const base64 = sourceBuffer.toString('base64')
	const mimeType = detectMimeType(imagePath)
	const sourceCopyPath = path.join(run.runDir, `source${path.extname(imagePath) || '.img'}`)
	copyFile(imagePath, sourceCopyPath)
	writeText(path.join(run.runDir, 'prompt.txt'), `${prompt}\n`)

	const payload = {
		instances: [
			{
				prompt,
				image: {
					bytesBase64Encoded: base64,
					mimeType,
				},
			},
		],
		parameters: {
			aspectRatio,
			durationSeconds,
			...(resolution ? { resolution } : {}),
		},
	}

	writeJson(path.join(run.runDir, 'request.json'), payload)
	writeJson(path.join(run.runDir, 'input.json'), {
		model,
		imagePath,
		aspectRatio,
		durationSeconds,
		...(resolution ? { resolution } : {}),
		sourceSizeBytes: sourceBuffer.length,
		startedAt: run.startedAt,
	})

	const startResponse = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
		method: 'POST',
		headers: {
			'x-goog-api-key': apiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})
	const startData = await readJsonResponse(startResponse)
	writeJson(path.join(run.runDir, 'provider-start-response.json'), startData)

	if (!startResponse.ok) {
		throw new Error(`Gemini Veo request failed (${startResponse.status})`)
	}

	if (typeof startData.name !== 'string') {
		throw new Error('Gemini Veo did not return an operation name')
	}

	console.log(`run dir: ${run.runDir}`)
	console.log(`source image: ${imagePath} (${formatBytes(sourceBuffer.length)})`)
	console.log(`operation: ${startData.name}`)

	let finalOperation: Record<string, unknown> | null = null
	while (Date.now() - startedAtMs < maxDurationMs) {
		await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs))
		const operationResponse = await fetch(`${BASE_URL}/${startData.name}`, {
			method: 'GET',
			headers: { 'x-goog-api-key': apiKey },
		})
		const operationData = await readJsonResponse(operationResponse)
		writeJson(path.join(run.runDir, 'provider-last-poll.json'), operationData)

		if (!operationResponse.ok) {
			throw new Error(`Gemini Veo polling failed (${operationResponse.status})`)
		}

		if (operationData.error && typeof operationData.error === 'object') {
			writeJson(path.join(run.runDir, 'provider-final-response.json'), operationData)
			const errorRecord = operationData.error as Record<string, unknown>
			throw new Error(typeof errorRecord.message === 'string' ? errorRecord.message : 'Gemini Veo operation failed')
		}

		if (operationData.done === true) {
			finalOperation = operationData
			writeJson(path.join(run.runDir, 'provider-final-response.json'), operationData)
			break
		}

		const metadata = operationData.metadata
		if (metadata && typeof metadata === 'object') {
			const metadataRecord = metadata as Record<string, unknown>
			const state = typeof metadataRecord.state === 'string' ? metadataRecord.state : 'unknown'
			console.log(`waiting... state=${state}`)
		} else {
			console.log('waiting... state=unknown')
		}
	}

	if (!finalOperation) {
		throw new Error(`Gemini Veo polling timed out after ${formatDurationMs(maxDurationMs)}`)
	}

	const videoUri = extractVideoUri(finalOperation)
	if (!videoUri) {
		throw new Error('Gemini Veo completed without a downloadable video URI')
	}

	const downloadResponse = await fetch(videoUri, {
		method: 'GET',
		headers: { 'x-goog-api-key': apiKey },
		redirect: 'follow',
	})
	if (!downloadResponse.ok) {
		throw new Error(`Video download failed (${downloadResponse.status})`)
	}

	const videoBuffer = Buffer.from(await downloadResponse.arrayBuffer())
	const outputPath = path.join(run.runDir, 'output.mp4')
	fs.writeFileSync(outputPath, videoBuffer)

	const completedAt = new Date().toISOString()
	writeJson(path.join(run.runDir, 'summary.json'), {
		kind: 'video',
		status: 'succeeded',
		model,
		prompt,
		imagePath,
		outputPath,
		videoUri,
		durationSeconds,
		aspectRatio,
		...(resolution ? { resolution } : {}),
		startedAt: run.startedAt,
		completedAt,
		durationMs: Date.now() - startedAtMs,
		outputSizeBytes: videoBuffer.length,
	})

	console.log(`video: ${outputPath} (${formatBytes(videoBuffer.length)})`)
	console.log(`elapsed: ${formatDurationMs(Date.now() - startedAtMs)}`)
}

main().catch((error) => {
	console.error(`Smoke test failed: ${error instanceof Error ? error.message : String(error)}`)
	process.exit(1)
})
