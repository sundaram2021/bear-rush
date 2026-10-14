export const DEFAULT_CONFIG = {
  run: {
    lives: 3,
    startSpeed: 14,
    speedRamp: 0.12,
    maxSpeed: 29,
    fishInterval: 1.55,
    fishIntervalFloor: 0.66,
    obstacleInterval: 3.15,
    obstacleIntervalFloor: 1.42,
    firstObstacleAt: 4,
    recoverySeconds: 1.65,
    spawnDistance: 56,
  },
  player: {
    laneGap: 3,
    maxX: 3.2,
    moveSpeed: 11,
    hitRadius: 0.95,
  },
  score: {
    fish: 100,
    comboWindow: 2.8,
    comboMax: 5,
  },
  camera: {
    fov: 63,
    follow: 6.5,
    height: 6.2,
    distance: 9.5,
  },
} as const

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] extends object ? Mutable<T[K]> : T[K] }
export const CONFIG: Mutable<typeof DEFAULT_CONFIG> = structuredClone(DEFAULT_CONFIG)
