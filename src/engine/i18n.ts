import en from '../i18n/en.json'
import type { Locale } from './save'

export type Dictionary = Record<string, string>

/** This game intentionally ships English only; browser and saved locales never change the UI. */
export function detectLocale(_languages: readonly string[] | undefined): Locale {
  return 'en'
}

export function resolveLocale(_saved: string | undefined, _languages: readonly string[] | undefined): Locale {
  return 'en'
}

export class I18n {
  readonly locale: Locale = 'en'
  private listeners = new Set<(locale: Locale) => void>()

  constructor(_locale: Locale = 'en') {
    document.documentElement.lang = 'en'
  }

  t(key: string, vars: Record<string, string | number> = {}): string {
    const text = (en as Dictionary)[key] ?? key
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
  }

  set(_locale: Locale): void {
    // No language selector is exposed; the game remains English-only.
  }

  onChange(fn: (locale: Locale) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const DICTIONARY_KEYS = { en: Object.keys(en) }
