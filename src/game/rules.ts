import { CONFIG, type FoodKind } from './config'

export type RunPhase = 'playing' | 'lost'
export type LoseReason = 'poison' | 'trap' | 'fall'

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
  /** How many of each food was eaten this run. */
  tally: Record<FoodKind, number>
}

export function createRun(): RunState {
  return {
    unranked: false,
    phase: 'playing',
    score: 0,
    lives: CONFIG.run.lives,
    elapsed: 0,
    distance: 0,
    collected: 0,
    combo: 0,
    comboTimer: 0,
    tally: { salmon: 0, honey: 0, fawn: 0, deer: 0, elk: 0, moose: 0 },
  }
}

/** The bear's speed ceiling rises the longer it keeps hunting, up to a fair cap. */
export function speedCap(elapsed: number): number {
  return Math.min(CONFIG.run.maxSpeed, CONFIG.run.baseSpeed + Math.max(0, elapsed) * CONFIG.run.speedRamp)
}

export function tick(s: RunState, dt: number, speed: number): RunState {
  if (s.phase !== 'playing') return s
  const comboTimer = Math.max(0, s.comboTimer - dt)
  return {
    ...s,
    elapsed: s.elapsed + dt,
    distance: s.distance + Math.max(0, speed) * dt,
    comboTimer,
    combo: comboTimer > 0 ? s.combo : 0,
  }
}

export function eatFood(s: RunState, kind: FoodKind): { state: RunState; points: number } {
  if (s.phase !== 'playing') return { state: s, points: 0 }
  const combo = Math.min(CONFIG.score.comboMax, s.comboTimer > 0 ? s.combo + 1 : 1)
  const points = CONFIG.score[kind] * combo
  return {
    state: {
      ...s,
      score: s.score + points,
      collected: s.collected + 1,
      combo,
      comboTimer: CONFIG.score.comboWindow,
      tally: { ...s.tally, [kind]: s.tally[kind] + 1 },
    },
    points,
  }
}

/** Any of the three dangers removes one life immediately. */
export function loseLife(s: RunState, reason: LoseReason): { state: RunState; lifeLost: boolean } {
  if (s.phase !== 'playing') return { state: s, lifeLost: false }
  const lives = Math.max(0, s.lives - 1)
  const next: RunState = { ...s, lives, combo: 0, comboTimer: 0 }
  if (lives === 0) return { state: { ...next, phase: 'lost', loseReason: reason }, lifeLost: true }
  return { state: next, lifeLost: true }
}
