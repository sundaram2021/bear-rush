import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { collect, createRun, damage, fishInterval, obstacleInterval, riverSpeed, tick } from '../src/game/rules'

describe('endless river run rules', () => {
  it('starts with three lives and has no time-based ending', () => {
    let run = createRun()
    expect(run.lives).toBe(3)
    expect(run.phase).toBe('playing')
    run = tick(run, 360)
    expect(run.phase).toBe('playing')
  })

  it('ramps the current and fish/hazard cadence fairly, then caps river speed', () => {
    expect(riverSpeed(0)).toBe(CONFIG.run.startSpeed)
    expect(riverSpeed(30)).toBeGreaterThan(riverSpeed(0))
    expect(riverSpeed(10_000)).toBe(CONFIG.run.maxSpeed)
    expect(fishInterval(80)).toBeLessThan(fishInterval(0))
    expect(obstacleInterval(80)).toBeLessThan(obstacleInterval(0))
    expect(riverSpeed(10_000)).toBeLessThanOrEqual(CONFIG.run.maxSpeed)
  })

  it('increases distance as the run advances', () => {
    const run = tick(createRun(), 2, 14)
    expect(run.elapsed).toBe(2)
    expect(run.distance).toBe(28)
  })

  it('rewards every fish and decays the combo after its window', () => {
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

  it('each tree hit costs one life, rejects repeat hits during recovery, and ends only at zero', () => {
    let run = createRun()
    run = damage(run).state
    expect(run.lives).toBe(2)
    expect(run.phase).toBe('playing')
    expect(damage(run).hurt).toBe(false)
    run = tick(run, CONFIG.run.recoverySeconds + 0.01)
    run = damage(run).state
    expect(run.lives).toBe(1)
    expect(run.phase).toBe('playing')
    run = tick(run, CONFIG.run.recoverySeconds + 0.01)
    run = damage(run).state
    expect(run.lives).toBe(0)
    expect(run.phase).toBe('lost')
    expect(run.loseReason).toBe('lives')
  })

  it('freezes scoring and run state after all lives are gone', () => {
    let run = createRun()
    for (let i = 0; i < 3; i += 1) {
      run = damage(run).state
      if (run.phase === 'playing') run = tick(run, CONFIG.run.recoverySeconds + 0.01)
    }
    expect(tick(run, 1)).toBe(run)
    expect(collect(run).points).toBe(0)
  })
})
