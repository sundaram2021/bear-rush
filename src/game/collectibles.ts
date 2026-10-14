import * as THREE from 'three'

type Salmon = { root: THREE.Group; homeX: number; pace: number; phase: number; caught: boolean }

/** Dynamically spawned salmon; the low-poly geometry is a gameplay blockout until model sourcing is restored. */
export class Collectibles {
  readonly group = new THREE.Group()
  private fish: Salmon[] = []
  private time = 0
  private readonly bodyGeo = new THREE.SphereGeometry(0.55, 14, 10)
  private readonly bodyMat = new THREE.MeshStandardMaterial({ color: '#ef7d49', roughness: 0.58, metalness: 0.08, flatShading: true })
  private readonly finMat = new THREE.MeshStandardMaterial({ color: '#f3ac69', roughness: 0.72, flatShading: true })
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: '#241d18' })

  spawn(x: number, z: number, pace = 1): void {
    const root = new THREE.Group()
    const body = new THREE.Mesh(this.bodyGeo, this.bodyMat)
    body.scale.set(0.45, 0.28, 1)
    body.castShadow = true
    root.add(body)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 3), this.finMat)
    tail.rotation.x = Math.PI / 2
    tail.position.z = 0.64
    tail.scale.set(0.72, 1, 0.8)
    root.add(tail)
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 3), this.finMat)
    fin.rotation.z = Math.PI
    fin.position.set(0, 0.25, 0.05)
    root.add(fin)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), this.eyeMat)
    eye.position.set(0.16, 0.06, -0.32)
    root.add(eye)
    root.position.set(x, 0.43, z)
    root.rotation.y = Math.PI
    this.group.add(root)
    this.fish.push({ root, homeX: x, pace, phase: Math.random() * Math.PI * 2, caught: false })
  }

  reset(): void {
    for (const f of this.fish) this.group.remove(f.root)
    this.fish = []
    this.time = 0
  }

  step(dt: number, riverSpeed: number, playerX: number, playerZ = 0): THREE.Vector3[] {
    this.time += dt
    const got: THREE.Vector3[] = []
    const keep: Salmon[] = []
    for (const f of this.fish) {
      f.root.position.z += riverSpeed * f.pace * dt
      f.root.position.y = 0.4 + Math.sin(this.time * 5 + f.phase) * 0.07
      f.root.rotation.z = Math.sin(this.time * 4 + f.phase) * 0.09
      const dx = Math.abs(f.root.position.x - playerX)
      const dz = Math.abs(f.root.position.z - playerZ)
      if (!f.caught && dx < 1.1 && dz < 1.25) {
        f.caught = true
        got.push(f.root.position.clone())
        this.group.remove(f.root)
      } else if (f.root.position.z < 12) {
        keep.push(f)
      } else {
        this.group.remove(f.root)
      }
    }
    this.fish = keep
    return got
  }
}
