import { NewPatientWizard } from '../components/wizard/NewPatientWizard'
import { usePatientStore } from '../hooks/usePatientStore'

export const NewPatientPage = () => {
  const { patients, upsertPatient } = usePatientStore()

  return <NewPatientWizard onSave={upsertPatient} patients={patients} />
}
