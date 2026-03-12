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
  onClose: () => void
}

type Phase = 'select' | 'warning' | 'confirm'

export const StatusEditorWizard = ({ patient, onSave, onClose }: StatusEditorWizardProps) => {
  const [selected, setSelected] = useState<ContainmentStatus>(patient.containmentStatus ?? 'Normal')
  const [phase, setPhase] = useState<Phase>('select')
  const [saving, setSaving] = useState(false)
  const { pushToast } = useToast()

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
      tone: selected === 'Normal' ? 'success' : 'warning',
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

      <div className="step-nav">
        <button className="ghost-button" onClick={phase === 'select' ? onClose : () => setPhase('select')} type="button">
          {phase === 'select' ? 'Cancel' : 'Back'}
        </button>
      </div>
    </article>
  )
}
