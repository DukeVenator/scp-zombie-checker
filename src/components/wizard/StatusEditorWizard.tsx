import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import {
  containmentOptions,
  containmentWarnings,
} from '../../lib/assessment-ui'
import type { ContainmentStatus, PatientRecord } from '../../types/patient'

type StatusEditorWizardProps = {
  patient: PatientRecord
  onSave: (id: string, status: ContainmentStatus) => Promise<PatientRecord>
  onMarkTerminated?: (id: string) => Promise<void>
  onRevertTerminated?: (id: string) => Promise<void>
  onClose: () => void
}

type Phase = 'choice' | 'select' | 'warning' | 'confirm' | 'confirm-terminated' | 'confirm-revert-terminated'

export const StatusEditorWizard = ({ patient, onSave, onMarkTerminated, onRevertTerminated, onClose }: StatusEditorWizardProps) => {
  const [selected, setSelected] = useState<ContainmentStatus>(patient.containmentStatus ?? 'Normal')
  const [phase, setPhase] = useState<Phase>('choice')
  const [saving, setSaving] = useState(false)
  const { pushToast } = useToast()
  const isTerminated = patient.classification?.status === 'Terminated'

  const handleSelect = (status: ContainmentStatus) => {
    setSelected(status)
    if (containmentWarnings[status]) {
      setPhase('warning')
    } else {
      setPhase('confirm')
    }
  }

  const handleConfirm = async () => {
    setSaving(true)
    await onSave(patient.id, selected)
    setSaving(false)
    pushToast({
      title: `Status updated: ${selected}`,
      description: `${patient.identity.name} containment status set to ${selected}.`,
      tone: selected === 'Normal' || selected === 'Terminated' ? 'success' : 'warning',
    })
    onClose()
  }

  const handleMarkTerminated = async () => {
    if (!onMarkTerminated) return
    setSaving(true)
    await onMarkTerminated(patient.id)
    setSaving(false)
    pushToast({
      title: 'Marked as terminated',
      description: `${patient.identity.name} is no longer a threat. Classification and containment set to Terminated.`,
      tone: 'success',
    })
    onClose()
  }

  const handleRevertTerminated = async () => {
    if (!onRevertTerminated) return
    setSaving(true)
    await onRevertTerminated(patient.id)
    setSaving(false)
    pushToast({
      title: 'Terminated status removed',
      description: `${patient.identity.name} has been re-assessed. Terminated status and containment cleared.`,
      tone: 'success',
    })
    onClose()
  }

  const warn = containmentWarnings[selected]

  return (
    <article className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Containment status</p>
          <h3>Update operational status</h3>
        </div>
        <span className="muted">Current: {patient.containmentStatus ?? 'Normal'}</span>
      </div>

      {phase === 'choice' && (
        <div className="step-card">
          <p className="eyebrow">Step 1</p>
          <h3 className="step-card__label">What do you want to do?</h3>
          <p className="muted step-card__sub">Update containment status or mark this subject as terminated (no longer a threat).</p>
          <div className="step-option-grid">
            <button
              className="step-option-btn"
              onClick={() => setPhase('select')}
              type="button"
            >
              <strong>Update containment status</strong>
              <span className="muted">Change Normal, Contained, Threat, Escaped, etc.</span>
            </button>
            {onMarkTerminated && !isTerminated && (
              <button
                className="step-option-btn step-option-btn--warn"
                onClick={() => setPhase('confirm-terminated')}
                type="button"
              >
                <strong>Mark subject as terminated</strong>
                <span className="muted">No longer a threat. Closes the case.</span>
              </button>
            )}
            {onRevertTerminated && isTerminated && (
              <button
                className="step-option-btn"
                onClick={() => setPhase('confirm-revert-terminated')}
                type="button"
              >
                <strong>Remove terminated status</strong>
                <span className="muted">Re-assess and clear Terminated. Subject will show current assessed status.</span>
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'select' && (
        <div className="step-card">
          <p className="eyebrow">Step 1</p>
          <h3 className="step-card__label">Select containment status</h3>
          <p className="muted step-card__sub">Choose the operational status for this subject.</p>
          <div className="step-option-grid">
            {containmentOptions.map((opt) => (
              <button
                key={opt.id}
                className={`step-option-btn ${opt.severity === 'danger' ? 'step-option-btn--danger' : opt.severity === 'warning' ? 'step-option-btn--warn' : ''} ${selected === opt.id ? 'is-selected' : ''}`}
                onClick={() => handleSelect(opt.id)}
                type="button"
              >
                <strong>{opt.label}</strong>
                <span className="muted">{opt.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'warning' && warn && (
        <div className="step-card">
          <div className="step-urgent-warning" role="alert">
            <div className="step-urgent-warning__icon"><TriangleAlert size={28} /></div>
            <h3 className="step-urgent-warning__title">{warn.title}</h3>
            <p className="step-urgent-warning__body">{warn.detail}</p>
            <button
              className="primary-button step-urgent-warning__ack"
              onClick={() => setPhase('confirm')}
              type="button"
            >
              Acknowledged — confirm status change
            </button>
          </div>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="step-card">
          <p className="eyebrow">Confirm</p>
          <h3 className="step-card__label">Apply status: {selected}</h3>
          <p className="muted step-card__sub">
            Changing {patient.identity.name} from <strong>{patient.containmentStatus ?? 'Normal'}</strong> to <strong>{selected}</strong>.
          </p>
          <div className="step-input-group">
            <button className="primary-button" disabled={saving} onClick={handleConfirm} type="button">
              {saving ? 'Saving...' : `Set status to ${selected}`}
            </button>
          </div>
        </div>
      )}

      {phase === 'confirm-terminated' && (
        <div className="step-card">
          <p className="eyebrow">Confirm</p>
          <h3 className="step-card__label">Mark as terminated</h3>
          <p className="muted step-card__sub">
            {patient.identity.name} will be marked as terminated (no longer a threat). Classification and containment will be set to Terminated. This cannot be undone by re-running assessment.
          </p>
          <div className="step-input-group">
            <button className="primary-button" disabled={saving} onClick={handleMarkTerminated} type="button">
              {saving ? 'Saving...' : 'Mark as terminated'}
            </button>
          </div>
        </div>
      )}

      {phase === 'confirm-revert-terminated' && (
        <div className="step-card">
          <p className="eyebrow">Confirm</p>
          <h3 className="step-card__label">Remove terminated status</h3>
          <p className="muted step-card__sub">
            {patient.identity.name} will be re-assessed from current vitals and checklist. Terminated status and containment will be cleared. Classification will reflect the new assessed status.
          </p>
          <div className="step-input-group">
            <button className="primary-button" disabled={saving} onClick={handleRevertTerminated} type="button">
              {saving ? 'Saving...' : 'Remove terminated and re-assess'}
            </button>
          </div>
        </div>
      )}

      <div className="step-nav">
        <button
          className="ghost-button"
          onClick={() => {
            if (phase === 'choice') onClose()
            else if (phase === 'select') setPhase('choice')
            else if (phase === 'warning') setPhase('select')
            else if (phase === 'confirm') setPhase(containmentWarnings[selected] ? 'warning' : 'select')
            else if (phase === 'confirm-terminated' || phase === 'confirm-revert-terminated') setPhase('choice')
            else setPhase('choice')
          }}
          type="button"
        >
          {phase === 'choice' ? 'Cancel' : 'Back'}
        </button>
      </div>
    </article>
  )
}
