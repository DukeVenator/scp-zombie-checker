import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { classifyPatient } from '../../data/scpRules'
import { useAgentProfile } from '../../hooks/useAgentProfile'
import {
  buildAssessmentDirectives,
  calculateInfectionProbability,
  emfWarnings,
  getClassificationToastTone,
  getThreatLevel,
  isHighAlertClassification,
  symptomWarnings,
  tempRangeWarnings,
  temperatureRanges,
  getTempRangeForValue,
} from '../../lib/assessment-ui'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning'
import { useToast } from '../../hooks/useToast'
import { findPotentialDuplicates } from '../../lib/storage'
import { formatValidationError } from '../../lib/validation'
import { profileToReportingAgent } from '../../types/agent'
import type { PatientInput, PatientRecord } from '../../types/patient'
import { defaultPatientInput, emfLevels, patientInputSchema, pupilStates, sexOptions } from '../../types/patient'
import { ToastViewport } from '../feedback/ToastViewport'
import { PatientPhotoInput } from '../patient/PatientPhotoInput'

type NewPatientWizardProps = {
  patients: PatientRecord[]
  onSave: (input: PatientInput) => Promise<PatientRecord>
}

const symptomLabels: Record<keyof PatientInput['checklist']['symptoms'], string> = {
  aggression: 'Aggression',
  decay: 'Visible decay',
  incoherentSpeech: 'Incoherent speech',
  violentResponse: 'Violent response',
  aversionToLight: 'Aversion to light',
  abnormalOdor: 'Abnormal odor',
}

type StepKind = 'text' | 'number' | 'select' | 'yesno' | 'photo' | 'textarea' | 'symptom-battery' | 'review' | 'temp-range' | 'emf-select'

interface StepDef {
  id: string
  label: string
  subtitle: string
  kind: StepKind
  options?: readonly string[]
  required?: boolean
  min?: number
  max?: number
  step?: number
}

const STEPS: StepDef[] = [
  { id: 'name', label: 'Subject name', subtitle: 'Full name or field alias of the subject.', kind: 'text', required: true },
  { id: 'age', label: 'Age', subtitle: 'Estimated or confirmed age.', kind: 'number', min: 0, max: 130 },
  { id: 'sex', label: 'Sex', subtitle: 'Biological sex for field identification.', kind: 'select', options: sexOptions },
  { id: 'hairColor', label: 'Hair colour', subtitle: 'Describe the colour for ID matching. Skip if unknown.', kind: 'text' },
  { id: 'eyeColor', label: 'Eye colour', subtitle: 'Note any discoloration or abnormality. Skip if unknown.', kind: 'text' },
  { id: 'skinPigmentation', label: 'Skin pigmentation', subtitle: 'Complexion and notable markings. Skip if unknown.', kind: 'text' },
  { id: 'photo', label: 'Patient photograph', subtitle: 'Capture or upload a reference image.', kind: 'photo' },
  { id: 'pupils', label: 'Pupil state', subtitle: 'Assess ocular response now.', kind: 'select', options: pupilStates },
  { id: 'temperature', label: 'Temperature (C)', subtitle: 'Select the range closest to the reading.', kind: 'temp-range' },
  { id: 'heartbeatDetected', label: 'Heartbeat detected?', subtitle: 'Can you confirm a pulse?', kind: 'yesno' },
  { id: 'heartbeatBpm', label: 'Heartbeat BPM', subtitle: 'Beats per minute if detected.', kind: 'number', min: 0, max: 240 },
  { id: 'emfLevel', label: 'EMF reading', subtitle: 'Electromagnetic field level around the subject.', kind: 'emf-select' },
  { id: 'symptoms', label: 'Observed symptoms', subtitle: 'Toggle each symptom observed.', kind: 'symptom-battery' },
  { id: 'notes', label: 'Field notes', subtitle: 'Additional observations or context (optional).', kind: 'textarea' },
  { id: 'review', label: 'File assessment', subtitle: 'Review and commit. If any marker is in doubt, escalate.', kind: 'review' },
]

const getStepValue = (form: PatientInput, stepId: string): string | number | boolean => {
  switch (stepId) {
    case 'name': return form.identity.name
    case 'age': return form.identity.age
    case 'sex': return form.identity.sex
    case 'hairColor': return form.identity.hairColor
    case 'eyeColor': return form.identity.eyeColor
    case 'skinPigmentation': return form.identity.skinPigmentation
    case 'pupils': return form.checklist.pupilState
    case 'temperature': return form.checklist.temperatureC
    case 'heartbeatDetected': return form.checklist.heartbeatDetected
    case 'heartbeatBpm': return form.checklist.heartbeatBpm
    case 'emfLevel': return form.checklist.emfLevel
    case 'notes': return form.checklist.notes
    default: return ''
  }
}

export const NewPatientWizard = ({ patients, onSave }: NewPatientWizardProps) => {
  const { profile, openSetup } = useAgentProfile()
  const [form, setForm] = useState<PatientInput>(() => ({
    ...defaultPatientInput(),
    reportingAgent: profile ? profileToReportingAgent(profile) : defaultPatientInput().reportingAgent,
  }))
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [noHeartbeatAck, setNoHeartbeatAck] = useState(false)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [symptomAck, setSymptomAck] = useState<string | null>(null)
  const [tempAck, setTempAck] = useState<string | null>(null)
  const [emfAck, setEmfAck] = useState<string | null>(null)
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const reportingAgent = profile ? profileToReportingAgent(profile) : form.reportingAgent
  const lastAlertedStatusRef = useRef('')
  const stepCardRef = useRef<HTMLDivElement>(null)

  useUnsavedChangesWarning(
    form.identity.name.length > 0 ||
      form.identity.hairColor.length > 0 ||
      form.photo.dataUrl.length > 0 ||
      form.checklist.notes.length > 0,
  )

  const classification = useMemo(() => classifyPatient(form), [form])
  const duplicates = useMemo(() => findPotentialDuplicates(patients, form), [patients, form])
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
      description: `${classification.summary} Escalate containment immediately. Do not proceed without armed support.`,
      tone: 'error',
      placement: 'checklist',
    })
  }, [classification.riskScore, classification.status, classification.summary, highAlert, pushToast])

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

  const setIdentity = useCallback((field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, identity: { ...prev.identity, [field]: value } }))
  }, [])

  const setChecklist = useCallback((field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, checklist: { ...prev.checklist, [field]: value } }))
  }, [])

  const handleSave = async () => {
    const result = patientInputSchema.safeParse({ ...form, reportingAgent })
    if (!result.success) {
      setError(formatValidationError(result.error, 'Patient data is invalid.'))
      return
    }
    setSaving(true)
    const record = await onSave(result.data)
    setSaving(false)
    pushToast({
      title: `${record.classification.status} assessment saved`,
      description: `${record.identity.name} was added to the SCP registry with risk ${record.classification.riskScore}.`,
      tone: getClassificationToastTone(record.classification),
    })
    navigate(`/patients/${record.id}`)
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

    if (currentStep.kind === 'text') {
      const value = getStepValue(form, stepId) as string
      const canContinue = !currentStep.required || value.trim().length >= 2
      return (
        <div className="step-input-group">
          <label>
            {currentStep.label}
            <input
              autoFocus
              value={value}
              onChange={(e) => setIdentity(stepId, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canContinue) advance() }}
            />
          </label>
          <button className="primary-button" disabled={!canContinue} onClick={advance} type="button">
            {value.trim() ? 'Continue' : 'Skip'} <ChevronRight size={16} />
          </button>
        </div>
      )
    }

    if (currentStep.kind === 'number') {
      const value = getStepValue(form, stepId) as number
      const setter = ['age'].includes(stepId) ? setIdentity : setChecklist
      const field = stepId === 'temperature' ? 'temperatureC' : stepId === 'heartbeatBpm' ? 'heartbeatBpm' : stepId
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
              onChange={(e) => setter(field, Number(e.target.value))}
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
      const value = getStepValue(form, stepId) as string
      const setter = ['sex'].includes(stepId) ? setIdentity : setChecklist
      const field = stepId === 'pupils' ? 'pupilState' : stepId === 'emfLevel' ? 'emfLevel' : stepId
      return (
        <div className="step-option-grid">
          {(currentStep.options ?? []).map((opt) => (
            <button
              key={opt}
              className={`step-option-btn ${value === opt ? 'is-selected' : ''}`}
              onClick={() => { setter(field, opt); advance() }}
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

    if (currentStep.kind === 'photo') {
      return (
        <div className="step-input-group">
          <PatientPhotoInput
            value={form.photo.dataUrl}
            onChange={(photo) => setForm((prev) => ({ ...prev, photo }))}
          />
          <button className="primary-button" onClick={advance} type="button">
            {form.photo.dataUrl ? 'Continue' : 'Skip'} <ChevronRight size={16} />
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
            <div><dt>Name</dt><dd>{form.identity.name || '—'}</dd></div>
            <div><dt>Age</dt><dd>{form.identity.age}</dd></div>
            <div><dt>Sex</dt><dd>{form.identity.sex}</dd></div>
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
          {form.photo.dataUrl && <img className="photo-preview review-photo" src={form.photo.dataUrl} alt="Review" />}
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
            {saving ? 'Saving...' : 'Save patient'}
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
            <div className="sticky-header__actions-prompt">
              {(highAlert || noPulse || (classification.warnings && classification.warnings.length > 0)) && (
                <span className="sticky-header__prompt-label sticky-header__prompt-label--alert">ALERT</span>
              )}
              {!(highAlert || noPulse) && directives.length > 0 && (
                <span className="sticky-header__prompt-label sticky-header__prompt-label--caution">CAUTION</span>
              )}
              <span className="sticky-header__prompt-cta">MORE DETAILS — CLICK HERE FOR ACTIONS</span>
              <span className="sticky-header__prompt-cta-mobile" aria-hidden="true">Details</span>
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
              <p className="eyebrow">New patient intake</p>
              <h2>SCP field screening</h2>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="info-banner">Possible duplicate: {duplicates[0]?.identity.name}. Review before saving.</div>
          )}

          <div ref={stepCardRef} className="step-card" key={`${currentStep.id}-${noHeartbeatAck}-${symptomAck}-${tempAck}-${emfAck}`}>
            <p className="eyebrow">Question {stepIdx + 1}</p>
            <h3 className="step-card__label">{currentStep.label}</h3>
            <p className="muted step-card__sub">{currentStep.subtitle}</p>
            {renderStepInput()}
          </div>

          <div className="step-nav">
            <button className="ghost-button" onClick={stepIdx === 0 ? () => navigate('/') : goBack} type="button">
              {stepIdx === 0 ? 'Exit' : 'Back'}
            </button>
            {currentStep.kind !== 'review' && currentStep.kind !== 'yesno' && (
              <button className="ghost-button" onClick={advance} type="button">Skip</button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
