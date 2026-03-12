import { useEffect } from 'react'

export const useUnsavedChangesWarning = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled])
}
