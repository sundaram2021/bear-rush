import { CONFIG } from './config'

export type RunPhase = 'playing' | 'lost'
export type LoseReason = 'lives'

export type RunState = {
  unranked: boolean
  phase: RunPhase
  loseReason?: LoseReason
  score: number
  lives: number
  elapsed: number
  distance: number
  collected: number
  combo: number
  comboTimer: number
  invulnerable: number
}

export function createRun(rules = CONFIG): RunState {
  return {
    unranked: false,
    phase: 'playing',
    score: 0,
    lives: rules.run.lives,
    elapsed: 0,
    distance: 0,
    collected: 0,
    combo: 0,
    comboTimer: 0,
    invulnerable: 0,
  }
}

export function riverSpeed(elapsed: number, rules = CONFIG): number {
  return Math.min(rules.run.maxSpeed, rules.run.startSpeed + Math.max(0, elapsed) * rules.run.speedRamp)
}

export function fishInterval(elapsed: number, rules = CONFIG): number {
  return Math.max(rules.run.fishIntervalFloor, rules.run.fishInterval - Math.max(0, elapsed) * 0.004)
}

export function obstacleInterval(elapsed: number, rules = CONFIG): number {
  return Math.max(rules.run.obstacleIntervalFloor, rules.run.obstacleInterval - Math.max(0, elapsed) * 0.009)
}

export function tick(s: RunState, dt: number, speed = riverSpeed(s.elapsed)): RunState {
  if (s.phase !== 'playing') return s
  const comboTimer = Math.max(0, s.comboTimer - dt)
  return {
    ...s,
    elapsed: s.elapsed + dt,
    distance: s.distance + speed * dt,
    comboTimer,
    combo: comboTimer > 0 ? s.combo : 0,
    invulnerable: Math.max(0, s.invulnerable - dt),
  }
}

export function collect(s: RunState, rules = CONFIG): { state: RunState; points: number } {
  if (s.phase !== 'playing') return { state: s, points: 0 }
  const combo = Math.min(rules.score.comboMax, s.comboTimer > 0 ? s.combo + 1 : 1)
  const points = rules.score.fish * combo
  return {
    state: { ...s, score: s.score + points, collected: s.collected + 1, combo, comboTimer: rules.score.comboWindow },
    points,
  }
}

/** Every accepted tree collision costs exactly one life; the invulnerability timer rejects repeats. */
export function damage(s: RunState, rules = CONFIG): { state: RunState; hurt: boolean } {
  if (s.phase !== 'playing' || s.invulnerable > 0) return { state: s, hurt: false }
  const lives = Math.max(0, s.lives - 1)
  const next: RunState = { ...s, lives, combo: 0, comboTimer: 0, invulnerable: rules.run.recoverySeconds }
  return lives === 0
    ? { state: { ...next, phase: 'lost', loseReason: 'lives' }, hurt: true }
    : { state: next, hurt: true }
}
