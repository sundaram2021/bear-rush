import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG, DEFAULT_CONFIG } from '../src/game/config'
import { tuning } from '../src/game/tuning'

const defaults = Object.fromEntries(tuning.controls.map(control => [control.id, control.default]))
afterEach(() => { tuning.apply(defaults); tuning.activate('run') })

describe('mountain-hunt tuning', () => {
  it('validates complete patches and preserves source defaults', () => {
    const before = tuning.read()
    for (const patch of [{ 'run.maxSpeed': 7, 'camera.fov': 999 }, { 'run.speedRamp': 0.011 }, { 'player.moveSpeed': '8' }, { unknown: 4 }]) {
      expect(() => tuning.apply(patch)).toThrow()
      expect(tuning.read()).toEqual(before)
    }
    tuning.apply({ 'player.moveSpeed': 6.2 })
    expect(CONFIG.player.moveSpeed).toBe(6.2)
    expect(DEFAULT_CONFIG.player.moveSpeed).toBe(6.6)
  })

  it('holds next-run starting lives and speed until a hunt starts', () => {
    tuning.apply({ 'run.lives': 4, 'run.baseSpeed': 6 })
    expect(CONFIG.run.lives).toBe(3)
    expect(CONFIG.run.baseSpeed).toBe(6.6)
    tuning.activate('run')
    expect(CONFIG.run.lives).toBe(4)
    expect(CONFIG.run.baseSpeed).toBe(6)
  })

  it('requires the top speed to be at least the starting speed', () => {
    expect(() => tuning.apply({ 'run.baseSpeed': 8, 'run.maxSpeed': 8 })).not.toThrow()
    expect(() => tuning.apply({ 'run.baseSpeed': 9, 'run.maxSpeed': 8 })).toThrow()
  })

  it('ignores camera changes for score eligibility but marks gameplay changes unranked', () => {
    tuning.activate('run')
    tuning.apply({ 'camera.fov': 63 })
    expect(tuning.unranked).toBe(false)
    tuning.apply({ 'player.moveSpeed': 6.2 })
    expect(tuning.unranked).toBe(true)
    tuning.apply(defaults)
    expect(tuning.unranked).toBe(true)
    tuning.activate('run')
    expect(tuning.unranked).toBe(false)
  })
})
