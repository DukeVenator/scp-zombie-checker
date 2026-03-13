import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Full-screen Three.js "updating application" animation.
 * Used when a badge visitor (no agent profile) gets a PWA update and we auto-reload.
 */
export function UpdatingScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.z = 4

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8)
    const material = new THREE.MeshNormalMaterial()
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const resize = () => {
      if (!container.parentElement) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', resize)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      mesh.rotation.x += 0.008
      mesh.rotation.y += 0.012
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      className="updating-overlay"
      ref={containerRef}
      role="alert"
      aria-live="polite"
      aria-label="Application updating"
    >
      <div className="updating-overlay__content">
        <p className="updating-overlay__title">Updating application…</p>
        <p className="updating-overlay__sub">You’ll be back in a moment.</p>
      </div>
    </div>
  )
}
