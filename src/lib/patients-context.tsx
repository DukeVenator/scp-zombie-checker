import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearPatients,
  deletePatient,
  getRecentPatients,
  importPatients,
  listPatients,
  savePatient,
  updatePatientStatus,
  updatePatientVariant,
} from './storage'
import type { PatientRecord } from '../types/patient'
import { PatientStoreContext, type PatientStoreContextValue } from './patient-store-context'
import { useAgentProfile } from '../hooks/useAgentProfile'
import { profileToReportingAgent, defaultReportingAgent } from '../types/agent'

export const PatientStoreProvider = ({ children }: { children: ReactNode }) => {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [recentPatients, setRecentPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAgentProfile()
  const agent = profile ? profileToReportingAgent(profile) : defaultReportingAgent()

  const refresh = useCallback(async () => {
    setLoading(true)
    const [allPatients, recent] = await Promise.all([listPatients(), getRecentPatients()])
    setPatients(allPatients)
    setRecentPatients(recent)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      const [allPatients, recent] = await Promise.all([listPatients(), getRecentPatients()])
      if (!isMounted) {
        return
      }

      setPatients(allPatients)
      setRecentPatients(recent)
      setLoading(false)
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo<PatientStoreContextValue>(
    () => ({
      patients,
      recentPatients,
      loading,
      refresh,
      upsertPatient: async (input, existingId) => {
        const record = await savePatient(input, existingId)
        await refresh()
        return record
      },
      removePatient: async (id) => {
        await deletePatient(id)
        await refresh()
      },
      importRecords: async (records) => {
        await importPatients(records)
        await refresh()
      },
      clearAllPatients: async () => {
        await clearPatients()
        await refresh()
      },
      setContainmentStatus: async (id, status) => {
        const record = await updatePatientStatus(id, status, agent)
        await refresh()
        return record
      },
      setVariant: async (id, variant) => {
        const record = await updatePatientVariant(id, variant, agent)
        await refresh()
        return record
      },
    }),
    [agent, loading, patients, recentPatients, refresh],
  )

  return <PatientStoreContext.Provider value={value}>{children}</PatientStoreContext.Provider>
}
