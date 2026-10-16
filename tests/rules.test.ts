import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { createRun, eatFood, loseLife, speedCap, tick } from '../src/game/rules'

describe('mountain hunt rules', () => {
  it('starts with three lives, an empty tally and no time-based ending', () => {
    const run = createRun()
    expect(run.lives).toBe(3)
    expect(run.phase).toBe('playing')
    expect(run.tally.moose).toBe(0)
    expect(tick(run, 600, 10).phase).toBe('playing')
  })

  it('ramps the running speed ceiling and caps it', () => {
    expect(speedCap(0)).toBe(CONFIG.run.baseSpeed)
    expect(speedCap(40)).toBeGreaterThan(speedCap(0))
    expect(speedCap(1_000_000)).toBe(CONFIG.run.maxSpeed)
  })

  it('accumulates elapsed time and distance', () => {
    const run = tick(createRun(), 2, 9)
    expect(run.elapsed).toBe(2)
    expect(run.distance).toBe(18)
  })

  it('scores each food type and pays a rising combo that decays', () => {
    let run = createRun()
    const first = eatFood(run, 'salmon')
    expect(first.points).toBe(CONFIG.score.salmon)
    run = first.state
    const second = eatFood(run, 'deer')
    expect(second.points).toBe(CONFIG.score.deer * 2)
    run = second.state
    expect(run.collected).toBe(2)
    expect(run.tally.deer).toBe(1)
    expect(run.combo).toBe(2)
    run = tick(run, CONFIG.score.comboWindow + 0.01, 0)
    expect(run.combo).toBe(0)
    expect(eatFood(run, 'honey').points).toBe(CONFIG.score.honey)
  })

  it('removes exactly one life per danger and ends at zero with a reason', () => {
    let run = createRun()
    const poison = loseLife(run, 'poison')
    expect(poison.lifeLost).toBe(true)
    expect(poison.state.lives).toBe(2)
    run = loseLife(poison.state, 'trap').state
    expect(run.lives).toBe(1)
    const fall = loseLife(run, 'fall')
    expect(fall.state.lives).toBe(0)
    expect(fall.state.phase).toBe('lost')
    expect(fall.state.loseReason).toBe('fall')
  })

  it('freezes score and life state after the last life is gone', () => {
    let run = createRun()
    for (let i = 0; i < 3; i += 1) {
      run = loseLife(run, 'trap').state
    }
    expect(run.phase).toBe('lost')
    expect(tick(run, 1, 10)).toBe(run)
    expect(eatFood(run, 'salmon').points).toBe(0)
    expect(loseLife(run, 'poison').state).toBe(run)
  })
})
