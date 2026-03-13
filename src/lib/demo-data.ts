import { createPatientRecord, TERMINATED_CLASSIFICATION } from './storage'
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

export const demoPatients = (): PatientRecord[] => {
  // Cleared: normal vitals, no symptoms
  const clearedInput = buildInput({
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
  })

  // Caution: Observation (riskScore 2–4) – abnormal heartbeat + fever
  const cautionInput = buildInput({
    identity: {
      name: 'Morgan Reid',
      age: 34,
      sex: 'Male',
      hairColor: 'Brown',
      eyeColor: 'Blue',
      skinPigmentation: 'Fair',
      incidentLocation: 'East wing checkpoint',
      notes: '',
    },
    checklist: {
      pupilState: 'Normal',
      temperatureC: 38.6,
      heartbeatBpm: 38,
      heartbeatDetected: true,
      emfLevel: 'Low',
      notes: '',
    },
  })

  // Warning: Suspected (riskScore 5–7) – clouded pupils, fever, high EMF
  const warningInput = buildInput({
    identity: {
      name: 'Sam Torres',
      age: 29,
      sex: 'Male',
      hairColor: 'Black',
      eyeColor: 'Brown',
      skinPigmentation: 'Medium',
      incidentLocation: 'North block corridor',
      notes: '',
    },
    checklist: {
      pupilState: 'Clouded',
      temperatureC: 38.6,
      heartbeatBpm: 72,
      heartbeatDetected: true,
      emfLevel: 'High',
      notes: '',
    },
  })

  // Critical: no pulse, clouded pupils, extreme EMF, multiple symptoms
  const criticalInput = buildInput({
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
  })

  // Terminated: same as a contained subject but status/containment set to Terminated
  const terminatedBase = createPatientRecord(buildInput({
    identity: {
      name: 'Subject 07',
      age: 0,
      sex: 'Unknown',
      hairColor: 'N/A',
      eyeColor: 'N/A',
      skinPigmentation: 'N/A',
      incidentLocation: 'Containment cell 7',
      notes: 'Terminated. No longer a threat.',
    },
    checklist: {
      pupilState: 'Clouded',
      temperatureC: 34,
      heartbeatBpm: 0,
      heartbeatDetected: false,
      emfLevel: 'High',
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
  }))

  const terminatedRecord = createPatientRecord(
    buildInput({
      identity: terminatedBase.identity,
      checklist: terminatedBase.checklist,
      reportingAgent: terminatedBase.reportingAgent,
      photo: terminatedBase.photo,
    }),
    {
      ...terminatedBase,
      classification: TERMINATED_CLASSIFICATION,
      containmentStatus: 'Terminated',
    },
  )

  return [
    createPatientRecord(clearedInput),
    createPatientRecord(cautionInput),
    createPatientRecord(warningInput),
    createPatientRecord(criticalInput),
    terminatedRecord,
  ]
}
