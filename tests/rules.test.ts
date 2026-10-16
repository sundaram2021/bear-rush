import { describe, expect, it } from 'vitest'
import { CONFIG, FOOD_KINDS } from '../src/game/config'
import { applyDamage, createRun, eatFood, speedCap, tick } from '../src/game/rules'

describe('mountain hunt rules', () => {
  it('starts at 100% health and has no time-based ending', () => {
    let run = createRun()
    expect(run.health).toBe(100)
    expect('lives' in run).toBe(false)
    run = tick(run, 360, 0)
    expect(run.phase).toBe('playing')
    expect(run.health).toBe(100)
  })

  it('raises the available running speed over time and caps it fairly', () => {
    expect(speedCap(0)).toBe(CONFIG.run.baseSpeed)
    expect(speedCap(30)).toBeGreaterThan(speedCap(0))
    expect(speedCap(10_000)).toBe(CONFIG.run.maxSpeed)
    expect(speedCap(10_000)).toBeLessThanOrEqual(CONFIG.run.maxSpeed)
  })

  it('tracks distance, survival time and movement speed', () => {
    const run = tick(createRun(), 2, 8)
    expect(run.elapsed).toBe(2)
    expect(run.distance).toBe(16)
  })

  it('chips health by percentage and ends the run immediately at zero', () => {
    let run = createRun()
    let result = applyDamage(run, CONFIG.hazards.poisonDamage, 'poison')
    expect(result.healthLost).toBe(36)
    expect(result.gameOver).toBe(false)
    run = result.state
    expect(run.health).toBe(64)
    expect(run.phase).toBe('playing')

    result = applyDamage(run, CONFIG.hazards.trapDamage, 'trap')
    expect(result.healthLost).toBe(44)
    expect(result.gameOver).toBe(false)
    run = result.state
    expect(run.health).toBe(20)

    result = applyDamage(run, CONFIG.hazards.poisonDamage, 'poison')
    expect(result.healthLost).toBe(20)
    expect(result.gameOver).toBe(true)
    run = result.state
    expect(run.health).toBe(0)
    expect(run.phase).toBe('lost')
    expect(run.loseReason).toBe('poison')
  })

  it('accepts only positive finite damage and does not restore health', () => {
    const run = createRun()
    expect(applyDamage(run, 0, 'trap').state).toBe(run)
    expect(applyDamage(run, -20, 'trap').state).toBe(run)
    expect(applyDamage(run, Number.NaN, 'trap').state).toBe(run)
    expect(run.health).toBe(100)
  })

  it('retains the three land damage sources and adds river-only driftwood damage', () => {
    let run = createRun()
    for (const reason of ['poison', 'trap'] as const) {
      const result = applyDamage(run, 40, reason)
      expect(result.gameOver).toBe(false)
      run = result.state
    }
    const fall = applyDamage(run, 40, 'fall')
    expect(fall.gameOver).toBe(true)
    expect(fall.state.health).toBe(0)
    expect(fall.state.phase).toBe('lost')
    expect(fall.state.loseReason).toBe('fall')
    const logHit = applyDamage(createRun(), CONFIG.river.logDamage, 'river-log')
    expect(logHit.healthLost).toBe(CONFIG.river.logDamage)
    expect(logHit.state.health).toBe(100 - CONFIG.river.logDamage)
    const fatalLog = applyDamage({ ...createRun(), health: CONFIG.river.logDamage }, CONFIG.river.logDamage, 'river-log')
    expect(fatalLog.gameOver).toBe(true)
    expect(fatalLog.state.phase).toBe('lost')
    expect(fatalLog.state.loseReason).toBe('river-log')
  })

  it('supports all eight scored food types and combo multipliers', () => {
    let run = createRun()
    for (const kind of FOOD_KINDS) {
      const result = eatFood(run, kind)
      expect(result.points).toBeGreaterThan(0)
      run = result.state
      expect(run.tally[kind]).toBeGreaterThanOrEqual(1)
    }
    expect(run.collected).toBe(FOOD_KINDS.length)
    expect(run.score).toBeGreaterThan(0)
    expect(eatFood(run, 'moose').points).toBeGreaterThan(CONFIG.score.moose)
    expect(tick(run, CONFIG.score.comboWindow + 0.01, 0).combo).toBe(0)
  })

  it('freezes score, health and phase after health reaches zero', () => {
    let run = applyDamage(createRun(), 100, 'fall').state
    expect(run.health).toBe(0)
    expect(run.phase).toBe('lost')
    expect(tick(run, 1, 16)).toBe(run)
    expect(eatFood(run, 'salmon').points).toBe(0)
    expect(applyDamage(run, 20, 'poison').state).toBe(run)
  })
})
