import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shield, UserRoundCog } from 'lucide-react'
import { useAgentProfile } from '../../hooks/useAgentProfile'
import { useToast } from '../../hooks/useToast'
import { agentProfileSchema, defaultAgentProfile, profileToReportingAgent, type AgentProfile } from '../../types/agent'

const bootMessages = [
  'Initializing secure intake console',
  'Validating local containment protocols',
  'Authorizing field agent profile',
] as const

export const AgentOnboarding = () => {
  const location = useLocation()
  const { profile, showSetup, completeSetup, closeSetup, isReady } = useAgentProfile()
  const { pushToast } = useToast()
  const [booting, setBooting] = useState(() => !profile)
  const [form, setForm] = useState<AgentProfile>(profile ?? defaultAgentProfile())
  const [error, setError] = useState('')

  const isBadgePage = location.pathname === '/badge' || location.pathname === 'badge' || location.pathname.endsWith('/badge')

  useEffect(() => {
    if (!showSetup || profile) {
      return
    }

    const timeoutId = window.setTimeout(() => setBooting(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [profile, showSetup])

  const bootMessage = bootMessages[1]

  if (isBadgePage || !isReady || !showSetup) {
    return null
  }

  const handleSubmit = () => {
    const parsed = agentProfileSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Agent profile is incomplete.')
      return
    }

    completeSetup(parsed.data)
    setError('')
    setForm(parsed.data)
    pushToast({
      title: 'Agent profile loaded',
      description: `${parsed.data.callsign} is now the active reporting agent.`,
      tone: 'success',
    })
  }

  return (
    <div className="onboarding-overlay">
      <div className={`onboarding-shell ${booting ? 'is-booting' : 'is-ready'}`}>
        <div className="onboarding-brand">
          <div className="onboarding-seal">
            <Shield size={40} />
          </div>
          <div>
            <p className="eyebrow">SCP secure intake node</p>
            <h2>{booting ? 'Booting field console' : 'Configure agent profile'}</h2>
            <p className="muted">
              {booting
                ? bootMessage
                : 'Set the reporting agent profile once. It will be stored locally and attached to patient creation and updates.'}
            </p>
          </div>
        </div>

        {booting ? (
          <div className="boot-sequence" aria-live="polite">
            <div className="boot-line" />
            <div className="boot-line" />
            <div className="boot-line" />
            <p className="boot-message">{bootMessage}</p>
          </div>
        ) : (
          <div className="page-stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Agent account wizard</p>
                <h3>Local field profile</h3>
              </div>
              <UserRoundCog size={18} />
            </div>

            <div className="form-grid">
              <label>
                Agent name
                <input
                  value={form.agentName}
                  onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))}
                />
              </label>
              <label>
                Callsign
                <input
                  value={form.callsign}
                  onChange={(event) => setForm((current) => ({ ...current, callsign: event.target.value }))}
                />
              </label>
              <label>
                Task force unit
                <input
                  value={form.taskForceUnit}
                  onChange={(event) => setForm((current) => ({ ...current, taskForceUnit: event.target.value }))}
                />
              </label>
              <label>
                Clearance level
                <input
                  value={form.clearanceLevel}
                  onChange={(event) => setForm((current) => ({ ...current, clearanceLevel: event.target.value }))}
                />
              </label>
            </div>

            <section className="panel panel--inner">
              <p className="eyebrow">Reporting preview</p>
              <strong>
                {form.agentName || 'Unassigned'} / {form.callsign || 'No callsign'}
              </strong>
              <p className="muted">
                Updates will be attributed to {profileToReportingAgent(form).taskForceUnit}.
              </p>
            </section>

            {error && <p className="form-error">{error}</p>}

            <div className="wizard-actions">
              {profile ? (
                <button className="ghost-button" onClick={closeSetup} type="button">
                  Cancel
                </button>
              ) : (
                <span className="muted">First-run setup is required before using the intake console.</span>
              )}
              <button className="primary-button" onClick={handleSubmit} type="button">
                Activate agent profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
