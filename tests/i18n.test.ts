import { describe, expect, it } from 'vitest'
import en from '../src/i18n/en.json'
import { detectLocale, resolveLocale } from '../src/engine/i18n'

const required = [
  'game.title', 'game.tagline', 'menu.play', 'menu.settings', 'menu.retry', 'controls.title',
  'controls.desktop', 'controls.touch', 'controls.goal', 'hud.fish', 'hud.score', 'hud.distance',
  'hud.speed', 'pause.title', 'settings.title', 'settings.water', 'settings.effects', 'settings.mute',
  'settings.privacy', 'results.title', 'results.fish', 'results.score', 'results.distance', 'results.time', 'results.best',
]

describe('English-only game copy', () => {
  it('ignores browser and saved locale choices', () => {
    expect(detectLocale(['zh-CN', 'en'])).toBe('en')
    expect(detectLocale(['fr-FR'])).toBe('en')
    expect(resolveLocale('zh-CN', ['zh-CN'])).toBe('en')
    expect(resolveLocale(undefined, ['zh-CN'])).toBe('en')
  })

  it('includes copy for the playable loop and all primary screens', () => {
    for (const key of required) expect(en[key as keyof typeof en], key).toBeTruthy()
  })

  it('does not leave unresolved copy placeholders', () => {
    for (const [key, value] of Object.entries(en)) {
      const opens = (value.match(/\{/g) ?? []).length
      const closes = (value.match(/\}/g) ?? []).length
      expect(opens, key).toBe(closes)
    }
  })
})
