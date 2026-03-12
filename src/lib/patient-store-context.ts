import { createContext } from 'react'
import type { ContainmentStatus, PatientInput, PatientRecord, ZombieVariant } from '../types/patient'

export type PatientStoreContextValue = {
  patients: PatientRecord[]
  recentPatients: PatientRecord[]
  loading: boolean
  refresh: () => Promise<void>
  upsertPatient: (input: PatientInput, existingId?: string) => Promise<PatientRecord>
  removePatient: (id: string) => Promise<void>
  importRecords: (records: PatientRecord[]) => Promise<void>
  clearAllPatients: () => Promise<void>
  setContainmentStatus: (id: string, status: ContainmentStatus) => Promise<PatientRecord>
  setVariant: (id: string, variant: ZombieVariant) => Promise<PatientRecord>
}

export const PatientStoreContext = createContext<PatientStoreContextValue | null>(null)
