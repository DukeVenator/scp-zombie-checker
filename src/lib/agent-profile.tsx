import { useMemo, useState, type ReactNode } from 'react'
import { agentProfileSchema, type AgentProfile } from '../types/agent'
import { AgentStoreContext, type AgentStoreContextValue } from './agent-store-context'

const AGENT_PROFILE_KEY = 'scp-zombie-checker:agent-profile'

const loadStoredProfile = (): AgentProfile | null => {
  const raw = window.localStorage.getItem(AGENT_PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    return agentProfileSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export const AgentProfileProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState(() => {
    const storedProfile = loadStoredProfile()
    return {
      profile: storedProfile as AgentProfile | null,
      showSetup: !storedProfile,
    }
  })

  const value = useMemo<AgentStoreContextValue>(
    () => ({
      profile: state.profile,
      isReady: true,
      showSetup: state.showSetup,
      completeSetup: (nextProfile) => {
        const parsed = agentProfileSchema.parse(nextProfile)
        window.localStorage.setItem(AGENT_PROFILE_KEY, JSON.stringify(parsed))
        setState({
          profile: parsed,
          showSetup: false,
        })
      },
      openSetup: () =>
        setState((current) => ({
          ...current,
          showSetup: true,
        })),
      closeSetup: () => {
        if (state.profile) {
          setState((current) => ({
            ...current,
            showSetup: false,
          }))
        }
      },
    }),
    [state],
  )

  return <AgentStoreContext.Provider value={value}>{children}</AgentStoreContext.Provider>
}
