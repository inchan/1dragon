import { access, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm'])
const IMAGE_MIN_WIDTH = 720
const IMAGE_MIN_HEIGHT = 720
const VIDEO_MIN_WIDTH = 720
const VIDEO_MIN_HEIGHT = 1280
const VIDEO_TARGET_WIDTH = 1080
const VIDEO_TARGET_HEIGHT = 1920
const VIDEO_MIN_DURATION_SECONDS = 5
const VIDEO_MAX_DURATION_SECONDS = 60
const VIDEO_MIN_FPS = 24

async function main() {
	const args = parseArgs(process.argv.slice(2))
	const timestamp = new Date().toISOString()
	const errors = []

	if (args.latest) {
		const latestSelection = await resolveLatestArtifacts(errors)

		if (!args.image) {
			args.image = latestSelection.imagePath
		}

		if (!args.video) {
			args.video = latestSelection.videoPath
		}
	}

	if (!args.image || !args.video) {
		for (const error of errors) {
			console.error(error)
		}

		printUsage()
		process.exitCode = 1
		return
	}

	const ffprobeCheck = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' })
	const ffprobeAvailable = ffprobeCheck.status === 0

	if (!ffprobeAvailable) {
		errors.push('ffprobe is required for media metadata validation but was not found in PATH.')
	}

	const image = await validateImage(args.image, ffprobeAvailable, errors)
	const video = await validateVideo(args.video, ffprobeAvailable, errors)
	const passed = errors.length === 0 && allChecksPassed(image.checks) && allChecksPassed(video.checks)
	const report = {
		timestamp,
		image,
		video,
		passed,
		errors,
	}

	if (args.out) {
		const outputPath = path.resolve(args.out)
		await mkdir(path.dirname(outputPath), { recursive: true })
		await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
	}

	printSummary(report, args.out)
	process.exitCode = passed ? 0 : 1
}

function parseArgs(argv) {
	const args = {}

	for (let index = 0; index < argv.length; index += 1) {
		const current = argv[index]

		if (current === '--latest') {
			args.latest = true
			continue
		}

		if (current === '--image' || current === '--video' || current === '--out') {
			const value = argv[index + 1]
			if (!value || value.startsWith('--')) {
				throw new Error(`Missing value for ${current}`)
			}

			args[current.slice(2)] = value
			index += 1
			continue
		}

		throw new Error(`Unknown argument: ${current}`)
	}

	return args
}

function printUsage() {
	console.error(
		'Usage: node tooling/validate-media.mjs --image <path> --video <path> [--out <path>] [--latest]',
	)
}

async function resolveLatestArtifacts(errors) {
	const artifactsDirectory = path.resolve('artifacts')
	let entries

	try {
		entries = await readdir(artifactsDirectory)
	} catch {
		errors.push(`Artifacts directory is not readable: ${artifactsDirectory}.`)
		return {
			imagePath: null,
			videoPath: null,
		}
	}

	const imagePath = await pickLatestArtifact(artifactsDirectory, entries, 'test-product-', '.png')
	const videoPath = await pickLatestArtifact(artifactsDirectory, entries, 'test-video-', '.mp4')

	if (!imagePath) {
		errors.push(`Missing latest test-product-*.png in ${artifactsDirectory}.`)
	}

	if (!videoPath) {
		errors.push(`Missing latest test-video-*.mp4 in ${artifactsDirectory}.`)
	}

	return {
		imagePath,
		videoPath,
	}
}

async function pickLatestArtifact(directoryPath, entries, prefix, suffix) {
	const matches = await Promise.all(
		entries
			.filter((entry) => entry.startsWith(prefix) && entry.endsWith(suffix))
			.map(async (entry) => ({
				name: entry,
				mtimeMs: (await stat(path.join(directoryPath, entry))).mtimeMs,
			})),
	)

	const latest = matches.sort((left, right) => right.mtimeMs - left.mtimeMs || right.name.localeCompare(left.name))[0]

	return latest ? path.join(directoryPath, latest.name) : null
}

async function validateImage(inputPath, ffprobeAvailable, errors) {
	const absolutePath = path.resolve(inputPath)
	const extension = path.extname(absolutePath).toLowerCase()
	const checks = createImageChecks()
	const metrics = {
		sizeBytes: 0,
		width: null,
		height: null,
	}

	const statResult = await validateFileBasics({
		absolutePath,
		extension,
		allowedExtensions: IMAGE_EXTENSIONS,
		checks,
		errors,
		label: 'Image',
	})

	if (!statResult.ok) {
		return {
			path: absolutePath,
			extension,
			checks,
			metrics,
		}
	}

	metrics.sizeBytes = statResult.sizeBytes

	if (!ffprobeAvailable) {
		checks.metadata = false
		checks.dimensions = false
		return {
			path: absolutePath,
			extension,
			checks,
			metrics,
		}
	}

	const metadata = probeMedia(absolutePath)
	if (!metadata.ok) {
		checks.metadata = false
		checks.dimensions = false
		errors.push(`Image ffprobe failed for ${absolutePath}: ${metadata.error}`)
		return {
			path: absolutePath,
			extension,
			checks,
			metrics,
		}
	}

	const stream = metadata.stream
	const width = Number(stream.width ?? 0)
	const height = Number(stream.height ?? 0)
	metrics.width = width
	metrics.height = height
	checks.metadata = width > 0 && height > 0
	checks.dimensions = width >= IMAGE_MIN_WIDTH && height >= IMAGE_MIN_HEIGHT

	if (!checks.metadata) {
		errors.push(`Image metadata missing width/height for ${absolutePath}.`)
	}

	if (!checks.dimensions) {
		errors.push(`Image dimensions must be at least ${IMAGE_MIN_WIDTH}x${IMAGE_MIN_HEIGHT}: ${width}x${height}.`)
	}

	return {
		path: absolutePath,
		extension,
		checks,
		metrics,
	}
}

async function validateVideo(inputPath, ffprobeAvailable, errors) {
	const absolutePath = path.resolve(inputPath)
	const extension = path.extname(absolutePath).toLowerCase()
	const checks = createVideoChecks()
	const metrics = {
		sizeBytes: 0,
		width: null,
		height: null,
		durationSeconds: null,
		fps: null,
	}

	const statResult = await validateFileBasics({
		absolutePath,
		extension,
		allowedExtensions: VIDEO_EXTENSIONS,
		checks,
		errors,
		label: 'Video',
	})

	if (!statResult.ok) {
		return {
			path: absolutePath,
			extension,
			checks,
			metrics,
		}
	}

	metrics.sizeBytes = statResult.sizeBytes

	if (!ffprobeAvailable) {
		checks.metadata = false
		checks.duration = false
		checks.resolution = false
		checks.fps = false
		return {
			path: absolutePath,
			extension,
			checks,
			metrics,
		}
	}

	const metadata = probeMedia(absolutePath)
	if (!metadata.ok) {
		checks.metadata = false
		checks.duration = false
		checks.resolution = false
		checks.fps = false
		errors.push(`Video ffprobe failed for ${absolutePath}: ${metadata.error}`)
		return {
			path: absolutePath,
			extension,
			checks,
			metrics,
		}
	}

	const stream = metadata.stream
	const format = metadata.format
	const width = Number(stream.width ?? 0)
	const height = Number(stream.height ?? 0)
	const durationSeconds = getDurationSeconds(stream, format)
	const fps = getFramesPerSecond(stream.avg_frame_rate ?? stream.r_frame_rate)

	metrics.width = width
	metrics.height = height
	metrics.durationSeconds = durationSeconds
	metrics.fps = fps

	checks.metadata = width > 0 && height > 0 && durationSeconds !== null && fps !== null
	checks.duration =
		durationSeconds !== null &&
		durationSeconds >= VIDEO_MIN_DURATION_SECONDS &&
		durationSeconds <= VIDEO_MAX_DURATION_SECONDS
	checks.resolution =
		(width === VIDEO_TARGET_WIDTH && height === VIDEO_TARGET_HEIGHT) ||
		(width >= VIDEO_MIN_WIDTH && height >= VIDEO_MIN_HEIGHT)
	checks.fps = fps !== null && fps >= VIDEO_MIN_FPS

	if (!checks.metadata) {
		errors.push(`Video metadata missing width/height/duration/fps for ${absolutePath}.`)
	}

	if (!checks.duration) {
		errors.push(
			`Video duration must be between ${VIDEO_MIN_DURATION_SECONDS} and ${VIDEO_MAX_DURATION_SECONDS} seconds: ${formatNumber(durationSeconds)}.`,
		)
	}

	if (!checks.resolution) {
		errors.push(
			`Video resolution must be exactly ${VIDEO_TARGET_WIDTH}x${VIDEO_TARGET_HEIGHT} or at least ${VIDEO_MIN_WIDTH}x${VIDEO_MIN_HEIGHT}: ${width}x${height}.`,
		)
	}

	if (!checks.fps) {
		errors.push(`Video FPS must be at least ${VIDEO_MIN_FPS}: ${formatNumber(fps)}.`)
	}

	return {
		path: absolutePath,
		extension,
		checks,
		metrics,
	}
}

function createImageChecks() {
	return {
		exists: false,
		readable: false,
		nonEmpty: false,
		extension: false,
		metadata: null,
		dimensions: null,
	}
}

function createVideoChecks() {
	return {
		exists: false,
		readable: false,
		nonEmpty: false,
		extension: false,
		metadata: null,
		duration: null,
		resolution: null,
		fps: null,
	}
}

async function validateFileBasics({ absolutePath, extension, allowedExtensions, checks, errors, label }) {
	try {
		await access(absolutePath, fsConstants.F_OK)
		checks.exists = true
	} catch {
		errors.push(`${label} file does not exist: ${absolutePath}`)
		return { ok: false, sizeBytes: 0 }
	}

	try {
		await access(absolutePath, fsConstants.R_OK)
		checks.readable = true
	} catch {
		errors.push(`${label} file is not readable: ${absolutePath}`)
		return { ok: false, sizeBytes: 0 }
	}

	const fileStat = await stat(absolutePath)
	checks.nonEmpty = fileStat.size > 0

	if (!checks.nonEmpty) {
		errors.push(`${label} file is empty: ${absolutePath}`)
	}

	checks.extension = allowedExtensions.has(extension)

	if (!checks.extension) {
		errors.push(
			`${label} extension must be one of ${Array.from(allowedExtensions).join(', ')}: ${extension || '(none)'}.`,
		)
	}

	return {
		ok: checks.nonEmpty && checks.extension,
		sizeBytes: fileStat.size,
	}
}

function probeMedia(inputPath) {
	const result = spawnSync(
		'ffprobe',
		[
			'-v',
			'error',
			'-print_format',
			'json',
			'-show_entries',
			'format=duration:stream=index,codec_type,width,height,avg_frame_rate,r_frame_rate',
			'-select_streams',
			'v:0',
			inputPath,
		],
		{ encoding: 'utf8' },
	)

	if (result.status !== 0) {
		return {
			ok: false,
			error: result.stderr.trim() || 'Unknown ffprobe error',
		}
	}

	try {
		const payload = JSON.parse(result.stdout)
		return {
			ok: true,
			stream: payload.streams?.[0] ?? {},
			format: payload.format ?? {},
		}
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Invalid ffprobe JSON output',
		}
	}
}

function getDurationSeconds(stream, format) {
	const candidate = stream.duration ?? format.duration
	if (candidate === undefined || candidate === null) {
		return null
	}

	const duration = Number(candidate)
	return Number.isFinite(duration) ? duration : null
}

function getFramesPerSecond(rate) {
	if (typeof rate !== 'string' || rate.length === 0) {
		return null
	}

	const [numeratorRaw, denominatorRaw] = rate.split('/')
	const numerator = Number(numeratorRaw)
	const denominator = denominatorRaw === undefined ? 1 : Number(denominatorRaw)

	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
		return null
	}

	return numerator / denominator
}

function allChecksPassed(checks) {
	return Object.values(checks).every((value) => value === true)
}

function formatNumber(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 'n/a'
	}

	return value.toFixed(2)
}

function printSummary(report, outputPath) {
	const status = report.passed ? 'PASS' : 'FAIL'
	const imageDimensions =
		report.image.metrics.width && report.image.metrics.height
			? `${report.image.metrics.width}x${report.image.metrics.height}`
			: 'n/a'
	const videoResolution =
		report.video.metrics.width && report.video.metrics.height
			? `${report.video.metrics.width}x${report.video.metrics.height}`
			: 'n/a'
	const videoDuration = formatNumber(report.video.metrics.durationSeconds)
	const videoFps = formatNumber(report.video.metrics.fps)
	const outputSuffix = outputPath ? ` | report=${path.resolve(outputPath)}` : ''

	console.log(
		`Media validation ${status} | image=${path.basename(report.image.path)} ${imageDimensions} | video=${path.basename(report.video.path)} ${videoResolution} ${videoDuration}s ${videoFps}fps${outputSuffix}`,
	)
}

main().catch((error) => {
	if (error instanceof Error) {
		console.error(error.message)
	} else {
		console.error('Unknown validation error')
	}

	process.exitCode = 1
})
