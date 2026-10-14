import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG, DEFAULT_CONFIG } from '../src/game/config'
import { Player } from '../src/game/player'
import { createRun } from '../src/game/rules'
import { tuning } from '../src/game/tuning'

const defaults = Object.fromEntries(tuning.controls.map(control => [control.id, control.default]))
afterEach(() => {
  tuning.apply(defaults)
  tuning.activate('run')
})

describe('Three.js runner tuning', () => {
  it('validates complete patches before committing and preserves source defaults', () => {
    const before = tuning.read()
    for (const patch of [{ 'run.maxSpeed': 20, 'camera.fov': 999 }, { 'run.speedRamp': 0.101 }, { 'player.moveSpeed': '8' }, { unknown: 4 }]) {
      expect(() => tuning.apply(patch)).toThrow()
      expect(tuning.read()).toEqual(before)
    }
    tuning.apply({ 'player.moveSpeed': 14 })
    expect(CONFIG.player.moveSpeed).toBe(14)
    expect(DEFAULT_CONFIG.player.moveSpeed).toBe(11)
  })

  it('holds next-run values until a new run starts', () => {
    tuning.apply({ 'run.lives': 4, 'run.startSpeed': 16 })
    expect(CONFIG.run.lives).toBe(3)
    expect(createRun().lives).toBe(3)
    tuning.activate('run')
    expect(CONFIG.run.lives).toBe(4)
    expect(CONFIG.run.startSpeed).toBe(16)
    expect(createRun().lives).toBe(4)
  })

  it('changes actual lateral steering and keeps the player within river bounds', () => {
    const player = new Player()
    player.step(0.2, 1)
    expect(player.x).toBeGreaterThan(0)
    for (let i = 0; i < 30; i += 1) player.step(0.1, 1)
    expect(player.x).toBeLessThanOrEqual(CONFIG.player.maxX)
  })

  it('requires a speed cap at least as large as starting speed', () => {
    expect(() => tuning.apply({ 'run.startSpeed': 18, 'run.maxSpeed': 18 })).not.toThrow()
    expect(() => tuning.apply({ 'run.startSpeed': 19, 'run.maxSpeed': 18 })).toThrow()
  })
})

describe('runner score eligibility', () => {
  it('ignores camera changes but marks gameplay changes when activated', () => {
    tuning.activate('run')
    tuning.apply({ 'camera.fov': 70 })
    expect(tuning.unranked).toBe(false)
    tuning.apply({ 'player.moveSpeed': 12 })
    expect(tuning.unranked).toBe(true)
    tuning.apply(defaults)
    expect(tuning.unranked).toBe(true)
    tuning.activate('run')
    expect(tuning.unranked).toBe(false)
  })
})
