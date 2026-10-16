import { CONFIG, DEFAULT_CONFIG } from './config'

type ApplyMode = 'LIVE' | 'NEXT_RUN'
type Control = { id: string; type: 'number'; category: string; label: string; description: string; unit: string; default: number; min: number; max: number; step: number; applyMode: ApplyMode; integrity: 'COSMETIC' | 'GAMEPLAY' }
type Binding = { control: Control; read(): number; write(value: number): void }
const bindings: Binding[] = []

function number<S extends keyof typeof CONFIG>(section: S, key: keyof typeof CONFIG[S] & string,
  category: string, label: string, min: number, max: number, step: number, unit: string,
  applyMode: ApplyMode = 'LIVE', integrity: 'COSMETIC' | 'GAMEPLAY' = 'GAMEPLAY'): void {
  const values = CONFIG[section] as Record<string, number>
  const defaults = DEFAULT_CONFIG[section] as Record<string, number>
  bindings.push({
    control: Object.freeze({ id: `${section}.${key}`, type: 'number', category, label,
      description: applyMode === 'NEXT_RUN' ? 'Applies when the next hunt starts.' : 'Updates this preview immediately.',
      unit, default: defaults[key], min, max, step, applyMode, integrity }),
    read: () => values[key], write: value => { values[key] = value },
  })
}

number('run', 'baseSpeed', 'Hunt rules', 'Starting run speed', 3, 10, 0.2, 'm/s', 'NEXT_RUN')
number('run', 'speedRamp', 'Hunt rules', 'Speed increase', 0.01, 0.12, 0.005, 'm/s/s', 'NEXT_RUN')
number('run', 'maxSpeed', 'Hunt rules', 'Top speed', 8, 20, 0.5, 'm/s', 'NEXT_RUN')
number('player', 'moveSpeed', 'Bear movement', 'Movement response', 3, 9, 0.2, 'm/s')
number('player', 'acceleration', 'Bear movement', 'Acceleration', 8, 24, 1, 'm/s/s')
number('player', 'slopeControlLoss', 'Bear movement', 'Steep-slope control loss', 0.2, 0.9, 0.02, '')
number('camera', 'fov', 'Camera', 'Field of view', 46, 78, 1, '°', 'LIVE', 'COSMETIC')
number('camera', 'follow', 'Camera', 'Follow smoothing', 2, 10, 0.2, '', 'LIVE', 'COSMETIC')
number('camera', 'height', 'Camera', 'Follow height', 3, 7, 0.1, 'm', 'LIVE', 'COSMETIC')

const byId = new Map(bindings.map(binding => [binding.control.id, binding]))
let requested = Object.fromEntries(bindings.map(binding => [binding.control.id, binding.control.default]))
let unranked = false
const isGameplayChanged = () => bindings.some(binding => binding.control.integrity === 'GAMEPLAY' && binding.read() !== binding.control.default)
const valid = (values: Record<string, number>) => values['run.maxSpeed'] >= values['run.baseSpeed']

export const tuning = {
  get unranked(): boolean { return unranked },
  controls: Object.freeze(bindings.map(binding => binding.control)),
  read() { return { requested: { ...requested }, active: Object.fromEntries(bindings.map(binding => [binding.control.id, binding.read()])) } },
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
    if (!valid(candidate) || !valid(active)) throw new Error('Top speed must not be lower than starting speed')
    requested = candidate
    for (const [id, value] of entries) {
      const binding = byId.get(id)!
      if (binding.control.applyMode === 'LIVE') binding.write(value)
    }
    unranked ||= isGameplayChanged()
  },
  activate(boundary: 'run'): void {
    for (const binding of bindings) if (binding.control.applyMode === 'NEXT_RUN') binding.write(requested[binding.control.id])
    unranked = boundary === 'run' ? isGameplayChanged() : unranked || isGameplayChanged()
  },
}
