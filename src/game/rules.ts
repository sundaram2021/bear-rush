import { CONFIG, FOOD_KINDS, type FoodKind } from './config'
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
  tally: Record<FoodKind, number>
}

export function createRun(): RunState {
  return {
    unranked: false, phase: 'playing', score: 0, lives: CONFIG.run.lives,
    elapsed: 0, distance: 0, collected: 0, combo: 0, comboTimer: 0,
    tally: Object.fromEntries(FOOD_KINDS.map(kind => [kind, 0])) as Record<FoodKind, number>,
  }
}

/** The attainable speed ceiling rises with run duration and then levels off. */
export function speedCap(elapsed: number): number {
  return Math.min(CONFIG.run.maxSpeed, CONFIG.run.baseSpeed + Math.max(0, elapsed) * CONFIG.run.speedRamp)
}

export function tick(state: RunState, dt: number, speed: number): RunState {
  if (state.phase !== 'playing') return state
  const comboTimer = Math.max(0, state.comboTimer - dt)
  return {
    ...state,
    elapsed: state.elapsed + dt,
    distance: state.distance + Math.max(0, speed) * dt,
    comboTimer,
    combo: comboTimer > 0 ? state.combo : 0,
  }
}

export function eatFood(state: RunState, kind: FoodKind): { state: RunState; points: number } {
  if (state.phase !== 'playing') return { state, points: 0 }
  const combo = Math.min(CONFIG.score.comboMax, state.comboTimer > 0 ? state.combo + 1 : 1)
  const points = CONFIG.score[kind] * combo
  return {
    state: {
      ...state, score: state.score + points, collected: state.collected + 1,
      combo, comboTimer: CONFIG.score.comboWindow,
      tally: { ...state.tally, [kind]: state.tally[kind] + 1 },
    },
    points,
  }
}

/** Poison, traps and trench falls each cost exactly one life; no other reason is supported. */
export function loseLife(state: RunState, reason: LoseReason): { state: RunState; lifeLost: boolean } {
  if (state.phase !== 'playing') return { state, lifeLost: false }
  const lives = Math.max(0, state.lives - 1)
  const next: RunState = { ...state, lives, combo: 0, comboTimer: 0 }
  return {
    state: lives === 0 ? { ...next, phase: 'lost', loseReason: reason } : next,
    lifeLost: true,
  }
}
