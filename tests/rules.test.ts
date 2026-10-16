import { describe, expect, it } from 'vitest'
import { CONFIG, FOOD_KINDS } from '../src/game/config'
import { applyDamage, createRun, eatFood, loseLife, speedCap, tick } from '../src/game/rules'

describe('mountain hunt rules', () => {
  it('starts with three lives and has no time-based ending', () => {
    let run = createRun()
    expect(run.lives).toBe(3)
    expect(run.health).toBe(100)
    run = tick(run, 360, 0)
    expect(run.phase).toBe('playing')
    expect(run.lives).toBe(3)
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
    expect(run.lives).toBe(3)
  })

  it('chips health by percent and removes a life only when health reaches zero', () => {
    let run = createRun()
    let result = applyDamage(run, CONFIG.hazards.poisonDamage, 'poison')
    expect(result.healthLost).toBe(36)
    expect(result.lifeLost).toBe(false)
    run = result.state
    expect(run.health).toBe(64)
    expect(run.lives).toBe(3)

    result = applyDamage(run, CONFIG.hazards.trapDamage, 'trap')
    expect(result.lifeLost).toBe(false)
    run = result.state
    expect(run.health).toBe(20)

    result = applyDamage(run, CONFIG.hazards.poisonDamage, 'poison')
    expect(result.healthLost).toBe(20)
    expect(result.lifeLost).toBe(true)
    run = result.state
    expect(run.lives).toBe(2)
    expect(run.health).toBe(CONFIG.hazards.healthAfterLife)
    expect(run.phase).toBe('playing')
  })

  it('supports all six scored food types and combo multipliers', () => {
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

  it('only poisonous food, bear traps and trench falls lose a life, one per event', () => {
    let run = createRun()
    for (const reason of ['poison', 'trap', 'fall'] as const) {
      const result = loseLife(run, reason)
      expect(result.lifeLost).toBe(true)
      run = result.state
      expect(run.lives).toBeLessThan(3)
    }
    expect(run.lives).toBe(0)
    expect(run.phase).toBe('lost')
    expect(run.loseReason).toBe('fall')
  })

  it('freezes score and life state after the third life is gone', () => {
    let run = createRun()
    run = loseLife(run, 'poison').state
    run = loseLife(run, 'trap').state
    run = loseLife(run, 'fall').state
    expect(tick(run, 1, 16)).toBe(run)
    expect(eatFood(run, 'salmon').points).toBe(0)
    expect(loseLife(run, 'poison').state).toBe(run)
  })
})
