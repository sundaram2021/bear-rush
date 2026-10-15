import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { collect, createRun, eatAlgae, fishInterval, hazardInterval, hitSmallBlock, riverSpeed, tick } from '../src/game/rules'

describe('river fishing rules', () => {
  it('starts with three lives and has no time-based ending', () => {
    let run = createRun()
    expect(run.lives).toBe(3)
    expect(run.blockHits).toBe(0)
    run = tick(run, 360)
    expect(run.phase).toBe('playing')
  })

  it('ramps the current and encounter pace smoothly, then caps current speed', () => {
    expect(riverSpeed(0)).toBe(CONFIG.run.startSpeed)
    expect(riverSpeed(30)).toBeGreaterThan(riverSpeed(0))
    expect(riverSpeed(10_000)).toBe(CONFIG.run.maxSpeed)
    expect(fishInterval(80)).toBeLessThan(fishInterval(0))
    expect(hazardInterval(80)).toBeLessThan(hazardInterval(0))
    expect(riverSpeed(10_000)).toBeLessThanOrEqual(CONFIG.run.maxSpeed)
  })

  it('records distance on the river and holds a missed fish harmlessly', () => {
    const run = tick(createRun(), 2, 14)
    expect(run.elapsed).toBe(2)
    expect(run.distance).toBe(28)
    expect(run.lives).toBe(3)
    expect(run.collected).toBe(0)
  })

  it('rewards deliberate catches and decays the combo after its window', () => {
    let run = createRun()
    let result = collect(run)
    expect(result.points).toBe(CONFIG.score.fish)
    run = collect(result.state).state
    expect(run.combo).toBe(2)
    expect(run.score).toBe(CONFIG.score.fish * 3)
    run = tick(run, CONFIG.score.comboWindow + 0.01)
    expect(run.combo).toBe(0)
    expect(collect(run).points).toBe(CONFIG.score.fish)
  })

  it('deducts exactly one life after two separate wood hits, then resets the strike meter', () => {
    let run = createRun()
    const first = hitSmallBlock(run)
    run = first.state
    expect(first.strike).toBe(1)
    expect(first.lifeLost).toBe(false)
    expect(run.lives).toBe(3)
    expect(run.blockHits).toBe(1)
    const second = hitSmallBlock(run)
    run = second.state
    expect(second.lifeLost).toBe(true)
    expect(second.strike).toBe(0)
    expect(run.lives).toBe(2)
    expect(run.blockHits).toBe(0)
    run = hitSmallBlock(hitSmallBlock(run).state).state
    expect(run.lives).toBe(1)
    run = hitSmallBlock(hitSmallBlock(run).state).state
    expect(run.lives).toBe(0)
    expect(run.phase).toBe('lost')
    expect(run.loseReason).toBe('lives')
  })

  it('deducts one life immediately for algae without counting a wood hit', () => {
    let run = createRun()
    run = hitSmallBlock(run).state
    const result = eatAlgae(run)
    expect(result.lifeLost).toBe(true)
    expect(result.state.lives).toBe(2)
    expect(result.state.blockHits).toBe(1)
    expect(eatAlgae(result.state).state.lives).toBe(1)
  })

  it('freezes score and life state after the third life is gone', () => {
    let run = createRun()
    for (let i = 0; i < 3; i += 1) {
      run = eatAlgae(run).state
      run = hitSmallBlock(hitSmallBlock(run).state).state
    }
    expect(run.phase).toBe('lost')
    expect(tick(run, 1)).toBe(run)
    expect(collect(run).points).toBe(0)
    expect(eatAlgae(run).state).toBe(run)
    expect(hitSmallBlock(run).state).toBe(run)
  })
})
