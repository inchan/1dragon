import {
	buildValidationPayload,
	listValidationCaseNames,
	validateAgenticResponse,
} from './agentic-validation-cases.mjs'

const DEFAULT_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001'
const DEFAULT_COOKIE = process.env.SESSION_COOKIE ?? ''

function parseArgs(argv) {
	const args = {
		baseUrl: DEFAULT_BASE_URL,
		cookie: DEFAULT_COOKIE,
		cases: listValidationCaseNames(),
		verifyDuplicate: true,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index]

		if (token === '--base-url') {
			args.baseUrl = argv[index + 1] ?? args.baseUrl
			index += 1
			continue
		}

		if (token === '--cookie') {
			args.cookie = argv[index + 1] ?? args.cookie
			index += 1
			continue
		}

		if (token === '--cases') {
			args.cases = (argv[index + 1] ?? '')
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
			index += 1
			continue
		}

		if (token === '--no-duplicate') {
			args.verifyDuplicate = false
		}
	}

	return args
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message)
	}
}

async function createJob({ baseUrl, cookie, caseName, idempotencyKey }) {
	const payload = buildValidationPayload(caseName, { idempotencyKey })
	const response = await fetch(`${baseUrl}/api/v1/media/jobs`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Cookie: cookie,
			'Idempotency-Key': payload.idempotencyKey,
		},
		body: JSON.stringify(payload),
	})
	const body = await response.json()

	return {
		status: response.status,
		body,
		payload,
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2))

	if (!options.cookie) {
		throw new Error('SESSION_COOKIE or --cookie is required.')
	}

	if (options.cases.length === 0) {
		throw new Error('At least one case must be selected.')
	}

	console.log(`Agentic smoke test start: ${options.cases.join(', ')}`)
	console.log(`Base URL: ${options.baseUrl}`)

	for (const caseName of options.cases) {
		const idempotencyKey = `smoke-${caseName}-${Date.now()}`
		console.log(`\n[CASE] ${caseName}`)

		const created = await createJob({
			baseUrl: options.baseUrl,
			cookie: options.cookie,
			caseName,
			idempotencyKey,
		})

		assert(
			created.status === 201 || created.status === 200,
			`Expected HTTP 200/201 but received ${created.status}.`,
		)

		const validation = validateAgenticResponse(caseName, created.body)
		assert(validation.ok, `Validation failed: ${validation.errors.join(' ')}`)
		console.log(`created job=${validation.summary.jobId} workflow=${validation.summary.workflow}`)

		if (!options.verifyDuplicate) {
			continue
		}

		const duplicated = await createJob({
			baseUrl: options.baseUrl,
			cookie: options.cookie,
			caseName,
			idempotencyKey,
		})

		assert(duplicated.status === 200, `Expected duplicate HTTP 200 but received ${duplicated.status}.`)

		const duplicateValidation = validateAgenticResponse(caseName, duplicated.body)
		assert(
			duplicateValidation.ok,
			`Duplicate validation failed: ${duplicateValidation.errors.join(' ')}`,
		)
		assert(
			duplicateValidation.summary.isDuplicate === true,
			'Expected duplicate response to set isDuplicate=true.',
		)
		assert(
			duplicateValidation.summary.workflow === validation.summary.workflow,
			'Expected duplicate response to keep the same workflow.',
		)

		console.log(`duplicate confirmed job=${duplicateValidation.summary.jobId}`)
	}

	console.log('\nAgentic smoke test passed.')
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
