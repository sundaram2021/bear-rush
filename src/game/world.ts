import * as THREE from 'three'

const RIVER_WIDTH = 9.5
const CHUNK_LENGTH = 32
const STREAM_LENGTH = 160

/** River corridor, repeating bank scenery, and lightweight moving foam cues. */
export class World {
  readonly scene = new THREE.Scene()
  private bankChunks: THREE.Group[] = []
  private foam: THREE.Mesh[] = []
  private time = 0
  private readonly water: THREE.Mesh

  constructor() {
    this.scene.background = new THREE.Color('#9dc8c9')
    this.scene.fog = new THREE.Fog('#9dc8c9', 65, 190)
    this.scene.add(new THREE.HemisphereLight('#e6f5ed', '#334d43', 1.25))
    const sun = new THREE.DirectionalLight('#fff2d4', 2.2)
    sun.position.set(-12, 22, 12)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    this.scene.add(sun)

    const waterMaterial = new THREE.MeshStandardMaterial({ color: '#267f89', roughness: 0.27, metalness: 0.08, transparent: true, opacity: 0.96 })
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_WIDTH, STREAM_LENGTH), waterMaterial)
    this.water.rotation.x = -Math.PI / 2
    this.water.position.set(0, -0.12, -72)
    this.water.receiveShadow = true
    this.scene.add(this.water)

    this.addCascade()
    for (let i = 0; i < 5; i += 1) {
      const chunk = this.makeBankChunk(i)
      chunk.position.z = 12 - i * CHUNK_LENGTH
      this.bankChunks.push(chunk)
      this.scene.add(chunk)
    }
    this.addFoam()
  }

  step(dt: number, speed: number): void {
    this.time += dt
    for (const chunk of this.bankChunks) {
      chunk.position.z += speed * dt
      if (chunk.position.z > 44) chunk.position.z -= STREAM_LENGTH
    }
    for (let i = 0; i < this.foam.length; i += 1) {
      const streak = this.foam[i]
      streak.position.z += speed * (0.92 + (i % 4) * 0.07) * dt
      streak.position.x += Math.sin(this.time * 1.4 + i) * 0.0015
      if (streak.position.z > 14) streak.position.z = -100 - (i % 7) * 8
      streak.scale.x = 0.65 + (Math.sin(this.time * 3 + i * 0.7) + 1) * 0.16
    }
  }

  update(_dt: number): void {
    this.water.position.y = -0.12 + Math.sin(this.time * 1.8) * 0.018
  }

  private addCascade(): void {
    const cliffMaterial = new THREE.MeshStandardMaterial({ color: '#687c70', roughness: 1, flatShading: true })
    const cliff = new THREE.Mesh(new THREE.ConeGeometry(19, 18, 8, 2), cliffMaterial)
    cliff.position.set(0, 8, -112)
    cliff.rotation.y = Math.PI / 8
    this.scene.add(cliff)
    const fallMaterial = new THREE.MeshBasicMaterial({ color: '#e0f2e9', transparent: true, opacity: 0.83 })
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(15, 11), fallMaterial)
    fall.position.set(0, 5.4, -101)
    this.scene.add(fall)
    const pool = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshBasicMaterial({ color: '#d5eee6', transparent: true, opacity: 0.45 }))
    pool.rotation.x = -Math.PI / 2
    pool.position.set(0, 0.02, -94)
    this.scene.add(pool)
  }

  private makeBankChunk(seed: number): THREE.Group {
    const group = new THREE.Group()
    const rng = random(seed * 981 + 415)
    const grass = new THREE.MeshStandardMaterial({ color: '#516f4f', roughness: 1, flatShading: true })
    const rock = new THREE.MeshStandardMaterial({ color: '#626a5a', roughness: 0.98, flatShading: true })
    const bark = new THREE.MeshStandardMaterial({ color: '#4c392a', roughness: 1, flatShading: true })
    const leafColors = ['#315843', '#3b6348', '#527452']
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.15, CHUNK_LENGTH), grass)
      bank.position.set(side * 8.1, -0.72, 0)
      bank.receiveShadow = true
      group.add(bank)
      for (let i = 0; i < 5; i += 1) {
        const x = side * (5.25 + rng() * 2.7)
        const z = (rng() - 0.5) * (CHUNK_LENGTH - 3)
        const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + rng() * 0.85, 0), rock)
        boulder.position.set(x, -0.08 + rng() * 0.24, z)
        boulder.scale.set(1.15, 0.7, 0.9)
        boulder.rotation.set(rng() * 0.5, rng() * 3, rng() * 0.3)
        boulder.castShadow = true
        group.add(boulder)
      }
      for (let i = 0; i < 4; i += 1) {
        const x = side * (7.1 + rng() * 4.2)
        const z = (rng() - 0.5) * (CHUNK_LENGTH - 4)
        const tree = new THREE.Group()
        const height = 3.6 + rng() * 2.2
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.29, height * 0.54, 7), bark)
        trunk.position.y = height * 0.27
        trunk.castShadow = true
        tree.add(trunk)
        const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.25 + rng() * 0.4, height * 0.7, 7, 2), new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(rng() * leafColors.length)], roughness: 1, flatShading: true }))
        foliage.position.y = height * 0.69
        foliage.castShadow = true
        tree.add(foliage)
        tree.position.set(x, -0.05, z)
        tree.rotation.z = (rng() - 0.5) * 0.1
        group.add(tree)
      }
    }
    return group
  }

  private addFoam(): void {
    const mat = new THREE.MeshBasicMaterial({ color: '#d3eee4', transparent: true, opacity: 0.58, depthWrite: false })
    for (let i = 0; i < 30; i += 1) {
      const streak = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 1.4 + (i % 4) * 0.45, 2, 5), mat)
      streak.rotation.x = Math.PI / 2
      streak.position.set((random(i + 44)() - 0.5) * (RIVER_WIDTH - 1), 0.025, -98 + (i / 30) * 108)
      this.foam.push(streak)
      this.scene.add(streak)
    }
  }
}

function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
