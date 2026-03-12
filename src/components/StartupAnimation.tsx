import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'

const STARTUP_DONE_KEY = 'scp-zombie-checker:startup-done'
const STARTUP_DURATION_MS = 3800
const PHASE_READY_MS = 2200

export const StartupAnimation = () => {
  const [visible, setVisible] = useState(() => sessionStorage.getItem(STARTUP_DONE_KEY) !== '1')
  const [phase, setPhase] = useState<'boot' | 'ready'>('boot')

  useEffect(() => {
    const done = sessionStorage.getItem(STARTUP_DONE_KEY)
    if (done === '1') {
      return
    }

    const t1 = window.setTimeout(() => setPhase('ready'), PHASE_READY_MS)
    const t2 = window.setTimeout(() => {
      sessionStorage.setItem(STARTUP_DONE_KEY, '1')
      setVisible(false)
      window.dispatchEvent(new CustomEvent('scp-startup-done'))
    }, STARTUP_DURATION_MS)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div
      className="startup-screen"
      data-phase={phase}
      aria-live="polite"
      aria-label="System starting"
    >
      <div className="startup-screen__scanlines" aria-hidden="true" />
      <div className="startup-screen__content">
        <div className="startup-screen__seal">
          <Shield size={56} strokeWidth={1.5} />
        </div>
        <p className="startup-screen__title">SCP INTAKE CONSOLE</p>
        <div className="startup-screen__progress">
          <div className="startup-screen__progress-bar" />
        </div>
        <p className="startup-screen__status">{phase === 'ready' ? 'SYSTEM ONLINE' : 'INITIALIZING...'}</p>
      </div>
    </div>
  )
}
