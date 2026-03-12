import { createPatientRecord } from './storage'
import { defaultReportingAgent } from '../types/agent'
import { defaultChecklist, defaultIdentity, type PatientInput, type PatientRecord } from '../types/patient'

type DemoOverrides = {
  identity?: Partial<PatientInput['identity']>
  checklist?: Partial<PatientInput['checklist']> & {
    symptoms?: Partial<PatientInput['checklist']['symptoms']>
  }
  reportingAgent?: Partial<PatientInput['reportingAgent']>
  photo?: Partial<PatientInput['photo']>
}

const buildInput = (overrides: DemoOverrides): PatientInput => ({
  identity: {
    ...defaultIdentity(),
    ...overrides.identity,
  },
  checklist: {
    ...defaultChecklist(),
    ...overrides.checklist,
    symptoms: {
      ...defaultChecklist().symptoms,
      ...overrides.checklist?.symptoms,
    },
  },
  reportingAgent: {
    ...defaultReportingAgent(),
    ...overrides.reportingAgent,
  },
  photo: {
    dataUrl: '',
    contentType: '',
    capturedAt: '',
    ...overrides.photo,
  },
})

export const demoPatients = (): PatientRecord[] => [
  createPatientRecord(
    buildInput({
      identity: {
        name: 'Ava Mercer',
        age: 28,
        sex: 'Female',
        hairColor: 'Black',
        eyeColor: 'Grey',
        skinPigmentation: 'Light olive',
        incidentLocation: 'Sector C perimeter',
        notes: '',
      },
      checklist: {
        pupilState: 'Normal',
        temperatureC: 37,
        heartbeatBpm: 80,
        heartbeatDetected: true,
        emfLevel: 'Low',
        notes: '',
      },
    }),
  ),
  createPatientRecord(
    buildInput({
      identity: {
        name: 'Jonas Pike',
        age: 41,
        sex: 'Male',
        hairColor: 'Brown',
        eyeColor: 'Hazel',
        skinPigmentation: 'Medium',
        incidentLocation: 'Tunnel access 12',
        notes: '',
      },
      checklist: {
        pupilState: 'Clouded',
        temperatureC: 39.8,
        heartbeatBpm: 20,
        heartbeatDetected: false,
        emfLevel: 'Extreme',
        symptoms: {
          aggression: true,
          decay: true,
          violentResponse: true,
          incoherentSpeech: true,
          aversionToLight: true,
          abnormalOdor: true,
        },
        notes: '',
      },
    }),
  ),
]
