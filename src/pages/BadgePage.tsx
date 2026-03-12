import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, ShieldAlert, RefreshCw } from 'lucide-react'
import { decodeBadgePayload, getBadgeUrl, type BadgePayload } from '../lib/badge'
import {
  getClearedCongrats,
  getContainmentHumor,
  getInfectionHumor,
  getStatusHumor,
  getSymptomDarkJoke,
} from '../lib/badge-copy'
import { usePatientStore } from '../hooks/usePatientStore'

function BadgeContent({ payload, badgeUrl }: { payload: BadgePayload; badgeUrl: string }) {
  const navigate = useNavigate()
  const { patients } = usePatientStore()
  const inStore = useMemo(() => patients.some((p) => p.id === payload.id), [patients, payload.id])

  const updatedAtFormatted = payload.updatedAt
    ? new Date(payload.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

  const infectionHumor = getInfectionHumor(payload.infectionPct)
  const isClearedNormal = payload.status === 'Cleared' && (payload.containment === 'Normal' || !payload.containment)
  const clearedCongrats = isClearedNormal ? getClearedCongrats() : null
  const containmentHumor = payload.containment ? getContainmentHumor(payload.containment) : null
  const statusHumor = getStatusHumor(payload.status)
  const symptomJoke = !isClearedNormal && payload.infectionPct >= 50 ? getSymptomDarkJoke(payload.id) : null

  return (
    <div className="badge-page">
      <div className="badge-doc" role="document">
        <div className="badge-doc__stripe">
          <Shield size={20} />
          <span>SCP FIELD INTAKE — SUBJECT CHECK</span>
          <Shield size={20} />
        </div>

        <header className="badge-doc__header">
          <div className="badge-doc__logo">
            <ShieldAlert size={28} />
            <span>ZOMBIE CHECKER</span>
          </div>
          <div className="badge-doc__doc-id">DOC #{payload.id.slice(0, 8).toUpperCase()}</div>
        </header>

        <div className="badge-doc__body">
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

              {/* Badge-only humor */}
              <div className="badge-doc__humor">
                {clearedCongrats && (
                  <p className="badge-doc__humor-line badge-doc__humor--cleared">{clearedCongrats}</p>
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
                {symptomJoke && (
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
