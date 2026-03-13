import { useEffect, useRef } from 'react'

export type BadgeSeverity = 'cleared' | 'warning' | 'critical' | 'terminated'

/** Cleared: gentle green rising particles (soft upward drift). */
function initClearedParticles(w: number, h: number) {
  const count = Math.min(100, Math.floor((w * h) / 14000))
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vy: -(0.12 + Math.random() * 0.28),
    vx: (Math.random() - 0.5) * 0.04,
    opacity: 0.06 + Math.random() * 0.1,
    size: 0.9 + Math.random() * 0.6,
  }))
}

/** Warning: amber dust motes that drift and bob (floating debris). */
function initWarningParticles(w: number, h: number) {
  const count = Math.min(85, Math.floor((w * h) / 16000))
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.06,
    vy: (Math.random() - 0.5) * 0.05,
    phase: Math.random() * Math.PI * 2,
    bobAmplitude: 2 + Math.random() * 3,
    bobSpeed: 0.8 + Math.random() * 1.2,
    opacity: 0.06 + Math.random() * 0.11,
    size: 1 + Math.random() * 0.8,
  }))
}

/** Critical: spore-like blobs – slow drift with organic wobble and soft pulse. */
function initCriticalSpores(w: number, h: number) {
  const count = Math.min(65, Math.floor((w * h) / 18000))
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.08,
    vy: (Math.random() - 0.5) * 0.06,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    wobbleAmplitude: 4 + Math.random() * 8,
    wobbleSpeed: 0.4 + Math.random() * 0.6,
    size: 2.5 + Math.random() * 4,
    baseOpacity: 0.06 + Math.random() * 0.12,
    pulseSpeed: 1.2 + Math.random() * 1.5,
    pulsePhase: Math.random() * Math.PI * 2,
  }))
}

/** Terminated: no particle array; lightweight scanlines drawn per frame (see loop). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as other inits
function initTerminatedParticles(_w: number, _h: number) {
  return []
}

export function useBadgeBackgroundCanvas(visible: boolean, severity: BadgeSeverity) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<unknown[]>([])
  const runningRef = useRef(false)
  const lastSeverityRef = useRef(severity)

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
      if (particlesRef.current.length === 0 || lastSeverityRef.current !== severity) {
        lastSeverityRef.current = severity
        if (severity === 'cleared') {
          particlesRef.current = initClearedParticles(w, h)
        } else if (severity === 'terminated') {
          particlesRef.current = initTerminatedParticles(w, h)
        } else if (severity === 'warning') {
          particlesRef.current = initWarningParticles(w, h)
        } else {
          particlesRef.current = initCriticalSpores(w, h)
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
        t += 0.012

        if (severity === 'cleared') {
          ctx.fillStyle = 'rgba(8, 18, 14, 0.12)'
          ctx.fillRect(0, 0, w, h)
          const particles = particlesRef.current as {
            x: number
            y: number
            vx: number
            vy: number
            opacity: number
            size: number
          }[]
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            p.x += p.vx
            p.y += p.vy
            if (p.y < -2) p.y = h + 2
            if (p.x < -2) p.x = w + 2
            if (p.x > w + 2) p.x = -2
            const flicker = 0.78 + 0.22 * Math.sin(t * 2 + i)
            ctx.fillStyle = `rgba(168, 224, 192, ${p.opacity * flicker})`
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
          }
        } else if (severity === 'terminated') {
          /* Lightweight B&W archival: dark base + slow drifting scanlines + soft vignette */
          ctx.fillStyle = 'rgb(14, 14, 14)'
          ctx.fillRect(0, 0, w, h)
          const bandCount = 24
          const bandHeight = 3
          const drift = (t * 18) % (h + 80)
          for (let i = 0; i < bandCount; i++) {
            const y = (i * (h / (bandCount + 1)) + drift) % (h + 60) - 30
            const alpha = 0.04 + 0.04 * Math.sin(t * 0.6 + i * 0.4)
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
            ctx.fillRect(0, y, w, bandHeight)
          }
          const vignette = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
          ctx.fillStyle = vignette
          ctx.fillRect(0, 0, w, h)
        } else if (severity === 'warning') {
          ctx.fillStyle = 'rgba(18, 16, 10, 0.14)'
          ctx.fillRect(0, 0, w, h)
          const particles = particlesRef.current as {
            x: number
            y: number
            vx: number
            vy: number
            phase: number
            bobAmplitude: number
            bobSpeed: number
            opacity: number
            size: number
          }[]
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            p.x += p.vx + Math.sin(t * p.bobSpeed + p.phase) * 0.15
            p.y += p.vy + Math.cos(t * p.bobSpeed * 0.9 + p.phase * 1.3) * p.bobAmplitude * 0.08
            if (p.x < 0) p.x = w
            if (p.x > w) p.x = 0
            if (p.y < 0) p.y = h
            if (p.y > h) p.y = 0
            const flicker = 0.72 + 0.28 * Math.sin(t * 1.4 + i * 0.6)
            ctx.fillStyle = `rgba(209, 201, 164, ${p.opacity * flicker})`
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          /* Critical: spore-like – slow drift + organic wobble + soft pulse */
          ctx.fillStyle = 'rgba(14, 4, 4, 0.2)'
          ctx.fillRect(0, 0, w, h)
          const spores = particlesRef.current as {
            x: number
            y: number
            vx: number
            vy: number
            phaseX: number
            phaseY: number
            wobbleAmplitude: number
            wobbleSpeed: number
            size: number
            baseOpacity: number
            pulseSpeed: number
            pulsePhase: number
          }[]
          for (let i = 0; i < spores.length; i++) {
            const s = spores[i]
            const wobbleX = Math.sin(t * s.wobbleSpeed + s.phaseX) * s.wobbleAmplitude
            const wobbleY = Math.sin(t * s.wobbleSpeed * 1.17 + s.phaseY) * s.wobbleAmplitude * 0.8
            s.x += s.vx + wobbleX * 0.02
            s.y += s.vy + wobbleY * 0.02
            if (s.x < -s.size * 2) s.x = w + s.size * 2
            if (s.x > w + s.size * 2) s.x = -s.size * 2
            if (s.y < -s.size * 2) s.y = h + s.size * 2
            if (s.y > h + s.size * 2) s.y = -s.size * 2
            const pulse = 0.7 + 0.3 * Math.sin(t * s.pulseSpeed + s.pulsePhase)
            const opacity = s.baseOpacity * pulse
            /* Soft spore: slight gradient-like falloff via radial blur effect (draw as soft circle) */
            const r = 180 + Math.floor(75 * (1 - opacity))
            const g = 60 + Math.floor(40 * (1 - opacity))
            const b = 60 + Math.floor(40 * (1 - opacity))
            const gradient = ctx.createRadialGradient(
              s.x,
              s.y,
              0,
              s.x,
              s.y,
              s.size * 1.4,
            )
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.9})`)
            gradient.addColorStop(0.5, `rgba(200, 80, 80, ${opacity * 0.4})`)
            gradient.addColorStop(1, 'rgba(120, 40, 40, 0)')
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(s.x, s.y, s.size * 1.4, 0, Math.PI * 2)
            ctx.fill()
            /* Slightly brighter core */
            ctx.fillStyle = `rgba(220, 100, 100, ${opacity * 0.35})`
            ctx.beginPath()
            ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      loop()
    }

    resize()
    if (particlesRef.current.length === 0 || lastSeverityRef.current !== severity) {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w > 0 && h > 0) {
        lastSeverityRef.current = severity
        if (severity === 'cleared') {
          particlesRef.current = initClearedParticles(w, h)
        } else if (severity === 'terminated') {
          particlesRef.current = initTerminatedParticles(w, h)
        } else if (severity === 'warning') {
          particlesRef.current = initWarningParticles(w, h)
        } else {
          particlesRef.current = initCriticalSpores(w, h)
        }
      }
    }
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
  }, [visible, severity])

  return canvasRef
}
