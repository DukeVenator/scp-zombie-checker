import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, ShieldAlert, ShieldCheck, Lock, RefreshCw, AlertTriangle, AlertOctagon } from 'lucide-react'
import { decodeBadgePayload, getBadgeUrl, type BadgePayload } from '../lib/badge'
import {
  getClearedCongrats,
  getContainmentHumor,
  getCriticalTerminationCopy,
  getInfectionHumor,
  getStatusHumor,
  getSymptomDarkJoke,
} from '../lib/badge-copy'
import { useBadgeBackgroundCanvas } from '../hooks/useBadgeBackgroundCanvas'
import { usePatientStore } from '../hooks/usePatientStore'

const HIGH_THREAT_CONTAINMENT = ['Escaped', 'Known Threat']
const HIGH_THREAT_VARIANT = ['Alpha', 'Gate Breaker']

function badgeSeverity(payload: BadgePayload): 'critical' | 'warning' | 'cleared' {
  if (
    payload.status === 'Critical' ||
    payload.infectionPct >= 70 ||
    (payload.containment && HIGH_THREAT_CONTAINMENT.includes(payload.containment)) ||
    (payload.variant && HIGH_THREAT_VARIANT.includes(payload.variant)) ||
    payload.threatLevel === 'Critical'
  ) {
    return 'critical'
  }
  if (
    ['Suspected', 'Contained', 'Observation'].includes(payload.status) ||
    (payload.infectionPct >= 40 && payload.infectionPct < 70)
  ) {
    return 'warning'
  }
  return 'cleared'
}

const LOADING_MS = 500
const UNLOCK_DURATION_MS = 2200
const UNLOCK_PHASE_VERIFIED_MS = 480

/** Low risk: Cleared status and below 20% infection */
function isStatusClear(payload: BadgePayload): boolean {
  return (
    payload.status === 'Cleared' &&
    payload.infectionPct < 20 &&
    (payload.containment === 'Normal' || !payload.containment) &&
    (payload.variant === 'Normal' || !payload.variant)
  )
}

function BadgeContent({ payload, badgeUrl }: { payload: BadgePayload; badgeUrl: string }) {
  const navigate = useNavigate()
  const { patients } = usePatientStore()
  const inStore = useMemo(() => patients.some((p) => p.id === payload.id), [patients, payload.id])
  const severity = useMemo(() => badgeSeverity(payload), [payload])
  const statusClear = useMemo(() => isStatusClear(payload), [payload])
  const [loading, setLoading] = useState(true)
  const [entered, setEntered] = useState(false)
  const [unlockVisible, setUnlockVisible] = useState(false)
  const [unlockPhase, setUnlockPhase] = useState<'lock' | 'verified'>('lock')

  useEffect(() => {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reduceMotion ? 0 : LOADING_MS
    const t = setTimeout(() => setLoading(false), delay)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (loading) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [loading])

  /* Unlock overlay for all severities: lock → verified, then hide (defer setState to avoid sync update in effect) */
  useEffect(() => {
    if (loading) return
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = requestAnimationFrame(() => {
      setUnlockVisible(true)
      setUnlockPhase('lock')
    })
    const t1 = window.setTimeout(() => setUnlockPhase('verified'), reduceMotion ? 80 : UNLOCK_PHASE_VERIFIED_MS)
    const t2 = window.setTimeout(
      () => setUnlockVisible(false),
      reduceMotion ? 400 : UNLOCK_DURATION_MS,
    )
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [loading])

  const updatedAtFormatted = payload.updatedAt
    ? new Date(payload.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

  const infectionHumor = getInfectionHumor(payload.infectionPct, severity, payload.id)
  const clearedCongrats = severity === 'cleared' ? getClearedCongrats(payload.id) : null
  const containmentHumor = payload.containment
    ? getContainmentHumor(payload.containment, severity, payload.id)
    : null
  const statusHumor = getStatusHumor(payload.status, severity, payload.id)
  const symptomJoke =
    severity !== 'cleared' && payload.infectionPct >= 50 ? getSymptomDarkJoke(payload.id) : null
  const criticalTermination =
    severity === 'critical' ? getCriticalTerminationCopy(payload.id) : null

  const badgeCanvasRef = useBadgeBackgroundCanvas(true, severity)

  const backgroundLayer = (
    <div className="badge-page__bg" aria-hidden="true">
      <canvas ref={badgeCanvasRef} className="badge-page__bg-canvas" />
      <div className={`badge-page__vignette badge-page__vignette--${severity}`} />
      <div className={`badge-page__scanlines badge-page__scanlines--${severity}`} />
    </div>
  )

  if (loading) {
    return (
      <div className={`badge-page badge-page--entered badge-page--severity-${severity}`} data-severity={severity}>
        {backgroundLayer}
        <div className="badge-page__content">
          <div className="badge-page__loading">
            <Shield size={32} className="badge-page__loading-icon" aria-hidden />
            <span>Loading document…</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`badge-page badge-page--severity-${severity} ${entered ? 'badge-page--entered' : ''} ${statusClear ? 'badge-page--status-clear' : ''}`}
      data-severity={severity}
      data-testid="badge-page"
    >
      {backgroundLayer}
      <div className="badge-page__content">
      {unlockVisible && (
        <div
          className={`badge-unlock-overlay badge-unlock-overlay--${severity}`}
          aria-live="polite"
          aria-label={severity === 'cleared' ? 'Status clear verified' : severity === 'warning' ? 'Elevated risk verified' : 'High threat verified'}
          data-testid="badge-unlock-overlay"
        >
          <div className="badge-unlock-overlay__modal" data-phase={unlockPhase}>
            <div className="badge-unlock-overlay__icon-wrap">
              {unlockPhase === 'lock' ? (
                <Lock size={48} strokeWidth={1.8} className="badge-unlock-overlay__icon" aria-hidden />
              ) : severity === 'cleared' ? (
                <ShieldCheck
                  size={48}
                  strokeWidth={1.8}
                  className="badge-unlock-overlay__icon badge-unlock-overlay__icon--verified"
                  aria-hidden
                />
              ) : severity === 'warning' ? (
                <AlertTriangle
                  size={48}
                  strokeWidth={1.8}
                  className="badge-unlock-overlay__icon badge-unlock-overlay__icon--verified"
                  aria-hidden
                />
              ) : (
                <AlertOctagon
                  size={48}
                  strokeWidth={1.8}
                  className="badge-unlock-overlay__icon badge-unlock-overlay__icon--verified"
                  aria-hidden
                />
              )}
            </div>
            <p className="badge-unlock-overlay__line">
              {unlockPhase === 'lock'
                ? 'VERIFYING…'
                : severity === 'cleared'
                  ? 'STATUS CLEAR'
                  : severity === 'warning'
                    ? 'ELEVATED RISK'
                    : 'HIGH THREAT'}
            </p>
            <p className="badge-unlock-overlay__line badge-unlock-overlay__line--highlight">
              {unlockPhase === 'verified'
                ? severity === 'cleared'
                  ? 'CLEARED — LOW RISK'
                  : severity === 'warning'
                    ? 'VERIFY THREAT LEVEL'
                    : 'CONTAINMENT ALERT'
                : '…'}
            </p>
          </div>
        </div>
      )}

      <div
        className={`badge-doc badge-doc--unlocking badge-doc--unlocking-${severity}`}
        role="document"
        data-testid="badge-doc"
      >
        <div
          className={`badge-doc__stripe badge-doc__stripe--entry ${severity === 'critical' ? 'badge-doc__stripe--hazard' : ''}`}
          data-testid="badge-doc-stripe"
        >
          {severity === 'critical' ? (
            <>
              <AlertOctagon size={20} aria-hidden />
              <span>CONTAINMENT HAZARD — TERMINATE</span>
              <AlertOctagon size={20} aria-hidden />
            </>
          ) : (
            <>
              <Shield size={20} aria-hidden />
              <span>SCP FIELD INTAKE — SUBJECT CHECK</span>
              <Shield size={20} aria-hidden />
            </>
          )}
        </div>

        <header
          className={`badge-doc__header badge-doc__header--entry ${severity === 'critical' ? 'badge-doc__header--hazard' : ''}`}
          data-testid="badge-doc-header"
        >
          <div className="badge-doc__logo">
            <ShieldAlert size={28} />
            <span>ZOMBIE CHECKER</span>
          </div>
          <div className="badge-doc__doc-id">DOC #{payload.id.slice(0, 8).toUpperCase()}</div>
        </header>

        <div className="badge-doc__body badge-doc__body--entry" data-testid="badge-doc-body">
          <div className="badge-doc__row badge-doc__row--main">
            <div className="badge-doc__col badge-doc__col--info">
              <h1 className="badge-doc__name">{payload.name}</h1>
              <dl className="badge-doc__meta">
                <div>
                  <dt>Subject ID</dt>
                  <dd>{payload.id}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`badge badge--${payload.status.toLowerCase()}`}>{payload.status}</span>
                  </dd>
                </div>
                <div>
                  <dt>Threat level</dt>
                  <dd>{payload.threatLevel ?? '—'}</dd>
                </div>
                <div>
                  <dt>Infection probability</dt>
                  <dd className={payload.infectionPct >= 70 ? 'badge-doc__danger' : payload.infectionPct >= 40 ? 'badge-doc__warn' : ''}>
                    {payload.infectionPct}%
                  </dd>
                </div>
                {payload.containment && payload.containment !== 'Normal' && (
                  <div>
                    <dt>Containment</dt>
                    <dd>{payload.containment}</dd>
                  </div>
                )}
                {payload.variant && payload.variant !== 'Normal' && (
                  <div>
                    <dt>Variant</dt>
                    <dd>{payload.variant}</dd>
                  </div>
                )}
                <div>
                  <dt>Last updated</dt>
                  <dd>{updatedAtFormatted}</dd>
                </div>
              </dl>
              <p className="badge-doc__summary">{payload.summary}</p>

              {/* Badge-only humour: severity-appropriate only; critical shows hostile termination copy */}
              <div className="badge-doc__humor">
                {clearedCongrats && (
                  <p className="badge-doc__humor-line badge-doc__humor--cleared">{clearedCongrats}</p>
                )}
                {criticalTermination && (
                  <p className="badge-doc__humor-line badge-doc__humor--critical">{criticalTermination}</p>
                )}
                {infectionHumor && (
                  <p className="badge-doc__humor-line badge-doc__humor--infection">{infectionHumor}</p>
                )}
                {containmentHumor && (
                  <p className="badge-doc__humor-line badge-doc__humor--containment">{containmentHumor}</p>
                )}
                {statusHumor && (
                  <p className="badge-doc__humor-line badge-doc__humor--status">{statusHumor}</p>
                )}
                {symptomJoke && severity !== 'critical' && (
                  <p className="badge-doc__humor-line badge-doc__humor--symptom">{symptomJoke}</p>
                )}
              </div>
            </div>
            <div className="badge-doc__col badge-doc__col--qr">
              <div className="badge-doc__qr-wrap">
                <QRCodeSVG value={badgeUrl} includeMargin size={200} level="M" />
              </div>
              <p className="badge-doc__scan-hint">Scan to view or update this record</p>
            </div>
          </div>
        </div>

        <footer className="badge-doc__footer">
          <span>Secure. Local-first. Re-scan to update.</span>
        </footer>
      </div>

      {inStore && (
        <div className="badge-page__actions">
          <button
            className="primary-button"
            onClick={() => navigate(`/patients/${payload.id}`)}
            type="button"
          >
            <RefreshCw size={16} />
            Update this record
          </button>
          <p className="muted">You have this subject in your SCP Checker. Open to edit or re-assess.</p>
        </div>
      )}
      </div>
    </div>
  )
}

export function BadgePage() {
  const [searchParams] = useSearchParams()
  const encoded = searchParams.get('d')
  const payload = useMemo(() => (encoded ? decodeBadgePayload(encoded) : null), [encoded])
  const badgeUrl = useMemo(() => (payload ? getBadgeUrl(payload) : ''), [payload])

  if (!payload) {
    return (
      <div className="badge-page badge-page--error">
        <div className="panel">
          <h2>Invalid or expired check</h2>
          <p className="muted">This link may be corrupted or no longer valid. Ask the operator for a new badge.</p>
        </div>
      </div>
    )
  }

  return <BadgeContent payload={payload} badgeUrl={badgeUrl} />
}
