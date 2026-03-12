import { z } from 'zod'
import { defaultReportingAgent, reportingAgentSchema } from './agent'

export const sexOptions = ['Female', 'Male', 'Other', 'Unknown'] as const
export const pupilStates = ['Normal', 'Dilated', 'Constricted', 'Clouded', 'Non-reactive'] as const
export const emfLevels = ['Low', 'Moderate', 'High', 'Extreme'] as const
export const patientStatuses = ['Cleared', 'Observation', 'Suspected', 'Contained', 'Critical'] as const
export const warningSeverities = ['info', 'warning', 'critical'] as const
export const containmentStatuses = ['Normal', 'Contained', 'Threat', 'Known Threat', 'Escaped'] as const
export const zombieVariants = ['Normal', 'Walker', 'Runner', 'Alpha', 'Gate Breaker'] as const

export type Sex = (typeof sexOptions)[number]
export type PupilState = (typeof pupilStates)[number]
export type EmfLevel = (typeof emfLevels)[number]
export type PatientStatus = (typeof patientStatuses)[number]
export type WarningSeverity = (typeof warningSeverities)[number]
export type ContainmentStatus = (typeof containmentStatuses)[number]
export type ZombieVariant = (typeof zombieVariants)[number]

export const symptomChecklistSchema = z.object({
  aggression: z.boolean(),
  decay: z.boolean(),
  incoherentSpeech: z.boolean(),
  violentResponse: z.boolean(),
  aversionToLight: z.boolean(),
  abnormalOdor: z.boolean(),
})

export type SymptomChecklist = z.infer<typeof symptomChecklistSchema>

export const zombieChecklistSchema = z.object({
  pupilState: z.enum(pupilStates),
  temperatureC: z.coerce.number().min(30).max(45),
  heartbeatBpm: z.coerce.number().min(0).max(240),
  heartbeatDetected: z.boolean(),
  emfLevel: z.enum(emfLevels),
  symptoms: symptomChecklistSchema,
  notes: z.string().trim().max(400).default(''),
})

export type ZombieChecklist = z.infer<typeof zombieChecklistSchema>

export const patientIdentitySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  age: z.coerce.number().int().min(0).max(130),
  sex: z.enum(sexOptions),
  hairColor: z.string().trim().max(60).refine(
    (v) => v.length === 0 || v.length >= 2,
    { message: 'Hair colour must be at least 2 characters if provided.' },
  ),
  eyeColor: z.string().trim().max(60).refine(
    (v) => v.length === 0 || v.length >= 2,
    { message: 'Eye colour must be at least 2 characters if provided.' },
  ),
  skinPigmentation: z.string().trim().max(120).refine(
    (v) => v.length === 0 || v.length >= 2,
    { message: 'Skin pigmentation must be at least 2 characters if provided.' },
  ),
  incidentLocation: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(400).default(''),
})

export type PatientIdentity = z.infer<typeof patientIdentitySchema>

export const warningSchema = z.object({
  id: z.string(),
  severity: z.enum(warningSeverities),
  title: z.string(),
  detail: z.string(),
  action: z.string(),
})

export type PatientWarning = z.infer<typeof warningSchema>

export const classificationSchema = z.object({
  status: z.enum(patientStatuses),
  riskScore: z.number().min(0),
  summary: z.string(),
  actions: z.array(z.string()),
  warnings: z.array(warningSchema),
})

export type ClassificationResult = z.infer<typeof classificationSchema>

export const historyChangeSchema = z.object({
  field: z.string(),
  from: z.string(),
  to: z.string(),
})

export type HistoryChange = z.infer<typeof historyChangeSchema>

export const patientHistoryEntrySchema = z.object({
  id: z.string(),
  recordedAt: z.string(),
  type: z.enum(['created', 'updated', 'imported', 'status-change', 'variant-assigned']),
  summary: z.string(),
  reportedBy: reportingAgentSchema.optional().default(defaultReportingAgent()),
  checklist: zombieChecklistSchema,
  changes: z.array(historyChangeSchema).optional().default([]),
})

export type PatientHistoryEntry = z.infer<typeof patientHistoryEntrySchema>

export const patientPhotoSchema = z.object({
  dataUrl: z.string().default(''),
  contentType: z.string().default(''),
  capturedAt: z.string().default(''),
})

export type PatientPhoto = z.infer<typeof patientPhotoSchema>

export const patientRecordSchema = z.object({
  id: z.string(),
  identity: patientIdentitySchema,
  checklist: zombieChecklistSchema,
  reportingAgent: reportingAgentSchema.optional().default(defaultReportingAgent()),
  photo: patientPhotoSchema,
  classification: classificationSchema,
  containmentStatus: z.enum(containmentStatuses).optional().default('Normal'),
  variant: z.enum(zombieVariants).optional().default('Normal'),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: reportingAgentSchema.optional().default(defaultReportingAgent()),
  updatedBy: reportingAgentSchema.optional().default(defaultReportingAgent()),
  tags: z.array(z.string()).default([]),
  history: z.array(patientHistoryEntrySchema),
})

export type PatientRecord = z.infer<typeof patientRecordSchema>

export const patientInputSchema = z.object({
  identity: patientIdentitySchema,
  checklist: zombieChecklistSchema,
  reportingAgent: reportingAgentSchema.default(defaultReportingAgent()),
  photo: patientPhotoSchema.optional().default({ dataUrl: '', contentType: '', capturedAt: '' }),
})

export type PatientInput = z.infer<typeof patientInputSchema>

export const patientExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  records: z.array(patientRecordSchema),
})

export type PatientExport = z.infer<typeof patientExportSchema>

export const qrPatientSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  age: z.number(),
  sex: z.enum(sexOptions),
  hairColor: z.string(),
  eyeColor: z.string(),
  skinPigmentation: z.string(),
  status: z.enum(patientStatuses),
  updatedAt: z.string(),
  checklist: zombieChecklistSchema,
})

export type QrPatientPayload = z.infer<typeof qrPatientSchema>

export const defaultSymptoms = (): SymptomChecklist => ({
  aggression: false,
  decay: false,
  incoherentSpeech: false,
  violentResponse: false,
  aversionToLight: false,
  abnormalOdor: false,
})

export const defaultChecklist = (): ZombieChecklist => ({
  pupilState: 'Normal',
  temperatureC: 36.8,
  heartbeatBpm: 72,
  heartbeatDetected: true,
  emfLevel: 'Low',
  symptoms: defaultSymptoms(),
  notes: '',
})

export const defaultIdentity = (): PatientIdentity => ({
  name: '',
  age: 30,
  sex: 'Unknown',
  hairColor: '',
  eyeColor: '',
  skinPigmentation: '',
  incidentLocation: '',
  notes: '',
})

export const defaultPatientInput = (): PatientInput => ({
  identity: defaultIdentity(),
  checklist: defaultChecklist(),
  reportingAgent: defaultReportingAgent(),
  photo: { dataUrl: '', contentType: '', capturedAt: '' },
})
