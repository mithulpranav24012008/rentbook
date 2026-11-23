// The apartment block in 3D: one window per house, lit when that house's rent is paid.
// Loaded lazily so three.js never slows the first screen. Draws only when something changes.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { BuildingWindows, WindowState } from '../lib/rent'

const WINDOW: Record<WindowState, number> = { paid: 0xf4b73a, due: 0x2a3850, vacant: 0xbcc2ca }
const WALL = 0xeee7da
const LEDGE = 0xd9cfbe
const GROUND = 0xdde2e9
const TANK = 0x2b2b2b

const COL = 1.15 // window pitch across
const ROW = 1.25 // floor height
const DEPTH = 2.2
const GAP = 1.4 // between buildings

type Props = { data: BuildingWindows[]; onFail: () => void; lightUp?: boolean }

export default function Building3D({ data, onFail, lightUp = false }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const sceneApi = useRef<ReturnType<typeof createScene> | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let api: ReturnType<typeof createScene>
    try {
      api = createScene(el, lightUp)
    } catch {
      onFail()
      return
    }
    sceneApi.current = api
    const ro = new ResizeObserver(() => api.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      api.dispose()
      sceneApi.current = null
    }
  }, [onFail, lightUp])

  useEffect(() => {
    sceneApi.current?.show(data)
  }, [data])

  return <div ref={host} className="building3d-canvas" aria-hidden="true" />
}

function createScene(el: HTMLElement, lightUp: boolean) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c0cc, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(-6, 10, 8)
  scene.add(sun)

  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshLambertMaterial({ color: GROUND }))
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const city = new THREE.Group()
  scene.add(city)

  // Window materials by house id, so a change of state can fade from the old colour.
  let windows = new Map<string, THREE.MeshBasicMaterial>()
  let fit = { width: 4, height: 4 }
  let raf = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const render = () => renderer.render(scene, camera)

  function frame() {
    const w = el.clientWidth || 1
    const h = el.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Fit the whole row of buildings, seen from the front-left and a little above.
    const half = THREE.MathUtils.degToRad(camera.fov / 2)
    const needH = fit.height * 1.05
    const needW = (fit.width * 1.05) / camera.aspect
    const dist = Math.max(needH, needW) / (2 * Math.tan(half)) + DEPTH
    const target = new THREE.Vector3(0, fit.height * 0.45, 0)
    camera.position.set(-dist * 0.38, fit.height * 0.55 + dist * 0.28, dist * 0.92)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
  }

  function clear() {
    city.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      }
    })
    city.clear()
  }

  function show(data: BuildingWindows[]) {
    const previous = new Map([...windows].map(([id, m]) => [id, m.color.clone()]))
    clear()
    windows = new Map()

    const widths = data.map((b) => b.columns * COL + 0.7)
    const total = widths.reduce((a, b) => a + b, 0) + GAP * Math.max(0, data.length - 1)
    let x = -total / 2
    let tallest = 2

    data.forEach((b, i) => {
      const w = widths[i]
      const h = b.floors * ROW + 0.5
      tallest = Math.max(tallest, h)
      const group = new THREE.Group()
      group.position.x = x + w / 2
      city.add(group)

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, DEPTH), new THREE.MeshLambertMaterial({ color: WALL }))
      body.position.y = h / 2
      group.add(body)

      // Parapet and the black water tank that sits on most Indian rooftops.
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.18, DEPTH + 0.12), new THREE.MeshLambertMaterial({ color: LEDGE }))
      parapet.position.y = h + 0.09
      group.add(parapet)
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 20), new THREE.MeshLambertMaterial({ color: TANK }))
      tank.position.set(w / 2 - 0.5, h + 0.43, -DEPTH / 4)
      group.add(tank)

      // A ledge under every floor.
      for (let f = 1; f < b.floors; f++) {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.07, 0.25), new THREE.MeshLambertMaterial({ color: LEDGE }))
        ledge.position.set(0, 0.25 + f * ROW, DEPTH / 2 + 0.1)
        group.add(ledge)
      }

      // House 1 is bottom-left, reading across and up, like the house numbers.
      b.windows.forEach((win, n) => {
        const col = n % b.columns
        const floor = Math.floor(n / b.columns)
        // The first time, a landing page starts every window dark and lights them one by one.
        const start = previous.get(win.unit.id) ?? new THREE.Color(lightUp ? WINDOW.due : WINDOW[win.state])
        const mat = new THREE.MeshBasicMaterial({ color: start })
        mat.userData.target = new THREE.Color(WINDOW[win.state])
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.78, 0.06), mat)
        pane.position.set(-w / 2 + 0.35 + COL / 2 + col * COL, 0.25 + ROW / 2 + floor * ROW, DEPTH / 2 + 0.02)
        group.add(pane)
        windows.set(win.unit.id, mat)
      })

      x += w + GAP
    })

    fit = { width: Math.max(total, 3), height: tallest + 0.6 }
    frame()
    fade()
  }

  // Each window moves to its colour over 450ms; with reduced motion it jumps there.
  function fade() {
    cancelAnimationFrame(raf)
    const mats = [...windows.values()]
    const from = mats.map((m) => m.color.clone())
    if (reduced) {
      mats.forEach((m) => m.color.copy(m.userData.target))
      render()
      return
    }
    const start = performance.now()
    const stagger = lightUp ? 160 : 0
    const length = 450 + stagger * mats.length
    const step = (now: number) => {
      const elapsed = now - start
      mats.forEach((m, i) => {
        const t = Math.min(1, Math.max(0, (elapsed - 300 * Number(lightUp) - i * stagger) / 450))
        m.color.copy(from[i]).lerp(m.userData.target, 1 - Math.pow(1 - t, 3))
      })
      render()
      if (elapsed < length + 300) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  return {
    show,
    resize() {
      frame()
      render()
    },
    dispose() {
      cancelAnimationFrame(raf)
      clear()
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
