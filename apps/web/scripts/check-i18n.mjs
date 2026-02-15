#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const LOCALES_DIR = resolve(import.meta.dirname, '../src/locales')
const LANGUAGES = ['en', 'ko', 'ja']

function flattenKeys(obj, prefix = '') {
	const keys = []
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key
		if (typeof value === 'object' && value !== null) {
			keys.push(...flattenKeys(value, fullKey))
		} else {
			keys.push(fullKey)
		}
	}
	return keys
}

function loadLocaleKeys(lang) {
	const dir = join(LOCALES_DIR, lang)
	const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
	const allKeys = new Set()

	for (const file of files) {
		const content = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
		for (const key of flattenKeys(content)) {
			allKeys.add(`${file.replace('.json', '')}:${key}`)
		}
	}

	return allKeys
}

let hasErrors = false

const keysByLang = {}
for (const lang of LANGUAGES) {
	keysByLang[lang] = loadLocaleKeys(lang)
}

const allKeys = new Set()
for (const keys of Object.values(keysByLang)) {
	for (const key of keys) {
		allKeys.add(key)
	}
}

for (const key of [...allKeys].sort()) {
	const missing = LANGUAGES.filter((lang) => !keysByLang[lang].has(key))
	if (missing.length > 0) {
		console.error(`MISSING: "${key}" in [${missing.join(', ')}]`)
		hasErrors = true
	}
}

if (hasErrors) {
	process.exit(1)
} else {
	console.log(`All ${allKeys.size} keys present in all ${LANGUAGES.length} languages.`)
}
