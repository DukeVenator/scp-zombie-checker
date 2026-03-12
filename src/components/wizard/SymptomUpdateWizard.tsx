import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, ShieldAlert, TriangleAlert } from 'lucide-react'
import { classifyPatient } from '../../data/scpRules'
import { useAgentProfile } from '../../hooks/useAgentProfile'
import {
  buildAssessmentDirectives,
  calculateInfectionProbability,
  emfWarnings,
  getClassificationToastTone,
  getTempRangeForValue,
  getThreatLevel,
  isHighAlertClassification,
  symptomWarnings,
  tempRangeWarnings,
  temperatureRanges,
} from '../../lib/assessment-ui'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning'
import { useToast } from '../../hooks/useToast'
import { profileToReportingAgent } from '../../types/agent'
import type { PatientInput, PatientRecord } from '../../types/patient'
import { emfLevels, pupilStates } from '../../types/patient'
import { ToastViewport } from '../feedback/ToastViewport'

type SymptomUpdateWizardProps = {
  patient: PatientRecord
  onSave: (input: PatientInput, existingId: string) => Promise<void>
}

const symptomLabels: Record<keyof PatientInput['checklist']['symptoms'], string> = {
  aggression: 'Aggression',
  decay: 'Visible decay',
  incoherentSpeech: 'Incoherent speech',
  violentResponse: 'Violent response',
  aversionToLight: 'Aversion to light',
  abnormalOdor: 'Abnormal odor',
}

type StepKind = 'select' | 'number' | 'yesno' | 'symptom-battery' | 'textarea' | 'review' | 'temp-range' | 'emf-select'

interface StepDef {
  id: string
  label: string
  subtitle: string
  kind: StepKind
  options?: readonly string[]
  min?: number
  max?: number
  step?: number
}

const STEPS: StepDef[] = [
  { id: 'pupils', label: 'Pupil state', subtitle: 'Reassess ocular response now.', kind: 'select', options: pupilStates },
  { id: 'temperature', label: 'Temperature (C)', subtitle: 'Select the range closest to the reading.', kind: 'temp-range' },
  { id: 'heartbeatDetected', label: 'Heartbeat detected?', subtitle: 'Can you confirm a pulse?', kind: 'yesno' },
  { id: 'heartbeatBpm', label: 'Heartbeat BPM', subtitle: 'Beats per minute if detected.', kind: 'number', min: 0, max: 240 },
  { id: 'emfLevel', label: 'EMF reading', subtitle: 'Current electromagnetic field level.', kind: 'emf-select' },
  { id: 'symptoms', label: 'Observed symptoms', subtitle: 'Toggle each symptom currently observed.', kind: 'symptom-battery' },
  { id: 'notes', label: 'Field notes', subtitle: 'Additional observations (optional).', kind: 'textarea' },
  { id: 'review', label: 'Confirm update', subtitle: 'Review changes and commit the updated assessment.', kind: 'review' },
]

export const SymptomUpdateWizard = ({ patient, onSave }: SymptomUpdateWizardProps) => {
  const { profile, openSetup } = useAgentProfile()
  const [form, setForm] = useState<PatientInput>({
    identity: patient.identity,
    checklist: patient.checklist,
    reportingAgent: profile ? profileToReportingAgent(profile) : patient.updatedBy,
    photo: patient.photo,
  })
  const [stepIdx, setStepIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [noHeartbeatAck, setNoHeartbeatAck] = useState(false)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [symptomAck, setSymptomAck] = useState<string | null>(null)
  const [tempAck, setTempAck] = useState<string | null>(null)
  const [emfAck, setEmfAck] = useState<string | null>(null)
  const { pushToast } = useToast()
  const reportingAgent = profile ? profileToReportingAgent(profile) : form.reportingAgent
  const lastAlertedStatusRef = useRef('')
  const stepCardRef = useRef<HTMLDivElement>(null)

  useUnsavedChangesWarning(JSON.stringify(form.checklist) !== JSON.stringify(patient.checklist))

  const classification = useMemo(() => classifyPatient(form), [form])
  const directives = useMemo(() => buildAssessmentDirectives(form.checklist), [form.checklist])
  const highAlert = isHighAlertClassification(classification)
  const threatLevel = getThreatLevel(classification)
  const noPulse = !form.checklist.heartbeatDetected || form.checklist.heartbeatBpm === 0
  const infectionPct = useMemo(() => calculateInfectionProbability(form.checklist), [form.checklist])

  useEffect(() => {
    if (!highAlert) return
    const alertKey = `${classification.status}:${classification.riskScore}`
    if (lastAlertedStatusRef.current === alertKey) return
    lastAlertedStatusRef.current = alertKey
    pushToast({
      title: `EXTREME CAUTION: ${classification.status}`,
      description: `${patient.identity.name} now requires escalated SCP handling. Do not proceed without armed support.`,
      tone: 'error',
      placement: 'checklist',
    })
  }, [classification.riskScore, classification.status, highAlert, patient.identity.name, pushToast])

  const visibleSteps = useMemo(() =>
    STEPS.filter((s) => !(s.id === 'heartbeatBpm' && !form.checklist.heartbeatDetected)),
    [form.checklist.heartbeatDetected],
  )
  const currentStep = visibleSteps[stepIdx] as StepDef
  const progress = Math.round(((stepIdx + 1) / visibleSteps.length) * 100)

  const advance = useCallback(() => {
    if (stepIdx < visibleSteps.length - 1) {
      setStepIdx((prev) => prev + 1)
      setNoHeartbeatAck(false)
      setSymptomAck(null)
      setTempAck(null)
      setEmfAck(null)
      stepCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }
  }, [stepIdx, visibleSteps.length])

  const goBack = useCallback(() => {
    if (stepIdx > 0) {
      setStepIdx((prev) => prev - 1)
      setNoHeartbeatAck(false)
      setSymptomAck(null)
      setTempAck(null)
      setEmfAck(null)
    }
  }, [stepIdx])

  const setChecklist = useCallback((field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, checklist: { ...prev.checklist, [field]: value } }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...form, reportingAgent }, patient.id)
    setSaving(false)
    setSaved(true)
    pushToast({
      title: `${classification.status} assessment updated`,
      description: `${patient.identity.name}'s checklist was refreshed with risk ${classification.riskScore}.`,
      tone: getClassificationToastTone(classification),
    })
    window.setTimeout(() => setSaved(false), 2000)
  }

  const statusColorClass = (() => {
    switch (classification.status) {
      case 'Critical': return 'is-critical'
      case 'Contained': return 'is-contained'
      case 'Suspected': return 'is-suspected'
      case 'Observation': return 'is-observation'
      default: return 'is-cleared'
    }
  })()

  const infectionClass = infectionPct >= 70 ? 'infection--critical' : infectionPct >= 40 ? 'infection--warning' : 'infection--low'

  const renderStepInput = () => {
    const stepId = currentStep.id

    if (currentStep.kind === 'number') {
      const field = stepId === 'temperature' ? 'temperatureC' : stepId
      const value = stepId === 'temperature' ? form.checklist.temperatureC : stepId === 'heartbeatBpm' ? form.checklist.heartbeatBpm : 0
      return (
        <div className="step-input-group">
          <label>
            {currentStep.label}
            <input
              autoFocus
              max={currentStep.max}
              min={currentStep.min}
              step={currentStep.step}
              type="number"
              value={value}
              onChange={(e) => setChecklist(field, Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') advance() }}
            />
          </label>
          <button className="primary-button" onClick={advance} type="button">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )
    }

    if (currentStep.kind === 'select') {
      const value = stepId === 'pupils' ? form.checklist.pupilState : form.checklist.emfLevel
      const field = stepId === 'pupils' ? 'pupilState' : stepId
      return (
        <div className="step-option-grid">
          {(currentStep.options ?? []).map((opt) => (
            <button
              key={opt}
              className={`step-option-btn ${value === opt ? 'is-selected' : ''}`}
              onClick={() => { setChecklist(field, opt); advance() }}
              type="button"
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    if (currentStep.kind === 'temp-range') {
      if (tempAck) {
        const warn = tempRangeWarnings[tempAck]
        return (
          <div className="step-urgent-warning" role="alert">
            <div className="step-urgent-warning__icon"><TriangleAlert size={28} /></div>
            <h3 className="step-urgent-warning__title">{warn?.title ?? 'TEMPERATURE WARNING'}</h3>
            <p className="step-urgent-warning__body">{warn?.detail ?? 'Abnormal temperature detected.'}</p>
            <button
              className="primary-button step-urgent-warning__ack"
              onClick={() => { setTempAck(null); advance() }}
              type="button"
            >
              Acknowledged
            </button>
          </div>
        )
      }

      const activeTempRange = getTempRangeForValue(form.checklist.temperatureC)
      return (
        <div className="step-option-grid step-option-grid--3col">
          {temperatureRanges.map((range) => (
            <button
              key={range.id}
              className={`step-option-btn ${range.severity === 'danger' ? 'step-option-btn--danger' : range.severity === 'warning' ? 'step-option-btn--warn' : ''} ${activeTempRange?.id === range.id ? 'is-selected' : ''}`}
              onClick={() => {
                setChecklist('temperatureC', range.value)
                if (range.severity !== 'normal' && tempRangeWarnings[range.id]) {
                  setTempAck(range.id)
                } else {
                  advance()
                }
              }}
              type="button"
            >
              <strong>{range.label}</strong>
              <span className="muted">{range.subtitle}</span>
            </button>
          ))}
        </div>
      )
    }

    if (currentStep.kind === 'emf-select') {
      if (emfAck) {
        const warn = emfWarnings[emfAck]
        return (
          <div className="step-urgent-warning" role="alert">
            <div className="step-urgent-warning__icon"><TriangleAlert size={28} /></div>
            <h3 className="step-urgent-warning__title">{warn?.title ?? 'EMF WARNING'}</h3>
            <p className="step-urgent-warning__body">{warn?.detail ?? 'Anomalous EMF level detected.'}</p>
            <button
              className="primary-button step-urgent-warning__ack"
              onClick={() => { setEmfAck(null); advance() }}
              type="button"
            >
              Acknowledged
            </button>
          </div>
        )
      }

      return (
        <div className="step-option-grid">
          {emfLevels.map((opt) => (
            <button
              key={opt}
              className={`step-option-btn ${form.checklist.emfLevel === opt ? 'is-selected' : ''} ${opt === 'Extreme' ? 'step-option-btn--danger' : opt === 'High' ? 'step-option-btn--warn' : ''}`}
              onClick={() => {
                setChecklist('emfLevel', opt)
                if (emfWarnings[opt]) {
                  setEmfAck(opt)
                } else {
                  advance()
                }
              }}
              type="button"
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    if (currentStep.kind === 'yesno') {
      if (noHeartbeatAck) {
        return (
          <div className="step-urgent-warning" role="alert">
            <div className="step-urgent-warning__icon"><TriangleAlert size={36} /></div>
            <h3 className="step-urgent-warning__title">NO PULSE DETECTED — POTENTIAL ZOMBIE</h3>
            <p className="step-urgent-warning__body">
              Subject has no confirmed heartbeat. Classified as <strong>POTENTIAL DEAD</strong>.
              Treat as hostile reanimation risk until disproven.
              Maintain armed distance. Initiate hard containment. Request backup immediately.
            </p>
            <p className="step-urgent-warning__body">
              <strong>Extreme caution.</strong> Heart rate set to 0. BPM step will be skipped.
              Any contact from this point must be under armed escort.
            </p>
            <button
              className="primary-button step-urgent-warning__ack"
              onClick={() => { setNoHeartbeatAck(false); advance() }}
              type="button"
            >
              Acknowledged — proceed with extreme caution
            </button>
          </div>
        )
      }

      return (
        <div className="step-yesno-group">
          <button
            className="step-option-btn step-option-btn--large"
            onClick={() => {
              setChecklist('heartbeatDetected', true)
              if (form.checklist.heartbeatBpm === 0) setChecklist('heartbeatBpm', 72)
              advance()
            }}
            type="button"
          >
            YES
          </button>
          <button
            className="step-option-btn step-option-btn--large step-option-btn--danger"
            onClick={() => {
              setChecklist('heartbeatDetected', false)
              setChecklist('heartbeatBpm', 0)
              setNoHeartbeatAck(true)
            }}
            type="button"
          >
            NO
          </button>
        </div>
      )
    }

    if (currentStep.kind === 'textarea') {
      return (
        <div className="step-input-group">
          <label>
            {currentStep.label}
            <textarea autoFocus rows={4} value={form.checklist.notes} onChange={(e) => setChecklist('notes', e.target.value)} />
          </label>
          <button className="primary-button" onClick={advance} type="button">
            {form.checklist.notes.trim() ? 'Continue' : 'Skip'} <ChevronRight size={16} />
          </button>
        </div>
      )
    }

    if (currentStep.kind === 'symptom-battery') {
      if (symptomAck) {
        const warn = symptomWarnings[symptomAck]
        return (
          <div className="step-urgent-warning" role="alert">
            <div className="step-urgent-warning__icon"><TriangleAlert size={28} /></div>
            <h3 className="step-urgent-warning__title">{warn?.title ?? 'WARNING'}</h3>
            <p className="step-urgent-warning__body">{warn?.detail ?? 'A threat marker has been activated.'}</p>
            <button
              className="primary-button step-urgent-warning__ack"
              onClick={() => setSymptomAck(null)}
              type="button"
            >
              Acknowledged
            </button>
          </div>
        )
      }

      return (
        <div className="step-input-group">
          <div className="symptom-grid">
            {Object.entries(form.checklist.symptoms).map(([key, active]) => (
              <label key={key} className={`symptom-card ${active ? 'is-active' : ''}`}>
                <input
                  checked={active}
                  type="checkbox"
                  onChange={(e) => {
                    const checked = e.target.checked
                    setForm((prev) => ({
                      ...prev,
                      checklist: {
                        ...prev.checklist,
                        symptoms: { ...prev.checklist.symptoms, [key]: checked },
                      },
                    }))
                    if (checked && symptomWarnings[key]) {
                      setSymptomAck(key)
                    }
                  }}
                />
                <span>{symptomLabels[key as keyof PatientInput['checklist']['symptoms']]}</span>
              </label>
            ))}
          </div>
          <button className="primary-button" onClick={advance} type="button">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )
    }

    if (currentStep.kind === 'review') {
      const tempRange = getTempRangeForValue(form.checklist.temperatureC)
      return (
        <div className="step-review">
          <dl className="review-list">
            <div><dt>Patient</dt><dd>{patient.identity.name}</dd></div>
            <div><dt>Pupils</dt><dd>{form.checklist.pupilState}</dd></div>
            <div><dt>Temp</dt><dd>{tempRange ? `${tempRange.label} (${form.checklist.temperatureC.toFixed(1)}°C)` : `${form.checklist.temperatureC.toFixed(1)}°C`}</dd></div>
            <div><dt>Heartbeat</dt><dd>{form.checklist.heartbeatDetected ? `${form.checklist.heartbeatBpm} BPM` : 'NOT DETECTED — POTENTIAL ZOMBIE'}</dd></div>
            <div><dt>EMF</dt><dd>{form.checklist.emfLevel}</dd></div>
            <div><dt>Infection probability</dt><dd className={infectionClass}>{infectionPct}%</dd></div>
          </dl>
          {noPulse && (
            <div className="step-urgent-warning" role="alert" style={{ animationIterationCount: 1 }}>
              <strong className="step-urgent-warning__title" style={{ fontSize: '1rem' }}>POTENTIAL DEAD TAG ACTIVE</strong>
              <p className="step-urgent-warning__body">This patient has no confirmed heartbeat. Classification is elevated.</p>
            </div>
          )}
          {saved && <span className="success-text">Record updated.</span>}
          <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
            {saving ? 'Updating...' : 'Save symptom update'}
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="wizard-layout wizard-layout--full">
      <section className="wizard-main">
        <div className="sticky-header-wrap">
          <button
            aria-expanded={headerOpen}
            className={`sticky-header ${statusColorClass}`}
            onClick={() => setHeaderOpen((v) => !v)}
            type="button"
          >
            <div className="sticky-header__row">
              <div className="sticky-header__badges">
                <span className={`badge badge--${classification.status.toLowerCase()}`}>{classification.status}</span>
                <span className="badge">Threat {threatLevel}</span>
                <span className={`badge ${highAlert ? 'badge--critical' : 'badge--observation'}`}>Risk {classification.riskScore}</span>
                {noPulse && <span className="badge badge--critical">POTENTIAL ZOMBIE</span>}
                <span className={`badge ${infectionClass}`}>{infectionPct}% infection</span>
              </div>
              <div className="sticky-header__progress">
                <span className="muted">Step {stepIdx + 1}/{visibleSteps.length}</span>
                <ChevronDown className={`sticky-header__chevron ${headerOpen ? 'is-open' : ''}`} size={16} />
              </div>
            </div>
            <div className="step-progress-bar">
              <div className="step-progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </button>

          {headerOpen && (
            <div className="sticky-header__dropdown">
            <section className="panel panel--inner agent-summary">
              <div>
                <p className="eyebrow">Reporting agent</p>
                <strong>{reportingAgent.callsign} / {reportingAgent.agentName}</strong>
                <p className="muted">{reportingAgent.taskForceUnit}</p>
              </div>
              <button className="ghost-button" onClick={openSetup} type="button">Edit agent</button>
            </section>

            <ToastViewport className="toast-viewport--inline" placement="checklist" />

            <section className={`alert-banner ${highAlert ? 'alert-banner--high' : 'alert-banner--normal'}`}>
              <div>
                <p className="eyebrow">Live SCP threat board</p>
                <strong>{classification.status} / Threat {threatLevel} / Risk {classification.riskScore}</strong>
                <p className="muted">{classification.summary}</p>
              </div>
            </section>

            <div className={`infection-meter ${infectionClass}`}>
              <div className="infection-meter__bar">
                <div className="infection-meter__fill" style={{ width: `${infectionPct}%` }} />
              </div>
              <p className="infection-meter__label">Zombie infection probability: <strong>{infectionPct}%</strong></p>
            </div>

            {classification.warnings.length > 0 && (
              <section className="panel panel--inner">
                <div className="section-heading">
                  <div><p className="eyebrow">Immediate alert feed</p><h3>Active warning conditions</h3></div>
                  <TriangleAlert size={18} />
                </div>
                <ul className="directive-list">
                  {classification.warnings.map((w) => (
                    <li key={w.id} className="directive-card">
                      <strong>{w.title}</strong>
                      <p className="muted">{w.detail}</p>
                      <p>{w.action}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {directives.length > 0 && (
              <section className="panel panel--inner">
                <div className="section-heading">
                  <div><p className="eyebrow">Triggered response orders</p><h3>SCP task force directives</h3></div>
                  <ShieldAlert size={18} />
                </div>
                <ol className="directive-list">
                  {directives.map((d) => (
                    <li key={d.id} className="directive-card"><strong>{d.title}</strong><p className="muted">{d.detail}</p></li>
                  ))}
                </ol>
              </section>
            )}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Update symptoms</p>
              <h2>{patient.identity.name}</h2>
            </div>
            <span className="muted">Previous: {patient.classification.status}</span>
          </div>

          <div ref={stepCardRef} className="step-card" key={`${currentStep.id}-${noHeartbeatAck}-${symptomAck}-${tempAck}-${emfAck}`}>
            <p className="eyebrow">Question {stepIdx + 1}</p>
            <h3 className="step-card__label">{currentStep.label}</h3>
            <p className="muted step-card__sub">{currentStep.subtitle}</p>
            {renderStepInput()}
          </div>

          <div className="step-nav">
            <button className="ghost-button" disabled={stepIdx === 0} onClick={goBack} type="button">Back</button>
            {currentStep.kind !== 'review' && currentStep.kind !== 'yesno' && (
              <button className="ghost-button" onClick={advance} type="button">Skip</button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
