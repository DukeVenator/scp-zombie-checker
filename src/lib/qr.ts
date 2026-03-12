import { qrPatientSchema, type PatientRecord, type QrPatientPayload } from '../types/patient'

const MAX_QR_PAYLOAD_SIZE = 1800

const encodeBase64 = (value: string) => window.btoa(unescape(encodeURIComponent(value)))

const decodeBase64 = (value: string) => decodeURIComponent(escape(window.atob(value)))

export const buildQrPayload = (record: PatientRecord) => {
  const payload: QrPatientPayload = qrPatientSchema.parse({
    version: 1,
    id: record.id,
    name: record.identity.name,
    age: record.identity.age,
    sex: record.identity.sex,
    hairColor: record.identity.hairColor,
    eyeColor: record.identity.eyeColor,
    skinPigmentation: record.identity.skinPigmentation,
    status: record.classification.status,
    updatedAt: record.updatedAt,
    checklist: record.checklist,
  })

  const encoded = encodeBase64(JSON.stringify(payload))
  if (encoded.length > MAX_QR_PAYLOAD_SIZE) {
    throw new Error('This patient record is too large for QR transfer. Use JSON export instead.')
  }

  return encoded
}

export const parseQrPayload = (payload: string) => qrPatientSchema.parse(JSON.parse(decodeBase64(payload.trim())))
