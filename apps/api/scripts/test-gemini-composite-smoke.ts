import fs from 'node:fs'
import path from 'node:path'
import {
	copyFile,
	createRunContext,
	detectMimeType,
	ensureReadableFile,
	formatDurationMs,
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
const DEFAULT_MODEL = 'gemini-2.5-flash-image'
const DEFAULT_PERSONA_BRIEF =
	'A real adult woman wearing the exact garment in a premium studio, full-body, natural confident pose.'

function buildDefaultPrompt(personaBrief: string): string {
	return [
		'Edit this source fashion product image into a photorealistic wearer-first composite.',
		'Preserve the garment identity exactly: same pattern, color palette, silhouette, neckline, sleeves, and construction details.',
		'The product must be worn by one real adult person.',
		'No mannequin, no floating garment, no duplicate garment, no extra clothing layers that hide the product.',
		'Keep the composition vertical and suitable for short-form ad generation.',
		personaBrief.trim(),
	].join(' ')
}

type GeminiGenerateContentResponse = {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				text?: string
				inlineData?: {
					data?: string
					mimeType?: string
				}
				inline_data?: {
					data?: string
					mime_type?: string
				}
			}>
		}
	}>
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

function extractGeneratedImage(response: GeminiGenerateContentResponse): { bytes: string; mimeType: string; text: string } {
	const candidates = Array.isArray(response.candidates) ? response.candidates : []

	for (const candidate of candidates) {
		const parts = Array.isArray(candidate.content?.parts) ? candidate.content?.parts : []
		let text = ''

		for (const part of parts) {
			if (typeof part.text === 'string' && !text) {
				text = part.text
			}

			const inlineData = part.inlineData ?? part.inline_data
			if (inlineData?.data) {
				const resolvedMimeType =
					('mimeType' in inlineData ? inlineData.mimeType : undefined) ??
					('mime_type' in inlineData ? inlineData.mime_type : undefined) ??
					'image/png'
				return {
					bytes: inlineData.data,
					mimeType: resolvedMimeType,
					text,
				}
			}
		}
	}

	throw new Error('Gemini image editing response contained no generated image data')
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

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2))
	if (hasFlag(args, 'help')) {
		printUsage([
			'Usage: pnpm --filter @1dragon/api smoke:gemini:composite -- --image <path> [options]',
			'',
			'Options:',
			'  --image <path>             Local product image path (required)',
			'  --persona-brief <text>     Persona / styling brief',
			'  --prompt <text>            Full prompt override',
			'  --model <name>             Default: gemini-2.5-flash-image',
			'  --run-name <label>         Optional suffix for artifact directory',
		])
		return
	}

	printHeader('Gemini Composite Image Direct Smoke Test')

	const apiKey = requireEnv('GEMINI_API_KEY', 'GEMINI_VEO_API_KEY', 'GEMINI_IMAGEN_API_KEY')
	const imageArg = getStringArg(args, 'image')
	if (!imageArg) {
		throw new Error('Missing required argument: --image <path>')
	}

	const imagePath = ensureReadableFile(imageArg)
	const personaBrief = getStringArg(args, 'persona-brief', DEFAULT_PERSONA_BRIEF) ?? DEFAULT_PERSONA_BRIEF
	const prompt = getStringArg(args, 'prompt', buildDefaultPrompt(personaBrief)) ?? buildDefaultPrompt(personaBrief)
	const model = getStringArg(args, 'model', DEFAULT_MODEL) ?? DEFAULT_MODEL
	const run = createRunContext('composite', getStringArg(args, 'run-name'))
	const startedAtMs = Date.now()

	const sourceBuffer = fs.readFileSync(imagePath)
	const mimeType = detectMimeType(imagePath)
	const sourceCopyPath = path.join(run.runDir, `source${path.extname(imagePath) || '.img'}`)
	copyFile(imagePath, sourceCopyPath)
	writeText(path.join(run.runDir, 'prompt.txt'), `${prompt}\n`)

	const payload = {
		contents: [
			{
				role: 'user',
				parts: [
					{ text: prompt },
					{
						inlineData: {
							mimeType,
							data: sourceBuffer.toString('base64'),
						},
					},
				],
			},
		],
		generationConfig: {
			responseModalities: ['TEXT', 'IMAGE'],
		},
	}

	writeJson(path.join(run.runDir, 'request.json'), payload)

	const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
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
		throw new Error(`Gemini composite request failed (${response.status})`)
	}

	const output = extractGeneratedImage(data as GeminiGenerateContentResponse)
	const outputPath = path.join(run.runDir, `composite${extensionFromMimeType(output.mimeType)}`)
	fs.writeFileSync(outputPath, Buffer.from(output.bytes, 'base64'))
	if (output.text.trim()) {
		writeText(path.join(run.runDir, 'response.txt'), `${output.text.trim()}\n`)
	}

	writeJson(path.join(run.runDir, 'summary.json'), {
		kind: 'composite-image',
		status: 'succeeded',
		model,
		prompt,
		personaBrief,
		imagePath,
		sourceCopyPath,
		outputPath,
		startedAt: run.startedAt,
		completedAt: new Date().toISOString(),
		durationMs: Date.now() - startedAtMs,
		outputSizeBytes: fs.statSync(outputPath).size,
	})

	console.log(`run dir: ${run.runDir}`)
	console.log(`source image: ${imagePath}`)
	console.log(`composite: ${outputPath}`)
	console.log(`elapsed: ${formatDurationMs(Date.now() - startedAtMs)}`)
}

main().catch((error) => {
	console.error(`Smoke test failed: ${error instanceof Error ? error.message : String(error)}`)
	process.exit(1)
})
