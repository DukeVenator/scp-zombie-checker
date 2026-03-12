import { createContext } from 'react'
import type { AgentProfile } from '../types/agent'

export type AgentStoreContextValue = {
  profile: AgentProfile | null
  isReady: boolean
  showSetup: boolean
  completeSetup: (profile: AgentProfile) => void
  openSetup: () => void
  closeSetup: () => void
}

export const AgentStoreContext = createContext<AgentStoreContextValue | null>(null)
