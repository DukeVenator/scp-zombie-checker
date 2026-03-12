import { useContext } from 'react'
import { PatientStoreContext } from '../lib/patient-store-context'

export const usePatientStore = () => {
  const context = useContext(PatientStoreContext)
  if (!context) {
    throw new Error('usePatientStore must be used inside PatientStoreProvider')
  }

  return context
}
