import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useParticleCanvas } from '../hooks/useParticleCanvas'

function isBadgePath(pathname: string): boolean {
  return pathname === '/badge' || pathname === 'badge' || pathname.endsWith('/badge')
}

const STARTUP_DONE_KEY = 'scp-zombie-checker:startup-done'
const STARTUP_AFTER_UPDATE_KEY = 'scp-zombie-checker:startup-after-update'
const AGENT_PROFILE_KEY = 'scp-zombie-checker:agent-profile'
export const STARTUP_SOUND_DISABLED_KEY = 'scp-zombie-checker:startup-sound-disabled'
const STARTUP_DURATION_MS = 3800
const PHASE_READY_MS = 2200
const STARTUP_SOUND_DELAY_MS = 2000

function isStartupSoundDisabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STARTUP_SOUND_DISABLED_KEY) === '1'
  } catch {
    return false
  }
}

function hasAgentProfile(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !!window.localStorage.getItem(AGENT_PROFILE_KEY)
  } catch {
    return false
  }
}

function shouldShowStartup(): boolean {
  if (typeof window === 'undefined') return true
  if (hasAgentProfile() === false) return true
  if (window.sessionStorage.getItem(STARTUP_AFTER_UPDATE_KEY) === '1') return true
  if (window.sessionStorage.getItem(STARTUP_DONE_KEY) !== '1') return true
  return false
}

const LOG_PREFIX = '[StartupSound]'

function useStartupSound(visible: boolean, soundEnabled: boolean) {
  const playedRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      console.debug(LOG_PREFIX, 'Skipped: startup not visible')
      return
    }
    if (playedRef.current) {
      console.debug(LOG_PREFIX, 'Skipped: already played')
      return
    }
    if (!soundEnabled) {
      console.debug(LOG_PREFIX, 'Skipped: sound disabled in settings')
      return
    }
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      console.debug(LOG_PREFIX, 'Skipped: prefers-reduced-motion')
      return
    }

    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
    const src = `${base}/sounds/startup.mp3`
    console.debug(LOG_PREFIX, 'Scheduling play', { src, delayMs: STARTUP_SOUND_DELAY_MS })
    const audio = new Audio(src)
    audio.volume = 0.6

    const t = window.setTimeout(() => {
      console.debug(LOG_PREFIX, 'Playing…', src)
      const p = audio.play()
      if (p?.then) {
        p.then(() => {
          playedRef.current = true
          console.debug(LOG_PREFIX, 'Playback started')
        }).catch((err) => {
          console.warn(LOG_PREFIX, 'Playback failed (e.g. autoplay blocked)', err)
        })
      } else {
        playedRef.current = true
        console.debug(LOG_PREFIX, 'Playback started (sync)')
      }
    }, STARTUP_SOUND_DELAY_MS)

    return () => {
      window.clearTimeout(t)
      audio.pause()
      audio.src = ''
      console.debug(LOG_PREFIX, 'Cleanup: timer cancelled, audio paused')
    }
  }, [visible, soundEnabled])
}

export const StartupAnimation = () => {
  const location = useLocation()
  const onBadge = isBadgePath(location.pathname)
  const [visible, setVisible] = useState(() => !onBadge && shouldShowStartup())
  const [phase, setPhase] = useState<'boot' | 'ready'>('boot')
  const soundEnabled = !isStartupSoundDisabled()
  const canvasRef = useParticleCanvas(visible)
  useStartupSound(visible, soundEnabled)

  /* On /badge, never show app startup; let badge page show its own animations and unblock listeners */
  useEffect(() => {
    if (onBadge) {
      window.sessionStorage.removeItem(STARTUP_AFTER_UPDATE_KEY)
      window.dispatchEvent(new CustomEvent('scp-startup-done'))
    }
  }, [onBadge])

  useEffect(() => {
    if (!visible) {
      window.sessionStorage.removeItem(STARTUP_AFTER_UPDATE_KEY)
      window.dispatchEvent(new CustomEvent('scp-startup-done'))
      return
    }

    const t1 = window.setTimeout(() => setPhase('ready'), PHASE_READY_MS)
    const t2 = window.setTimeout(() => {
      window.sessionStorage.setItem(STARTUP_DONE_KEY, '1')
      window.sessionStorage.removeItem(STARTUP_AFTER_UPDATE_KEY)
      setVisible(false)
      window.dispatchEvent(new CustomEvent('scp-startup-done'))
    }, STARTUP_DURATION_MS)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [visible])

  if (onBadge || !visible) {
    return null
  }

  return (
    <div
      className="startup-screen"
      data-phase={phase}
      data-testid="startup-screen"
      aria-live="polite"
      aria-label="System starting"
    >
      <canvas ref={canvasRef} className="startup-screen__canvas" aria-hidden="true" />
      <div className="startup-screen__vignette" aria-hidden="true" />
      <div className="startup-screen__scanlines" aria-hidden="true" />
      <div className="startup-screen__content">
        <div className="startup-screen__seal">
          <Shield size={56} strokeWidth={1.5} />
        </div>
        <p className={`startup-screen__title ${phase === 'ready' ? 'startup-screen__title--glitch' : ''}`}>
          SCP INTAKE CONSOLE
        </p>
        <div className="startup-screen__progress">
          <div className="startup-screen__progress-bar" />
        </div>
        <p className="startup-screen__status">{phase === 'ready' ? 'SYSTEM ONLINE' : 'INITIALIZING...'}</p>
      </div>
    </div>
  )
}
