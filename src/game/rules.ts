import { CONFIG, FOOD_KINDS, type FoodKind } from './config'

export type RunPhase = 'playing' | 'lost'
export type LoseReason = 'poison' | 'trap' | 'fall' | 'river-log'
export type RunState = {
  unranked: boolean
  phase: RunPhase
  loseReason?: LoseReason
  score: number
  health: number
  elapsed: number
  distance: number
  collected: number
  combo: number
  comboTimer: number
  tally: Record<FoodKind, number>
}

export function createRun(): RunState {
  return {
    unranked: false, phase: 'playing', score: 0, health: 100,
    elapsed: 0, distance: 0, collected: 0, combo: 0, comboTimer: 0,
    tally: Object.fromEntries(FOOD_KINDS.map(kind => [kind, 0])) as Record<FoodKind, number>,
  }
}

/** The speed ceiling rises with run duration and then levels off. */
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

/** Land hazards and river driftwood chip one health pool; 0% ends the run. */
export function applyDamage(state: RunState, amount: number, reason: LoseReason): { state: RunState; healthLost: number; gameOver: boolean } {
  if (state.phase !== 'playing' || !Number.isFinite(amount)) return { state, healthLost: 0, gameOver: false }
  const damage = Math.min(100, Math.max(0, Math.round(amount)))
  if (damage === 0) return { state, healthLost: 0, gameOver: false }
  const healthLost = Math.min(state.health, damage)
  const health = Math.max(0, state.health - damage)
  const gameOver = health === 0
  const next: RunState = {
    ...state,
    health,
    combo: 0,
    comboTimer: 0,
    ...(gameOver ? { phase: 'lost' as const, loseReason: reason } : {}),
  }
  return { state: next, healthLost, gameOver }
}
