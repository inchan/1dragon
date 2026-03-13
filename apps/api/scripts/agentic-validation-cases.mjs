import { pathToFileURL } from 'node:url'

const DEFAULT_IMAGE_URL =
	'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1080&q=80'

const VALIDATION_CASES = {
	baseline: {
		description: 'Simple single-platform request should resolve to baseline workflow.',
		payload: {
			stylePreset: 'SIMPLE',
			platforms: ['TIKTOK'],
			duration: 15,
			productCategory: 'OTHER',
			agenticMode: 'AUTO',
			autoShortformWorkflow: false,
			copy: {
				hook: '기본 상품 소개',
				description: '단일 상품 컷',
				cta: '지금 확인',
			},
		},
		expected: {
			workflow: 'BASELINE',
			shortformWorkflow: false,
			wearableComposite: false,
			stepIncludes: ['direct_generate', 'quality_gate'],
		},
	},
	'prompt-chain': {
		description: 'Keyword-rich or longer beauty request should resolve to prompt chain.',
		payload: {
			stylePreset: 'PREMIUM',
			platforms: ['INSTAGRAM_REELS'],
			duration: 20,
			productCategory: 'BEAUTY',
			keywords: ['glow', 'serum'],
			agenticMode: 'AUTO',
			autoShortformWorkflow: false,
			copy: {
				hook: '광채 세럼 루틴',
				description: '프리미엄 스킨케어 소개',
				cta: '자세히 보기',
			},
		},
		expected: {
			workflow: 'PROMPT_CHAIN',
			shortformWorkflow: false,
			wearableComposite: false,
			stepIncludes: ['analyze_brief', 'build_prompt', 'generate_video', 'quality_gate'],
		},
	},
	orchestrator: {
		description: 'Fashion request with persona/creative context should resolve to orchestrator-workers.',
		payload: {
			stylePreset: 'TRENDY',
			platforms: ['TIKTOK', 'INSTAGRAM_REELS'],
			duration: 15,
			productCategory: 'FASHION',
			agenticMode: 'AUTO',
			autoShortformWorkflow: true,
			personaId: '11111111-1111-4111-8111-111111111111',
			creativeContext: {
				location: 'Seongsu',
				profession: 'fashion model',
				identity: 'Korean adult woman',
				traits: ['urban runway'],
				visualStyle: 'editorial streetwear',
			},
			keywords: ['ootd', 'spring look'],
			copy: {
				hook: '성수 OOTD 시작',
				description: '봄 스트리트 룩',
				cta: '지금 확인',
			},
		},
		expected: {
			workflow: 'ORCHESTRATOR_WORKERS',
			shortformWorkflow: true,
			wearableComposite: true,
			stepIncludes: [
				'route_request',
				'wearable_composite_worker',
				'shortform_planner_worker',
				'video_generation_worker',
				'quality_gate',
			],
		},
	},
	wearable: {
		description: 'Accessory footwear request should enable wearable composite orchestration.',
		payload: {
			stylePreset: 'TRENDY',
			platforms: ['TIKTOK'],
			duration: 15,
			productCategory: 'ACCESSORIES',
			agenticMode: 'AUTO',
			autoShortformWorkflow: false,
			keywords: ['sneakers', 'limited drop'],
			copy: {
				hook: '신상 스니커즈 공개',
				description: '풋웨어 중심 숏폼',
				cta: '지금 확인',
			},
		},
		expected: {
			workflow: 'ORCHESTRATOR_WORKERS',
			shortformWorkflow: false,
			wearableComposite: true,
			stepIncludes: ['route_request', 'wearable_composite_worker', 'video_generation_worker', 'quality_gate'],
		},
	},
	'manual-baseline': {
		description: 'Manual baseline mode should disable advanced orchestration.',
		payload: {
			stylePreset: 'TRENDY',
			platforms: ['TIKTOK'],
			duration: 15,
			productCategory: 'FASHION',
			agenticMode: 'BASELINE',
			autoShortformWorkflow: true,
			keywords: ['shoe'],
			copy: {
				hook: '수동 baseline 확인',
				description: '강제 단순 경로',
				cta: '지금 확인',
			},
		},
		expected: {
			workflow: 'BASELINE',
			shortformWorkflow: false,
			wearableComposite: false,
			stepIncludes: ['direct_generate', 'quality_gate'],
		},
	},
}

export function listValidationCaseNames() {
	return Object.keys(VALIDATION_CASES)
}

export function getValidationCase(name) {
	const found = VALIDATION_CASES[name]
	if (!found) {
		throw new Error(
			`Unknown validation case: ${name}. Available cases: ${listValidationCaseNames().join(', ')}`,
		)
	}

	return found
}

export function buildValidationPayload(name, options = {}) {
	const validationCase = getValidationCase(name)
	const imageUrl = options.imageUrl?.trim() ? options.imageUrl.trim() : DEFAULT_IMAGE_URL
	const idempotencyKey =
		options.idempotencyKey?.trim()
			? options.idempotencyKey.trim()
			: `agentic-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

	return {
		imageUrl,
		idempotencyKey,
		...validationCase.payload,
	}
}

export function validateAgenticResponse(name, response) {
	const validationCase = getValidationCase(name)
	const errors = []

	if (!response || typeof response !== 'object') {
		return { ok: false, errors: ['Response is not an object.'] }
	}

	if (response.success !== true) {
		errors.push(`Expected success=true but received ${String(response.success)}.`)
	}

	const data = response.data
	if (!data || typeof data !== 'object') {
		errors.push('Response data is missing.')
		return { ok: false, errors }
	}

	const plan = data.agenticPlan
	if (!plan || typeof plan !== 'object') {
		errors.push('Response data.agenticPlan is missing.')
		return { ok: false, errors }
	}

	if (plan.workflow !== validationCase.expected.workflow) {
		errors.push(
			`Expected workflow=${validationCase.expected.workflow} but received ${String(plan.workflow)}.`,
		)
	}

	if (Boolean(plan.features?.shortformWorkflow) !== validationCase.expected.shortformWorkflow) {
		errors.push(
			`Expected features.shortformWorkflow=${String(validationCase.expected.shortformWorkflow)} but received ${String(plan.features?.shortformWorkflow)}.`,
		)
	}

	if (Boolean(plan.features?.wearableComposite) !== validationCase.expected.wearableComposite) {
		errors.push(
			`Expected features.wearableComposite=${String(validationCase.expected.wearableComposite)} but received ${String(plan.features?.wearableComposite)}.`,
		)
	}

	for (const step of validationCase.expected.stepIncludes) {
		if (!Array.isArray(plan.steps) || !plan.steps.includes(step)) {
			errors.push(`Expected plan.steps to include "${step}".`)
		}
	}

	if (typeof data.jobId !== 'string' || data.jobId.length === 0) {
		errors.push('Response data.jobId is missing.')
	}

	return {
		ok: errors.length === 0,
		errors,
		summary: {
			jobId: data.jobId,
			workflow: plan.workflow,
			shortformWorkflow: Boolean(plan.features?.shortformWorkflow),
			wearableComposite: Boolean(plan.features?.wearableComposite),
			isDuplicate: data.isDuplicate === true,
		},
	}
}

function printUsage() {
	console.log(
		[
			'Usage:',
			'  node agentic-validation-cases.mjs list',
			'  node agentic-validation-cases.mjs payload <case> [imageUrl] [idempotencyKey]',
			'  node agentic-validation-cases.mjs validate <case>',
		].join('\n'),
	)
}

async function runCli() {
	const [, , command, caseName, imageUrl, idempotencyKey] = process.argv

	if (!command) {
		printUsage()
		process.exitCode = 1
		return
	}

	if (command === 'list') {
		console.log(listValidationCaseNames().join('\n'))
		return
	}

	if (command === 'payload') {
		if (!caseName) {
			throw new Error('Case name is required for payload command.')
		}

		const payload = buildValidationPayload(caseName, { imageUrl, idempotencyKey })
		console.log(JSON.stringify(payload))
		return
	}

	if (command === 'validate') {
		if (!caseName) {
			throw new Error('Case name is required for validate command.')
		}

		const chunks = []
		for await (const chunk of process.stdin) {
			chunks.push(chunk)
		}

		const raw = Buffer.concat(chunks).toString('utf8').trim()
		const parsed = JSON.parse(raw)
		const result = validateAgenticResponse(caseName, parsed)

		if (!result.ok) {
			for (const error of result.errors) {
				console.error(`- ${error}`)
			}
			process.exitCode = 1
			return
		}

		console.log(JSON.stringify(result.summary))
		return
	}

	throw new Error(`Unknown command: ${command}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	runCli().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(1)
	})
}
