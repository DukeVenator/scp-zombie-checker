import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, ShieldAlert, Siren } from 'lucide-react'
import {
  calculateInfectionProbability,
  getThreatLevel,
} from '../../lib/assessment-ui'
import type { PatientRecord } from '../../types/patient'

type PatientCardProps = {
  patient: PatientRecord
}

export const PatientCard = ({ patient }: PatientCardProps) => {
  const infectionPct = calculateInfectionProbability(patient.checklist)
  const infectionClass = infectionPct >= 70 ? 'infection--critical' : infectionPct >= 40 ? 'infection--warning' : 'infection--low'
  const threatLevel = getThreatLevel(patient.classification)
  const containment = patient.containmentStatus ?? 'Normal'
  const variant = patient.variant ?? 'Normal'
  const noPulse = !patient.checklist.heartbeatDetected || patient.checklist.heartbeatBpm === 0
  const isTerminated = patient.classification.status === 'Terminated' || containment === 'Terminated'
  const terminate = infectionPct >= 81 && !isTerminated

  return (
    <article className={`panel patient-card ${terminate ? 'patient-card--terminate' : ''}`}>
      {terminate && (
        <div className="patient-card__terminate-strip">
          <Siren size={12} />
          TERMINATE ON SIGHT
          <Siren size={12} />
        </div>
      )}

      <div className="patient-card__header">
        <div>
          <p className="eyebrow">Patient ID {patient.id.slice(0, 8)}</p>
          <h3>{patient.identity.name}</h3>
        </div>
        <span className={`badge badge--${patient.classification.status.toLowerCase()}`}>
          {patient.classification.status}
        </span>
      </div>

      <div className="patient-card__metrics">
        <span className="pc-metric">
          <strong>{threatLevel}</strong>
          <span className="pc-metric__label">Threat</span>
        </span>
        <span className="pc-metric-divider" />
        <span className="pc-metric">
          <strong>{patient.classification.riskScore}</strong>
          <span className="pc-metric__label">Risk</span>
        </span>
        <span className="pc-metric-divider" />
        <span className={`pc-metric ${infectionClass}`}>
          <strong>{infectionPct}%</strong>
          <span className="pc-metric__label">Infected</span>
        </span>
      </div>

      <div className="sh-infection-bar">
        <div className={`sh-infection-bar__fill ${infectionClass}`} style={{ width: `${infectionPct}%` }} />
      </div>

      <div className="patient-card__tags">
        {containment !== 'Normal' && (
          <span className={`badge badge--small ${containment === 'Escaped' || containment === 'Known Threat' ? 'badge--critical' : 'badge--warning'}`}>
            <ShieldAlert size={10} /> {containment}
          </span>
        )}
        {variant !== 'Normal' && (
          <span className={`badge badge--small ${variant === 'Alpha' || variant === 'Gate Breaker' ? 'badge--critical' : 'badge--warning'}`}>
            {variant}
          </span>
        )}
        {noPulse && <span className="badge badge--small badge--critical">No pulse</span>}
      </div>

      <p className="muted patient-card__summary">{patient.classification.summary}</p>

      <div className="patient-card__footer">
        <span className="muted">
          <Clock3 size={14} /> {new Date(patient.updatedAt).toLocaleString()}
        </span>
        <Link className="inline-link" to={`/patients/${patient.id}`}>
          Open record
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}
