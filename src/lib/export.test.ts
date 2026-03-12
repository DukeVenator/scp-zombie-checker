import { describe, expect, it } from 'vitest'
import { buildExportPayload, parseImportPayload, safeParseImportPayload } from './export'
import { createPatientRecord } from './storage'
import { defaultPatientInput } from '../types/patient'

describe('export utilities', () => {
  it('builds a valid export payload and parses it again', () => {
    const input = defaultPatientInput()
    input.identity.name = 'Export Subject'
    input.identity.hairColor = 'Black'
    input.identity.eyeColor = 'Brown'
    input.identity.skinPigmentation = 'Light'
    const record = createPatientRecord(input)
    const payload = buildExportPayload([record])
    const reparsed = parseImportPayload(JSON.stringify(payload))

    expect(reparsed.records).toHaveLength(1)
    expect(reparsed.records[0]?.id).toBe(record.id)
  })

  it('returns a descriptive error for invalid imports', () => {
    const result = safeParseImportPayload('{"version": 2}')
    expect(result.success).toBe(false)
  })
})
