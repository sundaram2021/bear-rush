import { CONFIG } from './config'

type ApplyMode = 'LIVE' | 'NEXT_RUN'
type Control = { id: string; type: 'number'; category: string; label: string; description: string; unit: string; default: number; min: number; max: number; step: number; applyMode: ApplyMode; integrity: 'COSMETIC' | 'GAMEPLAY' }
type Binding = { control: Control; read(): number; write(value: number): void }

const DEFAULTS: Record<string, Record<string, number>> = {
  run: { lives: 3, baseSpeed: 5.5, speedRamp: 0.11, maxSpeed: 16 },
  player: { accel: 20, catchRange: 2.6 },
  camera: { fov: 62, distance: 9.5 },
}

const bindings: Binding[] = []
function number<S extends keyof typeof CONFIG>(section: S, key: keyof typeof CONFIG[S] & string,
  label: string, min: number, max: number, step: number, unit: string, applyMode: ApplyMode = 'LIVE', integrity: 'COSMETIC' | 'GAMEPLAY' = 'GAMEPLAY'): void {
  const values = CONFIG[section] as unknown as Record<string, number>
  const def = DEFAULTS[section][key]
  bindings.push({ control: Object.freeze({ id: `${section}.${key}`, type: 'number', category: section === 'camera' ? 'Camera' : section === 'player' ? 'Bear handling' : 'Mountain hunt',
    label, description: applyMode === 'NEXT_RUN' ? 'Applies when a new hunt starts.' : 'Updates this preview immediately.', unit, default: def, min, max, step, applyMode, integrity }),
    read: () => values[key], write: value => { values[key] = value } })
}

number('run', 'lives', 'Starting lives', 1, 6, 1, 'lives', 'NEXT_RUN')
number('run', 'baseSpeed', 'Base running speed', 3, 10, 0.5, 'm/s', 'NEXT_RUN')
number('run', 'speedRamp', 'Speed gained while hunting', 0.02, 0.3, 0.01, 'm/s/s', 'NEXT_RUN')
number('run', 'maxSpeed', 'Speed cap', 8, 22, 0.5, 'm/s', 'NEXT_RUN')
number('player', 'accel', 'Turning and acceleration', 8, 40, 1, '', 'LIVE')
number('player', 'catchRange', 'Catch reach', 1.5, 5, 0.1, 'm', 'LIVE')
number('camera', 'fov', 'Field of view', 46, 80, 1, '°', 'LIVE', 'COSMETIC')
number('camera', 'distance', 'Camera distance', 5, 16, 0.5, 'm', 'LIVE', 'COSMETIC')

const byId = new Map(bindings.map(b => [b.control.id, b]))
let requested = Object.fromEntries(bindings.map(b => [b.control.id, b.control.default]))
let unranked = false
const isGameplayChanged = () => bindings.some(b => b.control.integrity === 'GAMEPLAY' && b.read() !== b.control.default)
const valid = (v: Record<string, number>) => v['run.maxSpeed'] >= v['run.baseSpeed']

export const tuning = {
  get unranked(): boolean { return unranked },
  controls: Object.freeze(bindings.map(b => b.control)),
  read() { return { requested: { ...requested }, active: Object.fromEntries(bindings.map(b => [b.control.id, b.read()])) } },
  apply(patch: unknown): void {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid patch')
    const entries = Object.entries(patch)
    if (entries.length > bindings.length) throw new Error('Invalid patch')
    for (const [id, value] of entries) {
      const control = byId.get(id)?.control
      if (!control || typeof value !== 'number' || !Number.isFinite(value) || value < control.min || value > control.max) throw new Error('Invalid value')
      const steps = (value - control.min) / control.step
      if (value !== control.default && Math.abs(steps - Math.round(steps)) > 1e-7) throw new Error('Invalid increment')
    }
    const candidate = { ...requested, ...patch } as Record<string, number>
    const active = this.read().active
    for (const [id, value] of entries) if (byId.get(id)!.control.applyMode === 'LIVE') active[id] = value
    if (!valid(candidate) || !valid(active)) throw new Error('Frame rate cap must not be lower than the base speed')
    requested = candidate
    for (const [id, value] of entries) {
      const binding = byId.get(id)!
      if (binding.control.applyMode === 'LIVE') binding.write(value)
    }
    unranked ||= isGameplayChanged()
  },
  activate(boundary: 'run'): void {
    for (const b of bindings) if (b.control.applyMode === 'NEXT_RUN') b.write(requested[b.control.id])
    unranked = boundary === 'run' ? isGameplayChanged() : unranked || isGameplayChanged()
  },
}
