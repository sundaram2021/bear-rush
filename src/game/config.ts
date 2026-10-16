export const DEFAULT_CONFIG = {
  run: {
    lives: 3,
    baseSpeed: 5.5,
    sprintSpeed: 8.5,
    speedRamp: 0.11,
    maxSpeed: 16,
    firstHazardAt: 7,
    recoverySeconds: 1.8,
    spawnRadius: 130,
    despawnRadius: 195,
  },
  player: {
    accel: 20,
    turnRate: 7,
    catchRange: 2.6,
    pounceBoost: 6.5,
    pounceCooldown: 1.15,
    pounceStamina: 22,
    slideSlope: 0.95,
    slideGravity: 26,
    staminaDrain: 12,
    staminaRecover: 9,
  },
  score: {
    salmon: 120,
    honey: 180,
    fawn: 150,
    deer: 260,
    elk: 420,
    moose: 650,
    comboWindow: 3,
    comboMax: 6,
  },
  camera: {
    fov: 62,
    distance: 9.5,
    height: 4.4,
    follow: 5,
    pitch: 0.34,
  },
  world: {
    size: 900,
    grid: 240,
    snowLine: 26,
    waterDepth: 1.6,
    seasonPeriod: 150,
  },
} as const

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] extends object ? Mutable<T[K]> : T[K] }
export const CONFIG: Mutable<typeof DEFAULT_CONFIG> = structuredClone(DEFAULT_CONFIG)

/** Every food the bear can hunt. */
export type FoodKind = 'salmon' | 'honey' | 'fawn' | 'deer' | 'elk' | 'moose'
export const FOOD_KINDS: readonly FoodKind[] = ['salmon', 'honey', 'fawn', 'deer', 'elk', 'moose']
