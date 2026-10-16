export const DEFAULT_CONFIG = {
  run: {
    lives: 3,
    baseSpeed: 4.8,
    speedRamp: 0.065,
    maxSpeed: 16,
    sprintMultiplier: 1.36,
    spawnRadius: 42,
    maxFood: 18,
    maxHazards: 7,
    recoverySeconds: 1.2,
    invulnerabilitySeconds: 1.35,
  },
  player: {
    moveSpeed: 5.8,
    acceleration: 15,
    slopeControlLoss: 0.62,
    pounceBoost: 1.55,
    pounceCooldown: 1.1,
    bodyHeight: 1.3,
  },
  score: {
    salmon: 120,
    honey: 180,
    fawn: 150,
    deer: 260,
    elk: 420,
    moose: 650,
    comboWindow: 3.2,
    comboMax: 6,
  },
  camera: {
    fov: 62,
    distance: 7.4,
    height: 3.5,
    follow: 5.2,
    pitch: 0.14,
    sensitivity: 0.0022,
  },
  world: {
    size: 250,
    halfSize: 125,
    grid: 190,
    riverWidth: 6.5,
    trenchWidth: 4.8,
    trenchDepth: 9.2,
    snowLine: 20,
    seasonPeriod: 105,
  },
} as const

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] extends object ? Mutable<T[K]> : T[K] }
export const CONFIG: Mutable<typeof DEFAULT_CONFIG> = structuredClone(DEFAULT_CONFIG)

export const FOOD_KINDS = ['salmon', 'honey', 'fawn', 'deer', 'elk', 'moose'] as const
export type FoodKind = typeof FOOD_KINDS[number]
export const FOOD_LABELS: Record<FoodKind, string> = {
  salmon: 'Salmon', honey: 'Honey', fawn: 'Fawn', deer: 'Deer', elk: 'Elk', moose: 'Moose',
}
