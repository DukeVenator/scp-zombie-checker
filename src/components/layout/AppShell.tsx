import { useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Database, Download, RadioTower, ShieldAlert, UserRoundCog } from 'lucide-react'
import { useAgentProfile } from '../../hooks/useAgentProfile'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../hooks/useToast'
import { usePwaUpdater } from '../../lib/pwa'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/new', label: 'New Patient', icon: ShieldAlert },
  { to: '/transfers', label: 'Transfers', icon: Database },
]

export const AppShell = () => {
  const online = useOnlineStatus()
  const { profile, openSetup } = useAgentProfile()
  const { needRefresh, updateServiceWorker } = usePwaUpdater()
  const { pushToast } = useToast()
  const announcedUpdateRef = useRef(false)

  useEffect(() => {
    if (needRefresh[0] && !announcedUpdateRef.current) {
      announcedUpdateRef.current = true
      pushToast({
        title: 'Application update ready',
        description: 'A newer offline bundle is available. Apply now or dismiss to update later.',
        tone: 'info',
      })
    }
  }, [needRefresh, pushToast])

  return (
    <div className="app-shell">
      {needRefresh[0] && (
        <div className="update-banner" role="alert">
          <div className="update-banner__body">
            <Download size={16} />
            <span>A new version of SCP Zombie Checker is available.</span>
          </div>
          <button className="update-banner__btn" onClick={() => updateServiceWorker(true)} type="button">
            Apply update &amp; reload
          </button>
        </div>
      )}

      <header className="app-header">
        <div>
          <p className="eyebrow">SCP Task Force Intake Suite</p>
          <h1>SCP Zombie Checker</h1>
          <p className="subtitle">
            {profile
              ? `Active agent ${profile.callsign} / ${profile.taskForceUnit}`
              : 'Offline field intake, classification, and transfer tooling.'}
          </p>
        </div>
        <div className="status-cluster">
          {profile && (
            <button className="ghost-button" onClick={openSetup} type="button">
              <UserRoundCog size={16} />
              {profile.callsign}
            </button>
          )}
          <span className={`status-pill ${online ? 'is-online' : 'is-offline'}`}>
            <RadioTower size={16} />
            {online ? 'Online' : 'Offline ready'}
          </span>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
