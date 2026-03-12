import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_POLL_MS = 60_000

export const usePwaUpdater = () => {
  const updateState = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      registration.update()
      setInterval(() => {
        if (!registration.installing) registration.update()
      }, UPDATE_POLL_MS)
    },
  })

  return updateState
}
