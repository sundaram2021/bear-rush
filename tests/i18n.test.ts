import { describe, expect, it } from 'vitest'
import en from '../src/i18n/en.json'
import { detectLocale, resolveLocale } from '../src/engine/i18n'

const required = [
  'game.title', 'game.tagline', 'menu.play', 'menu.settings', 'menu.retry', 'controls.title',
  'controls.desktop', 'controls.touch', 'controls.stalk', 'controls.goal', 'controls.hazards', 'controls.huntButton', 'hunt.ready',
  'hud.score', 'hud.food', 'hud.distance', 'hud.health', 'hud.map', 'hud.map.label', 'hud.map.wind', 'hud.map.legend', 'weather.clear', 'weather.snow', 'pause.title',
  'settings.title', 'settings.ambience', 'settings.effects', 'settings.mute', 'settings.privacy',
  'results.title', 'results.food', 'results.score', 'results.distance', 'results.time', 'results.best',
  'food.salmon', 'food.honey', 'food.fawn', 'food.deer', 'food.elk', 'food.moose',
]

describe('English-only mountain-hunt copy', () => {
  it('ignores browser and saved locale choices', () => {
    expect(detectLocale(['zh-CN', 'en'])).toBe('en')
    expect(detectLocale(['fr-FR'])).toBe('en')
    expect(resolveLocale('zh-CN', ['zh-CN'])).toBe('en')
    expect(resolveLocale(undefined, ['zh-CN'])).toBe('en')
  })

  it('includes all foods, only the requested dangers, controls and main screens', () => {
    for (const key of required) expect(en[key as keyof typeof en], key).toBeTruthy()
    expect(en['controls.hazards'].toLowerCase()).toContain('poisonous food')
    expect(en['controls.hazards']).toContain('trench')
    expect(en['controls.hazards']).toContain('bear traps')
    expect(en['controls.hazards']).toContain('0%')
    expect(en['controls.desktop']).toContain('Ctrl stalks')
    expect(en['controls.touch']).toContain('gently')
  })

  it('does not leave unresolved copy placeholders', () => {
    for (const [key, value] of Object.entries(en)) {
      const opens = (value.match(/\{/g) ?? []).length
      const closes = (value.match(/\}/g) ?? []).length
      expect(opens, key).toBe(closes)
    }
  })
})
