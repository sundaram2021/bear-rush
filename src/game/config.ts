export const DEFAULT_CONFIG = {
  run: {
    lives: 3,
    startSpeed: 7.5,
    speedRamp: 0.035,
    maxSpeed: 15,
    fishInterval: 2.1,
    fishIntervalFloor: 0.8,
    hazardInterval: 3.8,
    hazardIntervalFloor: 1.65,
    firstHazardAt: 5,
    spawnDistance: 35,
    blockHitsPerLife: 2,
    recoverySeconds: 0.75,
  },
  player: {
    moveSpeed: 4.8,
    bankNear: 0.2,
    bankFar: 3.2,
    catchRangeX: 3.7,
    catchRangeZ: 2.8,
  },
  score: {
    fish: 100,
    comboWindow: 2.8,
    comboMax: 5,
  },
  camera: {
    fov: 58,
    follow: 4.8,
    height: 7.2,
    distance: 13,
  },
  world: {
    riverWidth: 9.5,
    startZ: -172,
    endZ: 52,
    bankDepth: 28,
    riverSegments: 280,
  },
} as const

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] extends object ? Mutable<T[K]> : T[K] }
export const CONFIG: Mutable<typeof DEFAULT_CONFIG> = structuredClone(DEFAULT_CONFIG)
