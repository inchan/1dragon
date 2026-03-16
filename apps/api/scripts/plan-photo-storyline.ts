#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
	buildPhotoConditionedStorylinePrompt,
} from '@/application/media/photo-conditioned-storyline.js'
import {
	buildDerivedShortformFromPhotoStorylineCandidate,
	buildPhotoConditionedStorylineJsonSchema,
	buildPhotoConditionedStorylineMarkdown,
	extractGeminiText,
	parsePhotoConditionedStorylineResponse,
	selectRecommendedStorylineCandidate,
	type GeminiGenerateContentResponse,
} from '@/application/media/photo-conditioned-storyline-result.js'
import {
	copyFile,
	createRunContext,
	detectMimeType,
	ensureReadableFile,
	getNumberArg,
	getStringArg,
	parseCliArgs,
	requireEnv,
	writeJson,
	writeText,
} from './live-media-smoke.utils.js'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

type CliConfig = {
	readonly imagePath: string
	readonly productCategory: string
	readonly cta: string
	readonly model: string
	readonly targetDurationSeconds: number
	readonly candidateCount: number
	readonly runName?: string
	readonly brandTone?: string
	readonly creativeContext?: string
	readonly bannedClaims: ReadonlyArray<string>
	readonly outputDir: string
}

function printUsage(): void {
	console.log(
		[
			'Usage:',
			'  tsx scripts/plan-photo-storyline.ts --image <path> [options]',
			'',
			'Options:',
			'  --product-category <value>       Default: FASHION',
			'  --cta <text>                     Default: 지금 코디 확인',
			'  --model <value>                  Default: gemini-3-flash-preview',
			'  --target-duration-seconds <n>    Default: 16',
			'  --candidate-count <n>            Default: 3',
			'  --run-name <label>               Optional run label',
			'  --brand-tone <text>              Optional brand tone guidance',
			'  --creative-context <text>        Optional creative context guidance',
			'  --banned-claims <csv>            Optional banned claims',
			'  --out-dir <path>                 Optional output directory',
		].join('\n'),
	)
}

function parseCsv(value: string | undefined): string[] {
	if (!value) {
		return []
	}

	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean)
}

function resolveOutputDir(runName: string | undefined, providedDir: string | undefined): string {
	if (providedDir) {
		return path.resolve(providedDir)
	}

	return createRunContext('photo-storyline', runName).runDir
}

function parseConfig(argv: string[]): CliConfig {
	const args = parseCliArgs(argv)
	if (args.help === true) {
		printUsage()
		process.exit(0)
	}

	const imageArg = getStringArg(args, 'image')
	if (!imageArg) {
		printUsage()
		throw new Error('Missing required argument: --image <path>')
	}

	const runName = getStringArg(args, 'run-name')
	const brandTone = getStringArg(args, 'brand-tone')
	const creativeContext = getStringArg(args, 'creative-context')
	return {
		imagePath: ensureReadableFile(imageArg),
		productCategory: getStringArg(args, 'product-category', 'FASHION') ?? 'FASHION',
		cta: getStringArg(args, 'cta', '지금 코디 확인') ?? '지금 코디 확인',
		model:
			getStringArg(args, 'model', 'gemini-3-flash-preview') ?? 'gemini-3-flash-preview',
		targetDurationSeconds: getNumberArg(args, 'target-duration-seconds', 16),
		candidateCount: getNumberArg(args, 'candidate-count', 3),
		bannedClaims: parseCsv(getStringArg(args, 'banned-claims')),
		outputDir: resolveOutputDir(runName, getStringArg(args, 'out-dir')),
		...(runName ? { runName } : {}),
		...(brandTone !== undefined ? { brandTone } : {}),
		...(creativeContext !== undefined ? { creativeContext } : {}),
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

async function requestStorylinePlan(input: {
	readonly apiKey: string
	readonly model: string
	readonly prompt: string
	readonly mimeType: string
	readonly imageBase64: string
}): Promise<GeminiGenerateContentResponse> {
	const payload = {
		contents: [
			{
				role: 'user',
				parts: [
					{ text: input.prompt },
					{
						inlineData: {
							mimeType: input.mimeType,
							data: input.imageBase64,
						},
					},
				],
			},
		],
		generationConfig: {
			responseMimeType: 'application/json',
			responseJsonSchema: buildPhotoConditionedStorylineJsonSchema(),
		},
	}

	const response = await fetch(`${BASE_URL}/models/${input.model}:generateContent`, {
		method: 'POST',
		headers: {
			'x-goog-api-key': input.apiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})

	const data = await readJsonResponse(response)
	if (!response.ok) {
		throw new Error(
			`Storyline planning failed (${response.status}): ${JSON.stringify(data)}`,
		)
	}

	return data as GeminiGenerateContentResponse
}

async function main(): Promise<void> {
	const config = parseConfig(process.argv.slice(2))
	const apiKey = requireEnv('GEMINI_API_KEY', 'GEMINI_VEO_API_KEY', 'GEMINI_IMAGEN_API_KEY')

	fs.mkdirSync(config.outputDir, { recursive: true })

	const sourceCopyPath = path.join(
		config.outputDir,
		`source${path.extname(config.imagePath) || '.img'}`,
	)
	copyFile(config.imagePath, sourceCopyPath)

	const prompt = buildPhotoConditionedStorylinePrompt({
		inputImageUrl: sourceCopyPath,
		productCategory: config.productCategory,
		targetDurationSeconds: config.targetDurationSeconds,
		candidateCount: config.candidateCount,
		cta: config.cta,
		...(config.brandTone ? { brandTone: config.brandTone } : {}),
		...(config.creativeContext ? { creativeContext: config.creativeContext } : {}),
		...(config.bannedClaims.length > 0 ? { bannedClaims: config.bannedClaims } : {}),
	})

	const promptPath = path.join(config.outputDir, 'storyline-prompt.txt')
	writeText(promptPath, `${prompt}\n`)

	const sourceBuffer = fs.readFileSync(config.imagePath)
	const mimeType = detectMimeType(config.imagePath)
	const rawResponse = await requestStorylinePlan({
		apiKey,
		model: config.model,
		prompt,
		mimeType,
		imageBase64: sourceBuffer.toString('base64'),
	})

	const rawResponsePath = path.join(config.outputDir, 'storyline-response.json')
	writeJson(rawResponsePath, rawResponse)

	const rawText = extractGeminiText(rawResponse)
	const rawTextPath = path.join(config.outputDir, 'storyline-response.txt')
	writeText(rawTextPath, `${rawText}\n`)

	const storyline = parsePhotoConditionedStorylineResponse(rawText)
	const selectedCandidate = selectRecommendedStorylineCandidate(storyline)
	const derivedShortform =
		buildDerivedShortformFromPhotoStorylineCandidate(selectedCandidate)

	const storylineJsonPath = path.join(config.outputDir, 'storyline.json')
	writeJson(storylineJsonPath, {
		input: {
			imagePath: config.imagePath,
			sourceCopyPath,
			productCategory: config.productCategory,
			cta: config.cta,
			model: config.model,
			targetDurationSeconds: config.targetDurationSeconds,
			candidateCount: config.candidateCount,
			...(config.brandTone ? { brandTone: config.brandTone } : {}),
			...(config.creativeContext ? { creativeContext: config.creativeContext } : {}),
			...(config.bannedClaims.length > 0 ? { bannedClaims: config.bannedClaims } : {}),
		},
		storyline,
		selectedCandidate,
		derivedShortform,
	})

	const storylineMarkdownPath = path.join(config.outputDir, 'storyline.md')
	writeText(
		storylineMarkdownPath,
		`${buildPhotoConditionedStorylineMarkdown({
			imagePath: config.imagePath,
			productCategory: config.productCategory,
			model: config.model,
			response: storyline,
		})}\n`,
	)

	console.log(`storyline_run_dir=${config.outputDir}`)
	console.log(`storyline_prompt=${promptPath}`)
	console.log(`storyline_response=${rawResponsePath}`)
	console.log(`storyline_json=${storylineJsonPath}`)
	console.log(`storyline_md=${storylineMarkdownPath}`)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
