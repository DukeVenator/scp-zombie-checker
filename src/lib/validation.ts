import type { ZodError } from 'zod'

const fieldLabels: Record<string, string> = {
  'identity.name': 'Name',
  'identity.age': 'Age',
  'identity.sex': 'Sex',
  'identity.hairColor': 'Hair colour',
  'identity.eyeColor': 'Eye colour',
  'identity.skinPigmentation': 'Skin pigmentation',
  'identity.incidentLocation': 'Incident location',
  'identity.notes': 'Intake notes',
  'checklist.pupilState': 'Pupils',
  'checklist.temperatureC': 'Temperature',
  'checklist.heartbeatBpm': 'Heartbeat',
  'checklist.heartbeatDetected': 'Heartbeat detected',
  'checklist.emfLevel': 'EMF reading',
  'checklist.notes': 'Checklist notes',
}

export const formatValidationError = (error: ZodError, fallback: string) => {
  const issue = error.issues[0]
  if (!issue) {
    return fallback
  }

  const path = issue.path.join('.')
  const label = fieldLabels[path]

  if (!label) {
    return issue.message || fallback
  }

  if (issue.message && !issue.message.startsWith('Too small')) {
    return issue.message
  }

  switch (path) {
    case 'identity.notes':
      return 'Intake notes are invalid.'
    case 'checklist.notes':
      return 'Checklist notes are invalid.'
    default:
      return `${label} is invalid.`
  }
}
