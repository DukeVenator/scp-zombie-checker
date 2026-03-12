import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'
import { ToastContext, type Toast } from './toast-store-context'

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Record<string, number>>({})

  const dismissToast = useCallback((id: string) => {
    window.clearTimeout(timeoutsRef.current[id])
    delete timeoutsRef.current[id]
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID()

      if ((toast.placement ?? 'global') === 'checklist') {
        setToasts((current) => [...current, { placement: 'checklist', ...toast, id }])
        timeoutsRef.current[id] = window.setTimeout(() => dismissToast(id), 4200)
        return id
      }

      sonnerToast(toast.title, {
        id,
        description: toast.description,
        duration: 4200,
      })

      return id
    },
    [dismissToast],
  )

  useEffect(
    () => () => {
      Object.values(timeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId))
    },
    [],
  )

  const value = useMemo(
    () => ({
      toasts,
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast, toasts],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
