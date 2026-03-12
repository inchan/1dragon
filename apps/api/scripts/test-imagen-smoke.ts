import fs from 'node:fs'
import path from 'node:path'
import {
	createRunContext,
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
const DEFAULT_MODEL = 'imagen-4.0-generate-001'
const DEFAULT_PROMPT =
	'A premium ecommerce hero image of a fashion product in a clean studio, photorealistic, soft lighting, high detail.'
const DEFAULT_ASPECT_RATIO = '9:16'

type ImagenPrediction = {
	readonly bytesBase64Encoded?: string
	readonly mimeType?: string
	image?: {
		imageBytes?: string
		mimeType?: string
	}
}

function extractImages(data: Record<string, unknown>): Array<{ bytes: string; mimeType: string }> {
	const outputs: Array<{ bytes: string; mimeType: string }> = []

	const predictions = Array.isArray(data.predictions) ? (data.predictions as ImagenPrediction[]) : []
	for (const prediction of predictions) {
		if (typeof prediction.bytesBase64Encoded === 'string') {
			outputs.push({
				bytes: prediction.bytesBase64Encoded,
				mimeType: prediction.mimeType ?? 'image/png',
			})
			continue
		}

		if (prediction.image && typeof prediction.image === 'object' && typeof prediction.image.imageBytes === 'string') {
			outputs.push({
				bytes: prediction.image.imageBytes,
				mimeType: prediction.image.mimeType ?? 'image/png',
			})
		}
	}

	const generatedImages = Array.isArray(data.generatedImages)
		? (data.generatedImages as Array<{ image?: { imageBytes?: string; mimeType?: string } }>)
		: []
	for (const generatedImage of generatedImages) {
		if (generatedImage.image && typeof generatedImage.image.imageBytes === 'string') {
			outputs.push({
				bytes: generatedImage.image.imageBytes,
				mimeType: generatedImage.image.mimeType ?? 'image/png',
			})
		}
	}

	return outputs
}

function extensionFromMimeType(mimeType: string): string {
	switch (mimeType) {
		case 'image/jpeg':
			return '.jpg'
		case 'image/webp':
			return '.webp'
		default:
			return '.png'
	}
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
			'Usage: pnpm --filter @1dragon/api smoke:gemini:image -- [options]',
			'',
			'Options:',
			'  --prompt <text>            Prompt override',
			'  --aspect-ratio <ratio>     Default: 9:16',
			'  --sample-count <n>         Default: 1',
			'  --model <name>             Default: imagen-4.0-generate-001',
			'  --run-name <label>         Optional suffix for artifact directory',
		])
		return
	}

	printHeader('Gemini Imagen Direct Smoke Test')

	const apiKey = requireEnv('GEMINI_IMAGEN_API_KEY', 'GEMINI_VEO_API_KEY')
	const prompt = getStringArg(args, 'prompt', DEFAULT_PROMPT) ?? DEFAULT_PROMPT
	const aspectRatio = getStringArg(args, 'aspect-ratio', DEFAULT_ASPECT_RATIO) ?? DEFAULT_ASPECT_RATIO
	const sampleCount = getNumberArg(args, 'sample-count', 1)
	const model = getStringArg(args, 'model', DEFAULT_MODEL) ?? DEFAULT_MODEL
	const run = createRunContext('imagen', getStringArg(args, 'run-name'))
	const startedAtMs = Date.now()

	const payload = {
		instances: [{ prompt }],
		parameters: {
			sampleCount,
			aspectRatio,
			personGeneration: 'allow_adult',
		},
	}

	writeText(path.join(run.runDir, 'prompt.txt'), `${prompt}\n`)
	writeJson(path.join(run.runDir, 'request.json'), payload)

	const response = await fetch(`${BASE_URL}/models/${model}:predict`, {
		method: 'POST',
		headers: {
			'x-goog-api-key': apiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})
	const data = await readJsonResponse(response)
	writeJson(path.join(run.runDir, 'provider-response.json'), data)

	if (!response.ok) {
		throw new Error(`Gemini Imagen request failed (${response.status})`)
	}

	const images = extractImages(data)
	if (images.length === 0) {
		throw new Error('Gemini Imagen response contained no generated images')
	}

	const outputs: string[] = []
	for (const [index, image] of images.entries()) {
		const buffer = Buffer.from(image.bytes, 'base64')
		const outputPath = path.join(
			run.runDir,
			`output-${String(index + 1).padStart(2, '0')}${extensionFromMimeType(image.mimeType)}`,
		)
		fs.writeFileSync(outputPath, buffer)
		outputs.push(outputPath)
	}

	writeJson(path.join(run.runDir, 'summary.json'), {
		kind: 'image',
		status: 'succeeded',
		model,
		prompt,
		aspectRatio,
		sampleCount,
		startedAt: run.startedAt,
		completedAt: new Date().toISOString(),
		durationMs: Date.now() - startedAtMs,
		outputs,
	})

	console.log(`run dir: ${run.runDir}`)
	console.log(`outputs: ${outputs.length}`)
	for (const outputPath of outputs) {
		const size = fs.statSync(outputPath).size
		console.log(`- ${outputPath} (${size} bytes)`)
	}
	console.log(`elapsed: ${formatDurationMs(Date.now() - startedAtMs)}`)
}

main().catch((error) => {
	console.error(`Smoke test failed: ${error instanceof Error ? error.message : String(error)}`)
	process.exit(1)
})
