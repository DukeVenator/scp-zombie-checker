import { Shield, ShieldAlert } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { badgeSeverity, type BadgePayload } from '../lib/badge'
import { getPrintFluff } from '../lib/badge-copy'
import {
  getClearedCongrats,
  getContainmentHumor,
  getCriticalTerminationCopy,
  getInfectionHumor,
  getStatusHumor,
  getSymptomDarkJoke,
} from '../lib/badge-copy'

type Severity = 'critical' | 'warning' | 'cleared'

const MOCK_DOSSIER: Record<Severity, { itemNumber: string; objectClass: string; containmentParagraph: string; steps: string[]; summary: string; subjectLine: string; symptoms: { label: string; active: boolean }[]; addendum: string | null; showIngestHighlight: boolean }> = {
  cleared: {
    itemNumber: 'SCP-TEST0001',
    objectClass: 'Safe',
    containmentParagraph: 'Standard observation protocols apply. Subject is under routine monitoring.',
    steps: [],
    summary: 'Subject cleared after screening. No anomalies detected.',
    subjectLine: 'Subject: Jane Doe, 34, Female. Biometrics: pupils reactive; temperature 36.6°C; heartbeat 72 BPM; EMF Normal. Containment: Normal. Variant: Normal.',
    symptoms: [
      { label: 'Aggression', active: false },
      { label: 'Visible decay', active: false },
      { label: 'Incoherent speech', active: false },
    ],
    addendum: null,
    showIngestHighlight: false,
  },
  warning: {
    itemNumber: 'SCP-TEST0002',
    objectClass: 'Euclid',
    containmentParagraph: 'This subject is secured in an SCP holding area. Maintain current protocols.',
    steps: ['Verify containment seals every 4 hours.', 'Log all personnel entering the containment zone.'],
    summary: 'Subject under observation. Elevated infection probability. Containment in effect.',
    subjectLine: 'Subject: John Smith, 41, Male. Biometrics: pupils sluggish; temperature 37.2°C; heartbeat 58 BPM; EMF High. Containment: Contained. Variant: Walker.',
    symptoms: [
      { label: 'Aggression', active: false },
      { label: 'Visible decay', active: true },
      { label: 'Incoherent speech', active: false },
    ],
    addendum: null,
    showIngestHighlight: true,
  },
  critical: {
    itemNumber: 'SCP-TEST0003',
    objectClass: 'Keter',
    containmentParagraph: 'Subject has broken containment. All nearby installations are on high alert.',
    steps: ['Lock down all exits in the facility immediately.', 'Deploy pursuit teams with live tracking.', 'Alert all nearby SCP installations.'],
    summary: 'Subject designated critical. Termination on sight authorized. Lethal force authorized.',
    subjectLine: 'Subject: Unknown, —, —. Biometrics: pupils non-reactive; temperature 32.0°C; heartbeat not detected; EMF Extreme. Containment: Escaped. Variant: Alpha.',
    symptoms: [
      { label: 'Aggression', active: true },
      { label: 'Visible decay', active: true },
      { label: 'Incoherent speech', active: true },
    ],
    addendum: 'Subject is designated for termination on sight. Lethal force is authorized.',
    showIngestHighlight: true,
  },
}

const MOCK_BADGE_PAYLOADS: Record<Severity, BadgePayload> = {
  cleared: {
    id: 'test-cleared-id',
    name: 'Test Cleared Subject',
    status: 'Cleared',
    infectionPct: 5,
    updatedAt: new Date().toISOString(),
    summary: 'Cleared after screening.',
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  },
  warning: {
    id: 'test-warning-id',
    name: 'Test Warning Subject',
    status: 'Contained',
    infectionPct: 55,
    updatedAt: new Date().toISOString(),
    summary: 'Under observation. Elevated risk.',
    containment: 'Contained',
    variant: 'Walker',
    threatLevel: 'Elevated',
  },
  critical: {
    id: 'test-critical-id',
    name: 'Test Critical Subject',
    status: 'Critical',
    infectionPct: 88,
    updatedAt: new Date().toISOString(),
    summary: 'Terminate on sight. Lethal force authorized.',
    containment: 'Escaped',
    variant: 'Alpha',
    threatLevel: 'Critical',
  },
}

function DossierBlock({ severity }: { severity: Severity }) {
  const fluff = getPrintFluff(severity)
  const d = MOCK_DOSSIER[severity]
  return (
    <div className="scp-print-card" data-testid={`print-variant-dossier-${severity}`} aria-hidden="false">
      <div className="scp-print-card__border">
        {severity === 'critical' && (
          <div className="scp-print__terminate">TERMINATE ON SIGHT — INFECTION 88%</div>
        )}
        <div className="scp-print__classification">{fluff.classificationLine}</div>
        <header className="scp-print__header">
          <div className="scp-print__logo-block">
            <div className="scp-print__logo-text">SCP</div>
            <div className="scp-print__org">
              <span>Secure. Contain. Protect.</span>
            </div>
            <img src="/icons/scp-icon.svg" alt="" className="scp-print__logo-img" />
          </div>
          <dl className="scp-print__meta">
            <div className="scp-print__meta-row"><dt>Clearance Level</dt><dd>2</dd></div>
            <div className="scp-print__meta-row"><dt>Item #</dt><dd>{d.itemNumber}</dd></div>
            <div className="scp-print__meta-row"><dt>Object Class</dt><dd>{d.objectClass}</dd></div>
          </dl>
        </header>
        <div className="scp-print__body">
          <section className="scp-print__section">
            <h3 className="scp-print__section-title">Special Containment Procedures:</h3>
            <p className="scp-print__paragraph">{d.containmentParagraph}</p>
            {d.steps.length > 0 && (
              <ul className="scp-print__dash-list">
                {d.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="scp-print__section">
            <h3 className="scp-print__section-title">Description:</h3>
            <p className="scp-print__paragraph">{d.summary}</p>
            <p className="scp-print__subject-id">{d.subjectLine}</p>
          </section>
          <section className="scp-print__section">
            <h3 className="scp-print__section-title">Symptoms of infection with {d.itemNumber} include:</h3>
            <ul className="scp-print__dash-list">
              {d.symptoms.map(({ label, active }) => (
                <li key={label} className={active ? 'is-active' : ''}>
                  {active ? label : `${label} (not observed)`}
                </li>
              ))}
              {d.showIngestHighlight && (
                <li>
                  <span className="scp-print__highlight">Subject will attempt to ingest living humans if physical contact is made.</span>
                </li>
              )}
            </ul>
          </section>
          {d.addendum && (
            <section className="scp-print__section">
              <h3 className="scp-print__section-title">Addendum:</h3>
              <p className="scp-print__paragraph"><span className="scp-print__highlight">{d.addendum}</span></p>
            </section>
          )}
        </div>
        <footer className="scp-print__footer">
          <img src="/icons/scp-icon.svg" alt="" className="scp-print__footer-logo" />
          <div className="scp-print__footer-center">
            <div className="scp-print__footer-confidential">CONFIDENTIAL!</div>
            <p className="scp-print__footer-disclaimer">This document may not be shared with or used by personnel below the designated clearance level.</p>
            {fluff.footerLines.length > 0 && (
              <p className="scp-print__footer-fluff">{fluff.footerLines.join(' ')}</p>
            )}
          </div>
          <div className="scp-print__footer-meta">
            <span>Reporting agent: MTF-TEST / Test Agent</span>
            <span>Printed: {new Date().toLocaleString()}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function BadgeBlock({ severity }: { severity: Severity }) {
  const payload = MOCK_BADGE_PAYLOADS[severity]
  const resolvedSeverity = badgeSeverity(payload)
  const fluff = getPrintFluff(resolvedSeverity)
  const infectionHumor = getInfectionHumor(payload.infectionPct, resolvedSeverity, payload.id)
  const clearedCongrats = resolvedSeverity === 'cleared' ? getClearedCongrats(payload.id) : null
  const containmentHumor = payload.containment ? getContainmentHumor(payload.containment, resolvedSeverity, payload.id) : null
  const statusHumor = getStatusHumor(payload.status, resolvedSeverity, payload.id)
  const symptomJoke = resolvedSeverity !== 'cleared' && payload.infectionPct >= 50 ? getSymptomDarkJoke(payload.id) : null
  const criticalTermination = resolvedSeverity === 'critical' ? getCriticalTerminationCopy(payload.id) : null
  const badgeUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname || '/'}#/badge?d=test` : '#'

  const stripeModifier =
    resolvedSeverity === 'critical'
      ? 'badge-doc__stripe--hazard'
      : resolvedSeverity === 'warning'
        ? 'badge-doc__stripe--warning'
        : ''
  return (
    <div
      className={`badge-doc badge-doc--print badge-doc--unlocking-${resolvedSeverity}`}
      data-testid={`print-variant-badge-${severity}`}
    >
      <div className={`badge-doc__stripe ${stripeModifier}`.trim()}>
        <Shield size={20} />
        <span>SCP FIELD INTAKE — SUBJECT CHECK — {fluff.classificationLine}</span>
        <Shield size={20} />
      </div>
      <header
        className={`badge-doc__header ${resolvedSeverity === 'critical' ? 'badge-doc__header--hazard' : ''}`.trim()}
      >
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
              <div><dt>Subject ID</dt><dd>{payload.id}</dd></div>
              <div><dt>Status</dt><dd><span className={`badge badge--${payload.status.toLowerCase()}`}>{payload.status}</span></dd></div>
              <div><dt>Threat level</dt><dd>{payload.threatLevel ?? '—'}</dd></div>
              <div><dt>Infection probability</dt><dd className={payload.infectionPct >= 70 ? 'badge-doc__danger' : payload.infectionPct >= 40 ? 'badge-doc__warn' : ''}>{payload.infectionPct}%</dd></div>
              {payload.containment && payload.containment !== 'Normal' && <div><dt>Containment</dt><dd>{payload.containment}</dd></div>}
              {payload.variant && payload.variant !== 'Normal' && <div><dt>Variant</dt><dd>{payload.variant}</dd></div>}
            </dl>
            <p className="badge-doc__summary">{payload.summary}</p>
            <div className="badge-doc__humor">
              {clearedCongrats && <p className="badge-doc__humor-line badge-doc__humor--cleared">{clearedCongrats}</p>}
              {criticalTermination && <p className="badge-doc__humor-line badge-doc__humor--critical">{criticalTermination}</p>}
              {infectionHumor && <p className="badge-doc__humor-line badge-doc__humor--infection">{infectionHumor}</p>}
              {containmentHumor && <p className="badge-doc__humor-line badge-doc__humor--containment">{containmentHumor}</p>}
              {statusHumor && <p className="badge-doc__humor-line badge-doc__humor--status">{statusHumor}</p>}
              {symptomJoke && resolvedSeverity !== 'critical' && <p className="badge-doc__humor-line badge-doc__humor--symptom">{symptomJoke}</p>}
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
        {fluff.footerLines.length > 0 && (
          <span className="badge-doc__footer-fluff">{fluff.footerLines.join(' ')}</span>
        )}
      </footer>
    </div>
  )
}

export function TestingPrintsPage() {
  const severities: Severity[] = ['cleared', 'warning', 'critical']
  return (
    <div className="testing-prints-page">
      <div className="testing-prints-page__bar">
        <h1 className="testing-prints-page__title">Print variants (testing)</h1>
        <p className="testing-prints-page__hint">Dossier and badge by severity. Use browser Print to preview.</p>
        <button className="primary-button" type="button" onClick={() => window.print()}>
          Print all
        </button>
      </div>
      {severities.map((severity) => (
        <section key={severity} className="testing-prints-page__section">
          <h2 className="testing-prints-page__section-title">Dossier — {severity}</h2>
          <DossierBlock severity={severity} />
        </section>
      ))}
      {severities.map((severity) => (
        <section key={`badge-${severity}`} className="testing-prints-page__section">
          <h2 className="testing-prints-page__section-title">Badge — {severity}</h2>
          <BadgeBlock severity={severity} />
        </section>
      ))}
    </div>
  )
}
