import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAgentProfile } from '../hooks/useAgentProfile'

const STARTUP_DONE_KEY = 'scp-zombie-checker:startup-done'
const WELCOME_DURATION_MS = 2200
const PHASE_VERIFIED_MS = 600
const DELAY_AFTER_STARTUP_MS = 200

export const WelcomeBackUnlock = () => {
  const { profile, showSetup } = useAgentProfile()
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'welcome' | 'verified'>('welcome')
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!profile || showSetup) {
      return
    }

    const runWelcome = () => {
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
  }, [profile, showSetup])

  if (!visible || !profile) {
    return null
  }

  return (
    <div className="unlock-overlay unlock-overlay--welcome" aria-live="polite" aria-label="Welcome back, agent verified">
      <div className="unlock-modal unlock-modal--welcome" data-phase={phase}>
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
