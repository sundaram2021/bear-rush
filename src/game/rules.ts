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
  /** Small-block contacts accumulated toward the next life loss; always 0 or 1. */
  blockHits: number
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
    blockHits: 0,
  }
}

export function riverSpeed(elapsed: number, rules = CONFIG): number {
  return Math.min(rules.run.maxSpeed, rules.run.startSpeed + Math.max(0, elapsed) * rules.run.speedRamp)
}

export function fishInterval(elapsed: number, rules = CONFIG): number {
  return Math.max(rules.run.fishIntervalFloor, rules.run.fishInterval - Math.max(0, elapsed) * 0.006)
}

export function hazardInterval(elapsed: number, rules = CONFIG): number {
  return Math.max(rules.run.hazardIntervalFloor, rules.run.hazardInterval - Math.max(0, elapsed) * 0.008)
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

function loseLife(s: RunState): RunState {
  if (s.phase !== 'playing') return s
  const lives = Math.max(0, s.lives - 1)
  return lives === 0
    ? { ...s, lives, phase: 'lost', loseReason: 'lives', combo: 0, comboTimer: 0 }
    : { ...s, lives, combo: 0, comboTimer: 0 }
}

/** Every second distinct small-block contact removes one life; the strike meter then restarts. */
export function hitSmallBlock(s: RunState, rules = CONFIG): { state: RunState; strike: number; lifeLost: boolean } {
  if (s.phase !== 'playing') return { state: s, strike: s.blockHits, lifeLost: false }
  const hits = s.blockHits + 1
  if (hits < rules.run.blockHitsPerLife) return { state: { ...s, blockHits: hits }, strike: hits, lifeLost: false }
  const next = loseLife({ ...s, blockHits: 0 })
  return { state: next, strike: 0, lifeLost: true }
}

/** One harmful-algae contact immediately removes one life; partial block progress remains visible. */
export function eatAlgae(s: RunState): { state: RunState; lifeLost: boolean } {
  if (s.phase !== 'playing') return { state: s, lifeLost: false }
  return { state: loseLife(s), lifeLost: true }
}
