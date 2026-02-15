import { describe, expect, it } from 'vitest'
import {
	AgeRangeVO,
	BodyTypeVO,
	GenderVO,
	ModelPersona,
	PersonaPreset,
	StyleVO,
} from './entities.js'

describe('model-persona/entities', () => {
	it('creates model persona and label', () => {
		const persona = new ModelPersona({
			gender: new GenderVO('female'),
			ageRange: new AgeRangeVO('young_adult'),
			bodyType: new BodyTypeVO('slim'),
			style: new StyleVO('casual'),
		})

		expect(persona.toLabel()).toBe('FEMALE/YOUNG_ADULT/SLIM/CASUAL')
	})

	it('throws when body type is invalid', () => {
		expect(() => {
			new BodyTypeVO('athletic')
		}).toThrowError('Invalid body type: athletic')
	})

	it('interpolates persona preset template', () => {
		const preset = new PersonaPreset({
			id: 'preset_1',
			name: '여성 캐주얼',
			modelPersona: new ModelPersona({
				gender: new GenderVO('female'),
				ageRange: new AgeRangeVO('young_adult'),
				bodyType: new BodyTypeVO('slim'),
				style: new StyleVO('casual'),
			}),
			imagenPromptTemplate:
				'{{gender}} {{age_range}} {{style}} model with {{product_name}} in {{product_category}}. keywords: {{product_keywords}}',
		})

		const prompt = preset.interpolatePrompt({
			productName: '플로럴 원피스',
			productCategory: 'FASHION',
			productKeywords: ['floral', 'dress'],
		})

		expect(prompt).toContain('FEMALE YOUNG_ADULT CASUAL model')
		expect(prompt).toContain('플로럴 원피스')
		expect(prompt).toContain('floral, dress')
	})
})
