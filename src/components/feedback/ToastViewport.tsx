import { BellRing, CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import type { ToastPlacement, ToastTone } from '../../lib/toast-store-context'

const toneIcon = (tone: ToastTone) => {
  switch (tone) {
    case 'success':
      return <CircleCheck size={18} />
    case 'warning':
      return <BellRing size={18} />
    case 'error':
      return <CircleAlert size={18} />
    default:
      return <Info size={18} />
  }
}

type ToastViewportProps = {
  placement?: ToastPlacement
  className?: string
}

export const ToastViewport = ({ placement = 'global', className = '' }: ToastViewportProps) => {
  const { toasts, dismissToast } = useToast()
  const visibleToasts = toasts.filter((toast) => (toast.placement ?? 'global') === placement)

  if (placement === 'global') {
    return null
  }

  return (
    <div aria-live="polite" className={`toast-viewport ${className}`.trim()}>
      {visibleToasts.map((toast) => (
        <article className={`toast toast--${toast.tone}`} key={toast.id}>
          <div className="toast__icon">{toneIcon(toast.tone)}</div>
          <div className="toast__body">
            <strong>{toast.title}</strong>
            {toast.description && <p className="muted">{toast.description}</p>}
          </div>
          <button aria-label={`Dismiss ${toast.title}`} className="ghost-button toast__close" onClick={() => dismissToast(toast.id)} type="button">
            <X size={16} />
          </button>
        </article>
      ))}
    </div>
  )
}
