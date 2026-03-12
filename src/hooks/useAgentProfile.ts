import { useContext } from 'react'
import { AgentStoreContext } from '../lib/agent-store-context'

export const useAgentProfile = () => {
  const context = useContext(AgentStoreContext)
  if (!context) {
    throw new Error('useAgentProfile must be used inside AgentProfileProvider')
  }

  return context
}
