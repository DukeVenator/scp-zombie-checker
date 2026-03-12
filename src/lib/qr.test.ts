import { describe, expect, it } from 'vitest'
import { buildQrPayload, parseQrPayload } from './qr'
import { createPatientRecord } from './storage'
import { defaultPatientInput } from '../types/patient'

describe('QR payload utilities', () => {
  it('encodes and decodes a compact patient record', () => {
    const input = defaultPatientInput()
    input.identity.name = 'QR Subject'
    input.identity.hairColor = 'Black'
    input.identity.eyeColor = 'Brown'
    input.identity.skinPigmentation = 'Light'
    const record = createPatientRecord(input)
    const payload = buildQrPayload(record)
    const parsed = parseQrPayload(payload)

    expect(parsed.id).toBe(record.id)
    expect(parsed.name).toBe(record.identity.name)
  })
})
