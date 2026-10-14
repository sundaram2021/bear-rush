/** Browser-local game settings and best-run statistics. No account, remote storage, or server. */
export type Locale = 'en'
export type Quality = 'low' | 'medium' | 'high'

export type SaveData = {
  version: 2
  musicVolume: number
  sfxVolume: number
  muted: boolean
  quality: Quality
  reducedMotion: boolean
  tutorialDone: boolean
  bestScore: number
  bestFish: number
  bestDistance: number
  bestTime: number
}

export const SAVE_KEY = 'bearrush.save'

export function defaultSave(): SaveData {
  return {
    version: 2,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    muted: false,
    quality: 'medium',
    reducedMotion: false,
    tutorialDone: false,
    bestScore: 0,
    bestFish: 0,
    bestDistance: 0,
    bestTime: 0,
  }
}

const clamp01 = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback)
const nonNegative = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback)
const distanceValue = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0)

/** Parse untrusted stored JSON into a valid local save; corrupt/foreign data never blocks play. */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave()
  if (!raw) return base
  let data: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base
    data = parsed as Record<string, unknown>
  } catch {
    return base
  }
  if (data.version !== 2) return base
  return {
    version: 2,
    musicVolume: clamp01(data.musicVolume, base.musicVolume),
    sfxVolume: clamp01(data.sfxVolume, base.sfxVolume),
    muted: data.muted === true,
    quality: data.quality === 'low' || data.quality === 'medium' || data.quality === 'high' ? data.quality : base.quality,
    reducedMotion: data.reducedMotion === true,
    tutorialDone: data.tutorialDone === true,
    bestScore: nonNegative(data.bestScore),
    bestFish: nonNegative(data.bestFish),
    bestDistance: distanceValue(data.bestDistance),
    bestTime: distanceValue(data.bestTime),
  }
}

function getLocalStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try { return globalThis.localStorage } catch { return undefined }
}

export class SaveStore {
  data: SaveData

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = getLocalStorage()) {
    let raw: string | null = null
    try { raw = this.storage?.getItem(SAVE_KEY) ?? null } catch { raw = null }
    this.data = parseSave(raw)
  }

  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch }
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data)) } catch {
      // Private browsing/quota denial: retain the in-memory settings for this page session.
    }
  }
}
