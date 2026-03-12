import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, ChevronDown, Download, Link2, Printer, QrCode,
  Shield, ShieldAlert, Siren, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { SymptomUpdateWizard } from '../components/wizard/SymptomUpdateWizard'
import { StatusEditorWizard } from '../components/wizard/StatusEditorWizard'
import { VariantWizard } from '../components/wizard/VariantWizard'
import { useToast } from '../hooks/useToast'
import {
  buildAssessmentDirectives,
  calculateInfectionProbability,
  containmentProcedures,
  getTempRangeForValue,
  getThreatLevel,
  isHighAlertClassification,
  symptomWarnings,
  variantWarnings,
} from '../lib/assessment-ui'
import { badgePayloadFromRecord, getBadgeUrl } from '../lib/badge'
import {
  getClearedCongrats,
  getContainmentHumor,
  getInfectionHumor,
  getStatusHumor,
  getSymptomDarkJoke,
} from '../lib/badge-copy'
import { buildSinglePatientPayload, downloadJson, exportFileName } from '../lib/export'
import { addRecentPatient } from '../lib/storage'
import { defaultReportingAgent } from '../types/agent'
import { usePatientStore } from '../hooks/usePatientStore'
import type { PatientWarning } from '../types/patient'

type ActiveWizard = 'none' | 'symptoms' | 'status' | 'variant'

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 }

const sortWarnings = (warnings: PatientWarning[]): PatientWarning[] =>
  [...warnings].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))

const historyTypeLabels: Record<string, string> = {
  created: 'Created',
  updated: 'Symptom update',
  imported: 'Imported',
  'status-change': 'Status change',
  'variant-assigned': 'Variant assigned',
}

const variantBadgeClass = (variant: string) => {
  switch (variant) {
    case 'Alpha': return 'badge--critical'
    case 'Gate Breaker': return 'badge--critical'
    case 'Runner': return 'badge--warning'
    case 'Walker': return 'badge--warning'
    default: return ''
  }
}

const FullscreenModal = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
  <div className="fullscreen-modal" role="dialog" aria-modal="true">
    <div className="fullscreen-modal__bar">
      <button className="ghost-button fullscreen-modal__close" onClick={onClose} type="button">
        <X size={20} />
        Close
      </button>
    </div>
    <div className="fullscreen-modal__body">
      {children}
    </div>
  </div>
)

const symptomLabels: Record<string, string> = {
  aggression: 'Aggression',
  decay: 'Visible decay',
  incoherentSpeech: 'Incoherent speech',
  violentResponse: 'Violent response',
  aversionToLight: 'Aversion to light',
  abnormalOdor: 'Abnormal odor',
}

const containmentBadgeClass = (status: string) => {
  switch (status) {
    case 'Escaped': return 'badge--critical'
    case 'Known Threat': return 'badge--critical'
    case 'Threat': return 'badge--warning'
    case 'Contained': return 'badge--warning'
    default: return ''
  }
}

export const PatientDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { patients, removePatient, upsertPatient, setContainmentStatus, setVariant } = usePatientStore()
  const { pushToast } = useToast()
  const [activeWizard, setActiveWizard] = useState<ActiveWizard>('none')
  const [headerOpen, setHeaderOpen] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)

  const patient = useMemo(() => patients.find((entry) => entry.id === id), [id, patients])

  useEffect(() => {
    if (patient) {
      addRecentPatient(patient.id)
    }
  }, [patient])

  if (!patient) {
    return (
      <div className="panel">
        <h2>Patient not found</h2>
        <Link className="inline-link" to="/">
          Return to dashboard
        </Link>
      </div>
    )
  }

  const updatedBy = patient.updatedBy ?? patient.reportingAgent ?? defaultReportingAgent()
  const classification = patient.classification
  const directives = buildAssessmentDirectives(patient.checklist)
  const highAlert = isHighAlertClassification(classification)
  const threatLevel = getThreatLevel(classification)
  const infectionPct = calculateInfectionProbability(patient.checklist)
  const infectionClass = infectionPct >= 70 ? 'infection--critical' : infectionPct >= 40 ? 'infection--warning' : 'infection--low'
  const noPulse = !patient.checklist.heartbeatDetected || patient.checklist.heartbeatBpm === 0
  const containment = patient.containmentStatus ?? 'Normal'
  const variant = patient.variant ?? 'Normal'
  const terminateOnSight = infectionPct >= 81

  const statusColorClass = (() => {
    if (terminateOnSight) return 'is-terminate'
    switch (classification.status) {
      case 'Critical': return 'is-critical'
      case 'Contained': return 'is-contained'
      case 'Suspected': return 'is-suspected'
      case 'Observation': return 'is-observation'
      default: return 'is-cleared'
    }
  })()

  const warningCount = classification.warnings.length
  const directiveCount = directives.length
  const sortedWarnings = useMemo(() => sortWarnings(classification.warnings), [classification.warnings])
  const topWarning = sortedWarnings[0] as PatientWarning | undefined
  const remainingWarnings = sortedWarnings.slice(1)
  const topDirective = directives[0]
  const remainingDirectives = directives.slice(1)
  const activeSymptoms = Object.entries(patient.checklist.symptoms).filter(([, v]) => v).map(([k]) => k)

  const topTags: string[] = useMemo(() => {
    const tags: string[] = []
    if (terminateOnSight) tags.push('TERMINATE ON SIGHT')
    if (noPulse) tags.push('NO HEARTBEAT')
    if (variant !== 'Normal') tags.push(variant.toUpperCase())
    if (containment !== 'Normal') tags.push(containment.toUpperCase())
    if (activeSymptoms.length >= 3) tags.push('MULTI-SYMPTOM CLUSTER')
    return tags
  }, [terminateOnSight, noPulse, variant, containment, activeSymptoms.length])

  const toggleWizard = (which: ActiveWizard) =>
    setActiveWizard((prev) => (prev === which ? 'none' : which))

  return (
    <div className="page-stack">
      {terminateOnSight && (
        <div className="terminate-banner" role="alert">
          <Siren size={22} />
          <div>
            <strong>TERMINATE ON SIGHT</strong>
            <span>Infection probability {infectionPct}% — subject is beyond containment. Lethal force authorized.</span>
          </div>
          <Siren size={22} />
        </div>
      )}

      {containment !== 'Normal' && containmentProcedures[containment] && (
        <div className={`status-banner status-banner--${containment === 'Escaped' ? 'critical' : 'warning'}`} role="alert">
          <div className="status-banner__header">
            <ShieldAlert size={20} />
            <div>
              <strong>{containmentProcedures[containment].title}</strong>
              <p>{containmentProcedures[containment].detail}</p>
            </div>
          </div>
          <ol className="status-banner__steps">
            {containmentProcedures[containment].steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {variant !== 'Normal' && variantWarnings[variant] && (
        <div className={`status-banner status-banner--${variant === 'Alpha' || variant === 'Gate Breaker' ? 'critical' : 'warning'}`} role="alert">
          <div className="status-banner__header">
            <AlertTriangle size={20} />
            <div>
              <strong>{variantWarnings[variant].title}</strong>
              <p>{variantWarnings[variant].detail}</p>
            </div>
          </div>
        </div>
      )}

      <div className="sticky-header-wrap">
        <button
          aria-expanded={headerOpen}
          className={`sticky-header ${statusColorClass}`}
          onClick={() => setHeaderOpen((v) => !v)}
          type="button"
        >
          <div className="sticky-header__core">
            <span className={`badge badge--${classification.status.toLowerCase()}`}>{classification.status}</span>

            <div className="sticky-header__metrics">
              <span className="sh-metric"><strong>{threatLevel}</strong><span className="sh-metric__label">Threat</span></span>
              <span className="sh-metric-divider" />
              <span className="sh-metric"><strong>{classification.riskScore}</strong><span className="sh-metric__label">Risk</span></span>
              <span className="sh-metric-divider" />
              <span className={`sh-metric ${infectionClass}`}><strong>{infectionPct}%</strong><span className="sh-metric__label">Infected</span></span>
            </div>

            <div className="sticky-header__trail">
              {warningCount > 0 && (
                <span className="sh-warning-dot">
                  <TriangleAlert size={12} />
                  <span className="sh-warning-dot__count">{warningCount}</span>
                </span>
              )}
              <ChevronDown className={`sticky-header__chevron ${headerOpen ? 'is-open' : ''}`} size={16} />
            </div>
          </div>

          {/* Desktop-only extra tags */}
          {(noPulse || terminateOnSight || warningCount > 0) && (
            <div className="sticky-header__extras">
              {terminateOnSight && <span className="badge badge--terminate badge--small">TERMINATE</span>}
              {noPulse && <span className="badge badge--critical badge--small">POTENTIAL ZOMBIE</span>}
              {warningCount > 0 && (
                <span className="badge badge--critical badge--small">
                  {warningCount} warning{warningCount > 1 ? 's' : ''} active
                </span>
              )}
            </div>
          )}

          <div className="sh-infection-bar">
            <div className={`sh-infection-bar__fill ${infectionClass}`} style={{ width: `${infectionPct}%` }} />
          </div>
        </button>

        {headerOpen && (
          <div className="sticky-header__dropdown">
          {/* Threat board summary */}
          <section className={`alert-banner ${highAlert ? 'alert-banner--high' : 'alert-banner--normal'}`}>
            <div>
              <p className="eyebrow">Live SCP threat board</p>
              <strong>{classification.status} / Threat {threatLevel} / Risk {classification.riskScore}</strong>
              <p className="muted">{classification.summary}</p>
            </div>
          </section>

          {/* Tags strip */}
          {topTags.length > 0 && (
            <div className="alert-tags">
              {topTags.map((tag) => (
                <span key={tag} className="badge badge--critical badge--small">{tag}</span>
              ))}
            </div>
          )}

          {/* Infection meter */}
          <div className={`infection-meter ${infectionClass}`}>
            <div className="infection-meter__bar">
              <div className="infection-meter__fill" style={{ width: `${infectionPct}%` }} />
            </div>
            <p className="infection-meter__label">Zombie infection probability: <strong>{infectionPct}%</strong></p>
          </div>

          {/* Most pressing alert + its procedure */}
          {topWarning && (
            <section className="panel panel--inner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Most pressing alert</p>
                  <h3>Primary warning condition</h3>
                </div>
                <TriangleAlert size={18} />
              </div>
              <article className={`warning warning--${topWarning.severity}`}>
                <div className="warning__title">
                  {topWarning.severity === 'critical' ? <Siren size={18} /> : <AlertTriangle size={18} />}
                  <strong>{topWarning.title}</strong>
                </div>
                <p>{topWarning.detail}</p>
                <p className="muted">{topWarning.action}</p>
              </article>

              {topDirective && (
                <div className="top-directive">
                  <div className="section-heading">
                    <div><p className="eyebrow">Immediate procedure</p></div>
                    <ShieldAlert size={16} />
                  </div>
                  <div className="directive-card">
                    <strong>{topDirective.title}</strong>
                    <p className="muted">{topDirective.detail}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* View more toggle */}
          {(remainingWarnings.length > 0 || remainingDirectives.length > 0) && (
            <button
              className="ghost-button view-more-btn"
              onClick={() => setShowAllAlerts((v) => !v)}
              type="button"
            >
              {showAllAlerts
                ? 'Hide additional alerts'
                : `View all alerts (${remainingWarnings.length + remainingDirectives.length} more)`}
              <ChevronDown className={`sticky-header__chevron ${showAllAlerts ? 'is-open' : ''}`} size={14} />
            </button>
          )}

          {/* Expanded: remaining warnings */}
          {showAllAlerts && remainingWarnings.length > 0 && (
            <section className="panel panel--inner">
              <div className="section-heading">
                <div><p className="eyebrow">Additional warnings</p><h3>Active warning conditions</h3></div>
                <TriangleAlert size={18} />
              </div>
              <div className="warning-list">
                {remainingWarnings.map((warning) => (
                  <article key={warning.id} className={`warning warning--${warning.severity}`}>
                    <div className="warning__title">
                      {warning.severity === 'critical' ? <Siren size={18} /> : <AlertTriangle size={18} />}
                      <strong>{warning.title}</strong>
                    </div>
                    <p>{warning.detail}</p>
                    <p className="muted">{warning.action}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Expanded: remaining directives */}
          {showAllAlerts && remainingDirectives.length > 0 && (
            <section className="panel panel--inner">
              <div className="section-heading">
                <div><p className="eyebrow">Additional procedures</p><h3>SCP task force directives</h3></div>
                <ShieldAlert size={18} />
              </div>
              <ol className="directive-list">
                {remainingDirectives.map((d) => (
                  <li key={d.id} className="directive-card"><strong>{d.title}</strong><p className="muted">{d.detail}</p></li>
                ))}
              </ol>
            </section>
          )}

          {/* Expanded: recommended actions */}
          {showAllAlerts && (
            <section className="panel panel--inner">
              <div className="section-heading">
                <div><p className="eyebrow">Recommended actions</p><h3>SCP response protocol</h3></div>
                <Shield size={18} />
              </div>
              <ul className="action-list">
                {classification.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        )}
      </div>

      <section className="wizard-layout patient-detail-layout">
        <div className="wizard-main page-stack">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Patient record</p>
                <h2>{patient.identity.name}</h2>
                <p className="muted">Last updated {new Date(patient.updatedAt).toLocaleString()}</p>
              </div>
              <div className="button-cluster">
                <button
                  className="secondary-button"
                  onClick={() =>
                    downloadJson(
                      buildSinglePatientPayload(patient),
                      exportFileName('patient', patient.identity.name),
                    )
                  }
                  type="button"
                >
                  <Download size={16} />
                  Export file
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setShowBadgeModal(true)}
                  type="button"
                >
                  <QrCode size={16} />
                  Export badge
                </button>
                <button className="ghost-button" onClick={() => window.print()} type="button">
                  <Printer size={16} />
                  Print
                </button>
                <button
                  className="ghost-button danger-button"
                  onClick={async () => {
                    await removePatient(patient.id)
                    pushToast({
                      title: 'Patient deleted',
                      description: `${patient.identity.name} was removed from local storage.`,
                      tone: 'warning',
                    })
                    navigate('/')
                  }}
                  type="button"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>

            {terminateOnSight && (
              <div className="terminate-inline" role="alert">
                <Siren size={18} />
                <strong>TERMINATE ON SIGHT — {infectionPct}% infection probability</strong>
                <p>Subject is beyond recovery threshold. Lethal response is mandatory under SCP field protocol.</p>
              </div>
            )}

            <div className="detail-summary-grid">
              <section className="panel panel--inner detail-photo-panel">
                {patient.photo.dataUrl ? (
                  <div className="detail-photo-frame">
                    <img className="detail-photo" src={patient.photo.dataUrl} alt={patient.identity.name} />
                  </div>
                ) : (
                  <div className="detail-photo-empty">No patient photo attached.</div>
                )}
              </section>

              <section className="panel panel--inner">
                <h3>Assessment summary</h3>
                <dl className="review-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`badge badge--${classification.status.toLowerCase()}`}>
                        {classification.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Containment</dt>
                    <dd>
                      <span className={`badge ${containmentBadgeClass(containment)}`}>
                        {containment}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Variant</dt>
                    <dd>
                      <span className={`badge ${variantBadgeClass(variant)}`}>
                        {variant}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Threat level</dt>
                    <dd>{threatLevel}</dd>
                  </div>
                  <div>
                    <dt>Risk score</dt>
                    <dd>{classification.riskScore}</dd>
                  </div>
                  <div>
                    <dt>Infection probability</dt>
                    <dd><span className={infectionClass}>{infectionPct}%</span></dd>
                  </div>
                  <div>
                    <dt>Updated by</dt>
                    <dd>
                      {updatedBy.callsign} / {updatedBy.agentName}
                    </dd>
                  </div>
                  <div>
                    <dt>Summary</dt>
                    <dd>{classification.summary}</dd>
                  </div>
                </dl>
                {noPulse && (
                  <div className="detail-tag detail-tag--critical">POTENTIAL ZOMBIE — No heartbeat confirmed</div>
                )}
              </section>
            </div>

            {/* Biometric readings */}
            <section className="panel panel--inner">
              <h3>Biometric readings</h3>
              <dl className="vitals-grid">
                <div className="vital-item">
                  <dt>Pupils</dt>
                  <dd className={patient.checklist.pupilState === 'Non-reactive' || patient.checklist.pupilState === 'Clouded' ? 'vital--alert' : ''}>
                    {patient.checklist.pupilState}
                  </dd>
                </div>
                <div className="vital-item">
                  <dt>Temperature</dt>
                  <dd className={patient.checklist.temperatureC < 35 || patient.checklist.temperatureC >= 39.5 ? 'vital--alert' : patient.checklist.temperatureC < 36.5 || patient.checklist.temperatureC >= 38.5 ? 'vital--warn' : ''}>
                    {patient.checklist.temperatureC.toFixed(1)}°C
                    {(() => { const r = getTempRangeForValue(patient.checklist.temperatureC); return r && r.id !== 'normal' ? ` — ${r.label}` : '' })()}
                  </dd>
                </div>
                <div className="vital-item">
                  <dt>Heartbeat</dt>
                  <dd className={noPulse ? 'vital--alert' : ''}>
                    {patient.checklist.heartbeatDetected ? `${patient.checklist.heartbeatBpm} BPM` : 'NOT DETECTED'}
                  </dd>
                </div>
                <div className="vital-item">
                  <dt>EMF</dt>
                  <dd className={patient.checklist.emfLevel === 'Extreme' ? 'vital--alert' : patient.checklist.emfLevel === 'High' ? 'vital--warn' : ''}>
                    {patient.checklist.emfLevel}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Symptoms & alarming behaviours */}
            <section className="panel panel--inner">
              <h3>Symptoms &amp; observed behaviours</h3>
              {activeSymptoms.length > 0 ? (
                <div className="symptom-detail-list">
                  {activeSymptoms.map((key) => {
                    const warn = symptomWarnings[key]
                    return (
                      <div key={key} className="symptom-detail-item symptom-detail-item--active">
                        <div className="symptom-detail-item__header">
                          <span className="symptom-detail-item__indicator" />
                          <strong>{symptomLabels[key] ?? key}</strong>
                          <TriangleAlert size={14} />
                        </div>
                        {warn && <p className="symptom-detail-item__warn">{warn.detail}</p>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="muted">No active symptoms recorded.</p>
              )}
              {(() => {
                const inactive = Object.entries(patient.checklist.symptoms).filter(([, v]) => !v).map(([k]) => k)
                if (inactive.length === 0) return null
                return (
                  <div className="symptom-inactive-row">
                    {inactive.map((key) => (
                      <span key={key} className="badge badge--small">{symptomLabels[key] ?? key}</span>
                    ))}
                  </div>
                )
              })()}
              {patient.checklist.notes && (
                <div className="field-notes-block">
                  <h4>Field notes</h4>
                  <p>{patient.checklist.notes}</p>
                </div>
              )}
            </section>

            <div className={`infection-meter ${infectionClass}`}>
              <div className="infection-meter__bar">
                <div className="infection-meter__fill" style={{ width: `${infectionPct}%` }} />
              </div>
              <p className="infection-meter__label">Zombie infection probability: <strong>{infectionPct}%</strong></p>
            </div>

            <div className="button-cluster button-cluster--wrap">
              <button
                className={`${activeWizard === 'symptoms' ? 'secondary-button' : 'primary-button'}`}
                onClick={() => toggleWizard('symptoms')}
                type="button"
              >
                {activeWizard === 'symptoms' ? 'Hide symptom wizard' : 'Update symptoms'}
              </button>
              <button
                className={`${activeWizard === 'status' ? 'secondary-button' : 'ghost-button'}`}
                onClick={() => toggleWizard('status')}
                type="button"
              >
                {activeWizard === 'status' ? 'Hide status wizard' : 'Change status'}
              </button>
              <button
                className={`${activeWizard === 'variant' ? 'secondary-button' : 'ghost-button'}`}
                onClick={() => toggleWizard('variant')}
                type="button"
              >
                {activeWizard === 'variant' ? 'Hide variant wizard' : 'Assign variant'}
              </button>
            </div>
          </article>

          {activeWizard !== 'none' && (
            <FullscreenModal onClose={() => setActiveWizard('none')}>
              {activeWizard === 'symptoms' && (
                <SymptomUpdateWizard
                  patient={patient}
                  onSave={async (input, existingId) => {
                    await upsertPatient(input, existingId)
                    setActiveWizard('none')
                  }}
                />
              )}

              {activeWizard === 'status' && (
                <StatusEditorWizard
                  patient={patient}
                  onSave={setContainmentStatus}
                  onClose={() => setActiveWizard('none')}
                />
              )}

              {activeWizard === 'variant' && (
                <VariantWizard
                  patient={patient}
                  onSave={setVariant}
                  onClose={() => setActiveWizard('none')}
                />
              )}
            </FullscreenModal>
          )}

          {showBadgeModal &&
            createPortal(
              (() => {
                const badgePayload = badgePayloadFromRecord(patient)
                const badgeUrl = getBadgeUrl(badgePayload)
                const updatedAtFormatted = new Date(badgePayload.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                const infectionHumor = getInfectionHumor(badgePayload.infectionPct)
                const isClearedNormal = badgePayload.status === 'Cleared' && (badgePayload.containment === 'Normal' || !badgePayload.containment)
                const clearedCongrats = isClearedNormal ? getClearedCongrats() : null
                const containmentHumor = badgePayload.containment ? getContainmentHumor(badgePayload.containment) : null
                const statusHumor = getStatusHumor(badgePayload.status)
                const symptomJoke = !isClearedNormal && badgePayload.infectionPct >= 50 ? getSymptomDarkJoke(badgePayload.id) : null
                return (
                  <div className="fullscreen-modal badge-print-modal" role="dialog" aria-modal="true" aria-label="Export patient badge">
                    <div className="fullscreen-modal__bar badge-print-modal__no-print">
                      <button
                        className="ghost-button badge-print-modal__copy-link"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(badgeUrl)
                            pushToast({ title: 'Link copied', description: 'Badge link copied to clipboard. You can paste it to share.', tone: 'success' })
                          } catch {
                            pushToast({ title: 'Copy failed', description: 'Could not copy link to clipboard.', tone: 'error' })
                          }
                        }}
                        type="button"
                      >
                        <Link2 size={18} />
                        Copy link
                      </button>
                      <button className="ghost-button fullscreen-modal__close" onClick={() => setShowBadgeModal(false)} type="button">
                        <X size={20} />
                        Close
                      </button>
                      <button className="primary-button" onClick={() => window.print()} type="button">
                        <Printer size={18} />
                        Print badge
                      </button>
                    </div>
                    <div className="fullscreen-modal__body">
                      <div className="badge-doc badge-doc--print">
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
                          <div className="badge-doc__doc-id">DOC #{badgePayload.id.slice(0, 8).toUpperCase()}</div>
                        </header>
                        <div className="badge-doc__body">
                          <div className="badge-doc__row badge-doc__row--main">
                            <div className="badge-doc__col badge-doc__col--info">
                              <h1 className="badge-doc__name">{badgePayload.name}</h1>
                              <dl className="badge-doc__meta">
                                <div><dt>Subject ID</dt><dd>{badgePayload.id}</dd></div>
                                <div><dt>Status</dt><dd><span className={`badge badge--${badgePayload.status.toLowerCase()}`}>{badgePayload.status}</span></dd></div>
                                <div><dt>Threat level</dt><dd>{badgePayload.threatLevel ?? '—'}</dd></div>
                                <div><dt>Infection probability</dt><dd className={badgePayload.infectionPct >= 70 ? 'badge-doc__danger' : badgePayload.infectionPct >= 40 ? 'badge-doc__warn' : ''}>{badgePayload.infectionPct}%</dd></div>
                                {badgePayload.containment && badgePayload.containment !== 'Normal' && <div><dt>Containment</dt><dd>{badgePayload.containment}</dd></div>}
                                {badgePayload.variant && badgePayload.variant !== 'Normal' && <div><dt>Variant</dt><dd>{badgePayload.variant}</dd></div>}
                                <div><dt>Last updated</dt><dd>{updatedAtFormatted}</dd></div>
                              </dl>
                              <p className="badge-doc__summary">{badgePayload.summary}</p>
                              <div className="badge-doc__humor">
                                {clearedCongrats && <p className="badge-doc__humor-line badge-doc__humor--cleared">{clearedCongrats}</p>}
                                {infectionHumor && <p className="badge-doc__humor-line badge-doc__humor--infection">{infectionHumor}</p>}
                                {containmentHumor && <p className="badge-doc__humor-line badge-doc__humor--containment">{containmentHumor}</p>}
                                {statusHumor && <p className="badge-doc__humor-line badge-doc__humor--status">{statusHumor}</p>}
                                {symptomJoke && <p className="badge-doc__humor-line badge-doc__humor--symptom">{symptomJoke}</p>}
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
                    </div>
                  </div>
                )
              })(),
              document.body,
            )}

          <article className="panel">
            <div className="section-heading">
              <div>
                <h3>Record history</h3>
                <p className="muted">All changes are tracked with field-level detail.</p>
              </div>
            </div>
            <ul className="history-list">
              {patient.history.map((entry) => {
                const reportedBy = entry.reportedBy ?? updatedBy
                const changes = entry.changes ?? []

                return (
                  <li key={entry.id} className="history-entry">
                    <div className="history-entry__header">
                      <span className={`badge badge--small ${entry.type === 'status-change' || entry.type === 'variant-assigned' ? 'badge--warning' : ''}`}>
                        {historyTypeLabels[entry.type] ?? entry.type}
                      </span>
                      <span className="muted">{new Date(entry.recordedAt).toLocaleString()}</span>
                    </div>
                    <p className="muted">
                      {reportedBy.callsign} / {reportedBy.agentName}
                    </p>
                    {changes.length > 0 && (
                      <ul className="history-changes">
                        {changes.map((c, i) => (
                          <li key={i} className="history-change">
                            <span className="history-change__field">{c.field}</span>
                            <span className="history-change__from">{c.from}</span>
                            <ArrowRight size={12} />
                            <span className="history-change__to">{c.to}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {changes.length === 0 && <p className="muted">{entry.summary}</p>}
                  </li>
                )
              })}
            </ul>
          </article>
        </div>
      </section>

      {/* SCP print card — hidden on screen, shown only when printing */}
      <div className="scp-print-card" aria-hidden="true">
        <div className="scp-print-card__border">
          {terminateOnSight && (
            <div className="scp-print__terminate">
              TERMINATE ON SIGHT — INFECTION {infectionPct}%
            </div>
          )}

          <header className="scp-print__header">
            <div className="scp-print__logo-block">
              <div className="scp-print__logo">SCP</div>
              <div className="scp-print__org">
                <span>SECURE. CONTAIN. PROTECT.</span>
                <span>Zombie Classification Division</span>
              </div>
            </div>
            <div className="scp-print__doc-id">
              <span>DOCUMENT CLASS: CLASSIFIED</span>
              <span>FILE #{patient.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </header>

          <div className="scp-print__stripe">
            <span>CLASSIFICATION: {classification.status.toUpperCase()}</span>
            <span>THREAT: {threatLevel.toUpperCase()}</span>
            <span>RISK: {classification.riskScore}</span>
            <span>INFECTION: {infectionPct}%</span>
          </div>

          <div className="scp-print__body">
            <div className="scp-print__col-left">
              {patient.photo.dataUrl && (
                <div className="scp-print__photo-frame">
                  <img src={patient.photo.dataUrl} alt={patient.identity.name} />
                </div>
              )}
              <table className="scp-print__identity-table">
                <tbody>
                  <tr><th>Subject</th><td>{patient.identity.name}</td></tr>
                  <tr><th>Age</th><td>{patient.identity.age}</td></tr>
                  <tr><th>Sex</th><td>{patient.identity.sex}</td></tr>
                  {patient.identity.hairColor && <tr><th>Hair</th><td>{patient.identity.hairColor}</td></tr>}
                  {patient.identity.eyeColor && <tr><th>Eyes</th><td>{patient.identity.eyeColor}</td></tr>}
                  {patient.identity.skinPigmentation && <tr><th>Skin</th><td>{patient.identity.skinPigmentation}</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="scp-print__col-right">
              <h3 className="scp-print__section-title">BIOMETRIC READINGS</h3>
              <table className="scp-print__data-table">
                <tbody>
                  <tr>
                    <th>Pupils</th>
                    <td>{patient.checklist.pupilState}</td>
                  </tr>
                  <tr>
                    <th>Temperature</th>
                    <td>
                      {patient.checklist.temperatureC.toFixed(1)}°C
                      {(() => { const r = getTempRangeForValue(patient.checklist.temperatureC); return r ? ` (${r.label})` : '' })()}
                    </td>
                  </tr>
                  <tr>
                    <th>Heartbeat</th>
                    <td>
                      {patient.checklist.heartbeatDetected
                        ? `Detected — ${patient.checklist.heartbeatBpm} BPM`
                        : 'NOT DETECTED'}
                    </td>
                  </tr>
                  <tr>
                    <th>EMF Level</th>
                    <td>{patient.checklist.emfLevel}</td>
                  </tr>
                  <tr>
                    <th>Containment</th>
                    <td>{containment}</td>
                  </tr>
                  <tr>
                    <th>Variant</th>
                    <td>{variant}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="scp-print__section-title">OBSERVED SYMPTOMS</h3>
              <ul className="scp-print__symptom-list">
                {Object.entries(patient.checklist.symptoms).map(([key, active]) => (
                  <li key={key} className={active ? 'is-active' : ''}>
                    <span className="scp-print__check">{active ? '■' : '□'}</span>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </li>
                ))}
              </ul>

              {patient.checklist.notes && (
                <>
                  <h3 className="scp-print__section-title">FIELD NOTES</h3>
                  <p className="scp-print__notes">{patient.checklist.notes}</p>
                </>
              )}
            </div>
          </div>

          <div className="scp-print__infection-bar-wrapper">
            <div className="scp-print__infection-bar">
              <div className="scp-print__infection-fill" style={{ width: `${infectionPct}%` }} />
            </div>
            <span>ZOMBIE INFECTION PROBABILITY: {infectionPct}%</span>
          </div>

          {classification.warnings.length > 0 && (
            <div className="scp-print__warnings">
              <h3 className="scp-print__section-title">ACTIVE WARNINGS</h3>
              {classification.warnings.map((w) => (
                <div key={w.id} className="scp-print__warning-item">
                  <strong>[{w.severity.toUpperCase()}] {w.title}</strong>
                  <p>{w.detail}</p>
                  <p className="scp-print__action">ACTION: {w.action}</p>
                </div>
              ))}
            </div>
          )}

          {directives.length > 0 && (
            <div className="scp-print__directives">
              <h3 className="scp-print__section-title">SCP TASK FORCE DIRECTIVES</h3>
              <ol>
                {directives.map((d) => (
                  <li key={d.id}>
                    <strong>{d.title}</strong>
                    <p>{d.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {noPulse && (
            <div className="scp-print__stamp scp-print__stamp--zombie">
              POTENTIAL ZOMBIE
            </div>
          )}

          {terminateOnSight && (
            <div className="scp-print__stamp scp-print__stamp--terminate">
              TERMINATE ON SIGHT
            </div>
          )}

          <footer className="scp-print__footer">
            <div>
              <span>Reporting agent: {updatedBy.callsign} / {updatedBy.agentName}</span>
              <span>Unit: {updatedBy.taskForceUnit}</span>
            </div>
            <div>
              <span>Classification: {classification.summary}</span>
              <span>Printed: {new Date().toLocaleString()}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
