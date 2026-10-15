import { CONFIG, DEFAULT_CONFIG } from './config'

type ApplyMode = 'LIVE' | 'NEXT_RUN'
type Control = { id: string; type: 'number'; category: string; label: string; description: string; unit: string; default: number; min: number; max: number; step: number; applyMode: ApplyMode; integrity: 'COSMETIC' | 'GAMEPLAY' }
type Binding = { control: Control; read(): number; write(value: number): void }

const bindings: Binding[] = []
function number<S extends keyof typeof CONFIG>(section: S, key: keyof typeof CONFIG[S] & string,
  label: string, min: number, max: number, step: number, unit: string, applyMode: ApplyMode = 'LIVE', integrity: 'COSMETIC' | 'GAMEPLAY' = 'GAMEPLAY'): void {
  const values = CONFIG[section] as Record<string, number>
  const defaults = DEFAULT_CONFIG[section] as Record<string, number>
  bindings.push({ control: Object.freeze({ id: `${section}.${key}`, type: 'number', category: section === 'camera' ? 'Camera' : section === 'player' ? 'Bank-side fishing' : 'River encounter',
    label, description: applyMode === 'NEXT_RUN' ? 'Applies when a new run starts.' : 'Updates this preview immediately.', unit, default: defaults[key], min, max, step, applyMode, integrity }),
    read: () => values[key], write: value => { values[key] = value } })
}

number('run', 'lives', 'Starting lives', 1, 5, 1, 'lives', 'NEXT_RUN')
number('run', 'startSpeed', 'Starting current speed', 4, 12, 0.5, 'm/s', 'NEXT_RUN')
number('run', 'speedRamp', 'Current speed increase', 0.01, 0.08, 0.005, 'm/s/s', 'NEXT_RUN')
number('run', 'maxSpeed', 'Current speed cap', 8, 20, 0.5, 'm/s', 'NEXT_RUN')
number('run', 'fishInterval', 'Initial fish arrival interval', 1, 4, 0.1, 's', 'NEXT_RUN')
number('run', 'hazardInterval', 'Initial hazard arrival interval', 2, 7, 0.1, 's', 'NEXT_RUN')
number('player', 'moveSpeed', 'Bank walking response', 2, 8, 0.25, 'm/s', 'LIVE')
number('player', 'catchRangeX', 'Catch reach across the water', 2.5, 5.5, 0.1, 'm', 'LIVE')
number('player', 'catchRangeZ', 'Catch timing window', 1.5, 4, 0.1, 'm', 'LIVE')
number('camera', 'fov', 'Field of view', 46, 76, 1, '°', 'LIVE', 'COSMETIC')
number('camera', 'follow', 'Camera ease', 2, 10, 0.25, '', 'LIVE', 'COSMETIC')
number('camera', 'height', 'Camera height', 5, 11, 0.25, 'm', 'LIVE', 'COSMETIC')

const byId = new Map(bindings.map(b => [b.control.id, b]))
let requested = Object.fromEntries(bindings.map(b => [b.control.id, b.control.default]))
let unranked = false
const isGameplayChanged = () => bindings.some(b => b.control.integrity === 'GAMEPLAY' && b.read() !== b.control.default)
const valid = (v: Record<string, number>) => v['run.maxSpeed'] >= v['run.startSpeed']
  && v['run.fishInterval'] >= CONFIG.run.fishIntervalFloor
  && v['run.hazardInterval'] >= CONFIG.run.hazardIntervalFloor

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
    if (!valid(candidate) || !valid(active)) throw new Error('Current speed cap must not be lower than starting speed')
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
