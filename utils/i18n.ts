import { ref, computed } from 'vue'
import browser from 'webextension-polyfill'
import { en } from '@/locales/en'
import { zhCN } from '@/locales/zh-CN'
import type { Locale } from '@/locales'

const STORAGE_KEY = 'app_language'

// Available locale packs
const locales: Record<string, Locale> = {
  'en': en,
  'zh-CN': zhCN
}

// Current language (defaults to English; language switching is optional)
const currentLanguage = ref<string>('en')

/**
 * Load the language preference from browser.storage.sync
 */
export async function loadLanguage() {
  try {
    // Use browser.storage.sync instead of localStorage so popup and content script stay in sync
    const result = await browser.storage.sync.get(STORAGE_KEY)
    const stored = result[STORAGE_KEY]

    if (stored && locales[stored]) {
      currentLanguage.value = stored
      console.log('[i18n] Loaded language:', stored)
    } else {
      // Fallback to English when nothing stored
      currentLanguage.value = 'en'
      console.log('[i18n] Using default language: en')
    }
  } catch (error) {
    console.error('[i18n] Failed to load language:', error)
    // Fall back to English when storage access fails
    currentLanguage.value = 'en'
  }
}

/**
 * Switch application language
 * @param lang language code such as 'en' or 'zh-CN'
 */
export async function setLanguage(lang: string) {
  if (locales[lang]) {
    currentLanguage.value = lang
    try {
      // Persist via browser.storage.sync to keep every context aligned
      await browser.storage.sync.set({ [STORAGE_KEY]: lang })
      console.log('[i18n] Language switched:', lang)
    } catch (error) {
      console.error('[i18n] Failed to persist language:', error)
    }
  } else {
    console.warn('[i18n] Unsupported language:', lang)
  }
}

/**
 * Retrieve value from a dotted path such as "common.save"
 * @param obj locale object
 * @param path path segments joined by dots
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let value = obj

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return undefined
    }
  }

  return value
}

/**
 * Translation helper
 * @param key translation key such as 'common.save'
 * @param params replacement parameters, e.g. { count: 3 }
 * @returns translated string or the key when missing
 *
 * @example
 * t('common.save')  // => 'Save'
 * t('knowledge.enabled_count', { count: 3 })  // => '3 enabled'
 */
export function t(key: string, params?: Record<string, any>): string {
  const locale = locales[currentLanguage.value] || locales['en']
  let value = getNestedValue(locale, key)

  // Missing translations fall back to the key
  if (value === undefined) {
    console.warn(`[i18n] Missing translation: ${key}`)
    return key
  }

  // Non-string values also fall back to the key
  if (typeof value !== 'string') {
    console.warn(`[i18n] Translation is not a string: ${key}`)
    return key
  }

  // Simple placeholder replacement
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      const placeholder = `{${paramKey}}`
      value = value.replace(new RegExp(placeholder, 'g'), String(paramValue))
    })
  }

  return value
}

/**
 * Vue composable for consuming i18n utilities
 *
 * @example
 * const { t, currentLanguage, setLanguage, availableLanguages } = useI18n()
 *
 * <button>{{ t('common.save') }}</button>
 * <select v-model="language" @change="setLanguage(language)">
 *   <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
 *     {{ lang.name }}
 *   </option>
 * </select>
 */
export function useI18n() {
  // Available language choices
  const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' }
  ]

  return {
    t,
    currentLanguage: computed(() => currentLanguage.value),
    setLanguage,
    availableLanguages: languageOptions,
    loadLanguage
  }
}
