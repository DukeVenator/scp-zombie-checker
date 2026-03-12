import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import {
  variantOptions,
  variantWarnings,
} from '../../lib/assessment-ui'
import type { PatientRecord, ZombieVariant } from '../../types/patient'

type VariantWizardProps = {
  patient: PatientRecord
  onSave: (id: string, variant: ZombieVariant) => Promise<PatientRecord>
  onClose: () => void
}

type Phase = 'select' | 'warning' | 'confirm'

export const VariantWizard = ({ patient, onSave, onClose }: VariantWizardProps) => {
  const [selected, setSelected] = useState<ZombieVariant>(patient.variant ?? 'Normal')
  const [phase, setPhase] = useState<Phase>('select')
  const [saving, setSaving] = useState(false)
  const { pushToast } = useToast()

  const handleSelect = (variant: ZombieVariant) => {
    setSelected(variant)
    if (variantWarnings[variant]) {
      setPhase('warning')
    } else {
      setPhase('confirm')
    }
  }

  const handleConfirm = async () => {
    setSaving(true)
    const record = await onSave(patient.id, selected)
    setSaving(false)
    pushToast({
      title: `Variant assigned: ${selected}`,
      description: `${patient.identity.name} confirmed as ${selected} variant.`,
      tone: selected === 'Alpha' || selected === 'Gate Breaker' ? 'error' : selected === 'Normal' ? 'success' : 'warning',
    })
    onClose()
  }

  const warn = variantWarnings[selected]

  return (
    <article className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Variant classification</p>
          <h3>Assign zombie variant</h3>
        </div>
        <span className="muted">Current: {patient.variant ?? 'Normal'}</span>
      </div>

      {phase === 'select' && (
        <div className="step-card">
          <p className="eyebrow">Step 1</p>
          <h3 className="step-card__label">Select confirmed variant</h3>
          <p className="muted step-card__sub">Choose the variant type based on observed behavior and confirmed intelligence.</p>
          <div className="step-option-grid">
            {variantOptions.map((opt) => (
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
              Acknowledged — confirm variant
            </button>
          </div>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="step-card">
          <p className="eyebrow">Confirm</p>
          <h3 className="step-card__label">Confirm variant: {selected}</h3>
          <p className="muted step-card__sub">
            Assigning {patient.identity.name} as <strong>{selected}</strong> variant.
            {selected !== patient.variant && patient.variant !== 'Normal' && (
              <> Previous variant: <strong>{patient.variant}</strong>.</>
            )}
          </p>
          <div className="step-input-group">
            <button className="primary-button" disabled={saving} onClick={handleConfirm} type="button">
              {saving ? 'Saving...' : `Confirm ${selected} variant`}
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
