import {
  patientExportSchema,
  patientRecordSchema,
  qrPatientSchema,
  type PatientExport,
  type PatientRecord,
} from '../types/patient'

export const EXPORT_FILE_PREFIX = 'scp-zombie-checker'

export const buildExportPayload = (records: PatientRecord[]): PatientExport =>
  patientExportSchema.parse({
    version: 1,
    exportedAt: new Date().toISOString(),
    records: records.map((record) => patientRecordSchema.parse(record)),
  })

export const buildSinglePatientPayload = (record: PatientRecord): PatientExport =>
  buildExportPayload([record])

export const parseImportPayload = (raw: string) => {
  const parsed = JSON.parse(raw)
  return patientExportSchema.parse(parsed)
}

export const safeParseImportPayload = (raw: string) => {
  try {
    return {
      success: true as const,
      data: parseImportPayload(raw),
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Import payload could not be read.',
    }
  }
}

export const downloadJson = (payload: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const exportFileName = (scope: 'all' | 'patient', patientName?: string) => {
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const suffix = scope === 'patient' && patientName ? `-${patientName.trim().replaceAll(/\s+/g, '-').toLowerCase()}` : ''
  return `${EXPORT_FILE_PREFIX}${suffix}-${timestamp}.json`
}

export const patientRecordFromQrImport = (record: PatientRecord) => patientRecordSchema.parse(record)

export const ensureQrPayloadShape = (value: unknown) => qrPatientSchema.parse(value)
