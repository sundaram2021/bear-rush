import * as THREE from 'three'
import type { FoodKind } from './config'

const sphere = new THREE.SphereGeometry(1, 48, 32)
const furTexture = typeof document === 'undefined' ? null : makeFurTexture()
const furBump = furTexture?.clone()
if (furBump) { furBump.colorSpace = THREE.NoColorSpace; furBump.needsUpdate = true }
const hide = furMaterial('#b18a64', 0.98, 0.085)
const darkFur = furMaterial('#795638', 0.99, 0.08)
const paleFur = furMaterial('#c5a17b', 0.96, 0.075)
const muzzleMat = new THREE.MeshStandardMaterial({ color: '#2d211c', roughness: 0.75 })
const eyeMat = new THREE.MeshStandardMaterial({ color: '#130f0c', roughness: 0.3 })
const hoofMat = new THREE.MeshStandardMaterial({ color: '#292621', roughness: 0.82 })
const antlerMat = new THREE.MeshStandardMaterial({ color: '#9c815e', roughness: 0.88 })
const salmonMat = new THREE.MeshPhysicalMaterial({ color: '#a54e45', roughness: 0.36, metalness: 0.03, clearcoat: 0.55 })
const finMat = new THREE.MeshStandardMaterial({ color: '#b67f6f', roughness: 0.65 })
const honeyMat = new THREE.MeshPhysicalMaterial({ color: '#dda83f', roughness: 0.21, clearcoat: 0.8 })
const poisonMat = new THREE.MeshStandardMaterial({ color: '#7b3d60', roughness: 0.82 })
const trapMat = new THREE.MeshStandardMaterial({ color: '#535b5a', metalness: 0.72, roughness: 0.34 })

export type AnimalRig = { root: THREE.Group; body: THREE.Group; head: THREE.Group; legs: THREE.Group[]; tail?: THREE.Group }

export function createBear(): AnimalRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  const head = new THREE.Group()
  root.add(body)
  body.add(head)
  ellipsoid(body, hide, [0, 1.05, 0.16], [0.76, 0.71, 1.13])
  ellipsoid(body, darkFur, [0, 1.18, -0.48], [0.75, 0.66, 0.63])
  ellipsoid(body, paleFur, [0, 1.18, 0.85], [0.2, 0.17, 0.23])
  ellipsoid(head, hide, [0, 1.58, -0.7], [0.49, 0.45, 0.5])
  ellipsoid(head, darkFur, [0, 1.41, -1.02], [0.36, 0.28, 0.43])
  ellipsoid(head, paleFur, [0, 1.44, -1.2], [0.27, 0.18, 0.28])
  ellipsoid(head, muzzleMat, [0, 1.48, -1.42], [0.16, 0.105, 0.11])
  for (const side of [-1, 1]) {
    ellipsoid(head, hide, [side * 0.34, 1.91, -0.74], [0.16, 0.17, 0.13])
    ellipsoid(head, darkFur, [side * 0.34, 1.93, -0.79], [0.08, 0.085, 0.07])
    ellipsoid(head, eyeMat, [side * 0.29, 1.68, -1.04], [0.052, 0.06, 0.034])
    ellipsoid(body, darkFur, [side * 0.19, 0.42, -0.35], [0.33, 0.46, 0.36])
  }
  const legs: THREE.Group[] = []
  for (const [x, z] of [[-0.5, -0.6], [0.5, -0.6], [-0.52, 0.68], [0.52, 0.68]]) {
    const leg = new THREE.Group()
    leg.position.set(x, 0.68, z)
    ellipsoid(leg, hide, [0, -0.22, 0], [0.25, 0.43, 0.25])
    ellipsoid(leg, darkFur, [0, -0.51, -0.03], [0.28, 0.16, 0.31])
    for (let claw = -1; claw <= 1; claw += 1) {
      const nail = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.13, 8), hoofMat)
      nail.position.set(claw * 0.095, -0.51, -0.29)
      nail.rotation.x = -Math.PI / 2
      leg.add(nail)
    }
    body.add(leg)
    legs.push(leg)
  }
  return { root, body, head, legs }
}

export function createPrey(kind: Extract<FoodKind, 'fawn' | 'deer' | 'elk' | 'moose'>): AnimalRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  const head = new THREE.Group()
  root.add(body)
  body.add(head)
  const isMoose = kind === 'moose'
  const isElk = kind === 'elk'
  const isFawn = kind === 'fawn'
  const coat = furMaterial(isMoose ? '#765a42' : isElk ? '#9b7555' : isFawn ? '#bd8c5d' : '#a47b58')
  const underside = isFawn ? paleFur : darkFur
  const scale = isFawn ? 0.58 : isMoose ? 1.32 : isElk ? 1.08 : 0.86
  body.scale.setScalar(scale)
  ellipsoid(body, coat, [0, 1.04, 0.18], [0.51, 0.5, 0.95])
  ellipsoid(body, underside, [0, 0.8, 0.19], [0.38, 0.27, 0.72])
  const neckLength = isMoose ? 0.64 : 0.43
  ellipsoid(head, coat, [0, 1.37, -0.57], [isMoose ? 0.32 : 0.25, 0.52, neckLength])
  ellipsoid(head, coat, [0, 1.76, -0.91], [isMoose ? 0.3 : 0.23, 0.31, 0.39])
  ellipsoid(head, underside, [0, 1.63, -1.2], [isMoose ? 0.23 : 0.17, 0.17, 0.3])
  for (const side of [-1, 1]) ellipsoid(head, eyeMat, [side * 0.17, 1.8, -1.17], [0.055, 0.06, 0.045])
  for (const side of [-1, 1]) {
    ellipsoid(head, coat, [side * 0.25, 1.83, -0.93], [0.1, 0.08, 0.22])
    if (isFawn) {
      for (let spot = 0; spot < 7; spot += 1) {
        ellipsoid(body, paleFur, [((spot % 3) - 1) * 0.19, 1.32 + Math.floor(spot / 3) * 0.12, 0.02 + (spot % 2) * 0.26], [0.035, 0.045, 0.045])
      }
    }
  }
  if (!isFawn) addAntlers(head, isMoose ? 1.15 : isElk ? 0.91 : 0.65, isMoose)
  const legs: THREE.Group[] = []
  for (const [x, z] of [[-0.32, -0.53], [0.32, -0.53], [-0.32, 0.72], [0.32, 0.72]]) {
    const leg = new THREE.Group()
    leg.position.set(x, 0.72, z)
    const length = isMoose ? 0.69 : isElk ? 0.62 : 0.55
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, length * 0.56, 6, 10), coat)
    upper.position.y = -length * 0.35
    upper.castShadow = true
    leg.add(upper)
    ellipsoid(leg, hoofMat, [0, -length * 0.83, -0.04], [0.105, 0.09, 0.14])
    body.add(leg)
    legs.push(leg)
  }
  if (kind === 'moose') {
    const dewlap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.39, 12), darkFur)
    dewlap.position.set(0, 1.2, -0.82)
    head.add(dewlap)
  }
  return { root, body, head, legs }
}

function addAntlers(head: THREE.Group, spread: number, palmated: boolean): void {
  for (const side of [-1, 1]) {
    const base = new THREE.Group()
    base.position.set(side * 0.2, 1.95, -0.89)
    base.rotation.z = -side * 0.24
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, spread * 0.85, 9), antlerMat)
    main.position.set(side * spread * 0.31, spread * 0.42, 0)
    main.rotation.z = -side * 0.27
    main.castShadow = true
    base.add(main)
    const tines = palmated ? 5 : 4
    for (let i = 0; i < tines; i += 1) {
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.045, spread * (0.24 + (i % 2) * 0.1), 7), antlerMat)
      tine.position.set(side * spread * (0.17 + i * 0.13), spread * (0.34 + (i % 2) * 0.12), 0)
      tine.rotation.z = side * (0.12 + i * 0.09)
      base.add(tine)
    }
    head.add(base)
  }
}

export function createSalmon(): THREE.Group {
  const fish = new THREE.Group()
  ellipsoid(fish, salmonMat, [0, 0, 0], [0.28, 0.23, 0.76])
  ellipsoid(fish, new THREE.MeshStandardMaterial({ color: '#d69d80', roughness: 0.55 }), [0, -0.1, 0.1], [0.25, 0.09, 0.5])
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 14), finMat)
  tail.position.z = 0.87
  tail.rotation.x = -Math.PI / 2
  tail.scale.set(1, 0.6, 0.62)
  fish.add(tail)
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 12), finMat)
  fin.position.set(0, 0.2, 0.04)
  fin.rotation.z = Math.PI
  fish.add(fin)
  for (const side of [-1, 1]) {
    ellipsoid(fish, eyeMat, [side * 0.19, 0.08, -0.42], [0.04, 0.042, 0.035])
    const pectoral = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), finMat)
    pectoral.position.set(side * 0.2, -0.04, -0.07)
    pectoral.scale.set(0.4, 0.7, 1.5)
    pectoral.rotation.x = side * 0.2
    fish.add(pectoral)
  }
  return fish
}

export function createHoney(): THREE.Group {
  const group = new THREE.Group()
  const hive = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.78, 18, 4), new THREE.MeshStandardMaterial({ color: '#6f482a', roughness: 0.92 }))
  hive.position.y = 0.76
  hive.castShadow = true
  group.add(hive)
  for (let row = 0; row < 3; row += 1) {
    const comb = new THREE.Mesh(new THREE.TorusGeometry(0.31 - row * 0.015, 0.035, 10, 24), honeyMat)
    comb.rotation.x = Math.PI / 2
    comb.position.set(0, 0.47 + row * 0.12, -0.38)
    group.add(comb)
  }
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), honeyMat)
  drip.position.set(0, 0.33, -0.41)
  drip.scale.y = 1.4
  group.add(drip)
  return group
}

export function createPoison(): THREE.Group {
  const group = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.38, 10), new THREE.MeshStandardMaterial({ color: '#82926b', roughness: 0.9 }))
  stem.position.y = 0.2
  group.add(stem)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), poisonMat)
  cap.scale.set(1.35, 0.54, 1.15)
  cap.position.y = 0.42
  cap.castShadow = true
  group.add(cap)
  const spots = new THREE.MeshStandardMaterial({ color: '#d8c8a8', roughness: 0.85 })
  for (let i = 0; i < 7; i += 1) {
    const angle = i * 2.399
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 2) * 0.012, 8, 6), spots)
    dot.position.set(Math.cos(angle) * 0.24, 0.52, Math.sin(angle) * 0.21)
    group.add(dot)
  }
  return group
}

export function createBearTrap(): THREE.Group {
  const group = new THREE.Group()
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.075, 0.62), trapMat)
  plate.position.y = 0.09
  group.add(plate)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 9, 24), trapMat)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.18
  group.add(ring)
  for (const side of [-1, 1]) {
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 7, 20, Math.PI), trapMat)
    jaw.rotation.set(Math.PI / 2, 0, side * 0.06)
    jaw.position.y = 0.2
    group.add(jaw)
  }
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 14), trapMat)
  spring.position.set(0, 0.1, 0.34)
  group.add(spring)
  group.traverse(object => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true })
  return group
}

function furMaterial(color: string, roughness = 0.98, bumpScale = 0.075): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness })
  if (furTexture) material.map = furTexture
  if (furBump) { material.bumpMap = furBump; material.bumpScale = bumpScale }
  return material
}

function ellipsoid(parent: THREE.Object3D, material: THREE.Material, position: [number, number, number], scale: [number, number, number]): THREE.Mesh {
  const mesh = new THREE.Mesh(sphere, material)
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function makeFurTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#8a725c'
  ctx.fillRect(0, 0, 256, 256)
  let seed = 29731
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < 5200; i += 1) {
    const shade = Math.floor(85 + random() * 110)
    ctx.strokeStyle = `rgba(${shade},${Math.floor(shade * 0.84)},${Math.floor(shade * 0.66)},${0.1 + random() * 0.23})`
    ctx.lineWidth = 0.4 + random() * 1.1
    const x = random() * 256
    const y = random() * 256
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (random() - 0.5) * 2.3, y + 2 + random() * 8)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.7, 1.2)
  texture.anisotropy = 4
  return texture
}
