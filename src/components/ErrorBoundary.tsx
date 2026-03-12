import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional label shown in the error card (e.g. "Patient detail") */
  section?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SCP ErrorBoundary]', error, info.componentStack)
  }

  private handleReload = () => window.location.reload()

  private handleRecover = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    const sectionLabel = this.props.section ?? 'Application module'

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card">
          <div className="error-boundary__icon">
            <AlertTriangle size={36} />
          </div>
          <h2 className="error-boundary__title">SYSTEM MALFUNCTION</h2>
          <p className="error-boundary__sub">
            {sectionLabel} encountered an unrecoverable error.
          </p>
          <details className="error-boundary__details">
            <summary>Technical details</summary>
            <pre>{this.state.error?.message}</pre>
            <pre className="error-boundary__stack">{this.state.error?.stack}</pre>
          </details>
          <div className="error-boundary__actions">
            <button className="primary-button" onClick={this.handleRecover} type="button">
              <RefreshCw size={14} />
              Attempt recovery
            </button>
            <button className="ghost-button" onClick={this.handleReload} type="button">
              Full reload
            </button>
          </div>
          <p className="error-boundary__footer">
            If this error persists, export your data from the Transfers page and clear the application cache.
          </p>
        </div>
      </div>
    )
  }
}
