import * as THREE from 'three'
import type { MapSnapshot } from '../game/game'

const SIZE = 256
const TRACK_COLORS: Record<string, string> = {
  salmon: '#76c5ce', honey: '#e7c267', fawn: '#e9d49d', deer: '#d6b487', elk: '#bd8f68', moose: '#937052',
}
const TRACK_LETTERS: Record<string, string> = { salmon: 'S', honey: 'H', fawn: 'F', deer: 'D', elk: 'E', moose: 'M' }

/** Compact local map: live terrain, imperfect recent sightings, and a heading-aware bear marker. */
export class Minimap {
  private readonly context: CanvasRenderingContext2D | null
  private lastDrawAt = 0

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SIZE
    canvas.height = SIZE
    this.context = canvas.getContext('2d')
  }

  draw(map: MapSnapshot): void {
    const ctx = this.context
    if (!ctx) return
    const now = performance.now()
    if (now - this.lastDrawAt < 150) return
    this.lastDrawAt = now
    const center = SIZE / 2
    const radius = center - 8
    const meters = map.radius
    const scale = radius / meters
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.save()
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.clip()

    const background = ctx.createRadialGradient(center, center, 8, center, center, radius)
    background.addColorStop(0, '#53664d')
    background.addColorStop(0.68, '#394b3d')
    background.addColorStop(1, '#273a31')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.strokeStyle = 'rgba(231,237,219,.09)'
    ctx.lineWidth = 1
    for (const metersOut of [42, 84, 126]) {
      ctx.beginPath()
      ctx.arc(center, center, metersOut * scale, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const offset of [-84, 0, 84]) {
      ctx.beginPath(); ctx.moveTo(center + offset * scale, 0); ctx.lineTo(center + offset * scale, SIZE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, center + offset * scale); ctx.lineTo(SIZE, center + offset * scale); ctx.stroke()
    }

    const mapPoint = (x: number, z: number) => ({ x: center + (x - map.x) * scale, y: center - (z - map.z) * scale })
    for (const [path, color, width, dash] of [
      [map.terrain.riverX, 'rgba(111,188,192,.82)', '3.6', '0'],
      [map.terrain.trenchX, 'rgba(205,176,124,.55)', '2', '1'],
    ] as const) {
      ctx.beginPath()
      for (let z = map.z - meters; z <= map.z + meters; z += 4) {
        const p = mapPoint(path(z), z)
        if (z === map.z - meters) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      if (dash === '1') ctx.setLineDash([4, 5])
      ctx.strokeStyle = color
      ctx.lineWidth = Number(width)
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.setLineDash([])
    }

    for (const track of map.tracks) {
      const p = mapPoint(track.x, track.z)
      if (Math.hypot(p.x - center, p.y - center) > radius - 7) continue
      const color = TRACK_COLORS[track.kind] ?? '#e1d5b9'
      ctx.globalAlpha = THREE.MathUtils.clamp(track.confidence, 0.14, 1)
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(15,28,23,.9)'; ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke()
      ctx.fillStyle = color
      ctx.font = '700 9px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(TRACK_LETTERS[track.kind] ?? '?', p.x, p.y + 0.5)
      ctx.globalAlpha = 1
    }

    ctx.restore()
    ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(245,241,226,.58)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = 'rgba(245,241,226,.94)'
    ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('N', center, 15)
    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(map.heading)
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7.5, 8); ctx.lineTo(0, 4.5); ctx.lineTo(-7.5, 8); ctx.closePath()
    ctx.fillStyle = '#f2d18b'; ctx.fill()
    ctx.strokeStyle = '#17251d'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.restore()
  }
}
