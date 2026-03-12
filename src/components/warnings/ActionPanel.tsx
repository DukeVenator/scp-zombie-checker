import { AlertTriangle, Shield, Siren } from 'lucide-react'
import type { ClassificationResult } from '../../types/patient'

type ActionPanelProps = {
  classification: ClassificationResult
}

export const ActionPanel = ({ classification }: ActionPanelProps) => (
  <aside className="panel warning-panel">
    <div className="section-heading">
      <div>
        <p className="eyebrow">SCP Assessment</p>
        <h3>{classification.status}</h3>
      </div>
      <span className={`badge badge--${classification.status.toLowerCase()}`}>
        Risk {classification.riskScore}
      </span>
    </div>

    <p>{classification.summary}</p>

    <div className="warning-list">
      {classification.warnings.map((warning) => (
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

    <section>
      <div className="section-heading">
        <h4>Recommended SCP actions</h4>
        <Shield size={16} />
      </div>
      <ul className="action-list">
        {classification.actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
    </section>
  </aside>
)
