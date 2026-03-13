import { useEffect, useRef } from 'react'

export function useParticleCanvas(visible: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<{ x: number; y: number; v: number; opacity: number }[]>([])
  const runningRef = useRef(false)

  useEffect(() => {
    if (!visible || !canvasRef.current) return
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w <= 0 || h <= 0) return
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
      if (particlesRef.current.length === 0) {
        const count = Math.min(120, Math.floor((w * h) / 12000))
        for (let i = 0; i < count; i++) {
          particlesRef.current.push({
            x: Math.random() * w,
            y: Math.random() * h,
            v: 0.2 + Math.random() * 0.4,
            opacity: 0.08 + Math.random() * 0.12,
          })
        }
      }
    }

    const startLoop = () => {
      if (runningRef.current || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return
      runningRef.current = true
      let t = 0
      const loop = () => {
        if (!canvasRef.current) return
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        if (w <= 0 || h <= 0) {
          frameRef.current = requestAnimationFrame(loop)
          return
        }
        frameRef.current = requestAnimationFrame(loop)
        ctx.fillStyle = 'rgba(4, 8, 6, 0.12)'
        ctx.fillRect(0, 0, w, h)
        t += 0.012
        const particles = particlesRef.current
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.y -= p.v
          if (p.y < 0) p.y = h
          const flicker = 0.7 + 0.3 * Math.sin(t * 3 + i)
          ctx.fillStyle = `rgba(180, 220, 200, ${p.opacity * flicker})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      loop()
    }

    resize()
    startLoop()
    const ro = new ResizeObserver(() => {
      resize()
      startLoop()
    })
    ro.observe(canvas)
    window.addEventListener('resize', resize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      runningRef.current = false
    }
  }, [visible])

  return canvasRef
}
