import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAgentProfile } from '../hooks/useAgentProfile'

const STARTUP_DONE_KEY = 'scp-zombie-checker:startup-done'
const WELCOME_DURATION_MS = 2200
const PHASE_VERIFIED_MS = 600
const DELAY_AFTER_STARTUP_MS = 200

const WELCOME_VARIANTS = [1, 2, 3] as const
function pickWelcomeVariant(): (typeof WELCOME_VARIANTS)[number] {
  return WELCOME_VARIANTS[Math.floor(Math.random() * WELCOME_VARIANTS.length)]
}

function isBadgePage(pathname: string): boolean {
  return pathname === '/badge' || pathname === 'badge' || pathname.endsWith('/badge')
}

export const WelcomeBackUnlock = () => {
  const location = useLocation()
  const { profile, showSetup } = useAgentProfile()
  const variant = useMemo(() => pickWelcomeVariant(), [])
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'welcome' | 'verified'>('welcome')
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const hasShownWelcomeThisLoadRef = useRef(false)

  useEffect(() => {
    if (!profile || showSetup || isBadgePage(location.pathname)) {
      return
    }

    const runWelcome = () => {
      if (hasShownWelcomeThisLoadRef.current) return
      hasShownWelcomeThisLoadRef.current = true
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
      setVisible(true)
      setPhase('welcome')
      const t1 = window.setTimeout(() => setPhase('verified'), PHASE_VERIFIED_MS)
      const t2 = window.setTimeout(() => setVisible(false), WELCOME_DURATION_MS)
      timeoutsRef.current = [t1, t2]
    }

    const startupDone = sessionStorage.getItem(STARTUP_DONE_KEY) === '1'
    if (startupDone) {
      const t = window.setTimeout(runWelcome, DELAY_AFTER_STARTUP_MS)
      return () => {
        window.clearTimeout(t)
        timeoutsRef.current.forEach(clearTimeout)
        timeoutsRef.current = []
      }
    }

    const onStartupDone = () => runWelcome()
    window.addEventListener('scp-startup-done', onStartupDone)
    return () => {
      window.removeEventListener('scp-startup-done', onStartupDone)
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [profile, showSetup, location.pathname])

  if (!visible || !profile || isBadgePage(location.pathname)) {
    return null
  }

  return (
    <div className="unlock-overlay unlock-overlay--welcome" aria-live="polite" aria-label="Welcome back, agent verified" data-variant={String(variant)}>
      <div className="unlock-modal unlock-modal--welcome" data-phase={phase} data-variant={String(variant)}>
        <div className="unlock-modal__icon-wrap">
          <ShieldCheck
            size={48}
            strokeWidth={1.8}
            className={`unlock-modal__icon ${phase === 'verified' ? 'unlock-modal__icon--verified' : ''}`}
            aria-hidden
          />
        </div>
        <p className="unlock-modal__line">WELCOME BACK, {profile.callsign.toUpperCase()}</p>
        <p className="unlock-modal__line unlock-modal__line--highlight">
          {phase === 'verified' ? 'CLEARANCE VERIFIED' : '…'}
        </p>
      </div>
    </div>
  )
}
