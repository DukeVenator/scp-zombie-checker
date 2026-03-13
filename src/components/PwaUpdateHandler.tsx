import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useAgentProfile } from '../hooks/useAgentProfile'
import { usePwaUpdater } from '../lib/pwa'
import { UpdatingScene } from './UpdatingScene'

const STARTUP_AFTER_UPDATE_KEY = 'scp-zombie-checker:startup-after-update'

function isBadgePath(pathname: string): boolean {
  return pathname === '/badge' || pathname === 'badge' || pathname.endsWith('/badge')
}

/** Delay before triggering reload so the updating animation is visible. */
const AUTO_UPDATE_DELAY_MS = 1800

/**
 * Handles PWA updates:
 * - On badge page, visitors (no agent profile) auto-update with a full-screen Three.js animation.
 * - On badge page, set-up agents see a banner and can choose to update now or later.
 * - On app routes, AppShell shows the update banner (agents only).
 */
export function PwaUpdateHandler() {
  const location = useLocation()
  const { profile } = useAgentProfile()
  const { needRefresh, updateServiceWorker } = usePwaUpdater()
  const triggeredRef = useRef(false)
  const onBadge = isBadgePath(location.pathname)
  const canDelayUpdate = !!profile
  const shouldAutoUpdate = onBadge && !canDelayUpdate && needRefresh[0]

  useEffect(() => {
    if (!shouldAutoUpdate || triggeredRef.current) return
    triggeredRef.current = true
    const t = window.setTimeout(() => {
      window.sessionStorage.setItem(STARTUP_AFTER_UPDATE_KEY, '1')
      updateServiceWorker(true)
    }, AUTO_UPDATE_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [shouldAutoUpdate, updateServiceWorker])

  if (!needRefresh[0]) return null
  if (!onBadge) return null

  if (shouldAutoUpdate) {
    return <UpdatingScene />
  }

  /* On badge with agent profile: show banner so they can delay or apply now */
  return (
    <div className="update-banner update-banner--badge" role="alert">
      <div className="update-banner__body">
        <Download size={16} />
        <span>A new version is available.</span>
      </div>
      <button
        className="update-banner__btn"
        onClick={() => {
          window.sessionStorage.setItem(STARTUP_AFTER_UPDATE_KEY, '1')
          updateServiceWorker(true)
        }}
        type="button"
      >
        Apply update &amp; reload
      </button>
    </div>
  )
}
