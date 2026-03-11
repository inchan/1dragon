#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { SHORTFORM_EXPERIMENT_TEAM, SHORTFORM_TREND_SNAPSHOT } from '../src/application/media/shortform-trend-snapshot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../../..')
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'artifacts')
const DEFAULT_VISION_MODEL = 'gpt-4.1-mini'
const TARGET_DURATION_SECONDS = 15

type Args = {
	image?: string
	productName?: string
	category?: string
	targetAge?: string
	loops: number
	headline?: string
	intent?: string
	cta?: string
	outDir?: string
	visionModel: string
	requireVision: boolean
}

type ProductBrief = {
	imagePath: string
	productName: string
	category: string
	targetAge: string
	productPromise: string
	clickDriver: string
}

type ResearchBrief = {
	snapshotDate: string
	sourceUrls: string[]
	signals: typeof SHORTFORM_TREND_SNAPSHOT.trendSignals
	messagePatterns: readonly string[]
}

type CandidatePlan = {
	index: number
	trendSignal: string
	headline: string
	intent: string
	cta: string
	visualDirection: string
	researchRationale: string
}

type CriticalReview = {
	score: number
	verdict: 'KEEP' | 'REVISE'
	issues: string[]
	strengths: string[]
}

type VisionReview =
	| {
			status: 'completed'
			model: string
			overallScore: number
			clickLikelihoodScore: number
			impactScore: number
			messageClarityScore: number
			targetAgeFitScore: number
			verdict: string
			strengths: string[]
			issues: string[]
	  }
	| {
			status: 'skipped'
			reason: string
	  }

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2))
	if (!args.image) {
		printUsage()
		throw new Error('--image is required')
	}

	const imagePath = path.resolve(args.image)
	await stat(imagePath)

	const runId = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
	const loopDir = path.resolve(args.outDir ?? path.join(ARTIFACTS_DIR, 'research-loop', runId))
	await mkdir(loopDir, { recursive: true })

	const productBrief = buildProductBrief(imagePath, args)
	const researchBrief = buildResearchBrief()
	const memory = {
		preferShorterHooks: false,
		preferDirectCta: false,
		preferStrongerProof: false,
	}

	const candidates: Array<Record<string, unknown>> = []

	for (let index = 1; index <= args.loops; index += 1) {
		const plan = buildCandidatePlan({
			index,
			productBrief,
			researchBrief,
			memory,
			...(args.headline ? { headlineOverride: args.headline } : {}),
			...(args.intent ? { intentOverride: args.intent } : {}),
			...(args.cta ? { ctaOverride: args.cta } : {}),
		})

		const candidateDir = path.join(loopDir, `loop-${String(index).padStart(2, '0')}`)
			await mkdir(candidateDir, { recursive: true })

			const videoPath = path.join(candidateDir, 'candidate.mp4')
			const validatePath = path.join(candidateDir, 'validation.json')
			const overlayPath = path.join(candidateDir, 'overlay.png')
			await createOverlayImage(overlayPath, plan)
			renderVideo({
				imagePath,
				videoPath,
				overlayPath,
				plan,
				productBrief,
			})
		runNode([
			path.join(REPO_ROOT, 'tooling/validate-media.mjs'),
			'--image',
			imagePath,
			'--video',
			videoPath,
			'--out',
			validatePath,
		])

		const validateReport = JSON.parse(await readFile(validatePath, 'utf8')) as {
			passed: boolean
		}
		const criticalReview = reviewCandidate(plan, productBrief)
		updateMemory(memory, criticalReview)
		const visionReview = await evaluateWithVision({
			videoPath,
			plan,
			productBrief,
			visionModel: args.visionModel,
			requireVision: args.requireVision,
			outputDir: candidateDir,
		})
		const score = scoreCandidate({
			validatePassed: validateReport.passed,
			criticalReview,
			visionReview,
		})

		candidates.push({
			index,
			videoPath,
			trendSignal: plan.trendSignal,
			headline: plan.headline,
			intent: plan.intent,
			cta: plan.cta,
			visualDirection: plan.visualDirection,
			researchRationale: plan.researchRationale,
			validatePassed: validateReport.passed,
			criticalReview,
			visionReview,
			score,
		})
	}

	candidates.sort((left, right) => Number(right.score) - Number(left.score))
	const best = candidates[0]
	if (!best) {
		throw new Error('No candidates generated')
	}

	const summary = {
		runId,
		timestamp: new Date().toISOString(),
		productBrief,
		researchBrief,
		team: SHORTFORM_EXPERIMENT_TEAM,
		loops: args.loops,
		best,
		candidates,
	}

	const summaryJsonPath = path.join(loopDir, 'loop-summary.json')
	const summaryMdPath = path.join(loopDir, 'loop-summary.md')
	await writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
	await writeFile(summaryMdPath, `${toMarkdown(summary)}\n`, 'utf8')

	console.log(`Research-driven loop complete | run=${runId} | loops=${args.loops}`)
	console.log(`best video: ${String(best.videoPath)}`)
	console.log(`summary: ${summaryJsonPath}`)
}

function parseArgs(argv: string[]): Args {
	const args: Args = {
		loops: 20,
		visionModel: DEFAULT_VISION_MODEL,
		requireVision: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const current = argv[index]
		if (!current) {
			break
		}
		if (current === '--help') {
			printUsage()
			process.exit(0)
		}
		if (current === '--require-vision') {
			args.requireVision = true
			continue
		}
		if (!current.startsWith('--')) {
			throw new Error(`Unknown argument: ${current}`)
		}

		const key = current.slice(2)
		const value = argv[index + 1]
		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for ${current}`)
		}

		switch (key) {
			case 'image':
				args.image = value
				break
			case 'product-name':
				args.productName = value
				break
			case 'category':
				args.category = value
				break
			case 'target-age':
				args.targetAge = value
				break
			case 'loops':
				args.loops = Math.max(1, Number.parseInt(value, 10) || 20)
				break
			case 'headline':
				args.headline = value
				break
			case 'intent':
				args.intent = value
				break
			case 'cta':
				args.cta = value
				break
			case 'out-dir':
				args.outDir = value
				break
			case 'vision-model':
				args.visionModel = value
				break
			default:
				throw new Error(`Unknown argument: ${current}`)
		}

		index += 1
	}

	return args
}

function printUsage(): void {
	console.error(
		[
			'Usage: pnpm --filter @1dragon/api loop:research --image <path> [options]',
			'Options:',
			'  --product-name <name>',
			'  --category <FASHION|BEAUTY|ACCESSORIES|OTHER>',
			'  --target-age <20-34>',
			'  --loops <number>              default 20',
			'  --headline <text>',
			'  --intent <text>',
			'  --cta <text>',
			'  --vision-model <model>       default gpt-4.1-mini',
			'  --require-vision             fail if OPENAI_API_KEY is missing',
			'  --out-dir <path>',
		].join('\n'),
	)
}

function buildProductBrief(imagePath: string, args: Args): ProductBrief {
	const basename = path.basename(imagePath, path.extname(imagePath))
	const inferredName = basename.replace(/[-_]+/g, ' ').trim() || '샘플 상품'
	const productName = (args.productName?.trim() || inferredName).trim()
	const category = normalizeCategory(args.category ?? inferCategoryFromName(productName))
	const targetAge = (args.targetAge?.trim() || defaultTargetAge(category)).trim()

	return {
		imagePath,
		productName,
		category,
		targetAge,
		productPromise: resolveProductPromise(category),
		clickDriver: resolveClickDriver(targetAge, category),
	}
}

function normalizeCategory(value: string): string {
	const normalized = value.trim().toUpperCase()
	if (['FASHION', 'BEAUTY', 'ACCESSORIES', 'SPORTS', 'OTHER'].includes(normalized)) {
		return normalized
	}
	return 'OTHER'
}

function inferCategoryFromName(productName: string): string {
	const value = productName.toLowerCase()
	if (/(dress|coat|shirt|pants|skirt|hoodie|jacket|원피스|의류|코디|룩)/i.test(value)) {
		return 'FASHION'
	}
	if (/(serum|cream|lip|beauty|cosmetic|스킨|세럼|립|뷰티)/i.test(value)) {
		return 'BEAUTY'
	}
	if (/(bag|watch|shoe|sneaker|wallet|가방|신발|시계|액세서리)/i.test(value)) {
		return 'ACCESSORIES'
	}
	return 'OTHER'
}

function defaultTargetAge(category: string): string {
	return category === 'FASHION' ? '20-34' : '25-39'
}

function resolveProductPromise(category: string): string {
	switch (category) {
		case 'FASHION':
			return '핏, 질감, 움직임을 실제처럼 설득력 있게 보여준다.'
		case 'BEAUTY':
			return '질감, 윤기, 사용 후 감정을 빠르게 상상시키게 한다.'
		case 'ACCESSORIES':
			return '디테일과 스타일링 포인트를 한눈에 읽히게 한다.'
		default:
			return '상품 가치와 사용 맥락을 짧고 명확하게 전달한다.'
	}
}

function resolveClickDriver(targetAge: string, category: string): string {
	if (category === 'FASHION') {
		return `${targetAge} 타깃이 저장하거나 댓글을 남길 만한 OOTD/fit-check 후킹을 만든다.`
	}
	return `${targetAge} 타깃이 바로 이득을 이해하고 더 보게 만드는 명확한 후킹을 만든다.`
}

function buildResearchBrief(): ResearchBrief {
	return {
		snapshotDate: SHORTFORM_TREND_SNAPSHOT.snapshotDate,
		sourceUrls: SHORTFORM_TREND_SNAPSHOT.officialSources.map((source) => source.url),
		signals: SHORTFORM_TREND_SNAPSHOT.trendSignals,
		messagePatterns: SHORTFORM_TREND_SNAPSHOT.messagePatterns,
	}
}

function buildCandidatePlan(input: {
	index: number
	productBrief: ProductBrief
	researchBrief: ResearchBrief
	memory: {
		preferShorterHooks: boolean
		preferDirectCta: boolean
		preferStrongerProof: boolean
	}
	headlineOverride?: string
	intentOverride?: string
	ctaOverride?: string
}): CandidatePlan {
	const signal = input.researchBrief.signals[(input.index - 1) % input.researchBrief.signals.length]
	if (!signal) {
		throw new Error('No trend signal available for candidate plan generation')
	}
	const hooks = [
		`${input.productBrief.productName} 왜 반응 좋지?`,
		`${input.productBrief.targetAge}가 멈추는 이유`,
		`입으면 바로 분위기 달라짐`,
		`첫 2초에 저장각 나오는 컷`,
		`댓글 부르는 핏체크 시작`,
	]
	const proofs = [
		`${input.productBrief.productPromise} ${signal.summary}`,
		`상품의 강점을 감정 payoff와 함께 보여준다. ${input.productBrief.clickDriver}`,
		`짧지만 과장 없이 설득한다. ${signal.directives[0]}`,
	]
	const ctas = [
		'지금 보고 댓글로 선택해줘',
		'저장해두고 코디 비교해봐',
		'지금 눌러서 디테일 확인',
		'어떤 컷이 더 끌리는지 말해줘',
	]

	const headline = input.headlineOverride?.trim()
		|| chooseFrom(hooks, input.index, input.memory.preferShorterHooks)
	const intent = input.intentOverride?.trim()
		|| chooseFrom(proofs, input.index + 3, input.memory.preferStrongerProof)
	const cta = input.ctaOverride?.trim()
		|| chooseFrom(ctas, input.index + 6, input.memory.preferDirectCta)

	return {
		index: input.index,
		trendSignal: signal.title,
		headline,
		intent,
		cta,
		visualDirection: `${signal.title} / ${input.productBrief.category} / loop ${input.index}`,
		researchRationale: `${signal.summary} ${signal.directives.join(' ')}`,
	}
}

function chooseFrom(values: string[], seed: number, preferShorter: boolean): string {
	const ordered = preferShorter ? [...values].sort((left, right) => left.length - right.length) : values
	return ordered[(seed - 1) % ordered.length] ?? values[0] ?? '핵심 메시지'
}

function renderVideo(input: {
	imagePath: string
	videoPath: string
	overlayPath: string
	plan: CandidatePlan
	productBrief: ProductBrief
}): void {
	const hue = (input.plan.index * 5) % 36
	const zoomSpeed = (0.00045 + (input.plan.index % 5) * 0.00018).toFixed(4)
	run('ffmpeg', [
		'-y',
		'-loop',
		'1',
		'-i',
		input.imagePath,
		'-i',
		input.overlayPath,
		'-t',
		String(TARGET_DURATION_SECONDS),
		'-filter_complex',
		`[0:v]scale=1080:1920,zoompan=z='min(zoom+${zoomSpeed},1.18)':d=375:s=1080x1920,eq=saturation=1.05:contrast=1.04,hue=h=${hue}[base];[base][1:v]overlay=0:0`,
		'-r',
		'25',
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		'-metadata',
		`title=${input.plan.headline}`,
		'-metadata',
		`comment=${input.plan.intent} | CTA:${input.plan.cta} | Signal:${input.plan.trendSignal} | Product:${input.productBrief.productName}`,
		input.videoPath,
	])
}

async function createOverlayImage(outputPath: string, plan: CandidatePlan): Promise<void> {
	const boxAlpha = (0.32 + Math.min(plan.index * 0.01, 0.23)).toFixed(2)
	const svg = buildOverlaySvg({
		headline: wrapForOverlay(plan.headline, 16),
		intent: wrapForOverlay(plan.intent, 26),
		trendSignal: plan.trendSignal,
		cta: wrapForOverlay(plan.cta, 22),
		boxAlpha,
	})

	await sharp(Buffer.from(svg))
		.png()
		.toFile(outputPath)
}

function buildOverlaySvg(input: {
	headline: string
	intent: string
	trendSignal: string
	cta: string
	boxAlpha: string
}): string {
	const headline = buildSvgLines(input.headline, 1360, 58, '#ffffff', 72, '700')
	const intent = buildSvgLines(input.intent, 1495, 30, '#ffffff', 42, '500')
	const signal = buildSvgLines(input.trendSignal, 1615, 26, '#fbbf24', 32, '600')
	const cta = buildSvgLines(input.cta, 1695, 38, '#fbbf24', 46, '700')

	return [
		'<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">',
		'<rect width="1080" height="1920" fill="transparent"/>',
		`<rect x="48" y="1260" width="984" height="580" rx="0" fill="rgba(0,0,0,${input.boxAlpha})"/>`,
		'<rect x="80" y="1710" width="920" height="8" fill="#fbbf24" fill-opacity="0.95"/>',
		headline,
		intent,
		signal,
		cta,
		'</svg>',
	].join('')
}

function buildSvgLines(
	value: string,
	startY: number,
	fontSize: number,
	fill: string,
	lineHeight: number,
	fontWeight: string,
): string {
	const lines = value.split('\n').map((line) => line.trim()).filter(Boolean)
	const tspans = lines
		.map((line, index) => {
			const dy = index === 0 ? 0 : lineHeight
			return `<tspan x="540" dy="${dy}">${escapeXml(line)}</tspan>`
		})
		.join('')

	return [
		`<text x="540" y="${startY}" text-anchor="middle" fill="${fill}" font-size="${fontSize}" font-weight="${fontWeight}"`,
		' font-family="AppleGothic, Apple SD Gothic Neo, Noto Sans Gothic, sans-serif"',
		' style="paint-order:stroke;stroke:#000000;stroke-opacity:0.55;stroke-width:6;letter-spacing:0.2px;">',
		tspans,
		'</text>',
	].join('')
}

function reviewCandidate(plan: CandidatePlan, productBrief: ProductBrief): CriticalReview {
	const issues: string[] = []
	const strengths: string[] = []

	if (plan.headline.length > 20) {
		issues.push('헤드라인이 길어 첫 정지력이 약해질 수 있습니다.')
	} else {
		strengths.push('헤드라인 길이가 비교적 짧아 첫 2초 정지력에 유리합니다.')
	}

	if (!/(왜|댓글|저장|핏|분위기|멈추)/.test(plan.headline)) {
		issues.push('호기심이나 반응 유도 장치가 약합니다.')
	} else {
		strengths.push('호기심 혹은 참여 유도가 분명합니다.')
	}

	if (!plan.intent.includes(productBrief.productPromise.split(' ')[0] ?? '상품')) {
		issues.push('의도 문장에서 상품의 핵심 효익이 직관적으로 보이지 않습니다.')
	} else {
		strengths.push('의도 문장에 상품 효익이 직접적으로 반영됩니다.')
	}

	if (!/(댓글|저장|확인|선택|눌러)/.test(plan.cta)) {
		issues.push('CTA가 수동적이라 클릭 유인이 약합니다.')
	} else {
		strengths.push('CTA가 반응을 요구해 댓글/클릭 행동을 유도합니다.')
	}

	if (!plan.researchRationale.includes(plan.trendSignal)) {
		issues.push('트렌드 신호와 메시지의 연결이 약합니다.')
	}

	const score = Math.max(1, 10 - issues.length * 1.7)
	return {
		score: Math.round(score * 10) / 10,
		verdict: score >= 7 ? 'KEEP' : 'REVISE',
		issues,
		strengths,
	}
}

function updateMemory(
	memory: {
		preferShorterHooks: boolean
		preferDirectCta: boolean
		preferStrongerProof: boolean
	},
	review: CriticalReview,
): void {
	if (review.issues.some((issue) => issue.includes('헤드라인'))) {
		memory.preferShorterHooks = true
	}
	if (review.issues.some((issue) => issue.includes('CTA'))) {
		memory.preferDirectCta = true
	}
	if (review.issues.some((issue) => issue.includes('효익'))) {
		memory.preferStrongerProof = true
	}
}

async function evaluateWithVision(input: {
	videoPath: string
	plan: CandidatePlan
	productBrief: ProductBrief
	visionModel: string
	requireVision: boolean
	outputDir: string
}): Promise<VisionReview> {
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		if (input.requireVision) {
			throw new Error('OPENAI_API_KEY is required for --require-vision')
		}
		return {
			status: 'skipped',
			reason: 'OPENAI_API_KEY is missing; vision review skipped.',
		}
	}

	const framePaths = await extractFrames(input.videoPath, input.outputDir)
	const imageInputs = await Promise.all(
		framePaths.map(async (framePath) => ({
			type: 'input_image' as const,
			image_url: await toDataUrl(framePath),
		})),
	)

	const content = [
		{
			type: 'input_text',
			text: [
				'You are the critical vision reviewer for a Korean short-form ecommerce video team.',
				`Product: ${input.productBrief.productName}`,
				`Category: ${input.productBrief.category}`,
				`Target age: ${input.productBrief.targetAge}`,
				`Trend signal: ${input.plan.trendSignal}`,
				`Headline: ${input.plan.headline}`,
				`Intent: ${input.plan.intent}`,
				`CTA: ${input.plan.cta}`,
				'Judge coldly whether the target viewer would stop, click, and understand the message.',
				'Return JSON only with keys: verdict, overallScore, clickLikelihoodScore, impactScore, messageClarityScore, targetAgeFitScore, strengths, issues.',
			].join('\n'),
		},
		...imageInputs,
	]

	const response = await fetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: input.visionModel,
			input: [
				{
					role: 'user',
					content,
				},
			],
		}),
	})

	if (!response.ok) {
		const errorBody = await response.text()
		if (input.requireVision) {
			throw new Error(`Vision review failed: ${errorBody}`)
		}
		return {
			status: 'skipped',
			reason: `Vision review failed: ${errorBody}`,
		}
	}

	const body = (await response.json()) as {
		output_text?: string
		output?: Array<{ content?: Array<{ text?: string }> }>
	}
	const text =
		body.output_text
		?? body.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? '').join('\n')
		?? ''
	const parsed = JSON.parse(extractJson(text)) as {
		verdict: string
		overallScore: number
		clickLikelihoodScore: number
		impactScore: number
		messageClarityScore: number
		targetAgeFitScore: number
		strengths: string[]
		issues: string[]
	}

	return {
		status: 'completed',
		model: input.visionModel,
		overallScore: parsed.overallScore,
		clickLikelihoodScore: parsed.clickLikelihoodScore,
		impactScore: parsed.impactScore,
		messageClarityScore: parsed.messageClarityScore,
		targetAgeFitScore: parsed.targetAgeFitScore,
		verdict: parsed.verdict,
		strengths: parsed.strengths ?? [],
		issues: parsed.issues ?? [],
	}
}

async function extractFrames(videoPath: string, outputDir: string): Promise<string[]> {
	const frameDir = path.join(outputDir, 'review-frames')
	await mkdir(frameDir, { recursive: true })
	const times = ['00:00:00.5', '00:00:02.5', '00:00:04.5']
	const paths: string[] = []

	for (const [index, time] of times.entries()) {
		const framePath = path.join(frameDir, `frame-${String(index + 1).padStart(2, '0')}.jpg`)
		run('ffmpeg', ['-y', '-ss', time, '-i', videoPath, '-frames:v', '1', framePath])
		paths.push(framePath)
	}

	return paths
}

async function toDataUrl(filePath: string): Promise<string> {
	const buffer = await readFile(filePath)
	return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

function extractJson(value: string): string {
	const start = value.indexOf('{')
	const end = value.lastIndexOf('}')
	if (start === -1 || end === -1 || end <= start) {
		throw new Error(`Expected JSON in model output, received: ${value}`)
	}
	return value.slice(start, end + 1)
}

function scoreCandidate(input: {
	validatePassed: boolean
	criticalReview: CriticalReview
	visionReview: VisionReview
}): number {
	const technical = input.validatePassed ? 20 : 8
	const critic = input.criticalReview.score * 2.5
	const vision =
		input.visionReview.status === 'completed'
			? input.visionReview.overallScore * 5
			: input.criticalReview.score * 3
	return Math.round((technical + critic + vision) * 100) / 100
}

function toMarkdown(summary: {
	readonly runId: string
	readonly productBrief: ProductBrief
	readonly researchBrief: ResearchBrief
	readonly team: typeof SHORTFORM_EXPERIMENT_TEAM
	readonly loops: number
	readonly best: Record<string, unknown>
	readonly candidates: Array<Record<string, unknown>>
}): string {
	const lines: string[] = []
	lines.push(`# Research Driven Loop Report (${summary.runId})`)
	lines.push('')
	lines.push('## Product Brief')
	lines.push(`- image: ${summary.productBrief.imagePath}`)
	lines.push(`- product: ${summary.productBrief.productName}`)
	lines.push(`- category: ${summary.productBrief.category}`)
	lines.push(`- target age: ${summary.productBrief.targetAge}`)
	lines.push(`- promise: ${summary.productBrief.productPromise}`)
	lines.push('')
	lines.push('## Research Snapshot')
	lines.push(`- snapshot date: ${summary.researchBrief.snapshotDate}`)
	for (const source of summary.researchBrief.sourceUrls) {
		lines.push(`- source: ${source}`)
	}
	lines.push('')
	lines.push('## Team')
	for (const member of summary.team) {
		lines.push(`- ${member.title}: ${member.responsibility}`)
	}
	lines.push('')
	lines.push(`## Best Candidate`)
	lines.push(`- loop: ${String(summary.best.index)}`)
	lines.push(`- video: ${String(summary.best.videoPath)}`)
	lines.push(`- score: ${String(summary.best.score)}`)
	lines.push(`- signal: ${String(summary.best.trendSignal)}`)
	lines.push(`- headline: ${String(summary.best.headline)}`)
	lines.push(`- cta: ${String(summary.best.cta)}`)
	lines.push('')
	lines.push('## All Candidates')
	for (const candidate of summary.candidates) {
		lines.push(
			`- #${String(candidate.index)} | score=${String(candidate.score)} | signal=${String(candidate.trendSignal)} | validate=${String(candidate.validatePassed)}`,
		)
	}
	return lines.join('\n')
}

function wrapForOverlay(value: string, maxCharsPerLine: number): string {
	const trimmed = value.trim()
	if (trimmed.length <= maxCharsPerLine) {
		return trimmed
	}

	const words = trimmed.split(/\s+/)
	const lines: string[] = []
	let currentLine = ''

	for (const word of words) {
		const candidate = currentLine ? `${currentLine} ${word}` : word
		if (candidate.length <= maxCharsPerLine) {
			currentLine = candidate
			continue
		}
		if (currentLine) {
			lines.push(currentLine)
			currentLine = word
			continue
		}
		lines.push(word)
	}

	if (currentLine) {
		lines.push(currentLine)
	}

	return lines.join('\n')
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

function run(cmd: string, args: string[]): void {
	const result = spawnSync(cmd, args, { stdio: 'inherit', encoding: 'utf8' })
	if (result.status !== 0) {
		throw new Error(`${cmd} failed with status ${result.status}`)
	}
}

function runNode(args: string[]): void {
	run('node', args)
}

void main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
