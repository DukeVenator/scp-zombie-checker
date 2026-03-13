import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Lock, Shield, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useAgentProfile } from '../../hooks/useAgentProfile'
import { useParticleCanvas } from '../../hooks/useParticleCanvas'
import { useToast } from '../../hooks/useToast'
import {
  agentProfileSchema,
  CLEARANCE_LEVEL_OPTIONS,
  defaultAgentProfile,
  profileToReportingAgent,
  TASK_FORCE_UNIT_OPTIONS,
  type AgentProfile,
} from '../../types/agent'

const bootMessages = [
  'Initializing secure intake console',
  'Validating local containment protocols',
  'Authorizing field agent profile',
] as const

export const AgentOnboarding = () => {
  const location = useLocation()
  const { profile, showSetup, completeSetup, closeSetup, isReady } = useAgentProfile()
  const { pushToast } = useToast()
  const [startupDone, setStartupDone] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem('scp-zombie-checker:startup-done') === '1',
  )
  const [intro, setIntro] = useState(() => !profile)
  const [booting, setBooting] = useState(() => !profile)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockPhase, setUnlockPhase] = useState<'connect' | 'verified'>('connect')
  const [exiting, setExiting] = useState(false)
  const [form, setForm] = useState<AgentProfile>(profile ?? defaultAgentProfile())
  const [error, setError] = useState('')
  const unlockTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const pendingProfileRef = useRef<AgentProfile | null>(null)
  const profileToCompleteRef = useRef<AgentProfile | null>(null)
  const canvasRef = useParticleCanvas(showSetup)

  const ONBOARDING_EXIT_MS = 500

  const isBadgePage = location.pathname === '/badge' || location.pathname === 'badge' || location.pathname.endsWith('/badge')

  useEffect(() => {
    const onStartupDone = () => setStartupDone(true)
    window.addEventListener('scp-startup-done', onStartupDone)
    return () => window.removeEventListener('scp-startup-done', onStartupDone)
  }, [])

  useEffect(() => {
    if (!showSetup || profile || !startupDone) {
      return
    }
    const introDurationMs = 1100
    const bootDurationMs = 2400
    const t1 = window.setTimeout(() => setIntro(false), introDurationMs)
    const t2 = window.setTimeout(() => setBooting(false), introDurationMs + bootDurationMs)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [profile, showSetup, startupDone])

  useEffect(() => {
    return () => {
      unlockTimeoutsRef.current.forEach(clearTimeout)
      unlockTimeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!exiting) return
    const profileData = profileToCompleteRef.current
    const t = window.setTimeout(() => {
      if (profileData) {
        completeSetup(profileData)
        setForm(profileData)
        pushToast({
          title: 'Agent profile loaded',
          description: `${profileData.callsign} is now the active reporting agent.`,
          tone: 'success',
        })
      }
      profileToCompleteRef.current = null
      setExiting(false)
    }, ONBOARDING_EXIT_MS)
    return () => window.clearTimeout(t)
  }, [exiting, completeSetup, pushToast])

  const bootMessage = bootMessages[1]
  const shouldHide = isBadgePage || !isReady || !showSetup

  const handleSubmit = () => {
    const parsed = agentProfileSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Agent profile is incomplete.')
      return
    }
    setError('')
    pendingProfileRef.current = parsed.data
    setUnlocking(true)
    setUnlockPhase('connect')
    const t1 = window.setTimeout(() => setUnlockPhase('verified'), 450)
    const t2 = window.setTimeout(() => {
      const profileData = pendingProfileRef.current
      pendingProfileRef.current = null
      if (profileData) {
        profileToCompleteRef.current = profileData
        setUnlocking(false)
        setExiting(true)
      } else {
        setUnlocking(false)
      }
    }, 1300)
    unlockTimeoutsRef.current = [t1, t2]
  }

  return shouldHide ? null : (
    <div className={`onboarding-overlay ${exiting ? 'onboarding-overlay--exiting' : ''}`}>
      <canvas ref={canvasRef} className="onboarding-overlay__canvas" aria-hidden="true" />
      <div className="onboarding-overlay__vignette" aria-hidden="true" />
      <div className="onboarding-overlay__scanlines" aria-hidden="true" />
      {intro && (
        <div className="onboarding-intro" aria-live="polite">
          <div className="onboarding-intro__lock">
            <Shield size={64} strokeWidth={1.5} />
          </div>
          <p className="onboarding-intro__title onboarding-intro__title--glitch">CONFIGURE AGENT PROFILE</p>
          <p className="onboarding-intro__sub">Authorization required — secure intake node</p>
        </div>
      )}
      {unlocking && (
        <div className="unlock-overlay" aria-live="polite">
          <div className="unlock-modal" data-phase={unlockPhase}>
            <div className="unlock-modal__icon-wrap">
              {unlockPhase === 'connect' ? (
                <Lock size={48} strokeWidth={1.8} className="unlock-modal__icon" aria-hidden />
              ) : (
                <ShieldCheck size={48} strokeWidth={1.8} className="unlock-modal__icon unlock-modal__icon--verified" aria-hidden />
              )}
            </div>
            <p className="unlock-modal__line">{unlockPhase === 'connect' ? 'CONNECTING…' : 'AUTHENTICATED'}</p>
            <p className="unlock-modal__line unlock-modal__line--highlight">
              {unlockPhase === 'verified' ? 'CLEARANCE VERIFIED' : '…'}
            </p>
          </div>
        </div>
      )}
      <div className={`onboarding-shell ${intro ? 'onboarding-shell--intro' : ''} ${booting ? 'is-booting' : 'is-ready'} ${unlocking ? 'onboarding-shell--unlocking' : ''}`}>
        <div className="onboarding-brand">
          <div className="onboarding-seal">
            <Shield size={40} />
          </div>
          <div>
            <p className="eyebrow">SCP secure intake node</p>
            <h2 className={booting ? 'onboarding-brand__title onboarding-brand__title--glitch' : 'onboarding-brand__title'}>
              {booting ? 'Booting field console' : 'Configure agent profile'}
            </h2>
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
              <label htmlFor="agent-task-force-unit">
                Task force unit
                <select
                  id="agent-task-force-unit"
                  value={form.taskForceUnit}
                  onChange={(event) => setForm((current) => ({ ...current, taskForceUnit: event.target.value }))}
                >
                  {TASK_FORCE_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="agent-clearance-level">
                Clearance level
                <select
                  id="agent-clearance-level"
                  value={form.clearanceLevel}
                  onChange={(event) => setForm((current) => ({ ...current, clearanceLevel: event.target.value }))}
                >
                  {CLEARANCE_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
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
