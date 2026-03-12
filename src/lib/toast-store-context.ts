import { createContext } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'
export type ToastPlacement = 'global' | 'checklist'

export type Toast = {
  id: string
  title: string
  description?: string
  tone: ToastTone
  placement?: ToastPlacement
}

export type ToastContextValue = {
  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id' | 'placement'> & { placement?: ToastPlacement }) => string
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
