import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type CliArgs = Record<string, string | boolean>

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPTS_DIR, '../../..')
const ARTIFACTS_ROOT = path.join(REPO_ROOT, 'artifacts', 'live-media-smoke')

export function parseCliArgs(argv: string[]): CliArgs {
	const args: CliArgs = {}

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index]
		if (!token?.startsWith('--')) {
			continue
		}

		const key = token.slice(2)
		const next = argv[index + 1]
		if (!next || next.startsWith('--')) {
			args[key] = true
			continue
		}

		args[key] = next
		index += 1
	}

	return args
}

export function getStringArg(args: CliArgs, key: string, fallback?: string): string | undefined {
	const value = args[key]
	if (typeof value === 'string' && value.trim().length > 0) {
		return value.trim()
	}

	return fallback
}

export function getNumberArg(args: CliArgs, key: string, fallback: number): number {
	const value = getStringArg(args, key)
	if (!value) {
		return fallback
	}

	const parsed = Number.parseInt(value, 10)
	return Number.isFinite(parsed) ? parsed : fallback
}

export function hasFlag(args: CliArgs, key: string): boolean {
	return args[key] === true
}

export function requireEnv(...names: string[]): string {
	for (const name of names) {
		const value = process.env[name]?.trim()
		if (value) {
			return value
		}
	}

	throw new Error(`Missing required environment variable. Expected one of: ${names.join(', ')}`)
}

export function createRunContext(prefix: string, name?: string): {
	readonly runId: string
	readonly runDir: string
	readonly startedAt: string
} {
	const startedAt = new Date().toISOString()
	const timestamp = startedAt.replace(/[:.]/g, '-')
	const runId = `${timestamp}-${prefix}${name ? `-${slugify(name)}` : ''}`
	const runDir = path.join(ARTIFACTS_ROOT, runId)
	fs.mkdirSync(runDir, { recursive: true })

	return {
		runId,
		runDir,
		startedAt,
	}
}

export function writeJson(filePath: string, data: unknown): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true })
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

export function writeText(filePath: string, value: string): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true })
	fs.writeFileSync(filePath, value)
}

export function copyFile(sourcePath: string, destinationPath: string): void {
	fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
	fs.copyFileSync(sourcePath, destinationPath)
}

export function ensureReadableFile(filePath: string): string {
	const resolved = path.resolve(filePath)
	if (!fs.existsSync(resolved)) {
		throw new Error(`Input file not found: ${resolved}`)
	}

	return resolved
}

export function detectMimeType(filePath: string): string {
	const extension = path.extname(filePath).toLowerCase()
	switch (extension) {
		case '.png':
			return 'image/png'
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg'
		case '.webp':
			return 'image/webp'
		default:
			return 'application/octet-stream'
	}
}

export function formatDurationMs(durationMs: number): string {
	if (durationMs < 1000) {
		return `${durationMs}ms`
	}

	return `${(durationMs / 1000).toFixed(1)}s`
}

export function printHeader(title: string): void {
	console.log('='.repeat(66))
	console.log(`  ${title}`)
	console.log('='.repeat(66))
}

export function printUsage(lines: ReadonlyArray<string>): void {
	for (const line of lines) {
		console.log(line)
	}
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48)
}
