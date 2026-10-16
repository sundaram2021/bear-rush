export const DEFAULT_CONFIG = {
  run: {
    lives: 3,
    baseSpeed: 6.6,
    speedRamp: 0.06,
    maxSpeed: 12.2,
    sprintMultiplier: 1.28,
    maxFood: 6,
    maxHazards: 7,
    recoverySeconds: 1.5,
    invulnerabilitySeconds: 1.4,
  },
  player: {
    moveSpeed: 6.6,
    acceleration: 8,
    slopeControlLoss: 0.67,
    pounceBoost: 0.9,
    pounceCooldown: 2.9,
    pounceDuration: 0.36,
    pounceStartSpeed: 3.8,
    pounceMinSpeed: 4.3,
    pounceFacingDot: 0.18,
    sprintCapacity: 3.2,
    sprintRecovery: 0.085,
    stalkMultiplier: 0.28,
    analogStalkThreshold: 0.55,
    bodyHeight: 1.3,
  },
  hunt: {
    spawnMinRadius: 76,
    spawnMaxRadius: 158,
    trackingRadius: 168,
    trackLifetime: 24,
    trackRefreshSeconds: 1.25,
    foodSpawnMinSeconds: 13,
    foodSpawnMaxSeconds: 21,
    awareness: { fawn: 42, deer: 37, elk: 33, moose: 28 },
    stalkAwarenessMultiplier: 0.54,
    chaseRadius: 68,
    escapeRadius: 112,
    chaseDuration: { fawn: 13, deer: 19, elk: 26, moose: 22 },
    exhaustedWindow: { fawn: 1.55, deer: 1.3, elk: 1.05, moose: 1.35 },
    fleeSpeed: { fawn: 9.1, deer: 10.1, elk: 11.2, moose: 9.4 },
    respawnPauseSeconds: 8,
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
    distance: 8.4,
    height: 3.55,
    follow: 4.6,
    pitch: 0.13,
    sensitivity: 0.0022,
  },
  world: {
    chunkSize: 80,
    chunkGrid: 28,
    renderChunkRadius: 2,
    riverWidth: 7.2,
    trenchWidth: 5.4,
    trenchDepth: 10.2,
    snowLine: 24,
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
