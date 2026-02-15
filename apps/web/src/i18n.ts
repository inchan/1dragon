import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import koCommon from './locales/ko/common.json'
import jaCommon from './locales/ja/common.json'

const resources = {
	en: { translation: enCommon },
	ko: { translation: koCommon },
	ja: { translation: jaCommon },
}

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'ko',
		supportedLngs: ['en', 'ko', 'ja'],
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ['navigator', 'htmlTag'],
			caches: ['localStorage'],
		},
	})

export default i18n
