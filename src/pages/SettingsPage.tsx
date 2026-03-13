import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon } from 'lucide-react'
import { STARTUP_SOUND_DISABLED_KEY } from '../components/StartupAnimation'
import { useAgentProfile } from '../hooks/useAgentProfile'
import { useToast } from '../hooks/useToast'
import { usePatientStore } from '../hooks/usePatientStore'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePwaUpdater } from '../lib/pwa'
import { clearPatients } from '../lib/storage'

function getStartupSoundDisabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STARTUP_SOUND_DISABLED_KEY) === '1'
}

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { profile, clearAgentProfile, openSetup } = useAgentProfile()
  const { pushToast } = useToast()
  const { patients, refresh } = usePatientStore()
  const online = useOnlineStatus()
  const { needRefresh } = usePwaUpdater()
  const [confirmClearAgent, setConfirmClearAgent] = useState(false)
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false)
  const [startupSoundDisabled, setStartupSoundDisabled] = useState(getStartupSoundDisabled)

  const handleStartupSoundToggle = (disabled: boolean) => {
    if (disabled) {
      window.localStorage.setItem(STARTUP_SOUND_DISABLED_KEY, '1')
    } else {
      window.localStorage.removeItem(STARTUP_SOUND_DISABLED_KEY)
    }
    setStartupSoundDisabled(disabled)
    pushToast({
      title: disabled ? 'Startup sound disabled' : 'Startup sound enabled',
      description: disabled ? 'Sound will not play on app startup.' : 'Sound will play on next startup.',
      tone: 'info',
    })
  }

  const handleClearAgent = () => {
    if (!confirmClearAgent) {
      setConfirmClearAgent(true)
      return
    }
    clearAgentProfile()
    setConfirmClearAgent(false)
    pushToast({ title: 'Agent data cleared', description: 'Reconfigure your agent profile to continue.', tone: 'info' })
    openSetup()
    navigate('/')
  }

  const handleFactoryReset = async () => {
    if (!confirmFactoryReset) {
      setConfirmFactoryReset(true)
      return
    }
    await clearPatients()
    clearAgentProfile()
    await refresh()
    setConfirmFactoryReset(false)
    pushToast({ title: 'Factory reset complete', description: 'All local data has been cleared.', tone: 'warning' })
    navigate('/')
  }

  return (
    <div className="page-stack">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Console settings</p>
          <h2>Agent data, reset, and debugging</h2>
          <p className="muted">
            Clear agent profile, perform a full factory reset, or view diagnostic information.
          </p>
        </div>
      </section>

      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sound</p>
            <h3>Startup sound</h3>
          </div>
        </div>
        <div className="settings-actions">
          <div className="settings-action settings-action--toggle">
            <div>
              <strong>Play sound on startup</strong>
              <p className="muted">Play the intake console sound when the app starts. Disable to keep startup silent.</p>
            </div>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={!startupSoundDisabled}
                onChange={(e) => handleStartupSoundToggle(!e.target.checked)}
                aria-describedby="startup-sound-desc"
              />
              <span className="toggle-label__text">{startupSoundDisabled ? 'Off' : 'On'}</span>
            </label>
          </div>
        </div>
        <p id="startup-sound-desc" className="visually-hidden">
          When on, startup sound plays on app load. When off, startup is silent.
        </p>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Data & reset</p>
            <h3>Clear data</h3>
          </div>
          <SettingsIcon size={18} />
        </div>

        <div className="settings-actions">
          <div className="settings-action">
            <div>
              <strong>Clear agent data</strong>
              <p className="muted">Remove the stored agent profile. You will be asked to reconfigure on next use.</p>
            </div>
            {confirmClearAgent ? (
              <div className="button-cluster">
                <button className="ghost-button" onClick={() => setConfirmClearAgent(false)} type="button">
                  Cancel
                </button>
                <button className="secondary-button" onClick={handleClearAgent} type="button">
                  Confirm clear agent
                </button>
              </div>
            ) : (
              <button className="secondary-button" onClick={handleClearAgent} type="button">
                Clear agent data
              </button>
            )}
          </div>

          <div className="settings-action">
            <div>
              <strong>Factory reset</strong>
              <p className="muted">Clear all local data: agent profile, all patients, and recent history. This cannot be undone.</p>
            </div>
            {confirmFactoryReset ? (
              <div className="button-cluster">
                <button className="ghost-button" onClick={() => setConfirmFactoryReset(false)} type="button">
                  Cancel
                </button>
                <button className="primary-button" onClick={() => void handleFactoryReset()} type="button">
                  Confirm factory reset
                </button>
              </div>
            ) : (
              <button className="secondary-button" onClick={() => void handleFactoryReset()} type="button">
                Factory reset
              </button>
            )}
          </div>
        </div>
      </article>

      <details className="panel panel--inner settings-debug">
        <summary className="settings-debug__summary">Debugging tools</summary>
        <dl className="settings-debug__list">
          <div>
            <dt>App version</dt>
            <dd>{import.meta.env.VITE_APP_VERSION ?? '—'}</dd>
          </div>
          <div>
            <dt>Patient records</dt>
            <dd>{patients.length}</dd>
          </div>
          <div>
            <dt>Online status</dt>
            <dd>{online ? 'Online' : 'Offline'}</dd>
          </div>
          <div>
            <dt>PWA update pending</dt>
            <dd>{needRefresh[0] ? 'Yes' : 'No'}</dd>
          </div>
          {profile && (
            <div>
              <dt>Active agent</dt>
              <dd>{profile.callsign} / {profile.taskForceUnit}</dd>
            </div>
          )}
        </dl>
      </details>
    </div>
  )
}
