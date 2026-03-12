import Dexie, { type Table } from 'dexie'
import { classifyPatient } from '../data/scpRules'
import { defaultReportingAgent } from '../types/agent'
import type { ReportingAgent } from '../types/agent'
import {
  patientInputSchema,
  patientRecordSchema,
  type ContainmentStatus,
  type HistoryChange,
  type PatientInput,
  type PatientRecord,
  type ZombieVariant,
} from '../types/patient'

const RECENT_PATIENTS_KEY = 'scp-zombie-checker:recent-patients'

class ScpDatabase extends Dexie {
  patients!: Table<PatientRecord, string>

  constructor() {
    super('scp-zombie-checker-db')
    this.version(1).stores({
      patients: 'id, updatedAt, classification.status, identity.name',
    })
  }
}

export const db = new ScpDatabase()

const buildHistorySummary = (input: PatientInput) =>
  `Pupils ${input.checklist.pupilState}, temperature ${input.checklist.temperatureC.toFixed(1)} C, heartbeat ${
    input.checklist.heartbeatDetected ? `${input.checklist.heartbeatBpm} BPM` : 'absent'
  }, EMF ${input.checklist.emfLevel}.`

const buildChecklistDiff = (prev: PatientInput['checklist'], next: PatientInput['checklist']): HistoryChange[] => {
  const changes: HistoryChange[] = []
  if (prev.pupilState !== next.pupilState) changes.push({ field: 'Pupils', from: prev.pupilState, to: next.pupilState })
  if (prev.temperatureC !== next.temperatureC) changes.push({ field: 'Temperature', from: `${prev.temperatureC.toFixed(1)}°C`, to: `${next.temperatureC.toFixed(1)}°C` })
  if (prev.heartbeatDetected !== next.heartbeatDetected) changes.push({ field: 'Heartbeat', from: prev.heartbeatDetected ? 'Yes' : 'No', to: next.heartbeatDetected ? 'Yes' : 'No' })
  if (prev.heartbeatBpm !== next.heartbeatBpm) changes.push({ field: 'BPM', from: String(prev.heartbeatBpm), to: String(next.heartbeatBpm) })
  if (prev.emfLevel !== next.emfLevel) changes.push({ field: 'EMF', from: prev.emfLevel, to: next.emfLevel })
  for (const key of Object.keys(prev.symptoms) as Array<keyof typeof prev.symptoms>) {
    if (prev.symptoms[key] !== next.symptoms[key]) {
      changes.push({ field: key, from: prev.symptoms[key] ? 'active' : 'inactive', to: next.symptoms[key] ? 'active' : 'inactive' })
    }
  }
  if (prev.notes !== next.notes) changes.push({ field: 'Notes', from: prev.notes || '(empty)', to: next.notes || '(empty)' })
  return changes
}

export const createPatientRecord = (
  rawInput: PatientInput,
  existing?: PatientRecord,
  updateType: 'created' | 'updated' | 'imported' = existing ? 'updated' : 'created',
): PatientRecord => {
  const input = patientInputSchema.parse(rawInput)
  const now = new Date().toISOString()
  const id = existing?.id ?? crypto.randomUUID()
  const classification = classifyPatient(input)
  const changes = existing ? buildChecklistDiff(existing.checklist, input.checklist) : []
  const historyEntry = {
    id: crypto.randomUUID(),
    recordedAt: now,
    type: updateType,
    summary: buildHistorySummary(input),
    reportedBy: input.reportingAgent,
    checklist: input.checklist,
    changes,
  }

  return patientRecordSchema.parse({
    id,
    identity: input.identity,
    checklist: input.checklist,
    reportingAgent: input.reportingAgent,
    photo: input.photo,
    classification,
    containmentStatus: existing?.containmentStatus ?? 'Normal',
    variant: existing?.variant ?? 'Normal',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? input.reportingAgent,
    updatedBy: input.reportingAgent,
    tags: existing?.tags ?? [],
    history: [historyEntry, ...(existing?.history ?? [])].slice(0, 20),
  })
}

export const updatePatientStatus = async (
  id: string,
  containmentStatus: ContainmentStatus,
  agent: ReportingAgent,
) => {
  const existing = await getPatient(id)
  if (!existing) throw new Error('Patient not found')
  const now = new Date().toISOString()
  const changes: HistoryChange[] = [{ field: 'Containment status', from: existing.containmentStatus ?? 'Normal', to: containmentStatus }]
  const entry = {
    id: crypto.randomUUID(),
    recordedAt: now,
    type: 'status-change' as const,
    summary: `Containment status changed from ${existing.containmentStatus ?? 'Normal'} to ${containmentStatus}.`,
    reportedBy: agent,
    checklist: existing.checklist,
    changes,
  }
  const updated = patientRecordSchema.parse({
    ...existing,
    containmentStatus,
    updatedAt: now,
    updatedBy: agent,
    history: [entry, ...existing.history].slice(0, 20),
  })
  await db.patients.put(updated)
  addRecentPatient(id)
  return updated
}

export const updatePatientVariant = async (
  id: string,
  variant: ZombieVariant,
  agent: ReportingAgent,
) => {
  const existing = await getPatient(id)
  if (!existing) throw new Error('Patient not found')
  const now = new Date().toISOString()
  const changes: HistoryChange[] = [{ field: 'Variant', from: existing.variant ?? 'Normal', to: variant }]
  const entry = {
    id: crypto.randomUUID(),
    recordedAt: now,
    type: 'variant-assigned' as const,
    summary: `Variant assigned: ${variant}.`,
    reportedBy: agent,
    checklist: existing.checklist,
    changes,
  }
  const updated = patientRecordSchema.parse({
    ...existing,
    variant,
    updatedAt: now,
    updatedBy: agent,
    history: [entry, ...existing.history].slice(0, 20),
  })
  await db.patients.put(updated)
  addRecentPatient(id)
  return updated
}

const normalizePatientRecord = (record: PatientRecord | undefined) => {
  if (!record) {
    return undefined
  }

  return patientRecordSchema.parse({
    ...record,
    reportingAgent: record.reportingAgent ?? record.updatedBy ?? record.createdBy ?? defaultReportingAgent(),
    createdBy: record.createdBy ?? record.reportingAgent ?? defaultReportingAgent(),
    updatedBy: record.updatedBy ?? record.reportingAgent ?? record.createdBy ?? defaultReportingAgent(),
    history: record.history.map((entry) => ({
      ...entry,
      reportedBy:
        entry.reportedBy ?? record.updatedBy ?? record.createdBy ?? record.reportingAgent ?? defaultReportingAgent(),
    })),
  })
}

export const listPatients = async () =>
  (await db.patients.orderBy('updatedAt').reverse().toArray())
    .map((record) => normalizePatientRecord(record))
    .filter((record): record is PatientRecord => Boolean(record))

export const getPatient = async (id: string) => normalizePatientRecord(await db.patients.get(id))

export const savePatient = async (input: PatientInput, existingId?: string) => {
  const existing = existingId ? await getPatient(existingId) : undefined
  const record = createPatientRecord(input, existing)
  await db.patients.put(record)
  addRecentPatient(record.id)
  return record
}

export const replacePatients = async (records: PatientRecord[]) => {
  await db.transaction('rw', db.patients, async () => {
    await db.patients.clear()
    await db.patients.bulkPut(records.map((record) => patientRecordSchema.parse(record)))
  })
}

export const importPatients = async (records: PatientRecord[]) => {
  const normalized = records.map((record) => patientRecordSchema.parse(record))
  await db.patients.bulkPut(normalized)
  normalized.forEach((record) => addRecentPatient(record.id))
  return normalized
}

export const createImportedClone = (record: PatientRecord, nameOverride: string) =>
  patientRecordSchema.parse({
    ...record,
    id: crypto.randomUUID(),
    identity: {
      ...record.identity,
      name: nameOverride.trim(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

export const mergeImportedRecord = (existing: PatientRecord, imported: PatientRecord) =>
  patientRecordSchema.parse({
    ...imported,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    history: [...imported.history, ...existing.history].slice(0, 12),
    tags: Array.from(new Set([...existing.tags, ...imported.tags])),
  })

export const deletePatient = async (id: string) => {
  await db.patients.delete(id)
  removeRecentPatient(id)
}

export const clearPatients = async () => {
  await db.patients.clear()
  window.localStorage.removeItem(RECENT_PATIENTS_KEY)
}

export const getRecentPatientIds = () => {
  const raw = window.localStorage.getItem(RECENT_PATIENTS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export const addRecentPatient = (id: string) => {
  const next = [id, ...getRecentPatientIds().filter((existingId) => existingId !== id)].slice(0, 8)
  window.localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(next))
}

export const removeRecentPatient = (id: string) => {
  window.localStorage.setItem(
    RECENT_PATIENTS_KEY,
    JSON.stringify(getRecentPatientIds().filter((existingId) => existingId !== id)),
  )
}

export const getRecentPatients = async () => {
  const ids = getRecentPatientIds()
  const records = await db.patients.bulkGet(ids)
  return ids
    .map((id) => normalizePatientRecord(records.find((record) => record?.id === id)))
    .filter((record): record is PatientRecord => Boolean(record))
}

export const findPotentialDuplicates = (records: PatientRecord[], input: PatientInput) =>
  records.filter((record) => {
    const sameName = record.identity.name.trim().toLowerCase() === input.identity.name.trim().toLowerCase()
    const ageDelta = Math.abs(record.identity.age - input.identity.age) <= 1
    const sameEyes = record.identity.eyeColor.trim().toLowerCase() === input.identity.eyeColor.trim().toLowerCase()
    return sameName || (ageDelta && sameEyes)
  })

export const findImportConflict = (records: PatientRecord[], importedRecord: PatientRecord) =>
  records.find((record) => {
    const sameId = record.id === importedRecord.id
    const sameName =
      record.identity.name.trim().toLowerCase() === importedRecord.identity.name.trim().toLowerCase()
    const similarAge = Math.abs(record.identity.age - importedRecord.identity.age) <= 1
    return sameId || (sameName && similarAge)
  })
